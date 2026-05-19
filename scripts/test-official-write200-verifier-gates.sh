#!/usr/bin/env bash
# Regression-test official write200 evidence verifier hard gates.
# This builds synthetic evidence only; it never runs benchmarks or mutates goal state.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT_DIR}"

SLUG="${PERFORMANCE_GOAL_SLUG:-chaincode-hotpath-write200}"
OUT_DIR=""

usage() {
  cat <<'USAGE'
Usage:
  scripts/test-official-write200-verifier-gates.sh [--out-dir <dir>] [--slug <slug>]

Creates minimal synthetic official write200 evidence and verifies that
scripts/verify-official-write200-evidence.sh:
  - passes only when BMU AutoID workload identity, host readiness, txmap, and
    ledger reconciliation are all present and consistent;
  - fails when workload identity, host readiness, or ledger/txmap proof is
    degraded.

No Fabric network, Docker benchmark, OMX checkpoint, or Codex goal mutation is
performed.
USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --out-dir) OUT_DIR="${2:-}"; shift 2 ;;
    --slug) SLUG="${2:-}"; shift 2 ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown argument: $1" >&2; usage >&2; exit 2 ;;
  esac
done

TS="$(date +%Y%m%dT%H%M%S%Z)"
if [[ -z "${OUT_DIR}" ]]; then
  OUT_DIR=".omx/evidence/blockchain/${SLUG}/official-write200-verifier-gates-selftest-${TS}"
fi
mkdir -p "${OUT_DIR}"
OUT_DIR="$(cd "${OUT_DIR}" && pwd)"
STATUS_ENV="${OUT_DIR}/status.env"
EXPECTED=10000
REPEAT_COUNT=10
TOTAL_EXPECTED=$(( EXPECTED * REPEAT_COUNT ))

create_fixture() {
  local dir=$1
  mkdir -p "${dir}/cleanup"
  cat > "${dir}/launch.env" <<EOF2
ALLOW_UNDERPOWERED=false
CALIPER_RECORD_AUTO_ID=true
CALIPER_EXEC_MODE=docker
CALIPER_ENDPOINT_MODE=docker
CALIPER_DOCKER_NETWORK=passport_net
COLLECT_HOST_RESOURCE_STATS=true
CALIPER_WRITE_ROUND_LABEL=write-bmu-data
CALIPER_WRITE_WORKLOAD_MODULE=workloads/recordBMUData.js
CALIPER_WRITE_CONTRACT_FUNCTION=RecordBMUDataAutoID
EOF2
  cat > "${dir}/effective-config.env" <<EOF2
PHASE=official
CALIPER_WRITE_ROUND_LABEL=write-bmu-data
CALIPER_WRITE_WORKLOAD_MODULE=workloads/recordBMUData.js
CALIPER_WRITE_CONTRACT_FUNCTION=RecordBMUDataAutoID
EOF2
  cat > "${dir}/summary.env" <<EOF2
WRITE_KPI_BASIS=successful_commit
BENCHMARK_PROFILE=PassportBenchmarkChannel
BENCHMARK_CHANNEL_ORGS=1,2,3,4
BENCHMARK_CC_INSTALL_ORGS=1,2,3,4
REPEAT_RUN_COUNT=${REPEAT_COUNT}
CALIPER_WRITE_TX_NUMBER=${EXPECTED}
WRITE200_MIN_TPS=205.0
WRITE200_P10_TPS=205.0
WRITE200_P50_TPS=215.0
ALL_RUNS_SUCC_EXPECTED=true
ALL_RUNS_FAIL_ZERO=true
ALL_RUNS_REJECT_ZERO=true
CALIPER_WRITE_ROUND_LABEL=write-bmu-data
CALIPER_WRITE_WORKLOAD_MODULE=workloads/recordBMUData.js
CALIPER_WRITE_CONTRACT_FUNCTION=RecordBMUDataAutoID
EOF2
  cat > "${dir}/final-status.env" <<EOF2
CLEAN_DIR=${dir}/cleanup
EOF2
  python3 - "${dir}" "${EXPECTED}" "${REPEAT_COUNT}" "${TOTAL_EXPECTED}" <<'PY'
import csv
import json
import sys
from pathlib import Path

root = Path(sys.argv[1])
expected = int(sys.argv[2])
repeat_count = int(sys.argv[3])
total_expected = int(sys.argv[4])
(root / "host-readiness.json").write_text(json.dumps({
    "status": "ready",
    "ready": True,
    "allowUnderpowered": False,
    "dockerCpus": 16,
    "dockerMemoryGiB": 32,
    "minDockerCpus": 12,
    "minDockerMemoryGiB": 24,
}, indent=2) + "\n")
(root / "summary.json").write_text(json.dumps({"status": "synthetic"}, indent=2) + "\n")
with (root / "repeat-results.csv").open("w", newline="") as f:
    writer = csv.DictWriter(f, fieldnames=["run", "expected", "succ", "fail", "reject", "successful_tps"])
    writer.writeheader()
    for run in range(1, repeat_count + 1):
        writer.writerow({
            "run": run,
            "expected": expected,
            "succ": expected,
            "fail": 0,
            "reject": 0,
            "successful_tps": 210 + run,
        })
runs = [
    {
        "run": run,
        "lines": expected,
        "succ": expected,
        "fail": 0,
        "verifiedTrue": expected,
    }
    for run in range(1, repeat_count + 1)
]
txmap_repeat = {
    "basis": "caliper_sendRequests_txmap_callback",
    "runs": runs,
    "parseErrors": 0,
    "allRunsSuccessVerified": True,
}
(root / "txmap-repeat-summary.json").write_text(json.dumps(txmap_repeat, indent=2) + "\n")
(root / "ledger-reconciliation.json").write_text(json.dumps({
    "classification": "successful_commit",
    "expected": total_expected,
    "txmap": {
        "lines": total_expected,
        "successVerifiedCount": total_expected,
        "errorCount": 0,
    },
    "couchdb": [
        {"org": "manufacturer", "count": total_expected},
        {"org": "evmanufacturer", "count": total_expected},
        {"org": "service", "count": total_expected},
        {"org": "regulator", "count": total_expected},
    ],
    "peerHeights": [
        {"peer": "peer0.manufacturer", "height": 42},
        {"peer": "peer0.evmanufacturer", "height": 42},
    ],
    "txmapRepeatSummary": txmap_repeat,
}, indent=2) + "\n")
(root / "cleanup" / "orderer-channels.after.json").write_text(json.dumps({
    "channels": [{"name": "passportchannel"}]
}, indent=2) + "\n")
PY
}

