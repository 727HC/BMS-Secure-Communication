#!/usr/bin/env bash
# Regression-test return-bundle required operator context sidecars.
# This builds synthetic files only; it never runs benchmarks or mutates goal state.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT_DIR}"

SLUG="${PERFORMANCE_GOAL_SLUG:-chaincode-hotpath-write200}"
OUT_DIR=""

usage() {
  cat <<'USAGE'
Usage:
  scripts/test-offhost-return-bundle-required-context.sh [--out-dir <dir>] [--slug <slug>]

Builds a minimal official-return-bundle fixture and verifies that
scripts/create-offhost-write200-return-bundle.sh requires
operator-context/workload-sequence-selftest.log when operator context is supplied.

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
  OUT_DIR=".omx/evidence/blockchain/${SLUG}/return-bundle-required-context-selftest-${TS}"
fi
mkdir -p "${OUT_DIR}"
OUT_DIR="$(cd "${OUT_DIR}" && pwd)"
STATUS_ENV="${OUT_DIR}/status.env"
EVIDENCE_DIR="${OUT_DIR}/evidence/official-write200"
OPERATOR_BAD="${OUT_DIR}/operator-missing-workload"
OPERATOR_GOOD="${OUT_DIR}/operator-good"
BAD_OUT="${OUT_DIR}/bad-return"
GOOD_OUT="${OUT_DIR}/good-return"
mkdir -p "${EVIDENCE_DIR}/ledger-validity1" "${OPERATOR_BAD}" "${OPERATOR_GOOD}"

cat > "${EVIDENCE_DIR}/launch.env" <<'EOF2'
ALLOW_UNDERPOWERED=false
CALIPER_RECORD_AUTO_ID=true
CALIPER_WRITE_ROUND_LABEL=write-bmu-data
CALIPER_WRITE_WORKLOAD_MODULE=workloads/recordBMUData.js
CALIPER_WRITE_CONTRACT_FUNCTION=RecordBMUDataAutoID
EOF2
cat > "${EVIDENCE_DIR}/effective-config.env" <<'EOF2'
PHASE=official
CALIPER_WRITE_ROUND_LABEL=write-bmu-data
CALIPER_WRITE_WORKLOAD_MODULE=workloads/recordBMUData.js
CALIPER_WRITE_CONTRACT_FUNCTION=RecordBMUDataAutoID
EOF2
cat > "${EVIDENCE_DIR}/summary.env" <<'EOF2'
WRITE_KPI_BASIS=successful_commit
BENCHMARK_PROFILE=PassportBenchmarkChannel
BENCHMARK_CHANNEL_ORGS=1,2,3,4
BENCHMARK_CC_INSTALL_ORGS=1,2,3,4
REPEAT_RUN_COUNT=10
CALIPER_WRITE_TX_NUMBER=10000
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
cat > "${EVIDENCE_DIR}/final-status.env" <<EOF2
CLEAN_DIR=${EVIDENCE_DIR}/cleanup
EOF2
cat > "${EVIDENCE_DIR}/host-readiness.json" <<'EOF2'
{"status":"ready","ready":true,"allowUnderpowered":false,"dockerCpus":16,"dockerMemoryGiB":32}
EOF2
printf 'host ready\n' > "${EVIDENCE_DIR}/host-readiness.log"
printf 'static checks pass\n' > "${EVIDENCE_DIR}/static-checks.log"
printf 'peer heights equal\n' > "${EVIDENCE_DIR}/peer-heights.log"
printf 'docker stats\n' > "${EVIDENCE_DIR}/docker-stats-repeat-1.log"
printf 'iostat\n' > "${EVIDENCE_DIR}/iostat-repeat-1.log"
printf 'pidstat\n' > "${EVIDENCE_DIR}/pidstat-repeat-1.log"
printf 'OFFICIAL_WRITE200_VERIFIER_STATUS=pass\n' > "${EVIDENCE_DIR}/official-write-verify.env"
printf '{}\n' > "${EVIDENCE_DIR}/official-write-verify.json"
printf 'official verifier pass\n' > "${EVIDENCE_DIR}/official-write-verify.log"
printf 'UPDATE_PERFORMANCE_GOAL_RESULTS=true\n' > "${EVIDENCE_DIR}/performance-goal-write-result.env"

python3 - "${EVIDENCE_DIR}" <<'PY'
import csv
import json
import sys
from pathlib import Path

root = Path(sys.argv[1])
expected = 10000
repeat_count = 10
total = expected * repeat_count
(root / "summary.json").write_text(json.dumps({"status": "synthetic"}, indent=2) + "\n")
with (root / "repeat-results.csv").open("w", newline="") as f:
    writer = csv.DictWriter(f, fieldnames=["run", "expected", "succ", "fail", "reject", "successful_tps"])
    writer.writeheader()
    for run in range(1, repeat_count + 1):
        writer.writerow({"run": run, "expected": expected, "succ": expected, "fail": 0, "reject": 0, "successful_tps": 210})
txmap_repeat = {
    "basis": "caliper_sendRequests_txmap_callback",
    "parseErrors": 0,
    "allRunsSuccessVerified": True,
    "runs": [{"run": run, "lines": expected, "succ": expected, "fail": 0, "verifiedTrue": expected} for run in range(1, repeat_count + 1)],
}
(root / "txmap-repeat-summary.json").write_text(json.dumps(txmap_repeat, indent=2) + "\n")
(root / "ledger-reconciliation.json").write_text(json.dumps({
    "classification": "successful_commit",
    "expected": total,
    "txmap": {"lines": total, "successVerifiedCount": total, "errorCount": 0},
    "couchdb": [{"org": org, "count": total} for org in ["manufacturer", "evmanufacturer", "service", "regulator"]],
    "peerHeights": [{"peer": "peer0.manufacturer", "height": 42}, {"peer": "peer0.evmanufacturer", "height": 42}],
    "txmapRepeatSummary": txmap_repeat,
}, indent=2) + "\n")
(root / "peer-heights-1.json").write_text(json.dumps({"status": "equal"}, indent=2) + "\n")
(root / "ledger-validity1" / "summary.json").write_text(json.dumps({"status": "pass"}, indent=2) + "\n")
PY

cat > "${OPERATOR_BAD}/operator-status.env" <<EOF2
STATUS=return_bundle_ready
BASE=${OPERATOR_BAD}
WORKLOAD_SELFTEST_RC=0
WORKLOAD_SELFTEST_LOG=${OPERATOR_BAD}/workload-sequence-selftest.log
EOF2
cat > "${OPERATOR_BAD}/handoff-readiness.json" <<'EOF2'
{"status":"pass"}
EOF2
printf 'handoff readiness pass\n' > "${OPERATOR_BAD}/handoff-readiness.log"
cp "${EVIDENCE_DIR}/host-readiness.json" "${OPERATOR_BAD}/host-readiness.json"
cp "${EVIDENCE_DIR}/host-readiness.log" "${OPERATOR_BAD}/host-readiness.log"
cp -a "${OPERATOR_BAD}/." "${OPERATOR_GOOD}/"
printf 'caliper BMU workload sequence selftest passed\n' > "${OPERATOR_GOOD}/workload-sequence-selftest.log"

set +e
scripts/create-offhost-write200-return-bundle.sh \
  --evidence-dir "${EVIDENCE_DIR}" \
  --operator-dir "${OPERATOR_BAD}" \
  --out-dir "${BAD_OUT}" \
  > "${OUT_DIR}/bad.log" 2>&1
BAD_RC=$?
set -e

BAD_MISSING_OK=false
if [[ -f "${BAD_OUT}/required-file-check.json" ]] && grep -Fq "operator-context/workload-sequence-selftest.log" "${BAD_OUT}/required-file-check.json"; then
  BAD_MISSING_OK=true
fi

set +e
scripts/create-offhost-write200-return-bundle.sh \
  --evidence-dir "${EVIDENCE_DIR}" \
  --operator-dir "${OPERATOR_GOOD}" \
  --out-dir "${GOOD_OUT}" \
  > "${OUT_DIR}/good.log" 2>&1
GOOD_RC=$?
set -e

GOOD_BUNDLE="$(grep -E '^BUNDLE=' "${GOOD_OUT}/return-bundle-status.env" | tail -1 | cut -d= -f2- || true)"
GOOD_TAR_HAS_LOG=false
if [[ -n "${GOOD_BUNDLE}" && -f "${GOOD_BUNDLE}" ]] && tar -tzf "${GOOD_BUNDLE}" | grep -Fxq "operator-context/workload-sequence-selftest.log"; then
  GOOD_TAR_HAS_LOG=true
fi

SELFTEST_STATUS=pass
if [[ "${BAD_RC}" == "0" || "${BAD_MISSING_OK}" != "true" ]]; then
  SELFTEST_STATUS=fail
fi
if [[ "${GOOD_RC}" != "0" || "${GOOD_TAR_HAS_LOG}" != "true" ]]; then
  SELFTEST_STATUS=fail
fi

{
  echo "RETURN_BUNDLE_REQUIRED_CONTEXT_SELFTEST_STATUS=${SELFTEST_STATUS}"
  echo "OUT_DIR=${OUT_DIR}"
  echo "BAD_RC=${BAD_RC}"
  echo "BAD_MISSING_OK=${BAD_MISSING_OK}"
  echo "GOOD_RC=${GOOD_RC}"
  echo "GOOD_BUNDLE=${GOOD_BUNDLE}"
  echo "GOOD_TAR_HAS_WORKLOAD_SELFTEST_LOG=${GOOD_TAR_HAS_LOG}"
} > "${STATUS_ENV}"

cat "${STATUS_ENV}"
[[ "${SELFTEST_STATUS}" == "pass" ]]
