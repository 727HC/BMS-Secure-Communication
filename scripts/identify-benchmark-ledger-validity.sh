#!/usr/bin/env bash
# Read-only Fabric block-store validation helper for disposable benchmark channels.
# It copies one peer's block store, runs ledgerutil identifytxs for expected BMU
# record keys, and writes a compact summary. It never submits transactions.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT_DIR}"

RUN_ID="${RUN_ID:-}"
CHANNEL="${CHANNEL_NAME:-}"
EXPECTED="${CALIPER_WRITE_TX_NUMBER:-0}"
CHAINCODE="${CHAINCODE_NAME:-passport-contract}"
EVIDENCE_DIR="${EVIDENCE_ROOT:-}"
OUTPUT_DIR=""
TXMAP_DIR="${CALIPER_TXMAP_DIR:-}"
PEER_CONTAINER="${LEDGER_VALIDITY_PEER:-peer0.manufacturer.battery.com}"
LEDGER_PEER_FS_PATH="${LEDGER_PEER_FS_PATH:-${LEDGER_BLOCKSTORE_PATH:-/var/hyperledger/production}}"
LEDGER_DATA_PATH="${LEDGER_DATA_PATH:-${LEDGER_PEER_FS_PATH}/ledgersData}"
LEDGERUTIL_BIN="${LEDGERUTIL_BIN:-}"
FABRIC_TOOLS_IMAGE="${FABRIC_TOOLS_IMAGE:-hyperledger/fabric-tools:2.5}"
WORKERS="${CALIPER_WORKERS:-}"
RECORD_EPOCH="${CALIPER_RECORD_EPOCH:-}"
RECORD_PREFIX="${CALIPER_KEY_PREFIX:-}"
ALLOW_LIVE_READONLY_LEDGER_DIAGNOSTIC="${ALLOW_LIVE_READONLY_LEDGER_DIAGNOSTIC:-false}"
KEEP_LEDGER_BLOCKSTORE_COPY="${KEEP_LEDGER_BLOCKSTORE_COPY:-false}"

usage() {
  cat <<'USAGE'
Usage:
  scripts/identify-benchmark-ledger-validity.sh \
    --run-id <id> --channel <benchmark-channel> --expected <n> \
    --evidence-dir <dir> [--txmap-dir <dir>]

Options:
  --run-id <id>              Caliper run id to filter txmap JSONL lines.
  --channel <name>           Channel/ledger id to inspect. `passportchannel` is blocked unless ALLOW_LIVE_READONLY_LEDGER_DIAGNOSTIC=true.
  --expected <n>             Expected record count for this run/group.
  --chaincode <name>         Chaincode namespace, default passport-contract.
  --evidence-dir <dir>       Evidence root; default EVIDENCE_ROOT.
  --output-dir <dir>         Output dir; default <evidence-dir>/ledger-validity.
  --txmap-dir <dir>          Preferred source of exact recordId keys.
  --peer-container <name>    Peer container to copy block store from.
  --ledger-peer-fs-path <p>   Peer filesystem root for ledgerutil, default /var/hyperledger/production.
  --ledger-data-path <path>   Peer ledgersData path to copy, default <peer-fs>/ledgersData.
  --ledgerutil-bin <path>     Host ledgerutil binary; default fabric-samples/bin/ledgerutil if present, else Docker.
  --fabric-tools-image <img> Docker image that contains `ledgerutil`.
  --workers <n>              Fallback key generation worker count when no txmap exists.
  --record-epoch <epoch>     Fallback key generation epoch, e.g. r1.
  --record-prefix <prefix>   Fallback key prefix; default sha1(run-id)[0:8].
  --keep-blockstore-copy     Keep copied peer blockstore under output dir; default removes it after ledgerutil.

Outputs under --output-dir:
  expected-keys.json, ledgerutil.log, summary.json, summary.env, blockstore/, identifytxs/
USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --run-id) RUN_ID="${2:-}"; shift 2 ;;
    --channel) CHANNEL="${2:-}"; shift 2 ;;
    --expected) EXPECTED="${2:-}"; shift 2 ;;
    --chaincode) CHAINCODE="${2:-}"; shift 2 ;;
    --evidence-dir) EVIDENCE_DIR="${2:-}"; shift 2 ;;
    --output-dir) OUTPUT_DIR="${2:-}"; shift 2 ;;
    --txmap-dir) TXMAP_DIR="${2:-}"; shift 2 ;;
    --peer-container) PEER_CONTAINER="${2:-}"; shift 2 ;;
    --ledger-peer-fs-path) LEDGER_PEER_FS_PATH="${2:-}"; shift 2 ;;
    --ledger-data-path) LEDGER_DATA_PATH="${2:-}"; shift 2 ;;
    --ledgerutil-bin) LEDGERUTIL_BIN="${2:-}"; shift 2 ;;
    --fabric-tools-image) FABRIC_TOOLS_IMAGE="${2:-}"; shift 2 ;;
    --workers) WORKERS="${2:-}"; shift 2 ;;
    --record-epoch) RECORD_EPOCH="${2:-}"; shift 2 ;;
    --record-prefix) RECORD_PREFIX="${2:-}"; shift 2 ;;
    --keep-blockstore-copy) KEEP_LEDGER_BLOCKSTORE_COPY=true; shift ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown argument: $1" >&2; usage >&2; exit 2 ;;
  esac
