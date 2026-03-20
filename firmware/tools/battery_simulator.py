"""
battery_simulator.py - Standalone Battery Data Simulator
Replaces Simulink for testing CMU firmware via UART.

Usage:
    python battery_simulator.py --port COM3 --baud 115200

Data flow:
    This script -> UART -> S32K144 (CMU) -> CAN-FD -> S32K344 (BMU)

Frame format (52 bytes):
    [0xAA][0x55][0x30][48 bytes data][CRC-8 checksum]
"""

import argparse
import struct
import time
import math
import sys

try:
    import serial
except ImportError:
    print("ERROR: pyserial not installed. Run: pip install pyserial")
    sys.exit(1)


# ============================================================================
#  Battery Data Structure (48 bytes, matches bms_protocol.h BatteryData_t)
# ============================================================================
#   float    current_A           (4B)
#   float    voltage_V           (4B)
#   uint16   soc_u16             (2B)  0~65535 -> 0.0~1.0
#   uint16   discharge_cycles    (2B)
#   uint16   temperature_u16     (2B)  encoded: (K - 273) / 50 * 65535
#   uint8    cell_voltage[11]    (11B) encoded: (V - 2.5) / 1.7 * 255
#   uint8    cell_soc[11]        (11B) encoded: SOC * 255
#   uint16   timestamp_ms        (2B)
#   uint8    status_flags        (1B)
#   uint8    cell_count          (1B)
#   uint8    reserved[8]         (8B)
# Total: 48 bytes

UART_SYNC_0 = 0xAA
UART_SYNC_1 = 0x55
BATTERY_DATA_SIZE = 48
NUM_CELLS = 11


def encode_soc(soc: float) -> int:
    """Encode SOC (0.0~1.0) to uint16 (0~65535)"""
    return max(0, min(65535, int(soc * 65535)))


def encode_temperature(temp_celsius: float) -> int:
    """Encode temperature (Celsius) to uint16"""
    temp_k = temp_celsius + 273.0
    return max(0, min(65535, int((temp_k - 273.0) / 50.0 * 65535)))


def encode_cell_voltage(voltage: float) -> int:
    """Encode cell voltage (2.5~4.2V) to uint8 (0~255)"""
    return max(0, min(255, int((voltage - 2.5) / (4.2 - 2.5) * 255)))


def encode_cell_soc(soc: float) -> int:
    """Encode cell SOC (0.0~1.0) to uint8 (0~255)"""
    return max(0, min(255, int(soc * 255)))


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


class BatterySimulator:
    """Simulates a battery discharge/charge cycle with realistic variations"""

    def __init__(self, num_cells: int = NUM_CELLS):
        self.num_cells = num_cells
        self.time_s = 0.0
        self.cycle_count = 0
        self.soc = 0.95  # Start near full
        self.charging = False
        self.base_temp = 25.0  # Celsius

    def step(self, dt: float) -> dict:
        """Advance simulation by dt seconds and return battery state"""
        self.time_s += dt

        # Discharge/charge cycle
        if not self.charging:
            self.soc -= 0.001 * dt  # Slow discharge
            if self.soc <= 0.15:
                self.charging = True
                self.cycle_count += 1
        else:
            self.soc += 0.002 * dt  # Charge faster
            if self.soc >= 0.95:
                self.charging = False

        self.soc = max(0.05, min(0.99, self.soc))

        # Current: negative = discharge, positive = charge
        base_current = 5.0 if self.charging else -3.5
        current = base_current + 0.3 * math.sin(self.time_s * 0.5)

        # Voltage from SOC (simplified lithium-ion curve)
        voltage_per_cell = 3.0 + 1.0 * self.soc + 0.1 * math.sin(self.time_s * 0.2)
        total_voltage = voltage_per_cell * self.num_cells

        # Temperature: rises with current
        temp = self.base_temp + abs(current) * 0.8 + 2.0 * math.sin(self.time_s * 0.1)

        # Per-cell variations (small random-like differences using sin)
        cell_voltages = []
        cell_socs = []
        for i in range(self.num_cells):
            phase = i * 0.7 + self.time_s * 0.3
            cv = voltage_per_cell + 0.02 * math.sin(phase)
            cs = self.soc + 0.01 * math.sin(phase + 1.0)
            cell_voltages.append(max(2.5, min(4.2, cv)))
            cell_socs.append(max(0.0, min(1.0, cs)))

        # Status flags
        flags = 0x00
        if self.charging:
            flags |= 0x01  # bit0: charging
        if abs(max(cell_socs) - min(cell_socs)) > 0.05:
            flags |= 0x02  # bit1: balancing needed

        return {
            "current_A": current,
            "voltage_V": total_voltage,
            "soc": self.soc,
            "cycles": self.cycle_count,
            "temperature_C": temp,
            "cell_voltages": cell_voltages,
            "cell_socs": cell_socs,
            "timestamp_ms": int(self.time_s * 1000) % 65536,
            "status_flags": flags,
            "cell_count": self.num_cells,
        }


