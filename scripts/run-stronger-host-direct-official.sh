#!/usr/bin/env bash
# Stronger-host direct official write200 runner.
# Purpose: make the current blocked action copy/paste-proof and always leave a
# portable ~/OMX_WRITE200_OUT_*.tar.gz fallback, even when the operator exits
# non-zero. This script never touches live passportchannel directly and never
# calls Codex update_goal.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT_DIR}"

usage() {
  cat <<'USAGE'
Usage:
  scripts/run-stronger-host-direct-official.sh

Run this on the stronger host after extracting the handoff tarball over an
existing checkout. It runs the direct official 10-repeat operator attempt with
no smoke/sweep flags and always creates a portable fallback archive:
  ~/OMX_WRITE200_OUT_*.tar.gz

Bring back, in priority order:
  1. offhost-write200-return-*.tar.gz
  2. offhost-write200-operator-diagnostics-*.tar.gz
  3. OMX_WRITE200_OUT_*.tar.gz
USAGE
}

if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
  usage
  exit 0
fi
if [[ $# -gt 0 ]]; then
  echo "This direct runner accepts no smoke/sweep arguments." >&2
  usage >&2
  exit 2
fi

export CALIPER_EXEC_MODE="${CALIPER_EXEC_MODE:-docker}"
export CALIPER_ENDPOINT_MODE="${CALIPER_ENDPOINT_MODE:-docker}"
export CALIPER_DOCKER_NETWORK="${CALIPER_DOCKER_NETWORK:-passport_net}"
export CALIPER_VERIFY_PREPARED_EACH_REPEAT="${CALIPER_VERIFY_PREPARED_EACH_REPEAT:-false}"
export CALIPER_FABRIC_TIMEOUT_INVOKEORQUERY="${CALIPER_FABRIC_TIMEOUT_INVOKEORQUERY:-180}"
export CALIPER_OBSERVER_INTERNAL_INTERVAL="${CALIPER_OBSERVER_INTERNAL_INTERVAL:-10000}"
export COLLECT_HOST_RESOURCE_STATS="${COLLECT_HOST_RESOURCE_STATS:-true}"
export ALLOW_UNDERPOWERED=false
export BENCHMARK_CHANNEL_PROFILE=PassportBenchmarkChannel
export BENCHMARK_CHANNEL_ORGS=1,2,3,4
export BENCHMARK_CC_INSTALL_ORGS=1,2,3,4
# Evidence-aligned official shape:
# - Local PASS-adjacent singles above 200 TPS used the run-bench defaults
#   (4 workers) with 400 target TPS.
# - 60/240 was a later host-throughput hypothesis, not the current best
#   official-shape candidate, and it can underdrive the write200 gate.
export CALIPER_WORKERS="${CALIPER_WORKERS:-4}"
export CALIPER_WRITE_TARGET_TPS="${CALIPER_WRITE_TARGET_TPS:-400}"
export CALIPER_WRITE_TX_NUMBER="${CALIPER_WRITE_TX_NUMBER:-10000}"
export CALIPER_RECORD_AUTO_ID="${CALIPER_RECORD_AUTO_ID:-true}"
export SMOKE_WORKERS="${SMOKE_WORKERS:-${CALIPER_WORKERS}}"
export SMOKE_TARGET_TPS="${SMOKE_TARGET_TPS:-${CALIPER_WRITE_TARGET_TPS}}"
export OFFICIAL_WORKERS="${OFFICIAL_WORKERS:-${CALIPER_WORKERS}}"
export OFFICIAL_TARGET_TPS="${OFFICIAL_TARGET_TPS:-${CALIPER_WRITE_TARGET_TPS}}"
export FINAL_OUT_DIR="${FINAL_OUT_DIR:-${HOME}/OMX_WRITE200_OUT}"
export FINAL_OUT_SEARCH_ROOTS="${FINAL_OUT_SEARCH_ROOTS:-${ROOT_DIR} ${HOME} /tmp}"

FINAL_OUT_DIR_ABS="$(mkdir -p "${FINAL_OUT_DIR}" && cd "${FINAL_OUT_DIR}" && pwd)"
RUN_MARKER="${FINAL_OUT_DIR_ABS}/run-start.marker"
WRAPPER_STATUS="${FINAL_OUT_DIR_ABS}/direct-official-wrapper-status.env"
OPERATOR_LOG="${FINAL_OUT_DIR_ABS}/offhost-direct-official.log"
FOUND_BUNDLES="${FINAL_OUT_DIR_ABS}/found-bundles.txt"
FOUND_STATUS_FILES="${FINAL_OUT_DIR_ABS}/found-status-files.txt"
VERIFIER_SELFTEST_DIR="${FINAL_OUT_DIR_ABS}/verifier-gates-selftest"
VERIFIER_SELFTEST_LOG="${FINAL_OUT_DIR_ABS}/verifier-gates-selftest.log"
VERIFIER_SELFTEST_RC="not_run"
WORKLOAD_SELFTEST_LOG="${FINAL_OUT_DIR_ABS}/workload-sequence-selftest.log"
WORKLOAD_SELFTEST_RC="not_run"
FALLBACK_BUNDLE=""
FINISHED=false
: > "${RUN_MARKER}"

write_finished_wrapper_status() {
  local operator_rc=$1
  local fallback_tar_rc=$2
  local bundle_sha=$3
  local note=${4:-}
  cat > "${WRAPPER_STATUS}" <<STATUS
STATUS=finished
OPERATOR_RC=${operator_rc}
FALLBACK_TAR_RC=${fallback_tar_rc}
FINAL_OUT_DIR=${FINAL_OUT_DIR_ABS}
RUN_MARKER=${RUN_MARKER}
OPERATOR_LOG=${OPERATOR_LOG}
FOUND_BUNDLES=${FOUND_BUNDLES}
FOUND_STATUS_FILES=${FOUND_STATUS_FILES}
VERIFIER_SELFTEST_DIR=${VERIFIER_SELFTEST_DIR}
VERIFIER_SELFTEST_LOG=${VERIFIER_SELFTEST_LOG}
VERIFIER_SELFTEST_RC=${VERIFIER_SELFTEST_RC}
WORKLOAD_SELFTEST_LOG=${WORKLOAD_SELFTEST_LOG}
WORKLOAD_SELFTEST_RC=${WORKLOAD_SELFTEST_RC}
OMX_WRITE200_OUT_BUNDLE=${FALLBACK_BUNDLE}
OMX_WRITE200_OUT_BUNDLE_SHA256=${bundle_sha}
CALIPER_WORKERS=${CALIPER_WORKERS}
CALIPER_WRITE_TARGET_TPS=${CALIPER_WRITE_TARGET_TPS}
CALIPER_WRITE_TX_NUMBER=${CALIPER_WRITE_TX_NUMBER}
CALIPER_RECORD_AUTO_ID=${CALIPER_RECORD_AUTO_ID}
CALIPER_WRITE_ROUND_LABEL=write-bmu-data
CALIPER_WRITE_WORKLOAD_MODULE=workloads/recordBMUData.js
CALIPER_WRITE_CONTRACT_FUNCTION=RecordBMUDataAutoID
ALLOW_UNDERPOWERED=${ALLOW_UNDERPOWERED}
BENCHMARK_CHANNEL_PROFILE=${BENCHMARK_CHANNEL_PROFILE}
BENCHMARK_CHANNEL_ORGS=${BENCHMARK_CHANNEL_ORGS}
BENCHMARK_CC_INSTALL_ORGS=${BENCHMARK_CC_INSTALL_ORGS}
OFFICIAL_WORKERS=${OFFICIAL_WORKERS}
OFFICIAL_TARGET_TPS=${OFFICIAL_TARGET_TPS}
NOTE=${note}
STATUS
}

write_portable_operator_status() {
  local operator_rc=$1
  local fallback_status="${FINAL_OUT_DIR_ABS}/operator-status.env"
  if [[ -f "${fallback_status}" ]]; then
    return 0
  fi
  # Importers classify OMX_WRITE200_OUT_*.tar.gz as diagnostic evidence by
  # `operator-status.env`. If the operator exits before creating its own status
  # file, this synthetic blocked status keeps the portable fallback importable
  # instead of being silently ignored as an unknown archive.
  cat > "${fallback_status}" <<STATUS
STATUS=direct_official_wrapper_fallback
BASE=${FINAL_OUT_DIR_ABS}
HOST_READINESS_RC=not_recorded
SMOKE_RC=not_run
SMOKE_CLEANUP_RC=not_run
SWEEP_RC=not_run
OFFICIAL_RC=${operator_rc}
PACKAGE_RC=not_run
RETURN_BUNDLE=
RETURN_BUNDLE_SHA256=
DIAGNOSTIC_BUNDLE=
DIAGNOSTIC_BUNDLE_SHA256=
SWEEP_RESULTS_CSV=
VERIFIER_SELFTEST_DIR=${VERIFIER_SELFTEST_DIR}
VERIFIER_SELFTEST_LOG=${VERIFIER_SELFTEST_LOG}
VERIFIER_SELFTEST_RC=${VERIFIER_SELFTEST_RC}
WORKLOAD_SELFTEST_LOG=${WORKLOAD_SELFTEST_LOG}
WORKLOAD_SELFTEST_RC=${WORKLOAD_SELFTEST_RC}
CALIPER_WORKERS=${CALIPER_WORKERS}
CALIPER_WRITE_TARGET_TPS=${CALIPER_WRITE_TARGET_TPS}
CALIPER_WRITE_TX_NUMBER=${CALIPER_WRITE_TX_NUMBER}
CALIPER_RECORD_AUTO_ID=${CALIPER_RECORD_AUTO_ID}
CALIPER_WRITE_ROUND_LABEL=write-bmu-data
CALIPER_WRITE_WORKLOAD_MODULE=workloads/recordBMUData.js
CALIPER_WRITE_CONTRACT_FUNCTION=RecordBMUDataAutoID
ALLOW_UNDERPOWERED=${ALLOW_UNDERPOWERED}
BENCHMARK_CHANNEL_PROFILE=${BENCHMARK_CHANNEL_PROFILE}
BENCHMARK_CHANNEL_ORGS=${BENCHMARK_CHANNEL_ORGS}
BENCHMARK_CC_INSTALL_ORGS=${BENCHMARK_CC_INSTALL_ORGS}
OFFICIAL_WORKERS=${OFFICIAL_WORKERS}
OFFICIAL_TARGET_TPS=${OFFICIAL_TARGET_TPS}
NOTE=synthetic operator-status.env written by run-stronger-host-direct-official.sh so OMX_WRITE200_OUT fallback archives remain importable diagnostic evidence
STATUS
}

finish_wrapper() {
  local rc="$1"
  if [[ "${FINISHED}" == "true" ]]; then
    return 0
  fi
  FINISHED=true
  set +e
  mkdir -p "${FINAL_OUT_DIR_ABS}"
  printf '%s\n' "${rc}" > "${FINAL_OUT_DIR_ABS}/operator.rc"

  : > "${FOUND_BUNDLES}"
  : > "${FOUND_STATUS_FILES}"
  while IFS= read -r root; do
    [[ -d "${root}" ]] || continue
    find "${root}" -maxdepth 8 -type f -newer "${RUN_MARKER}" \
      ! -path "${ROOT_DIR}/.omx/evidence/blockchain/full-rerun-audit-*" \
      \( -name 'offhost-write200-return-*.tar.gz' -o -name 'offhost-write200-operator-diagnostics-*.tar.gz' \) \
      -print >> "${FOUND_BUNDLES}" 2>/dev/null || true
    find "${root}" -maxdepth 8 -type f -newer "${RUN_MARKER}" \
      ! -path "${ROOT_DIR}/.omx/evidence/blockchain/full-rerun-audit-*" \
      \( -name 'operator-status.env' -o -name 'operator-final-status.env' -o -name 'summary.env' -o -name 'official-write-verify.env' \) \
      -print >> "${FOUND_STATUS_FILES}" 2>/dev/null || true
  done < <(printf '%s\n' ${FINAL_OUT_SEARCH_ROOTS})

  sort -u -o "${FOUND_BUNDLES}" "${FOUND_BUNDLES}"
  sort -u -o "${FOUND_STATUS_FILES}" "${FOUND_STATUS_FILES}"

  while IFS= read -r path; do
    [[ -f "${path}" ]] && cp -f "${path}" "${FINAL_OUT_DIR_ABS}/" 2>/dev/null || true
  done < "${FOUND_BUNDLES}"
  while IFS= read -r path; do
    [[ -f "${path}" ]] && cp -f "${path}" "${FINAL_OUT_DIR_ABS}/" 2>/dev/null || true
  done < "${FOUND_STATUS_FILES}"

  local out_name
  out_name="$(basename "${FINAL_OUT_DIR_ABS}")_$(date -u +%Y%m%dT%H%M%SZ).tar.gz"
  FALLBACK_BUNDLE="${HOME}/${out_name}"
  # Write a final-status snapshot before archiving so the portable fallback is
  # self-contained. The adjacent status file is rewritten below with the final
  # archive return code and sha256 after tar creation.
  write_finished_wrapper_status \
    "${rc}" \
    "external_status_file_after_archive_creation" \
    "external_status_file_after_archive_creation" \
    "This in-archive status snapshot is written before fallback archive hashing; use the adjacent external direct-official-wrapper-status.env for final FALLBACK_TAR_RC and OMX_WRITE200_OUT_BUNDLE_SHA256."
  write_portable_operator_status "${rc}"
  tar -czf "${FALLBACK_BUNDLE}" -C "$(dirname "${FINAL_OUT_DIR_ABS}")" "$(basename "${FINAL_OUT_DIR_ABS}")" 2>/dev/null
  local tar_rc=$?
  local bundle_sha=""
  if [[ ${tar_rc} -eq 0 && -f "${FALLBACK_BUNDLE}" ]]; then
    bundle_sha="$(sha256sum "${FALLBACK_BUNDLE}" | awk '{print $1}')"
  fi

  write_finished_wrapper_status \
    "${rc}" \
    "${tar_rc}" \
    "${bundle_sha}" \
    "This external status file was rewritten after fallback archive creation and carries the final archive return code and sha256."

  echo ""
  echo "[direct-official-wrapper] operator rc: ${rc}"
  echo "[direct-official-wrapper] final output dir: ${FINAL_OUT_DIR_ABS}"
  echo "[direct-official-wrapper] fallback archive: ${FALLBACK_BUNDLE}"
  [[ -n "${bundle_sha}" ]] && echo "[direct-official-wrapper] fallback sha256: ${bundle_sha}"
  echo "[direct-official-wrapper] bring back RETURN_BUNDLE, DIAGNOSTIC_BUNDLE, or this fallback archive."
  set -e
}

on_exit() {
  local rc=$?
  finish_wrapper "${rc}"
  exit "${rc}"
}
trap on_exit EXIT
trap 'finish_wrapper 130; exit 130' INT
trap 'finish_wrapper 143; exit 143' TERM
trap 'finish_wrapper 129; exit 129' HUP

if [[ "${CALIPER_RECORD_AUTO_ID,,}" != "true" ]]; then
  echo "CALIPER_RECORD_AUTO_ID must be true for official chaincode hot-path evidence, got ${CALIPER_RECORD_AUTO_ID}" >&2
  exit 2
fi
if ! [[ "${CALIPER_WRITE_TX_NUMBER}" =~ ^[0-9]+$ ]] || (( CALIPER_WRITE_TX_NUMBER < 10000 )); then
  echo "CALIPER_WRITE_TX_NUMBER must be >=10000 for official write200 evidence, got ${CALIPER_WRITE_TX_NUMBER}" >&2
  exit 2
fi

cat > "${WRAPPER_STATUS}" <<STATUS
STATUS=running
FINAL_OUT_DIR=${FINAL_OUT_DIR_ABS}
RUN_MARKER=${RUN_MARKER}
OPERATOR_LOG=${OPERATOR_LOG}
VERIFIER_SELFTEST_DIR=${VERIFIER_SELFTEST_DIR}
VERIFIER_SELFTEST_LOG=${VERIFIER_SELFTEST_LOG}
VERIFIER_SELFTEST_RC=${VERIFIER_SELFTEST_RC}
WORKLOAD_SELFTEST_LOG=${WORKLOAD_SELFTEST_LOG}
WORKLOAD_SELFTEST_RC=${WORKLOAD_SELFTEST_RC}
CALIPER_WORKERS=${CALIPER_WORKERS}
CALIPER_WRITE_TARGET_TPS=${CALIPER_WRITE_TARGET_TPS}
CALIPER_WRITE_TX_NUMBER=${CALIPER_WRITE_TX_NUMBER}
CALIPER_RECORD_AUTO_ID=${CALIPER_RECORD_AUTO_ID}
CALIPER_WRITE_ROUND_LABEL=write-bmu-data
CALIPER_WRITE_WORKLOAD_MODULE=workloads/recordBMUData.js
CALIPER_WRITE_CONTRACT_FUNCTION=RecordBMUDataAutoID
ALLOW_UNDERPOWERED=${ALLOW_UNDERPOWERED}
BENCHMARK_CHANNEL_PROFILE=${BENCHMARK_CHANNEL_PROFILE}
BENCHMARK_CHANNEL_ORGS=${BENCHMARK_CHANNEL_ORGS}
BENCHMARK_CC_INSTALL_ORGS=${BENCHMARK_CC_INSTALL_ORGS}
OFFICIAL_WORKERS=${OFFICIAL_WORKERS}
OFFICIAL_TARGET_TPS=${OFFICIAL_TARGET_TPS}
STATUS

echo "[direct-official-wrapper] starting direct official write200"
echo "[direct-official-wrapper] log: ${OPERATOR_LOG}"
echo "[direct-official-wrapper] final out: ${FINAL_OUT_DIR_ABS}"

if [[ -x "scripts/apply-offhost-write200-overlay.sh" ]]; then
  scripts/apply-offhost-write200-overlay.sh 2>&1 | tee "${FINAL_OUT_DIR_ABS}/apply-overlay.log"
fi

echo "[direct-official-wrapper] running Caliper BMU workload selftest"
set +e
node scripts/test-caliper-bmu-workload-sequence.js > "${WORKLOAD_SELFTEST_LOG}" 2>&1
WORKLOAD_SELFTEST_RC=$?
set -e
if [[ "${WORKLOAD_SELFTEST_RC}" != "0" ]]; then
  echo "[direct-official-wrapper] Caliper BMU workload selftest failed rc=${WORKLOAD_SELFTEST_RC}; refusing official write200 run" >&2
  exit "${WORKLOAD_SELFTEST_RC}"
fi
echo "[direct-official-wrapper] Caliper BMU workload selftest passed"

echo "[direct-official-wrapper] running verifier gate selftest"
set +e
scripts/test-official-write200-verifier-gates.sh \
  --out-dir "${VERIFIER_SELFTEST_DIR}" \
  > "${VERIFIER_SELFTEST_LOG}" 2>&1
VERIFIER_SELFTEST_RC=$?
set -e
if [[ "${VERIFIER_SELFTEST_RC}" != "0" ]]; then
  echo "[direct-official-wrapper] verifier gate selftest failed rc=${VERIFIER_SELFTEST_RC}; refusing official write200 run" >&2
  exit "${VERIFIER_SELFTEST_RC}"
fi
echo "[direct-official-wrapper] verifier gate selftest passed"

set +e
scripts/run-offhost-write200-operator.sh 2>&1 | tee "${OPERATOR_LOG}"
operator_rc=${PIPESTATUS[0]}
set -e
exit "${operator_rc}"