done

if [[ -z "${RUN_ID}" || -z "${CHANNEL}" ]]; then
  echo "--run-id and --channel are required" >&2
  usage >&2
  exit 2
fi
if [[ "${CHANNEL}" == "passportchannel" && "${ALLOW_LIVE_READONLY_LEDGER_DIAGNOSTIC}" != "true" ]]; then
  echo "Refusing live passportchannel ledger diagnostic by default; set ALLOW_LIVE_READONLY_LEDGER_DIAGNOSTIC=true for read-only diagnostic use." >&2
  exit 21
fi
if ! [[ "${EXPECTED}" =~ ^[0-9]+$ ]] || (( EXPECTED <= 0 )); then
  echo "--expected must be a positive integer" >&2
  exit 2
fi
if [[ -z "${EVIDENCE_DIR}" ]]; then
  EVIDENCE_DIR="${ROOT_DIR}/.omx/evidence/blockchain/${RUN_ID}"
fi
if [[ "${EVIDENCE_DIR}" != /* ]]; then
  EVIDENCE_DIR="${ROOT_DIR}/${EVIDENCE_DIR}"
fi
if [[ -z "${OUTPUT_DIR}" ]]; then
  OUTPUT_DIR="${EVIDENCE_DIR}/ledger-validity"
fi
if [[ "${OUTPUT_DIR}" != /* ]]; then
  OUTPUT_DIR="${ROOT_DIR}/${OUTPUT_DIR}"
fi
if [[ -n "${TXMAP_DIR}" && "${TXMAP_DIR}" != /* ]]; then
  TXMAP_DIR="${ROOT_DIR}/${TXMAP_DIR}"
fi
mkdir -p "${OUTPUT_DIR}"
OUTPUT_DIR="$(cd "${OUTPUT_DIR}" && pwd)"

EXPECTED_KEYS_JSON="${OUTPUT_DIR}/expected-keys.json"
SUMMARY_JSON="${OUTPUT_DIR}/summary.json"
SUMMARY_ENV="${OUTPUT_DIR}/summary.env"
LEDGERUTIL_LOG="${OUTPUT_DIR}/ledgerutil.log"
BLOCKSTORE_DIR="${OUTPUT_DIR}/blockstore"
PEER_FS_COPY="${BLOCKSTORE_DIR}/production"
IDENTIFY_DIR="${OUTPUT_DIR}/identifytxs"

python3 - \
  "${EXPECTED_KEYS_JSON}" "${RUN_ID}" "${CHANNEL}" "${CHAINCODE}" "${EXPECTED}" "${TXMAP_DIR}" "${WORKERS}" "${RECORD_EPOCH}" "${RECORD_PREFIX}" <<'PY'
import hashlib
import json
import os
import sys
from pathlib import Path

out = Path(sys.argv[1])
run_id, channel, chaincode = sys.argv[2], sys.argv[3], sys.argv[4]
expected = int(sys.argv[5])
txmap_dir = sys.argv[6]
workers = int(sys.argv[7]) if sys.argv[7].isdigit() else 0
record_epoch = sys.argv[8]
record_prefix = sys.argv[9] or hashlib.sha1(run_id.encode()).hexdigest()[:8]

record_ids = []
source = "generated"
if txmap_dir and Path(txmap_dir).exists():
    seen = set()
    for file in sorted(Path(txmap_dir).rglob("*.jsonl")):
        for raw in file.read_text(errors="replace").splitlines():
            if not raw.strip():
                continue
            try:
                obj = json.loads(raw)
            except Exception:
                continue
            if obj.get("runId") != run_id:
                continue
            rid = obj.get("recordId")
            if rid and rid not in seen:
                seen.add(rid)
                record_ids.append(rid)
    if record_ids:
        source = "txmap"

if not record_ids:
    if workers <= 0 or not record_epoch:
        raise SystemExit("No txmap recordIds found; fallback generation requires --workers and --record-epoch")
    for n in range(expected):
        worker = n % workers
        idx = n // workers
        record_ids.append(f"B-CAL-{record_prefix}-{worker}-{record_epoch}-{idx}")

payload = {
    "ledgerid": channel,
    "metadata": {
        "runId": run_id,
        "expected": expected,
        "chaincode": chaincode,
        "keySource": source,
        "recordIdCount": len(record_ids),
    },
    "diffRecords": [{"namespace": chaincode, "key": rid} for rid in record_ids],
}
out.write_text(json.dumps(payload, indent=2) + "\n")
print(json.dumps(payload["metadata"], indent=2))
PY

rm -rf "${BLOCKSTORE_DIR}" "${IDENTIFY_DIR}"
mkdir -p "${BLOCKSTORE_DIR}"
{
  echo "# docker cp $(date -Is)"
  echo "peer=${PEER_CONTAINER}"
  echo "peer_fs_root=${LEDGER_PEER_FS_PATH}"
  echo "source=${LEDGER_DATA_PATH}"
  echo "dest=${PEER_FS_COPY}/ledgersData"
} > "${OUTPUT_DIR}/docker-cp-peer-fs.log"
mkdir -p "${PEER_FS_COPY}"
docker cp "${PEER_CONTAINER}:${LEDGER_DATA_PATH}" "${PEER_FS_COPY}/ledgersData" >> "${OUTPUT_DIR}/docker-cp-peer-fs.log" 2>&1

if [[ -z "${LEDGERUTIL_BIN}" && -x "${ROOT_DIR}/fabric-samples/bin/ledgerutil" ]]; then
  LEDGERUTIL_BIN="${ROOT_DIR}/fabric-samples/bin/ledgerutil"
fi

set +e
if [[ -n "${LEDGERUTIL_BIN}" ]]; then
  "${LEDGERUTIL_BIN}" identifytxs \
    "${EXPECTED_KEYS_JSON}" \
    "${PEER_FS_COPY}" \
    -o "${IDENTIFY_DIR}" \
    > "${LEDGERUTIL_LOG}" 2>&1
else
  docker run --rm \
    -v "${OUTPUT_DIR}:/artifacts" \
    "${FABRIC_TOOLS_IMAGE}" \
    ledgerutil identifytxs \
      /artifacts/expected-keys.json \
      /artifacts/blockstore/production \
      -o /artifacts/identifytxs \
    > "${LEDGERUTIL_LOG}" 2>&1
fi
LEDGERUTIL_RC=$?
set -e

python3 - \
  "${SUMMARY_JSON}" "${SUMMARY_ENV}" "${EXPECTED_KEYS_JSON}" "${IDENTIFY_DIR}" "${LEDGERUTIL_LOG}" "${LEDGERUTIL_RC}" "${RUN_ID}" "${CHANNEL}" "${CHAINCODE}" <<'PY'
import json
import os
import sys
from pathlib import Path

summary_path = Path(sys.argv[1])
env_path = Path(sys.argv[2])
keys_path = Path(sys.argv[3])
identify_dir = Path(sys.argv[4])
ledgerutil_log = Path(sys.argv[5])
ledgerutil_rc = int(sys.argv[6])
run_id, channel, chaincode = sys.argv[7], sys.argv[8], sys.argv[9]
keys_payload = json.loads(keys_path.read_text())
expected = int(keys_payload.get("metadata", {}).get("expected") or len(keys_payload.get("diffRecords", [])))
key_source = keys_payload.get("metadata", {}).get("keySource", "unknown")

status_counts = {}
records_seen = 0
records_missing = 0
records_with_tx = 0
tx_count = 0
files = []
parse_errors = []

def status_value(tx):
    for key in ("txValidationStatus", "validationCode", "validationStatus", "status"):
        if isinstance(tx, dict) and key in tx:
            return str(tx[key])
    return "<unknown>"

def visit(obj):
    global records_seen, records_missing, records_with_tx, tx_count
    if isinstance(obj, dict):
        if isinstance(obj.get("txs"), list):
            records_seen += 1
            txs = obj.get("txs") or []
            if not txs:
                records_missing += 1
            else:
                records_with_tx += 1
            for tx in txs:
                tx_count += 1
                status = status_value(tx)
                status_counts[status] = status_counts.get(status, 0) + 1
            return
        for value in obj.values():
            visit(value)
    elif isinstance(obj, list):
        for item in obj:
            visit(item)

if identify_dir.exists():
    for path in sorted(identify_dir.rglob("*.json")):
        files.append(str(path))
        try:
            visit(json.loads(path.read_text(errors="replace")))
        except Exception as exc:
            parse_errors.append({"file": str(path), "error": str(exc)})

valid_count = status_counts.get("VALID", 0) + status_counts.get("0", 0)
invalid_count = max(tx_count - valid_count, 0)
if ledgerutil_rc != 0:
    classification = "ledgerutil_failed"
elif records_seen and records_missing == 0 and invalid_count == 0 and records_with_tx >= expected:
    classification = "ledger_all_expected_valid"
elif invalid_count > 0:
    classification = "ledger_invalid_transactions"
elif records_missing > 0:
    classification = "ledger_missing_expected_keys"
else:
    classification = "ledger_validity_inconclusive"

result = {
    "generatedAt": __import__("datetime").datetime.utcnow().replace(microsecond=0).isoformat() + "Z",
    "runId": run_id,
    "channel": channel,
    "chaincode": chaincode,
    "expected": expected,
    "keySource": key_source,
    "ledgerutilRc": ledgerutil_rc,
    "ledgerutilLog": str(ledgerutil_log),
    "identifyDir": str(identify_dir),
    "txlistFiles": files,
    "parseErrors": parse_errors,
    "recordsSeen": records_seen,
    "recordsWithTx": records_with_tx,
    "recordsMissing": records_missing,
    "txCount": tx_count,
    "validationStatusCounts": status_counts,
    "validCount": valid_count,
    "invalidCount": invalid_count,
    "classification": classification,
}
summary_path.write_text(json.dumps(result, indent=2) + "\n")
with env_path.open("w") as f:
    f.write(f"LEDGER_VALIDITY_STATUS={classification}\n")
    f.write(f"LEDGERUTIL_RC={ledgerutil_rc}\n")
    f.write(f"LEDGER_VALIDITY_EXPECTED={expected}\n")
    f.write(f"LEDGER_VALIDITY_RECORDS_WITH_TX={records_with_tx}\n")
    f.write(f"LEDGER_VALIDITY_RECORDS_MISSING={records_missing}\n")
    f.write(f"LEDGER_VALIDITY_VALID_COUNT={valid_count}\n")
    f.write(f"LEDGER_VALIDITY_INVALID_COUNT={invalid_count}\n")
    f.write(f"LEDGER_VALIDITY_SUMMARY={summary_path}\n")
print(json.dumps(result, indent=2))
PY

cat "${SUMMARY_JSON}"
if [[ "${KEEP_LEDGER_BLOCKSTORE_COPY}" != "true" ]]; then
  rm -rf "${BLOCKSTORE_DIR}"
  {
    echo "removed_at=$(date -Is)"
    echo "reason=avoid-large-return-bundle"
    echo "set KEEP_LEDGER_BLOCKSTORE_COPY=true or pass --keep-blockstore-copy to retain"
  } > "${OUTPUT_DIR}/blockstore-removed.txt"
fi
if (( LEDGERUTIL_RC != 0 )); then
  exit "${LEDGERUTIL_RC}"
fi
