"""One-shot UART probe capture.
Reads COM4 for up to 60s or until [HSE-PROBE] line seen, then exits.
Output: prints all lines to stdout, exits 0 on probe line, 1 on timeout.
"""
import argparse
import sys
import time

import serial


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--port", default="COM4")
    ap.add_argument("--baud", type=int, default=28800)
    ap.add_argument("--timeout", type=float, default=60.0)
    ap.add_argument("--marker", default="[HSE-PROBE] D_rd2")
    args = ap.parse_args()

    ser = serial.Serial(args.port, args.baud, timeout=1.0)
    deadline = time.time() + args.timeout
    found = False
    try:
        while time.time() < deadline:
            raw = ser.readline()
            if not raw:
                continue
            line = raw.decode("ascii", errors="replace").rstrip("\r\n")
            if not line:
                continue
            print(line, flush=True)
            if args.marker in line:
                found = True
                break
    finally:
        ser.close()
    sys.exit(0 if found else 1)


if __name__ == "__main__":
    main()
