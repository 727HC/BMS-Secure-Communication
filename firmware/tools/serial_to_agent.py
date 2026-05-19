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


_HEX64_RE = re.compile(r'^[0-9a-fA-F]{64}$')
_HEX96_RE = re.compile(r'^[0-9a-fA-F]{96}$')


def parse_bmu_line(line):
    """Parse BMU serial output line. Returns None on malformed input."""
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
        sign_r = sign_match.group(2).replace(' ', '')
        sign_s = sign_match.group(3).replace(' ', '')
        if not _HEX64_RE.match(sign_r) or not _HEX64_RE.match(sign_s):
            print(f"  [DROP] malformed SIGN line (R/S not 64 hex): {line[:80]}", flush=True)
            return None
        result['type'] = 'sign'
        result['fc'] = int(sign_match.group(1))
        result['signR'] = sign_r
        result['signS'] = sign_s
        if sign_match.group(4):
            raw = sign_match.group(4).replace(' ', '')
            if _HEX96_RE.match(raw):
                result['rawPayload'] = raw
            else:
                print(f"  [DROP] malformed DATA (not 96 hex, len={len(raw)}): {raw[:60]}", flush=True)
                # keep going without rawPayload — signature alone still valid for legacy path
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
    parser.add_argument("--min-fc", type=int, default=0,
                        help="Drop SIGN frames with fc < this value (catch-up after BMU reboot vs chaincode lastFc). 0 = no filter.")
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
    if args.min_fc > 0:
        print(f"  MinFC:  {args.min_fc} (drop SIGN frames below this until BMU catches up)")
    print(f"  Press Ctrl+C to stop\n", flush=True)

    spool = init_spool(spool_path)
    ser = serial.Serial(args.port, args.baud, timeout=1)
    pending_data_by_fc = {}
    sent_count = 0
    loop_count = 0
    # BMU reboot detection: alert once per peak when FC regresses sharply
    last_seen_fc = 0
    reboot_alerted_at_peak = 0

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
                # BMU reboot detection: alert once per peak when FC regresses sharply
                if last_seen_fc > 100 and fc < last_seen_fc - 100 and reboot_alerted_at_peak != last_seen_fc:
                    print(f"  [ALERT] BMU FC regression: prev_max={last_seen_fc}, now={fc} — board likely rebooted", flush=True)
                    if args.did:
                        print(f"          → Manual recovery (if intentional): peer chaincode invoke ... ResetFCForDID '{args.did}' '<reason ≥10>'", flush=True)
                    else:
                        print(f"          → Manual recovery: ResetFCForDID against this BMU's DID", flush=True)
                    reboot_alerted_at_peak = last_seen_fc
                if fc > last_seen_fc:
                    last_seen_fc = fc
                if args.min_fc > 0 and fc < args.min_fc:
                    # BMU FC restarted (e.g. reboot/key-exchange) but chaincode lastFc is higher.
                    # Silently skip until BMU's FC catches up. Print every 50 dropped to avoid spam.
                    pending_data_by_fc.pop(fc, None)
                    if fc % 50 == 0:
                        print(f"  [SKIP] FC={fc} < min-fc {args.min_fc} (waiting for BMU FC catch-up)", flush=True)
                    continue
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