copy_fixture() {
  local src=$1
  local dst=$2
  mkdir -p "${dst}"
  cp -a "${src}/." "${dst}/"
}

run_case() {
  local name=$1
  local dir=$2
  local expected_rc=$3
  local expected_phrase=$4
  local json="${OUT_DIR}/${name}.json"
  local env="${OUT_DIR}/${name}.env"
  local log="${OUT_DIR}/${name}.log"
  set +e
  scripts/verify-official-write200-evidence.sh \
    --evidence-dir "${dir}" \
    --output "${json}" \
    --env-output "${env}" \
    > "${log}" 2>&1
  local rc=$?
  set -e
  printf '%s\n' "${rc}" > "${OUT_DIR}/${name}.rc"
  if [[ "${rc}" != "${expected_rc}" ]]; then
    echo "case ${name}: expected rc ${expected_rc}, got ${rc}" >&2
    return 1
  fi
  if [[ -n "${expected_phrase}" ]] && ! grep -Fq "${expected_phrase}" "${json}" "${env}" "${log}"; then
    echo "case ${name}: missing expected phrase: ${expected_phrase}" >&2
    return 1
  fi
}

GOOD="${OUT_DIR}/good"
BAD_WORKLOAD="${OUT_DIR}/bad-workload"
BAD_LEDGER="${OUT_DIR}/bad-ledger"
BAD_HOST="${OUT_DIR}/bad-host"

create_fixture "${GOOD}"
copy_fixture "${GOOD}" "${BAD_WORKLOAD}"
copy_fixture "${GOOD}" "${BAD_LEDGER}"
copy_fixture "${GOOD}" "${BAD_HOST}"

python3 - "${BAD_WORKLOAD}" "${BAD_LEDGER}" "${BAD_HOST}" <<'PY'
import json
import sys
from pathlib import Path

bad_workload = Path(sys.argv[1])
bad_ledger = Path(sys.argv[2])
bad_host = Path(sys.argv[3])

for rel in ["launch.env", "effective-config.env", "summary.env"]:
    p = bad_workload / rel
    text = p.read_text()
    text = text.replace("CALIPER_WRITE_CONTRACT_FUNCTION=RecordBMUDataAutoID", "CALIPER_WRITE_CONTRACT_FUNCTION=RecordBMUData")
    p.write_text(text)

ledger_path = bad_ledger / "ledger-reconciliation.json"
ledger = json.loads(ledger_path.read_text())
ledger["txmap"]["successVerifiedCount"] = ledger["expected"] - 1
ledger["txmapRepeatSummary"]["allRunsSuccessVerified"] = False
ledger["txmapRepeatSummary"]["runs"][0]["verifiedTrue"] = ledger["expected"] - 1
ledger_path.write_text(json.dumps(ledger, indent=2) + "\n")

host_path = bad_host / "host-readiness.json"
host = json.loads(host_path.read_text())
host["allowUnderpowered"] = True
host_path.write_text(json.dumps(host, indent=2) + "\n")
launch_path = bad_host / "launch.env"
launch_path.write_text(launch_path.read_text().replace("ALLOW_UNDERPOWERED=false", "ALLOW_UNDERPOWERED=true"))
PY

run_case good "${GOOD}" 0 "OFFICIAL_WRITE_LEDGER_RECONCILIATION_MATCH=true"
run_case bad-workload "${BAD_WORKLOAD}" 1 "CALIPER_WRITE_CONTRACT_FUNCTION must be RecordBMUDataAutoID"
run_case bad-ledger "${BAD_LEDGER}" 1 "ledger world-state reconciliation must match expected successful commits"
run_case bad-host "${BAD_HOST}" 1 "ALLOW_UNDERPOWERED must be false for official PASS"

{
  echo "OFFICIAL_WRITE200_VERIFIER_GATES_SELFTEST_STATUS=pass"
  echo "OUT_DIR=${OUT_DIR}"
  echo "GOOD_EVIDENCE=${GOOD}"
  echo "BAD_WORKLOAD_EVIDENCE=${BAD_WORKLOAD}"
  echo "BAD_LEDGER_EVIDENCE=${BAD_LEDGER}"
  echo "BAD_HOST_EVIDENCE=${BAD_HOST}"
} > "${STATUS_ENV}"

cat "${STATUS_ENV}"
