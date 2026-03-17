import socket
import struct
import serial

#  UART 설정
uart = serial.Serial(port="COM3", baudrate=115200, timeout=1)  # 포트명은 환경에 따라 조정

#  데이터 압축 (48 bytes)
def compress_to_48_bytes(parsed):
    def encode_soc(soc):
        return int(soc * 65535)

    def encode_temp(temp_K):
        return int((temp_K - 273) / 50 * 65535)

    def encode_voltage_cell(v):
        return max(0, min(255, int((v - 2.5) / (4.2 - 2.5) * 255)))

    def encode_soc_cell(s):
        return max(0, min(255, int(s * 255)))

    i_f32 = struct.pack('<f', float(parsed['iCellModel']))
    v_f32 = struct.pack('<f', float(parsed['vCellModel']))
    soc_u16 = struct.pack('<H', encode_soc(parsed['socCellModel']))
    cycles_u16 = struct.pack('<H', parsed['numCyclesCellModel'])
    temp_u16 = struct.pack('<H', encode_temp(parsed['temperatureCellModel']))
    v_arr_u8 = bytes([encode_voltage_cell(v) for v in parsed['vParallelAssembly']])
    soc_arr_u8 = bytes([encode_soc_cell(s) for s in parsed['socParallelAssembly']])

    return i_f32 + v_f32 + soc_u16 + cycles_u16 + temp_u16 + v_arr_u8 + soc_arr_u8  # 48 bytes

# 🚀 UART 송신 함수
def send_uart(data_bytes):
    if uart and uart.is_open:
        uart.write(data_bytes)

# 🛰️ UDP 수신 및 처리 루프
def receive_battery_data_udp(ip="127.0.0.1", port=5005):
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    sock.bind((ip, port))
    print(f" Listening for UDP packets on {ip}:{port}...")

    while True:
        data, addr = sock.recvfrom(1024)
        if len(data) != 216:
            print(f"⚠️ Invalid packet size: {len(data)} bytes from {addr}")
            continue

        try:
            values = struct.unpack('<27d', data)
            parsed = {
                'iCellModel': values[0],
                'numCyclesCellModel': int(values[1]),
                'socCellModel': values[2],
                'socParallelAssembly': list(values[3:14]),
                'temperatureCellModel': values[14],
                'vCellModel': values[15],
                'vParallelAssembly': list(values[16:27]),
            }

            # 디버깅 출력
            print(" Received Battery Packet")
            print(f" Current: {parsed['iCellModel']:.3f} A")
            print(f" Discharge Cycles: {parsed['numCyclesCellModel']}")
            print(f"SOC (avg): {parsed['socCellModel']:.3f}")
            print(f" Temperature: {parsed['temperatureCellModel']:.2f} K")
            print(f" Voltage (total): {parsed['vCellModel']:.3f} V")
            print(" SOC per cell:     ", ["{:.3f}".format(s) for s in parsed['socParallelAssembly']])
            print(" Voltage per cell: ", ["{:.3f}".format(v) for v in parsed['vParallelAssembly']])
            print("─────────────────────────────────────")

            # 압축 + UART 송신
            compressed_packet = compress_to_48_bytes(parsed)
            print(f" Compressed 48B Packet: {compressed_packet.hex()}")
            send_uart(compressed_packet)

        except Exception as e:
            print(f"❌ Error parsing packet: {e}")

# ▶ 진입점
if __name__ == "__main__":
    receive_battery_data_udp()
