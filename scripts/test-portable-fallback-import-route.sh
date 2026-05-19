#!/usr/bin/env bash
# Self-test the portable OMX_WRITE200_OUT fallback import route.
# This does not run benchmarks and never calls Codex update_goal.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT_DIR}"

SLUG="${PERFORMANCE_GOAL_SLUG:-chaincode-hotpath-write200}"
OUT_DIR=""

usage() {
  cat <<'USAGE'
Usage:
  scripts/test-portable-fallback-import-route.sh [--out-dir <dir>] [--slug <slug>]

Builds a minimal OMX_WRITE200_OUT_*.tar.gz fallback archive containing a
synthetic operator-status.env and verifies import-latest classifies it as a
DIAGNOSTIC dry run. It writes only local evidence and never imports/checkpoints.
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
  OUT_DIR=".omx/evidence/blockchain/${SLUG}/portable-fallback-import-route-selftest-${TS}"
fi
mkdir -p "${OUT_DIR}"
STATUS_ENV="${OUT_DIR}/status.env"
PAYLOAD_DIR="${OUT_DIR}/payload/OMX_WRITE200_OUT"
BUNDLE="${OUT_DIR}/OMX_WRITE200_OUT_selftest.tar.gz"
RENAMED_DIR="${OUT_DIR}/renamed"
RENAMED_BUNDLE="${RENAMED_DIR}/renamed-fallback.tar.gz"
DRY_RUN_LOG="${OUT_DIR}/import-latest-dry-run.log"
RENAMED_DRY_RUN_LOG="${OUT_DIR}/import-latest-renamed-content-scan.log"
mkdir -p "${PAYLOAD_DIR}" "${RENAMED_DIR}"

cat > "${PAYLOAD_DIR}/operator-status.env" <<'STATUS'
STATUS=direct_official_wrapper_fallback
BASE=/tmp/OMX_WRITE200_OUT
HOST_READINESS_RC=not_recorded
SMOKE_RC=not_run
SMOKE_CLEANUP_RC=not_run
SWEEP_RC=not_run
OFFICIAL_RC=2
PACKAGE_RC=not_run
RETURN_BUNDLE=
RETURN_BUNDLE_SHA256=
DIAGNOSTIC_BUNDLE=
DIAGNOSTIC_BUNDLE_SHA256=
SWEEP_RESULTS_CSV=
CALIPER_WORKERS=4
CALIPER_WRITE_TARGET_TPS=400
CALIPER_WRITE_TX_NUMBER=10000
CALIPER_RECORD_AUTO_ID=true
ALLOW_UNDERPOWERED=false
BENCHMARK_CHANNEL_PROFILE=PassportBenchmarkChannel
BENCHMARK_CHANNEL_ORGS=1,2,3,4
BENCHMARK_CC_INSTALL_ORGS=1,2,3,4
OFFICIAL_WORKERS=4
OFFICIAL_TARGET_TPS=400
NOTE=self-contained fallback import route selftest fixture
STATUS

tar -czf "${BUNDLE}" -C "${OUT_DIR}/payload" OMX_WRITE200_OUT
cp "${BUNDLE}" "${RENAMED_BUNDLE}"

set +e
scripts/import-latest-offhost-write200-bundle.sh \
  --bundle "${BUNDLE}" \
  --dry-run \
  --max-depth 1 \
  --slug "${SLUG}" \
  > "${DRY_RUN_LOG}" 2>&1
DRY_RUN_RC=$?
set -e

selected_kind="$(grep -E '^SELECTED_KIND=' "${DRY_RUN_LOG}" | tail -1 | cut -d= -f2- || true)"
status="$(grep -E '^STATUS=' "${DRY_RUN_LOG}" | tail -1 | cut -d= -f2- || true)"
router_command="$(grep -E '^ROUTER_COMMAND=' "${DRY_RUN_LOG}" | tail -1 | cut -d= -f2- || true)"

set +e
OFFHOST_BUNDLE_CONTENT_SCAN=true scripts/import-latest-offhost-write200-bundle.sh \
  --search-root "${RENAMED_DIR}" \
  --dry-run \
  --max-depth 1 \
  --slug "${SLUG}" \
  > "${RENAMED_DRY_RUN_LOG}" 2>&1
RENAMED_DRY_RUN_RC=$?
set -e

renamed_selected_bundle="$(grep -E '^SELECTED_BUNDLE=' "${RENAMED_DRY_RUN_LOG}" | tail -1 | cut -d= -f2- || true)"
renamed_selected_kind="$(grep -E '^SELECTED_KIND=' "${RENAMED_DRY_RUN_LOG}" | tail -1 | cut -d= -f2- || true)"
renamed_status="$(grep -E '^STATUS=' "${RENAMED_DRY_RUN_LOG}" | tail -1 | cut -d= -f2- || true)"

SELFTEST_STATUS=pass
if [[ "${DRY_RUN_RC}" != "0" || "${status}" != "dry_run" || "${selected_kind}" != "diagnostic" ]]; then
  SELFTEST_STATUS=fail
fi
if [[ "${router_command}" != *"scripts/import-offhost-write200-bundle.sh"* ]]; then
  SELFTEST_STATUS=fail
fi
if [[ "${RENAMED_DRY_RUN_RC}" != "0" || "${renamed_status}" != "dry_run" || "${renamed_selected_kind}" != "diagnostic" || "${renamed_selected_bundle}" != "$(cd "$(dirname "${RENAMED_BUNDLE}")" && pwd)/$(basename "${RENAMED_BUNDLE}")" ]]; then
  SELFTEST_STATUS=fail
fi
for phrase in \
  "ALLOW_UNDERPOWERED=false" \
  "BENCHMARK_CHANNEL_PROFILE=PassportBenchmarkChannel" \
  "BENCHMARK_CHANNEL_ORGS=1,2,3,4" \
  "BENCHMARK_CC_INSTALL_ORGS=1,2,3,4"; do
  if ! grep -Fq "${phrase}" "${PAYLOAD_DIR}/operator-status.env"; then
    SELFTEST_STATUS=fail
  fi
done

{
  echo "PORTABLE_FALLBACK_IMPORT_ROUTE_STATUS=${SELFTEST_STATUS}"
  echo "OUT_DIR=${OUT_DIR}"
  echo "BUNDLE=${BUNDLE}"
  echo "RENAMED_BUNDLE=${RENAMED_BUNDLE}"
  echo "DRY_RUN_LOG=${DRY_RUN_LOG}"
  echo "DRY_RUN_RC=${DRY_RUN_RC}"
  echo "DRY_RUN_STATUS=${status}"
  echo "SELECTED_KIND=${selected_kind}"
  echo "ROUTER_COMMAND=${router_command}"
  echo "RENAMED_DRY_RUN_LOG=${RENAMED_DRY_RUN_LOG}"
  echo "RENAMED_DRY_RUN_RC=${RENAMED_DRY_RUN_RC}"
  echo "RENAMED_DRY_RUN_STATUS=${renamed_status}"
  echo "RENAMED_SELECTED_KIND=${renamed_selected_kind}"
  echo "RENAMED_SELECTED_BUNDLE=${renamed_selected_bundle}"
} > "${STATUS_ENV}"

cat "${STATUS_ENV}"
[[ "${SELFTEST_STATUS}" == "pass" ]]
