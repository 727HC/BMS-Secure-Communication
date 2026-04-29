"""
serial_to_agent.py - BMU Serial -> BMS Agent Bridge
Reads EDDSA signatures from BMU serial output and sends to blockchain agent.

BMU output format:
  [BMU] OK FC=N SOC=... T=... Cyc=... Cells=11
  [SIGN] FC=N R=<64hex> S=<64hex> DATA=<96hex>

Usage:
  python serial_to_agent.py --port COM4 --baud 28800 --agent http://localhost:3001 --did <DID> \
    --user <USER> --password <PASSWORD> --org 1
"""

import serial
import requests
import re
import os
import sqlite3
import json
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


def init_spool(db_path):
    """Initialize SQLite spool for durable message delivery."""
    conn = sqlite3.connect(db_path)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS pending (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            fc INTEGER,
            payload_json TEXT NOT NULL,
            created_at TEXT DEFAULT (datetime('now')),
            retry_count INTEGER DEFAULT 0
        )
    """)
    conn.commit()
    return conn


def build_payload(sign_record, data_record=None, did=None):
    """Build JSON payload from sign + data records."""
    signature = (sign_record['signR'] + sign_record['signS']).lower()
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
    return payload


class AgentAuth:
    """JWT authentication for BMS Agent API."""

    def __init__(self, agent_url, user, password, org):
        self.agent_url = agent_url
        self.user = user
        self.password = password
        self.org = org
        self.token = None
        self.token_time = 0
        self.token_ttl = 23 * 3600  # refresh before 24h expiry

    def get_token(self):
        """Get valid JWT token, logging in if needed."""
        if self.token and (time.time() - self.token_time) < self.token_ttl:
            return self.token
        return self._login()

    def _login(self):
        """Login to agent and get JWT token."""
        try:
            resp = requests.post(f"{self.agent_url}/api/auth/login", json={
                "userId": self.user,
                "password": self.password,
                "orgNum": self.org,
            }, timeout=10)
            if resp.status_code == 200:
                data = resp.json()
                self.token = data.get("token")
                self.token_time = time.time()
                print(f"  [AUTH] Login OK (user={self.user}, org={self.org})", flush=True)
                return self.token
            else:
                print(f"  [AUTH] Login failed: {resp.status_code} {resp.text[:100]}")
                return None
        except Exception as e:
            print(f"  [AUTH] Login error: {e}")
            return None

    def headers(self):
        """Get Authorization headers."""
        token = self.get_token()
        if token:
            return {"Authorization": f"Bearer {token}"}
        return {}


def post_to_agent(agent_url, payload, auth=None):
    """POST payload to agent. Returns True on success."""
    try:
        api_url = f"{agent_url}/api/bmu/data"
        hdrs = auth.headers() if auth else {}
        resp = requests.post(api_url, json=payload, headers=hdrs, timeout=5)
        if resp.status_code == 200:
            result = resp.json()
            print(f"  -> Blockchain: {result.get('id', result.get('recordId', 'ok'))} OK", flush=True)
            return True
        elif resp.status_code == 401 and auth:
            # Token expired, force re-login
            auth.token = None
            hdrs = auth.headers()
            resp = requests.post(api_url, json=payload, headers=hdrs, timeout=5)
            if resp.status_code == 200:
                result = resp.json()
                print(f"  -> Blockchain: {result.get('id', result.get('recordId', 'ok'))} OK (re-auth)", flush=True)
                return True
        print(f"  -> Agent error: {resp.status_code} {resp.text[:100]}")
        return False
    except requests.exceptions.ConnectionError:
        print(f"  -> Agent not reachable at {agent_url}")
        return False
    except Exception as e:
        print(f"  -> Error: {e}")
        return False


def spool_insert(conn, fc, payload):
    """Insert failed payload into spool for later retry."""
    conn.execute(
        "INSERT INTO pending (fc, payload_json) VALUES (?, ?)",
        (fc, json.dumps(payload))
    )
    conn.commit()


def spool_retry(conn, agent_url, auth=None, max_batch=10):
    """Retry pending payloads from spool. Returns number of successful sends."""
    rows = conn.execute(
        "SELECT id, fc, payload_json, retry_count FROM pending "
        "WHERE retry_count < 50 ORDER BY id ASC LIMIT ?",
        (max_batch,)
    ).fetchall()

    if not rows:
        return 0

    success = 0
    for row_id, fc, payload_json, retry_count in rows:
        payload = json.loads(payload_json)
        if post_to_agent(agent_url, payload, auth=auth):
            conn.execute("DELETE FROM pending WHERE id = ?", (row_id,))
            success += 1
        else:
            conn.execute(
                "UPDATE pending SET retry_count = ? WHERE id = ?",
                (retry_count + 1, row_id)
            )
            break  # agent still down, stop retrying this batch

    conn.commit()

    # Warn about stuck entries
    stuck = conn.execute("SELECT COUNT(*) FROM pending WHERE retry_count >= 50").fetchone()[0]
    if stuck > 0:
        print(f"  [WARN] {stuck} spool entries exceeded max retries", flush=True)

    return success


def main():
    parser = argparse.ArgumentParser(description="BMU Serial → BMS Agent Bridge")
    parser.add_argument("--port", default="COM4", help="Serial port (default: COM4)")
    parser.add_argument("--baud", type=int, default=28800, help="Baud rate (default: 28800)")
    parser.add_argument("--agent", default="http://localhost:3001",
                        help="BMS Agent URL (default: http://localhost:3001)")
    parser.add_argument("--did", default=None,
                        help="BMU DID for signature verification (e.g. MPGsQGEaPz9qcySnxfFt4B)")
    parser.add_argument("--user", default=None, help="Agent login user ID")
    parser.add_argument("--password", default=None, help="Agent login password")
    parser.add_argument("--org", type=int, default=1, help="Agent org number (default: 1=Manufacturer)")
    args = parser.parse_args()

    spool_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "spool.db")

    # JWT auth (required if agent enforces authentication)
    auth = None
    if args.user and args.password:
        auth = AgentAuth(args.agent, args.user, args.password, args.org)

    print(f"BMU Serial -> Agent Bridge")
    print(f"  Serial: {args.port} @ {args.baud}")
    print(f"  Agent:  {args.agent}")
    print(f"  Auth:   {'JWT (' + args.user + ')' if auth else 'none'}")
    print(f"  Spool:  {spool_path}")
    print(f"  Press Ctrl+C to stop\n", flush=True)

    spool = init_spool(spool_path)
    ser = serial.Serial(args.port, args.baud, timeout=1)
    pending_data_by_fc = {}
    sent_count = 0
    loop_count = 0

    try:
        while True:
            # Retry spooled payloads every 20 loops (~20s at 1s serial timeout)
            loop_count += 1
            if loop_count % 20 == 0:
                retried = spool_retry(spool, args.agent, auth=auth)
                if retried > 0:
                    print(f"  [SPOOL] Retried {retried} pending records", flush=True)

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
                if len(pending_data_by_fc) > 50:
                    oldest = sorted(pending_data_by_fc.keys())[:-50]
                    for k in oldest:
                        print(f"  [DROP] FC={k} evicted from pending cache (no matching SIGN within 50 frames)", flush=True)
                        del pending_data_by_fc[k]

            elif parsed['type'] == 'sign':
                fc = parsed['fc']
                data_record = pending_data_by_fc.pop(fc, None)
                print(f"[SIGN] FC={fc} R={parsed['signR'][:16]}... S={parsed['signS'][:16]}...", flush=True)

                payload = build_payload(parsed, data_record=data_record, did=args.did)
                if post_to_agent(args.agent, payload, auth=auth):
                    sent_count += 1
                else:
                    spool_insert(spool, fc, payload)
                    print(f"  [SPOOL] FC={fc} saved for retry", flush=True)

                if sent_count % 10 == 0 and sent_count > 0:
                    print(f"  Total sent: {sent_count}")

    except KeyboardInterrupt:
        pending = spool.execute("SELECT COUNT(*) FROM pending WHERE retry_count < 50").fetchone()[0]
        print(f"\nStopped. Sent: {sent_count}, Pending in spool: {pending}")
    finally:
        spool.close()
        ser.close()


if __name__ == "__main__":
    main()