def pack_battery_data(state: dict) -> bytes:
    """Pack battery state into 48-byte binary structure (BatteryData_t)"""

    data = struct.pack("<f", state["current_A"])                            # 4B
    data += struct.pack("<f", state["voltage_V"])                           # 4B
    data += struct.pack("<H", encode_soc(state["soc"]))                    # 2B
    data += struct.pack("<H", state["cycles"])                              # 2B
    data += struct.pack("<H", encode_temperature(state["temperature_C"]))  # 2B

    # Per-cell voltage (11 bytes)
    for v in state["cell_voltages"]:
        data += struct.pack("B", encode_cell_voltage(v))

    # Per-cell SOC (11 bytes)
    for s in state["cell_socs"]:
        data += struct.pack("B", encode_cell_soc(s))

    data += struct.pack("<H", state["timestamp_ms"])    # 2B
    data += struct.pack("B", state["status_flags"])     # 1B
    data += struct.pack("B", state["cell_count"])       # 1B
    data += b"\x00" * 8                                 # 8B reserved

    assert len(data) == BATTERY_DATA_SIZE, f"Data size mismatch: {len(data)} != {BATTERY_DATA_SIZE}"
    return data


def build_uart_frame(battery_bytes: bytes) -> bytes:
    """Build UART frame: [0xAA][0x55][LEN][DATA...][CRC-8]"""
    frame = bytes([UART_SYNC_0, UART_SYNC_1, BATTERY_DATA_SIZE])
    frame += battery_bytes
    frame += bytes([crc8_maxim(battery_bytes)])
    return frame


def print_state(state: dict, frame_num: int):
    """Print battery state to console"""
    print(f"[{frame_num:06d}] "
          f"I={state['current_A']:+6.2f}A  "
          f"V={state['voltage_V']:6.2f}V  "
          f"SOC={state['soc']*100:5.1f}%  "
          f"T={state['temperature_C']:5.1f}°C  "
          f"Cyc={state['cycles']}  "
          f"{'CHG' if state['status_flags'] & 0x01 else 'DIS'}")


def main():
    parser = argparse.ArgumentParser(description="BMS Battery Data Simulator")
    parser.add_argument("--port", type=str, default="COM3",
                        help="UART serial port (default: COM3)")
    parser.add_argument("--baud", type=int, default=115200,
                        help="Baud rate (default: 115200)")
    parser.add_argument("--period", type=float, default=0.05,
                        help="Transmission period in seconds (default: 0.05 = 50ms)")
    parser.add_argument("--dry-run", action="store_true",
                        help="Print data without sending to UART")
    parser.add_argument("--udp", action="store_true",
                        help="Send via UDP (for use with dataProcess.py)")
    parser.add_argument("--udp-ip", type=str, default="127.0.0.1",
                        help="UDP destination IP (default: 127.0.0.1)")
    parser.add_argument("--udp-port", type=int, default=5005,
                        help="UDP destination port (default: 5005)")
    args = parser.parse_args()

    sim = BatterySimulator()

    # UDP mode: send 27 doubles via UDP (same format as MATLAB)
    udp_sock = None
    if args.udp:
        import socket
        udp_sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        print(f"UDP mode: sending to {args.udp_ip}:{args.udp_port}")

    if not args.dry_run and not args.udp:
        try:
            uart = serial.Serial(port=args.port, baudrate=args.baud, timeout=1)
            print(f"Opened {args.port} at {args.baud} baud")
        except serial.SerialException as e:
            print(f"ERROR: Cannot open {args.port}: {e}")
            sys.exit(1)
    else:
        uart = None
        print("DRY RUN mode (no UART)")

    print(f"Sending battery data every {args.period*1000:.0f}ms")
    print("Press Ctrl+C to stop\n")

    frame_num = 0
    try:
        while True:
            state = sim.step(args.period)
            battery_bytes = pack_battery_data(state)
            frame = build_uart_frame(battery_bytes)

            if udp_sock:
                # Send 27 doubles via UDP (same format as MATLAB)
                import struct as st
                num_cells = state["cell_count"]
                temp_k = state["temperature_C"] + 273.0
                # Pad cell arrays to 11
                cell_socs = (state["cell_socs"] + [state["soc"]] * 11)[:11]
                cell_volts = (state["cell_voltages"] + [state["voltage_V"] / num_cells] * 11)[:11]
                packet = [state["current_A"], float(state["cycles"]), state["soc"]]
                packet += cell_socs
                packet += [temp_k, state["voltage_V"]]
                packet += cell_volts
                udp_data = st.pack("<27d", *packet)
                udp_sock.sendto(udp_data, (args.udp_ip, args.udp_port))
            elif uart and uart.is_open:
                uart.write(frame)

            if frame_num % 20 == 0:  # Print every 20th frame (1 second at 50ms)
                print_state(state, frame_num)

            frame_num += 1
            time.sleep(args.period)

    except KeyboardInterrupt:
        print("\nStopped.")
    finally:
        if uart and uart.is_open:
            uart.close()


if __name__ == "__main__":
    main()
