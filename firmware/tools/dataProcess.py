"""
dataProcess.py - Simulink UDP to UART Bridge
Receives battery data from Simulink via UDP, compresses to 48 bytes,
wraps in UART frame, and sends to S32K144 CMU.

Data flow:
    Simulink (UDP:5005) -> This script -> UART -> S32K144 (CMU)

Simulink sends 27 doubles (216 bytes) via UDP:
    [0]  iCellModel           - Cell current (A)
    [1]  numCyclesCellModel   - Discharge cycle count
    [2]  socCellModel         - Average SOC (0~1)
    [3:14]  socParallelAssembly[11]  - Per-cell SOC
    [14] temperatureCellModel - Temperature (K)
    [15] vCellModel           - Cell voltage (V)
    [16:27] vParallelAssembly[11]    - Per-cell voltage (V)

UART output frame (52 bytes):
    [0xAA][0x55][0x30][48 bytes BatteryData_t][CRC-8 checksum]
"""

import socket
import struct
import time
import sys
import argparse

try:
    import serial
except ImportError:
    print("ERROR: pyserial not installed. Run: pip install pyserial")
    sys.exit(1)

# ============================================================================
#  Configuration
# ============================================================================
SIMULINK_UDP_IP = "127.0.0.1"
SIMULINK_UDP_PORT = 5005
SIMULINK_PACKET_SIZE = 216  # 27 doubles * 8 bytes

NUM_CELLS = 11
BATTERY_DATA_SIZE = 48

UART_SYNC_0 = 0xAA
UART_SYNC_1 = 0x55


# ============================================================================
#  Encoding Functions
# ============================================================================
def encode_soc(soc: float) -> int:
    return max(0, min(65535, int(soc * 65535)))


def encode_temperature(temp_k: float) -> int:
    return max(0, min(65535, int((temp_k - 273.0) / 50.0 * 65535)))


def encode_cell_voltage(v: float) -> int:
    return max(0, min(255, int((v - 2.5) / (4.2 - 2.5) * 255)))


def encode_cell_soc(s: float) -> int:
    return max(0, min(255, int(s * 255)))


def crc8_maxim(data: bytes) -> int:
    """CRC-8/MAXIM (polynomial 0x31, init 0x00) — matches firmware BMS_CalcChecksum"""
    crc = 0x00
    for b in data:
        crc ^= b
        for _ in range(8):
            if crc & 0x80:
                crc = ((crc << 1) ^ 0x31) & 0xFF
            else:
                crc = (crc << 1) & 0xFF
    return crc


# ============================================================================
#  Parse Simulink UDP Packet
# ============================================================================
def parse_simulink_packet(data: bytes) -> dict:
    """Parse 216-byte UDP packet from Simulink (27 doubles, little-endian)"""
    if len(data) != SIMULINK_PACKET_SIZE:
        return None

    values = struct.unpack("<27d", data)

    return {
        "current_A": values[0],
        "cycles": int(values[1]),
        "soc": values[2],
        "cell_socs": list(values[3:14]),       # 11 values
        "temperature_K": values[14],
        "voltage_V": values[15],
        "cell_voltages": list(values[16:27]),   # 11 values
    }


# ============================================================================
#  Compress to 48-byte BatteryData_t
# ============================================================================
def compress_to_battery_data(parsed: dict, timestamp_ms: int) -> bytes:
    """Compress parsed Simulink data to 48-byte BatteryData_t structure"""

    data = struct.pack("<f", float(parsed["current_A"]))                     # 4B
    data += struct.pack("<f", float(parsed["voltage_V"]))                    # 4B
    data += struct.pack("<H", encode_soc(parsed["soc"]))                     # 2B
    data += struct.pack("<H", parsed["cycles"])                              # 2B
    data += struct.pack("<H", encode_temperature(parsed["temperature_K"]))   # 2B

    # Per-cell voltage (11 bytes)
    for v in parsed["cell_voltages"][:NUM_CELLS]:
        data += struct.pack("B", encode_cell_voltage(v))

    # Per-cell SOC (11 bytes)
    for s in parsed["cell_socs"][:NUM_CELLS]:
        data += struct.pack("B", encode_cell_soc(s))

    data += struct.pack("<H", timestamp_ms % 65536)     # 2B timestamp
    data += struct.pack("B", 0x00)                       # 1B status_flags
    data += struct.pack("B", NUM_CELLS)                  # 1B cell_count
    data += b"\x00" * 8                                  # 8B reserved

    assert len(data) == BATTERY_DATA_SIZE
    return data


# ============================================================================
#  Build UART Frame
# ============================================================================
def build_uart_frame(battery_bytes: bytes) -> bytes:
    """Build framed UART packet: [0xAA][0x55][LEN][DATA][CRC-8]"""
    frame = bytes([UART_SYNC_0, UART_SYNC_1, BATTERY_DATA_SIZE])
    frame += battery_bytes
    frame += bytes([crc8_maxim(battery_bytes)])
    return frame


# ============================================================================
#  Main
# ============================================================================
def main():
    parser = argparse.ArgumentParser(description="Simulink UDP to UART Bridge")
    parser.add_argument("--port", type=str, default="COM5",
                        help="UART serial port (default: COM5, matches config.env CMU_COM)")
    parser.add_argument("--baud", type=int, default=9600,
                        help="Baud rate (default: 9600, matches config.env CMU_UART_BAUD)")
    parser.add_argument("--udp-ip", type=str, default=SIMULINK_UDP_IP,
                        help=f"UDP listen IP (default: {SIMULINK_UDP_IP})")
    parser.add_argument("--udp-port", type=int, default=SIMULINK_UDP_PORT,
                        help=f"UDP listen port (default: {SIMULINK_UDP_PORT})")
    args = parser.parse_args()

    # Open UART
    try:
        uart = serial.Serial(port=args.port, baudrate=args.baud, timeout=1)
        print(f"UART: {args.port} at {args.baud} baud")
    except serial.SerialException as e:
        print(f"ERROR: Cannot open {args.port}: {e}")
        sys.exit(1)

    # Open UDP socket
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    sock.bind((args.udp_ip, args.udp_port))
    print(f"UDP:  Listening on {args.udp_ip}:{args.udp_port}")
    print(f"Waiting for Simulink data ({SIMULINK_PACKET_SIZE} bytes/packet)...")
    print("Press Ctrl+C to stop\n")

    frame_count = 0
    start_time = time.time()

    try:
        while True:
            data, addr = sock.recvfrom(1024)

            if len(data) != SIMULINK_PACKET_SIZE:
                print(f"WARN: Invalid packet size {len(data)} from {addr}")
                continue

            parsed = parse_simulink_packet(data)
            if parsed is None:
                continue

            # Timestamp in ms since start
            elapsed_ms = int((time.time() - start_time) * 1000)

            # Compress and frame
            battery_bytes = compress_to_battery_data(parsed, elapsed_ms)
            frame = build_uart_frame(battery_bytes)

            # Send via UART
            if uart and uart.is_open:
                uart.write(frame)

            frame_count += 1
            if frame_count % 20 == 0:
                print(f"[{frame_count:06d}] "
                      f"I={parsed['current_A']:+6.2f}A  "
                      f"V={parsed['voltage_V']:6.2f}V  "
                      f"SOC={parsed['soc']*100:5.1f}%  "
                      f"T={parsed['temperature_K']-273:.1f}°C  "
                      f"Cyc={parsed['cycles']}")

    except KeyboardInterrupt:
        print(f"\nStopped. Total frames: {frame_count}")
    finally:
        uart.close()
        sock.close()


if __name__ == "__main__":
    main()
