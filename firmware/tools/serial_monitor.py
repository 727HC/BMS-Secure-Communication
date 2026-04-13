#!/usr/bin/env python3
"""BMU Serial Monitor — reads and prints serial output."""
import serial
import sys
import argparse

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--port", required=True)
    parser.add_argument("--baud", type=int, required=True)
    args = parser.parse_args()

    ser = serial.Serial(args.port, args.baud, timeout=0.1)
    try:
        while True:
            line = ser.readline()
            if line:
                text = bytes(b if 0x20 <= b <= 0x7E or b in (0x0D, 0x0A) else 0x2E for b in line)
                sys.stdout.write(text.decode())
                sys.stdout.flush()
    except KeyboardInterrupt:
        pass
    finally:
        ser.close()

if __name__ == "__main__":
    main()
