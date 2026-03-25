"""
serial_to_agent.py — BMU Serial → BMS Agent Bridge
Reads EDDSA signatures from BMU serial output and sends to blockchain agent.

BMU output format:
  [BMU] OK FC=N SOC=... T=... Cyc=... Cells=11
  [SIGN] FC=N R=<64hex> S=<64hex> DATA=<96hex>

Usage:
  python serial_to_agent.py --port COM4 --baud 28800 --agent http://localhost:3001 --did <DID>
"""

import serial
import requests
import hashlib
import re
import sys
import argparse
import time


def parse_bmu_line(line):
    """Parse BMU serial output line."""
    result = {}

    # [BMU] OK FC=42 SOC=61176 T=38760 Cyc=0 Cells=11
    bmu_match = re.match(
        r'\[BMU\] OK FC=(\d+) SOC=(\d+) T=(\d+) Cyc=(\d+) Cells=(\d+)', line)
    if bmu_match:
        result['type'] = 'data'
        result['fc'] = int(bmu_match.group(1))
        result['soc'] = int(bmu_match.group(2))
        result['temperature'] = int(bmu_match.group(3))
        result['cycles'] = int(bmu_match.group(4))
        result['cells'] = int(bmu_match.group(5))
        return result

    # [SIGN] FC=42 R=AABB...  S=CCDD... DATA=EEFF...
    sign_match = re.match(
        r'\[SIGN\] FC=(\d+) R=(.+?) S=(.+?)(?:\s+DATA=(.+))?$', line)
    if sign_match:
        result['type'] = 'sign'
        result['fc'] = int(sign_match.group(1))
        result['signR'] = sign_match.group(2).replace(' ', '')
        result['signS'] = sign_match.group(3).replace(' ', '')
        if sign_match.group(4):
            result['rawPayload'] = sign_match.group(4).replace(' ', '')
        return result

    return None


def send_to_agent(agent_url, sign_record, data_record=None, did=None):
    """Send verified + signed data to BMS Agent."""
    signature = sign_record['signR'] + sign_record['signS']

    payload = {
        'fc': sign_record['fc'],
        'signature': signature,
    }
    if did:
        payload['did'] = did
    if 'rawPayload' in sign_record:
        payload['rawPayload'] = sign_record['rawPayload']
    if data_record:
        payload['soc'] = data_record['soc']
        payload['temperature'] = data_record['temperature']

    try:
        api_url = f"{agent_url}/api/bmu/data"
        resp = requests.post(api_url, json=payload, timeout=5)
        if resp.status_code == 200:
            result = resp.json()
            print(f"  -> Blockchain: {result.get('id', result.get('recordId', 'ok'))} OK", flush=True)
        else:
            print(f"  → Agent error: {resp.status_code} {resp.text[:100]}")
    except requests.exceptions.ConnectionError:
        print(f"  → Agent not reachable at {agent_url}")
    except Exception as e:
        print(f"  → Error: {e}")


def main():
    parser = argparse.ArgumentParser(description="BMU Serial → BMS Agent Bridge")
    parser.add_argument("--port", default="COM4", help="Serial port (default: COM4)")
    parser.add_argument("--baud", type=int, default=28800, help="Baud rate (default: 28800)")
    parser.add_argument("--agent", default="http://localhost:3001",
                        help="BMS Agent URL (default: http://localhost:3001)")
    parser.add_argument("--did", default=None,
                        help="BMU DID for signature verification (e.g. MPGsQGEaPz9qcySnxfFt4B)")
    args = parser.parse_args()

    print(f"BMU Serial → Agent Bridge")
    print(f"  Serial: {args.port} @ {args.baud}")
    print(f"  Agent:  {args.agent}")
    print(f"  Press Ctrl+C to stop\n", flush=True)

    ser = serial.Serial(args.port, args.baud, timeout=1)
    pending_data_by_fc = {}
    sent_count = 0

    try:
        while True:
            raw = ser.readline()
            if not raw:
                continue

            line = raw.decode('ascii', errors='replace').strip()
            if not line:
                continue

            parsed = parse_bmu_line(line)
            if not parsed:
                continue

            if parsed['type'] == 'data':
                pending_data_by_fc[parsed['fc']] = parsed
                print(f"[DATA] FC={parsed['fc']} SOC={parsed['soc']} T={parsed['temperature']}", flush=True)
                # 오래된 pending 항목 정리 (최근 50개만 유지)
                if len(pending_data_by_fc) > 50:
                    oldest = sorted(pending_data_by_fc.keys())[:-50]
                    for k in oldest:
                        del pending_data_by_fc[k]

            elif parsed['type'] == 'sign':
                fc = parsed['fc']
                data_record = pending_data_by_fc.pop(fc, None)
                print(f"[SIGN] FC={fc} R={parsed['signR'][:16]}... S={parsed['signS'][:16]}...", flush=True)
                send_to_agent(args.agent, parsed, data_record=data_record, did=args.did)
                sent_count += 1
                if sent_count % 10 == 0:
                    print(f"  Total sent: {sent_count}")

    except KeyboardInterrupt:
        print(f"\nStopped. Total sent: {sent_count}")
    finally:
        ser.close()


if __name__ == "__main__":
    main()
