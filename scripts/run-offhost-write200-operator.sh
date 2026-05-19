#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT_DIR}"

RUN_SMOKE=false
SMOKE_ONLY=false
RUN_SWEEP=false
SWEEP_ON_SMOKE_FAIL=false
RUN_OFFICIAL=true
PACKAGE_RETURN=true
PACKAGE_DIAGNOSTICS="${PACKAGE_DIAGNOSTICS:-true}"
PACKAGE_FINAL_OUT="${PACKAGE_FINAL_OUT:-true}"
FORCE_OFFICIAL_AFTER_SMOKE=false
SKIP_REASON=""
TS="${RUN_TS:-$(date +%Y%m%dT%H%M%S%Z)}"
BASE="${EVIDENCE_BASE:-.omx/evidence/blockchain/offhost-write200-operator-${TS}}"
FINAL_OUT_DIR="${FINAL_OUT_DIR:-${HOME}/OMX_WRITE200_OUT}"
# Search all common locations for return/diagnostic bundles when packaging the
# portable final output. This is evidence-recovery hardening only; it must not
# be treated as official PASS evidence.
FINAL_OUT_SEARCH_ROOTS="${FINAL_OUT_SEARCH_ROOTS:-${ROOT_DIR} ${HOME} /tmp}"
MIN_DOCKER_CPUS="${MIN_DOCKER_CPUS:-12}"
MIN_DOCKER_MEMORY_GIB="${MIN_DOCKER_MEMORY_GIB:-24}"
ALLOW_UNDERPOWERED="${ALLOW_UNDERPOWERED:-false}"
SWEEP_MATRIX="${SWEEP_MATRIX:-4:400 4:380 4:420 3:400 5:400}"
SWEEP_REPEAT_COUNT="${SWEEP_REPEAT_COUNT:-1}"
SMOKE_MIN_SUCCESSFUL_TPS="${SMOKE_MIN_SUCCESSFUL_TPS:-205}"
PRE_OFFICIAL_ON_MARGINAL_SMOKE="${PRE_OFFICIAL_ON_MARGINAL_SMOKE:-true}"
PRE_OFFICIAL_REPEAT_COUNT="${PRE_OFFICIAL_REPEAT_COUNT:-5}"
PRE_OFFICIAL_MIN_SUCCESSFUL_TPS="${PRE_OFFICIAL_MIN_SUCCESSFUL_TPS:-205}"
PRE_OFFICIAL_MARGIN_UPPER_TPS="${PRE_OFFICIAL_MARGIN_UPPER_TPS:-210}"
DEFAULT_WORKERS="${CALIPER_WORKERS:-4}"
DEFAULT_TARGET_TPS="${CALIPER_WRITE_TARGET_TPS:-400}"
SMOKE_WORKERS="${SMOKE_WORKERS:-${DEFAULT_WORKERS}}"
SMOKE_TARGET_TPS="${SMOKE_TARGET_TPS:-${DEFAULT_TARGET_TPS}}"
OFFICIAL_WORKERS="${OFFICIAL_WORKERS:-${CALIPER_WORKERS:-${SMOKE_WORKERS}}}"
OFFICIAL_TARGET_TPS="${OFFICIAL_TARGET_TPS:-${CALIPER_WRITE_TARGET_TPS:-${SMOKE_TARGET_TPS}}}"
CALIPER_RECORD_AUTO_ID="${CALIPER_RECORD_AUTO_ID:-true}"
CALIPER_EXEC_MODE="${CALIPER_EXEC_MODE:-docker}"
CALIPER_ENDPOINT_MODE="${CALIPER_ENDPOINT_MODE:-docker}"
CALIPER_DOCKER_NETWORK="${CALIPER_DOCKER_NETWORK:-passport_net}"
CALIPER_FABRIC_TIMEOUT_INVOKEORQUERY="${CALIPER_FABRIC_TIMEOUT_INVOKEORQUERY:-180}"
CALIPER_OBSERVER_INTERNAL_INTERVAL="${CALIPER_OBSERVER_INTERNAL_INTERVAL:-10000}"
COLLECT_HOST_RESOURCE_STATS="${COLLECT_HOST_RESOURCE_STATS:-true}"
STATUS_ENV=""
OPERATOR_START_MARKER=""

usage() {
  cat <<'USAGE'
Usage:
  scripts/run-offhost-write200-operator.sh [--smoke] [--smoke-only] [--no-package-return]
  scripts/run-offhost-write200-operator.sh --smoke --force-official-after-smoke
  scripts/run-offhost-write200-operator.sh --sweep-only
  scripts/run-offhost-write200-operator.sh --smoke --sweep-on-smoke-fail

Stronger-host operator helper for the official write200 handoff.

Actions:
  1. Runs scripts/validate-offhost-write200-handoff.sh.
  2. Checks Docker host readiness before any smoke/official write.
  3. Optionally runs a 3-repeat smoke on a disposable benchmark channel.
  4. Cleans disposable smoke channels before any official run.
  5. Stops before official if smoke fails or misses the smoke quality gate
     unless --force-official-after-smoke is set.
  6. Optionally runs a disposable rate/worker sweep after a smoke failure.
  7. If smoke only barely passes, runs a 5-repeat pre-official guard before
     the 10-repeat gate.
  8. Runs scripts/run-official-write200-audit.sh for the 10-repeat official gate.
  9. Packages the official evidence with scripts/create-offhost-write200-return-bundle.sh.
 10. If no official return bundle is produced, packages operator diagnostics
     for transfer back to the active worktree.

This script only uses disposable benchmark channels for writes. It never writes
to live passportchannel and never calls Codex update_goal.
USAGE
}

while [[ $# -gt 0 ]]; do
  # Be tolerant of arguments pasted from CRLF text on Windows/WSL. A trailing
  # carriage return otherwise turns e.g. `--sweep-on-smoke-fail` into an
  # unknown argument before any benchmark work can start.
  arg="${1%$'\r'}"
  case "${arg}" in
    --smoke)
      RUN_SMOKE=true
      shift
      ;;
    --smoke-only)
      RUN_SMOKE=true
      SMOKE_ONLY=true
      RUN_OFFICIAL=false
      shift
      ;;
    --sweep-only)
      RUN_SWEEP=true
      RUN_SMOKE=false
      RUN_OFFICIAL=false
      PACKAGE_RETURN=false
      shift
      ;;
    --sweep-on-smoke-fail)
      SWEEP_ON_SMOKE_FAIL=true
      shift
      ;;
    --no-official)
      RUN_OFFICIAL=false
      shift
      ;;
    --no-package-return)
      PACKAGE_RETURN=false
      shift
      ;;
    --no-package-diagnostics)
      PACKAGE_DIAGNOSTICS=false
      shift
      ;;
    --force-official-after-smoke)
      FORCE_OFFICIAL_AFTER_SMOKE=true
      shift
      ;;
    --base)
      BASE="${2:-}"
      BASE="${BASE%$'\r'}"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage >&2
      exit 2
      ;;
  esac
done

mkdir -p "${BASE}"
BASE="$(cd "${BASE}" && pwd)"
STATUS_ENV="${BASE}/operator-status.env"
OPERATOR_START_MARKER="${BASE}/operator-start.marker"
: > "${OPERATOR_START_MARKER}"
READINESS_JSON="${BASE}/handoff-readiness.json"
READINESS_LOG="${BASE}/handoff-readiness.log"
HANDOFF_READINESS_RC="not_run"
HOST_READINESS_JSON="${BASE}/host-readiness.json"
HOST_READINESS_RC="not_run"
WORKLOAD_SELFTEST_LOG="${BASE}/workload-sequence-selftest.log"
WORKLOAD_SELFTEST_RC="not_run"
SMOKE_ROOT="${BASE}/smoke-w${SMOKE_WORKERS}-t${SMOKE_TARGET_TPS}-3run"
SWEEP_ROOT="${BASE}/sweep"
OFFICIAL_ROOT="${BASE}/official-write200-w${OFFICIAL_WORKERS}-t${OFFICIAL_TARGET_TPS}-10run"
RETURN_STATUS=""
RETURN_BUNDLE=""
RETURN_BUNDLE_SHA256=""
DIAGNOSTIC_STATUS=""
DIAGNOSTIC_BUNDLE=""
DIAGNOSTIC_BUNDLE_SHA256=""
DIAGNOSTIC_RC="not_run"
FINAL_OUT_BUNDLE=""
FINAL_OUT_BUNDLE_SHA256=""
FINAL_OUT_RC="not_run"
FINAL_OUT_STATUS=""
SMOKE_RC="not_run"
SMOKE_GATE_RC="not_run"
SMOKE_GATE_JSON=""
SMOKE_CLEANUP_DIR=""
SMOKE_CLEANUP_RC="not_run"
SWEEP_RC="not_run"
SWEEP_RESULTS_CSV="${SWEEP_ROOT}/sweep-results.csv"
SWEEP_RECOMMENDATION_JSON="${SWEEP_ROOT}/sweep-recommendation.json"
SWEEP_RECOMMENDATION_ENV="${SWEEP_ROOT}/sweep-recommendation.env"
SWEEP_RECOMMENDATION_RC="not_run"
SWEEP_RECOMMENDATION_STATUS="not_run"
PRE_OFFICIAL_ROOT="${BASE}/preofficial-write200-w${OFFICIAL_WORKERS}-t${OFFICIAL_TARGET_TPS}-${PRE_OFFICIAL_REPEAT_COUNT}run"
PRE_OFFICIAL_RC="not_run"
PRE_OFFICIAL_GATE_JSON=""
PRE_OFFICIAL_GATE_RC="not_run"
PRE_OFFICIAL_CLEANUP_DIR=""
PRE_OFFICIAL_CLEANUP_RC="not_run"
PRE_OFFICIAL_TRIGGERED=false
PRE_OFFICIAL_REASON=""
OFFICIAL_RC="not_run"
PACKAGE_RC="not_run"

if [[ "${CALIPER_RECORD_AUTO_ID,,}" != "true" ]]; then
  {
    echo "STATUS=blocked_invalid_official_shape"
    echo "REASON=CALIPER_RECORD_AUTO_ID must be true for chaincode hot-path official evidence"
    echo "CALIPER_RECORD_AUTO_ID=${CALIPER_RECORD_AUTO_ID}"
    echo "CALIPER_WRITE_TX_NUMBER=10000"
    echo "BASE=${BASE}"
  } > "${STATUS_ENV}"
  echo "[operator] blocked: CALIPER_RECORD_AUTO_ID must be true for official chaincode hot-path evidence, got ${CALIPER_RECORD_AUTO_ID}" >&2
  exit 2
fi

set +e
scripts/validate-offhost-write200-handoff.sh "${READINESS_JSON}" > "${READINESS_LOG}" 2>&1
HANDOFF_READINESS_RC=$?
set -e
if [[ "${HANDOFF_READINESS_RC}" != "0" ]]; then
  RUN_SMOKE=false
  RUN_SWEEP=false
  RUN_OFFICIAL=false
  PACKAGE_RETURN=false
  SKIP_REASON="handoff_readiness_failed"
fi

if [[ -z "${SKIP_REASON}" && ( "${RUN_SMOKE}" == "true" || "${RUN_SWEEP}" == "true" || "${RUN_OFFICIAL}" == "true" ) ]]; then
  set +e
  node scripts/test-caliper-bmu-workload-sequence.js > "${WORKLOAD_SELFTEST_LOG}" 2>&1
  WORKLOAD_SELFTEST_RC=$?
  set -e
  if [[ "${WORKLOAD_SELFTEST_RC}" != "0" ]]; then
    RUN_SMOKE=false
    RUN_SWEEP=false
    RUN_OFFICIAL=false
    PACKAGE_RETURN=false
    SKIP_REASON="workload_selftest_failed"
  fi
fi

if [[ "${RUN_SMOKE}" == "true" || "${RUN_SWEEP}" == "true" || "${RUN_OFFICIAL}" == "true" ]]; then
  set +e
  MIN_DOCKER_CPUS="${MIN_DOCKER_CPUS}" \
  MIN_DOCKER_MEMORY_GIB="${MIN_DOCKER_MEMORY_GIB}" \
  ALLOW_UNDERPOWERED="${ALLOW_UNDERPOWERED}" \
    scripts/check-benchmark-host-readiness.sh --output "${HOST_READINESS_JSON}" \
    > "${BASE}/host-readiness.log" 2>&1
  HOST_READINESS_RC=$?
  set -e
  if [[ "${HOST_READINESS_RC}" != "0" ]]; then
    RUN_SMOKE=false
    RUN_SWEEP=false
    RUN_OFFICIAL=false
    PACKAGE_RETURN=false
    SKIP_REASON="blocked_underpowered_host"
  fi
fi

evaluate_smoke_quality_gate() {
  local smoke_root=$1
  local output_json=$2
  scripts/evaluate-write200-smoke-quality-gate.py \
    --smoke-root "${smoke_root}" \
    --output "${output_json}" \
    --min-successful-tps "${SMOKE_MIN_SUCCESSFUL_TPS}"
}

env_value() {
  local file=$1
  local key=$2
  if [[ -f "${file}" ]]; then
    grep -E "^${key}=" "${file}" | tail -1 | cut -d= -f2- || true
  fi
}

write_effective_config() {
  local root=$1
  local phase=$2
  local workers=$3
  local target_tps=$4
  local repeat_count=$5
  local txmap_dir=$6
  mkdir -p "${root}"
  {
    echo "PHASE=${phase}"
    echo "RUN_TS=${TS}"
    echo "EVIDENCE_ROOT=${root}"
    echo "CALIPER_EXEC_MODE=${CALIPER_EXEC_MODE}"
    echo "CALIPER_ENDPOINT_MODE=${CALIPER_ENDPOINT_MODE}"
    echo "CALIPER_DOCKER_NETWORK=${CALIPER_DOCKER_NETWORK}"
    echo "CALIPER_WORKERS=${workers}"
    echo "CALIPER_WRITE_TARGET_TPS=${target_tps}"
    echo "CALIPER_RECORD_AUTO_ID=${CALIPER_RECORD_AUTO_ID}"
    echo "CALIPER_WRITE_TX_NUMBER=10000"
    echo "CALIPER_WRITE_ROUND_LABEL=write-bmu-data"
    echo "CALIPER_WRITE_WORKLOAD_MODULE=workloads/recordBMUData.js"
    echo "CALIPER_WRITE_CONTRACT_FUNCTION=RecordBMUDataAutoID"
    echo "REPEAT_COUNT=${repeat_count}"
    echo "BENCHMARK_CHANNEL_PROFILE=PassportBenchmarkChannel"
    echo "BENCHMARK_CHANNEL_ORGS=1,2,3,4"
    echo "BENCHMARK_CC_INSTALL_ORGS=1,2,3,4"
    echo "BENCHMARK_PEER_CONCURRENCY=true"
    echo "BENCHMARK_PEER_ENDORSER_CONCURRENCY=5000"
    echo "BENCHMARK_PEER_DELIVER_CONCURRENCY=5000"
    echo "BENCHMARK_PEER_GATEWAY_CONCURRENCY=2000"
    echo "ORG=evmanufacturer"
    echo "PREPARE_ORG=manufacturer"
    echo "CALIPER_FABRIC_GATEWAY_EVENTSTRATEGY=msp_any"
    echo "CALIPER_FABRIC_TIMEOUT_INVOKEORQUERY=${CALIPER_FABRIC_TIMEOUT_INVOKEORQUERY}"
    echo "CALIPER_OBSERVER_INTERNAL_INTERVAL=${CALIPER_OBSERVER_INTERNAL_INTERVAL}"
    echo "CALIPER_VERIFY_PREPARED_EACH_REPEAT=false"
    echo "COLLECT_DOCKER_STATS=true"
    echo "COLLECT_HOST_RESOURCE_STATS=${COLLECT_HOST_RESOURCE_STATS}"
    echo "CALIPER_SKIP_READ_ROUND=true"
    echo "CALIPER_TXMAP_DIR=${txmap_dir}"
    echo "RECONCILE_AFTER_RUNS=true"
    echo "RECONCILE_REQUIRED=true"
    echo "IDENTIFY_LEDGER_VALIDITY_AFTER_RUNS=true"
    echo "IDENTIFY_LEDGER_VALIDITY_REQUIRED=false"
    echo "WAIT_FOR_PEER_HEIGHTS_EQUAL=true"
    echo "WAIT_FOR_PEER_HEIGHTS_REQUIRED=true"
    echo "WAIT_FOR_DOCKER_IDLE=true"
    echo "WAIT_FOR_COUCHDB_ACTIVE_TASKS=true"
  } > "${root}/effective-config.env"
}

float_lt() {
  awk -v a="${1:-}" -v b="${2:-}" 'BEGIN { exit !((a + 0) < (b + 0)) }'
}

if [[ "${RUN_SMOKE}" == "true" ]]; then
  mkdir -p "${SMOKE_ROOT}"
  write_effective_config "${SMOKE_ROOT}" smoke "${SMOKE_WORKERS}" "${SMOKE_TARGET_TPS}" 3 "${SMOKE_ROOT}/txmap"
  set +e
  EVIDENCE_ROOT="${SMOKE_ROOT}" \
    RUN_ID="smoke-w${SMOKE_WORKERS}-t${SMOKE_TARGET_TPS}-${TS}" \
    CHANNEL_NAME="passportsmoke$(date +%m%d%H%M%S)" \
    CALIPER_EXEC_MODE="${CALIPER_EXEC_MODE}" \
    CALIPER_ENDPOINT_MODE="${CALIPER_ENDPOINT_MODE}" \
    CALIPER_DOCKER_NETWORK="${CALIPER_DOCKER_NETWORK}" \
    BENCHMARK_CHANNEL_PROFILE=PassportBenchmarkChannel \
    BENCHMARK_CHANNEL_ORGS=1,2,3,4 \
    BENCHMARK_CC_INSTALL_ORGS=1,2,3,4 \
    BENCHMARK_PEER_CONCURRENCY=true \
    BENCHMARK_PEER_ENDORSER_CONCURRENCY=5000 \
    BENCHMARK_PEER_DELIVER_CONCURRENCY=5000 \
    BENCHMARK_PEER_GATEWAY_CONCURRENCY=2000 \
    ORG=evmanufacturer \
    PREPARE_ORG=manufacturer \
    REPEAT_COUNT=3 \
    CALIPER_WRITE_TX_NUMBER=10000 \
    CALIPER_WRITE_TARGET_TPS="${SMOKE_TARGET_TPS}" \
    CALIPER_WORKERS="${SMOKE_WORKERS}" \
    CALIPER_RECORD_AUTO_ID="${CALIPER_RECORD_AUTO_ID}" \
    CALIPER_FABRIC_GATEWAY_EVENTSTRATEGY=msp_any \
    CALIPER_FABRIC_TIMEOUT_INVOKEORQUERY="${CALIPER_FABRIC_TIMEOUT_INVOKEORQUERY}" \
    CALIPER_OBSERVER_INTERNAL_INTERVAL="${CALIPER_OBSERVER_INTERNAL_INTERVAL}" \
    CALIPER_VERIFY_PREPARED_EACH_REPEAT=false \
    COLLECT_DOCKER_STATS=true \
    COLLECT_HOST_RESOURCE_STATS="${COLLECT_HOST_RESOURCE_STATS}" \
    CALIPER_SKIP_READ_ROUND=true \
    CALIPER_TXMAP_DIR="${SMOKE_ROOT}/txmap" \
    RECONCILE_AFTER_RUNS=true \
    RECONCILE_REQUIRED=true \
    IDENTIFY_LEDGER_VALIDITY_AFTER_RUNS=true \
    IDENTIFY_LEDGER_VALIDITY_REQUIRED=false \
    WAIT_FOR_PEER_HEIGHTS_EQUAL=true \
    WAIT_FOR_PEER_HEIGHTS_REQUIRED=true \
    WAIT_FOR_DOCKER_IDLE=true \
    WAIT_FOR_COUCHDB_ACTIVE_TASKS=true \
    scripts/blockchain-tps-reproducibility.sh > "${BASE}/smoke.log" 2>&1
  SMOKE_RC=$?
  set -e

  SMOKE_CLEANUP_DIR="${BASE}/cleanup-after-smoke"
  set +e
  DRY_RUN=false \
    CONFIRM_BENCHMARK_CLEANUP=benchmark-only \
    EVIDENCE_DIR="${SMOKE_CLEANUP_DIR}" \
    scripts/cleanup-benchmark-fabric-artifacts.sh > "${BASE}/smoke-cleanup.log" 2>&1
  SMOKE_CLEANUP_RC=$?
  set -e

  if [[ "${SMOKE_RC}" == "0" ]]; then
    SMOKE_GATE_JSON="${SMOKE_ROOT}/smoke-quality-gate.json"
    set +e
    evaluate_smoke_quality_gate "${SMOKE_ROOT}" "${SMOKE_GATE_JSON}" > "${BASE}/smoke-quality-gate.log" 2>&1
    SMOKE_GATE_RC=$?
    set -e
  fi

  if [[ "${SMOKE_CLEANUP_RC}" != "0" ]]; then
    RUN_OFFICIAL=false
    PACKAGE_RETURN=false
    SKIP_REASON="smoke_cleanup_failed_official_skipped"
  elif [[ "${SMOKE_ONLY}" == "true" ]]; then
    RUN_OFFICIAL=false
  elif [[ "${SMOKE_RC}" == "0" && "${SMOKE_GATE_RC}" != "0" && "${FORCE_OFFICIAL_AFTER_SMOKE}" != "true" ]]; then
    RUN_OFFICIAL=false
    PACKAGE_RETURN=false
    if [[ "${SWEEP_ON_SMOKE_FAIL}" == "true" ]]; then
      RUN_SWEEP=true
      SKIP_REASON="smoke_quality_gate_failed_sweep_requested_official_skipped"
    else
      SKIP_REASON="smoke_quality_gate_failed_official_skipped"
    fi
  elif [[ "${SMOKE_RC}" != "0" && "${FORCE_OFFICIAL_AFTER_SMOKE}" != "true" ]]; then
    RUN_OFFICIAL=false
    PACKAGE_RETURN=false
    if [[ "${SWEEP_ON_SMOKE_FAIL}" == "true" ]]; then
      RUN_SWEEP=true
      SKIP_REASON="smoke_failed_sweep_requested_official_skipped"
    else
      SKIP_REASON="smoke_failed_official_skipped"
    fi
  fi
fi

if [[ "${RUN_OFFICIAL}" == "true" \
  && "${RUN_SMOKE}" == "true" \
  && "${SMOKE_RC}" == "0" \
  && "${SMOKE_GATE_RC}" == "0" \
  && "${PRE_OFFICIAL_ON_MARGINAL_SMOKE}" == "true" ]]; then
  smoke_min_tps="$(env_value "${SMOKE_ROOT}/summary.env" WRITE200_MIN_TPS)"
  if [[ -n "${smoke_min_tps}" ]] && float_lt "${smoke_min_tps}" "${PRE_OFFICIAL_MARGIN_UPPER_TPS}"; then
    PRE_OFFICIAL_TRIGGERED=true
    PRE_OFFICIAL_REASON="smoke_min_tps_${smoke_min_tps}_below_${PRE_OFFICIAL_MARGIN_UPPER_TPS}"
    mkdir -p "${PRE_OFFICIAL_ROOT}"
    write_effective_config "${PRE_OFFICIAL_ROOT}" preofficial "${OFFICIAL_WORKERS}" "${OFFICIAL_TARGET_TPS}" "${PRE_OFFICIAL_REPEAT_COUNT}" "${PRE_OFFICIAL_ROOT}/txmap"
    set +e
    EVIDENCE_ROOT="${PRE_OFFICIAL_ROOT}" \
      RUN_ID="preofficial-w${OFFICIAL_WORKERS}-t${OFFICIAL_TARGET_TPS}-${TS}" \
      CHANNEL_NAME="passportpre$(date +%m%d%H%M%S)" \
      CALIPER_EXEC_MODE="${CALIPER_EXEC_MODE}" \
      CALIPER_ENDPOINT_MODE="${CALIPER_ENDPOINT_MODE}" \
      CALIPER_DOCKER_NETWORK="${CALIPER_DOCKER_NETWORK}" \
      BENCHMARK_CHANNEL_PROFILE=PassportBenchmarkChannel \
      BENCHMARK_CHANNEL_ORGS=1,2,3,4 \
      BENCHMARK_CC_INSTALL_ORGS=1,2,3,4 \
      BENCHMARK_PEER_CONCURRENCY=true \
      BENCHMARK_PEER_ENDORSER_CONCURRENCY=5000 \
      BENCHMARK_PEER_DELIVER_CONCURRENCY=5000 \
      BENCHMARK_PEER_GATEWAY_CONCURRENCY=2000 \
      ORG=evmanufacturer \
      PREPARE_ORG=manufacturer \
      REPEAT_COUNT="${PRE_OFFICIAL_REPEAT_COUNT}" \
      CALIPER_WRITE_TX_NUMBER=10000 \
      CALIPER_WRITE_TARGET_TPS="${OFFICIAL_TARGET_TPS}" \
      CALIPER_WORKERS="${OFFICIAL_WORKERS}" \
      CALIPER_RECORD_AUTO_ID="${CALIPER_RECORD_AUTO_ID}" \
      CALIPER_FABRIC_GATEWAY_EVENTSTRATEGY=msp_any \
      CALIPER_FABRIC_TIMEOUT_INVOKEORQUERY="${CALIPER_FABRIC_TIMEOUT_INVOKEORQUERY}" \
      CALIPER_OBSERVER_INTERNAL_INTERVAL="${CALIPER_OBSERVER_INTERNAL_INTERVAL}" \
      CALIPER_VERIFY_PREPARED_EACH_REPEAT=false \
      COLLECT_DOCKER_STATS=true \
      COLLECT_HOST_RESOURCE_STATS="${COLLECT_HOST_RESOURCE_STATS}" \
      CALIPER_SKIP_READ_ROUND=true \
      CALIPER_TXMAP_DIR="${PRE_OFFICIAL_ROOT}/txmap" \
      RECONCILE_AFTER_RUNS=true \
      RECONCILE_REQUIRED=true \
      IDENTIFY_LEDGER_VALIDITY_AFTER_RUNS=true \
      IDENTIFY_LEDGER_VALIDITY_REQUIRED=false \
      WAIT_FOR_PEER_HEIGHTS_EQUAL=true \
      WAIT_FOR_PEER_HEIGHTS_REQUIRED=true \
      WAIT_FOR_DOCKER_IDLE=true \
      WAIT_FOR_COUCHDB_ACTIVE_TASKS=true \
      scripts/blockchain-tps-reproducibility.sh > "${BASE}/preofficial.log" 2>&1
    PRE_OFFICIAL_RC=$?
    set -e

    PRE_OFFICIAL_CLEANUP_DIR="${BASE}/cleanup-after-preofficial"
    set +e
    DRY_RUN=false \
      CONFIRM_BENCHMARK_CLEANUP=benchmark-only \
      EVIDENCE_DIR="${PRE_OFFICIAL_CLEANUP_DIR}" \
      scripts/cleanup-benchmark-fabric-artifacts.sh > "${BASE}/preofficial-cleanup.log" 2>&1
    PRE_OFFICIAL_CLEANUP_RC=$?
    set -e

    if [[ "${PRE_OFFICIAL_RC}" == "0" ]]; then
      PRE_OFFICIAL_GATE_JSON="${PRE_OFFICIAL_ROOT}/preofficial-quality-gate.json"
      set +e
      scripts/evaluate-write200-smoke-quality-gate.py \
        --smoke-root "${PRE_OFFICIAL_ROOT}" \
        --output "${PRE_OFFICIAL_GATE_JSON}" \
        --min-successful-tps "${PRE_OFFICIAL_MIN_SUCCESSFUL_TPS}" \
        > "${BASE}/preofficial-quality-gate.log" 2>&1
      PRE_OFFICIAL_GATE_RC=$?
      set -e
    fi

    if [[ "${PRE_OFFICIAL_CLEANUP_RC}" != "0" ]]; then
      RUN_OFFICIAL=false
      PACKAGE_RETURN=false
      SKIP_REASON="preofficial_cleanup_failed_official_skipped"
    elif [[ "${PRE_OFFICIAL_RC}" != "0" || "${PRE_OFFICIAL_GATE_RC}" != "0" ]]; then
      RUN_OFFICIAL=false
      PACKAGE_RETURN=false
      if [[ "${SWEEP_ON_SMOKE_FAIL}" == "true" ]]; then
        RUN_SWEEP=true
        SKIP_REASON="preofficial_quality_gate_failed_sweep_requested_official_skipped"
      else
        SKIP_REASON="preofficial_quality_gate_failed_official_skipped"
      fi
    fi
  fi
fi

if [[ "${RUN_SWEEP}" == "true" ]]; then
  mkdir -p "${SWEEP_ROOT}"
  echo "index,workers,target_tps,rc,cleanup_rc,evidence_root,summary_env,min_tps,p50_tps,mean_tps,all_succ_expected,all_fail_zero,all_reject_zero" > "${SWEEP_RESULTS_CSV}"
  SWEEP_RC=0
  sweep_index=0
  for candidate in ${SWEEP_MATRIX}; do
    sweep_index=$((sweep_index + 1))
    workers="${candidate%%:*}"
    target_tps="${candidate#*:}"
    case_root="${SWEEP_ROOT}/w${workers}-t${target_tps}"
    mkdir -p "${case_root}"
    write_effective_config "${case_root}" sweep "${workers}" "${target_tps}" "${SWEEP_REPEAT_COUNT}" "${case_root}/txmap"
    case_channel="passportsw${sweep_index}$(date +%m%d%H%M%S)"
    set +e
    EVIDENCE_ROOT="${case_root}" \
      RUN_ID="sweep-w${workers}-t${target_tps}-${TS}" \
      CHANNEL_NAME="${case_channel}" \
      CALIPER_EXEC_MODE="${CALIPER_EXEC_MODE}" \
      CALIPER_ENDPOINT_MODE="${CALIPER_ENDPOINT_MODE}" \
      CALIPER_DOCKER_NETWORK="${CALIPER_DOCKER_NETWORK}" \
      BENCHMARK_CHANNEL_PROFILE=PassportBenchmarkChannel \
      BENCHMARK_CHANNEL_ORGS=1,2,3,4 \
      BENCHMARK_CC_INSTALL_ORGS=1,2,3,4 \
      BENCHMARK_PEER_CONCURRENCY=true \
      BENCHMARK_PEER_ENDORSER_CONCURRENCY=5000 \
      BENCHMARK_PEER_DELIVER_CONCURRENCY=5000 \
      BENCHMARK_PEER_GATEWAY_CONCURRENCY=2000 \
      ORG=evmanufacturer \
      PREPARE_ORG=manufacturer \
      REPEAT_COUNT="${SWEEP_REPEAT_COUNT}" \
      CALIPER_WRITE_TX_NUMBER=10000 \
      CALIPER_WRITE_TARGET_TPS="${target_tps}" \
      CALIPER_WORKERS="${workers}" \
      CALIPER_RECORD_AUTO_ID="${CALIPER_RECORD_AUTO_ID}" \
      CALIPER_FABRIC_GATEWAY_EVENTSTRATEGY=msp_any \
      CALIPER_FABRIC_TIMEOUT_INVOKEORQUERY="${CALIPER_FABRIC_TIMEOUT_INVOKEORQUERY}" \
      CALIPER_OBSERVER_INTERNAL_INTERVAL="${CALIPER_OBSERVER_INTERNAL_INTERVAL}" \
      CALIPER_VERIFY_PREPARED_EACH_REPEAT=false \
      COLLECT_DOCKER_STATS=true \
      COLLECT_HOST_RESOURCE_STATS="${COLLECT_HOST_RESOURCE_STATS}" \
      CALIPER_SKIP_READ_ROUND=true \
      CALIPER_TXMAP_DIR="${case_root}/txmap" \
      RECONCILE_AFTER_RUNS=true \
      RECONCILE_REQUIRED=true \
      IDENTIFY_LEDGER_VALIDITY_AFTER_RUNS=true \
      IDENTIFY_LEDGER_VALIDITY_REQUIRED=false \
      WAIT_FOR_PEER_HEIGHTS_EQUAL=true \
      WAIT_FOR_PEER_HEIGHTS_REQUIRED=true \
      WAIT_FOR_DOCKER_IDLE=true \
      WAIT_FOR_COUCHDB_ACTIVE_TASKS=true \
      scripts/blockchain-tps-reproducibility.sh > "${case_root}/run.log" 2>&1
    case_rc=$?
    set -e

    cleanup_dir="${case_root}/cleanup"
    set +e
    DRY_RUN=false \
      CONFIRM_BENCHMARK_CLEANUP=benchmark-only \
      EVIDENCE_DIR="${cleanup_dir}" \
      scripts/cleanup-benchmark-fabric-artifacts.sh > "${case_root}/cleanup.log" 2>&1
    cleanup_rc=$?
    set -e

    summary_env="${case_root}/summary.env"
    echo "${sweep_index},${workers},${target_tps},${case_rc},${cleanup_rc},${case_root},${summary_env},$(env_value "${summary_env}" WRITE200_MIN_TPS),$(env_value "${summary_env}" WRITE200_P50_TPS),$(env_value "${summary_env}" WRITE200_MEAN_TPS),$(env_value "${summary_env}" ALL_RUNS_SUCC_EXPECTED),$(env_value "${summary_env}" ALL_RUNS_FAIL_ZERO),$(env_value "${summary_env}" ALL_RUNS_REJECT_ZERO)" >> "${SWEEP_RESULTS_CSV}"

    if [[ "${case_rc}" != "0" || "${cleanup_rc}" != "0" ]]; then
      SWEEP_RC=1
    fi
    if [[ "${cleanup_rc}" != "0" ]]; then
      SKIP_REASON="sweep_cleanup_failed_official_skipped"
      break
    fi
  done

  set +e
  scripts/recommend-write200-sweep-candidate.py \
    --sweep-results "${SWEEP_RESULTS_CSV}" \
    --output "${SWEEP_RECOMMENDATION_JSON}" \
    --env-output "${SWEEP_RECOMMENDATION_ENV}" \
    --min-successful-tps "${SMOKE_MIN_SUCCESSFUL_TPS}" \
    > "${SWEEP_ROOT}/sweep-recommendation.log" 2>&1
  SWEEP_RECOMMENDATION_RC=$?
  set -e
  SWEEP_RECOMMENDATION_STATUS="$(grep -E '^SWEEP_RECOMMENDATION_STATUS=' "${SWEEP_RECOMMENDATION_ENV}" | tail -1 | cut -d= -f2- || true)"
fi

write_status() {
  {
  echo "BASE=${BASE}"
  echo "READINESS_JSON=${READINESS_JSON}"
  echo "READINESS_LOG=${READINESS_LOG}"
  echo "HANDOFF_READINESS_RC=${HANDOFF_READINESS_RC}"
  echo "HOST_READINESS_JSON=${HOST_READINESS_JSON}"
  echo "HOST_READINESS_RC=${HOST_READINESS_RC}"
  echo "WORKLOAD_SELFTEST_LOG=${WORKLOAD_SELFTEST_LOG}"
  echo "WORKLOAD_SELFTEST_RC=${WORKLOAD_SELFTEST_RC}"
  echo "MIN_DOCKER_CPUS=${MIN_DOCKER_CPUS}"
  echo "MIN_DOCKER_MEMORY_GIB=${MIN_DOCKER_MEMORY_GIB}"
  echo "ALLOW_UNDERPOWERED=${ALLOW_UNDERPOWERED}"
	  echo "CALIPER_EXEC_MODE=${CALIPER_EXEC_MODE}"
	  echo "CALIPER_ENDPOINT_MODE=${CALIPER_ENDPOINT_MODE}"
	  echo "CALIPER_DOCKER_NETWORK=${CALIPER_DOCKER_NETWORK}"
	  echo "COLLECT_HOST_RESOURCE_STATS=${COLLECT_HOST_RESOURCE_STATS}"
	  echo "RUN_SMOKE=${RUN_SMOKE}"
	  echo "SMOKE_WORKERS=${SMOKE_WORKERS}"
	  echo "SMOKE_TARGET_TPS=${SMOKE_TARGET_TPS}"
	  echo "SMOKE_ROOT=${SMOKE_ROOT}"
  echo "SMOKE_RC=${SMOKE_RC}"
  echo "SMOKE_MIN_SUCCESSFUL_TPS=${SMOKE_MIN_SUCCESSFUL_TPS}"
  echo "SMOKE_GATE_JSON=${SMOKE_GATE_JSON}"
  echo "SMOKE_GATE_RC=${SMOKE_GATE_RC}"
  echo "SMOKE_CLEANUP_DIR=${SMOKE_CLEANUP_DIR}"
  echo "SMOKE_CLEANUP_RC=${SMOKE_CLEANUP_RC}"
  echo "RUN_SWEEP=${RUN_SWEEP}"
  echo "SWEEP_ON_SMOKE_FAIL=${SWEEP_ON_SMOKE_FAIL}"
  echo "SWEEP_MATRIX=${SWEEP_MATRIX}"
  echo "SWEEP_REPEAT_COUNT=${SWEEP_REPEAT_COUNT}"
  echo "SWEEP_ROOT=${SWEEP_ROOT}"
  echo "SWEEP_RESULTS_CSV=${SWEEP_RESULTS_CSV}"
  echo "SWEEP_RC=${SWEEP_RC}"
  echo "SWEEP_RECOMMENDATION_JSON=${SWEEP_RECOMMENDATION_JSON}"
  echo "SWEEP_RECOMMENDATION_ENV=${SWEEP_RECOMMENDATION_ENV}"
  echo "SWEEP_RECOMMENDATION_RC=${SWEEP_RECOMMENDATION_RC}"
  echo "SWEEP_RECOMMENDATION_STATUS=${SWEEP_RECOMMENDATION_STATUS}"
  echo "FORCE_OFFICIAL_AFTER_SMOKE=${FORCE_OFFICIAL_AFTER_SMOKE}"
  echo "PRE_OFFICIAL_ON_MARGINAL_SMOKE=${PRE_OFFICIAL_ON_MARGINAL_SMOKE}"
  echo "PRE_OFFICIAL_REPEAT_COUNT=${PRE_OFFICIAL_REPEAT_COUNT}"
  echo "PRE_OFFICIAL_MIN_SUCCESSFUL_TPS=${PRE_OFFICIAL_MIN_SUCCESSFUL_TPS}"
  echo "PRE_OFFICIAL_MARGIN_UPPER_TPS=${PRE_OFFICIAL_MARGIN_UPPER_TPS}"
  echo "PRE_OFFICIAL_TRIGGERED=${PRE_OFFICIAL_TRIGGERED}"
  echo "PRE_OFFICIAL_REASON=${PRE_OFFICIAL_REASON}"
  echo "PRE_OFFICIAL_ROOT=${PRE_OFFICIAL_ROOT}"
  echo "PRE_OFFICIAL_RC=${PRE_OFFICIAL_RC}"
  echo "PRE_OFFICIAL_GATE_JSON=${PRE_OFFICIAL_GATE_JSON}"
  echo "PRE_OFFICIAL_GATE_RC=${PRE_OFFICIAL_GATE_RC}"
  echo "PRE_OFFICIAL_CLEANUP_DIR=${PRE_OFFICIAL_CLEANUP_DIR}"
  echo "PRE_OFFICIAL_CLEANUP_RC=${PRE_OFFICIAL_CLEANUP_RC}"
  echo "WAIT_FOR_PEER_HEIGHTS_EQUAL=true"
  echo "WAIT_FOR_PEER_HEIGHTS_REQUIRED=true"
  echo "SKIP_REASON=${SKIP_REASON}"
  echo "RUN_OFFICIAL=${RUN_OFFICIAL}"
  echo "OFFICIAL_WORKERS=${OFFICIAL_WORKERS}"
  echo "OFFICIAL_TARGET_TPS=${OFFICIAL_TARGET_TPS}"
  echo "CALIPER_WRITE_ROUND_LABEL=write-bmu-data"
  echo "CALIPER_WRITE_WORKLOAD_MODULE=workloads/recordBMUData.js"
  echo "CALIPER_WRITE_CONTRACT_FUNCTION=RecordBMUDataAutoID"
  echo "OFFICIAL_ROOT=${OFFICIAL_ROOT}"
  echo "OFFICIAL_RC=${OFFICIAL_RC}"
  echo "PACKAGE_RETURN=${PACKAGE_RETURN}"
  echo "PACKAGE_RC=${PACKAGE_RC}"
  echo "RETURN_STATUS=${RETURN_STATUS}"
  echo "RETURN_BUNDLE=${RETURN_BUNDLE}"
  echo "RETURN_BUNDLE_SHA256=${RETURN_BUNDLE_SHA256}"
  echo "PACKAGE_DIAGNOSTICS=${PACKAGE_DIAGNOSTICS}"
  echo "DIAGNOSTIC_STATUS=${DIAGNOSTIC_STATUS}"
  echo "DIAGNOSTIC_BUNDLE=${DIAGNOSTIC_BUNDLE}"
  echo "DIAGNOSTIC_BUNDLE_SHA256=${DIAGNOSTIC_BUNDLE_SHA256}"
  echo "DIAGNOSTIC_RC=${DIAGNOSTIC_RC}"
  echo "PACKAGE_FINAL_OUT=${PACKAGE_FINAL_OUT}"
  echo "FINAL_OUT_DIR=${FINAL_OUT_DIR}"
  echo "FINAL_OUT_BUNDLE=${FINAL_OUT_BUNDLE}"
  echo "FINAL_OUT_BUNDLE_SHA256=${FINAL_OUT_BUNDLE_SHA256}"
  echo "FINAL_OUT_RC=${FINAL_OUT_RC}"
  echo "FINAL_OUT_STATUS=${FINAL_OUT_STATUS}"
  if [[ -n "${SKIP_REASON}" ]]; then
    echo "STATUS=${SKIP_REASON}"
  elif [[ "${RUN_OFFICIAL}" == "true" && "${PACKAGE_RETURN}" == "true" && "${PACKAGE_RC}" == "0" ]]; then
    echo "STATUS=return_bundle_ready"
  elif [[ "${RUN_OFFICIAL}" == "true" ]]; then
    echo "STATUS=official_run_finished_without_return_bundle"
  elif [[ "${RUN_SWEEP}" == "true" ]]; then
    echo "STATUS=sweep_finished"
  elif [[ "${RUN_SMOKE}" == "true" ]]; then
    echo "STATUS=smoke_finished"
  else
    echo "STATUS=readiness_only"
  fi
  } > "${STATUS_ENV}"
}

create_final_out_bundle() {
  local operator_rc=${1:-0}
  if [[ "${PACKAGE_FINAL_OUT}" != "true" ]]; then
    FINAL_OUT_RC="skipped"
    return 0
  fi

  set +e
  FINAL_OUT_RC="0"
  local final_dir final_parent final_name stamp path
  final_dir="${FINAL_OUT_DIR}"
  mkdir -p "${final_dir}"
  final_dir="$(cd "${final_dir}" && pwd)"
  FINAL_OUT_DIR="${final_dir}"
  final_parent="$(dirname "${final_dir}")"
  final_name="$(basename "${final_dir}")"
  stamp="$(date -u +%Y%m%dT%H%M%SZ)"
  FINAL_OUT_STATUS="${final_dir}/operator-final-status.env"

  {
    echo "OPERATOR_EXIT_RC=${operator_rc}"
    echo "PWD=${ROOT_DIR}"
    echo "DATE_UTC=$(date -u +%Y-%m-%dT%H:%M:%SZ)"
    echo "BASE=${BASE}"
    echo "STATUS_ENV=${STATUS_ENV}"
    echo "OPERATOR_START_MARKER=${OPERATOR_START_MARKER}"
    echo "RETURN_BUNDLE=${RETURN_BUNDLE}"
    echo "RETURN_BUNDLE_SHA256=${RETURN_BUNDLE_SHA256}"
    echo "DIAGNOSTIC_BUNDLE=${DIAGNOSTIC_BUNDLE}"
    echo "DIAGNOSTIC_BUNDLE_SHA256=${DIAGNOSTIC_BUNDLE_SHA256}"
    echo "NOTE=Portable operator output; not official PASS evidence by itself."
  } > "${FINAL_OUT_STATUS}"

  for path in \
    "${STATUS_ENV}" \
    "${OPERATOR_START_MARKER}" \
    "${READINESS_JSON}" \
    "${READINESS_LOG}" \
    "${HOST_READINESS_JSON}" \
    "${BASE}/host-readiness.log" \
    "${BASE}/official.log" \
    "${BASE}/return-bundle.log" \
    "${DIAGNOSTIC_STATUS}" \
    "${BASE}/diagnostic-bundle/diagnostic-bundle.log" \
    "${RETURN_STATUS}" \
    "${RETURN_BUNDLE}" \
    "${DIAGNOSTIC_BUNDLE}"; do
    if [[ -n "${path}" && -f "${path}" ]]; then
      cp -f "${path}" "${final_dir}/"
    fi
  done

  local search_roots=()
  if [[ -n "${FINAL_OUT_SEARCH_ROOTS}" ]]; then
    # shellcheck disable=SC2206
    search_roots=(${FINAL_OUT_SEARCH_ROOTS})
  else
    search_roots=("${BASE}")
  fi
  : > "${final_dir}/found-bundles.txt"
  for path in "${search_roots[@]}"; do
    if [[ -e "${path}" ]]; then
      find "${path}" -maxdepth 8 -type f -newer "${OPERATOR_START_MARKER}" \
        ! -path "${ROOT_DIR}/.omx/evidence/blockchain/full-rerun-audit-*" \
        \( -name 'offhost-write200-return-*.tar.gz' -o -name 'offhost-write200-operator-diagnostics-*.tar.gz' \) \
        -print >> "${final_dir}/found-bundles.txt" 2>/dev/null
    fi
  done
  sort -u -o "${final_dir}/found-bundles.txt" "${final_dir}/found-bundles.txt"
  while IFS= read -r path; do
    if [[ -f "${path}" ]]; then
      cp -f "${path}" "${final_dir}/"
    fi
  done < "${final_dir}/found-bundles.txt"

  FINAL_OUT_BUNDLE="${final_parent}/${final_name}_${stamp}.tar.gz"
  tar -czf "${FINAL_OUT_BUNDLE}" -C "${final_parent}" "${final_name}"
  FINAL_OUT_RC=$?
  if (( FINAL_OUT_RC == 0 )); then
    FINAL_OUT_BUNDLE_SHA256="$(sha256sum "${FINAL_OUT_BUNDLE}" | awk '{print $1}')"
    {
      echo "FINAL_OUT_DIR=${FINAL_OUT_DIR}"
      echo "FINAL_OUT_BUNDLE=${FINAL_OUT_BUNDLE}"
      echo "FINAL_OUT_BUNDLE_SHA256=${FINAL_OUT_BUNDLE_SHA256}"
      echo "OPERATOR_EXIT_RC=${operator_rc}"
      echo "CREATED_AT=$(date -Is)"
      echo "PURPOSE=portable-operator-output-not-official-pass-evidence"
    } > "${final_dir}/final-out-status.env"
  fi

  echo
  echo "==== WRITE200 OPERATOR FINAL ===="
  echo "operator rc: ${operator_rc}"
  echo "final out dir: ${FINAL_OUT_DIR}"
  echo "portable output bundle: ${FINAL_OUT_BUNDLE}"
  echo "return bundle: ${RETURN_BUNDLE}"
  echo "diagnostic bundle: ${DIAGNOSTIC_BUNDLE}"
  echo "found bundles:"
  cat "${final_dir}/found-bundles.txt" 2>/dev/null || true
  echo "================================="
  echo

  write_status
  set -e
  return 0
}

finish_operator() {
  local rc=${1:-0}
  trap - EXIT
  create_final_out_bundle "${rc}" || true
  cat "${STATUS_ENV}"
  exit "${rc}"
}

trap 'finish_operator "$?"' EXIT
trap 'finish_operator 130' INT
trap 'finish_operator 143' TERM
trap 'finish_operator 129' HUP

if [[ "${RUN_OFFICIAL}" == "true" ]]; then
  OFFICIAL_ROOT="${BASE}/official-write200-w${OFFICIAL_WORKERS}-t${OFFICIAL_TARGET_TPS}-10run"
  mkdir -p "${OFFICIAL_ROOT}"
  write_effective_config "${OFFICIAL_ROOT}" official "${OFFICIAL_WORKERS}" "${OFFICIAL_TARGET_TPS}" 10 "${OFFICIAL_ROOT}/txmap"
  set +e
  EVIDENCE_BASE="${BASE}" \
    EVIDENCE_ROOT="${OFFICIAL_ROOT}" \
    RUN_ID="official-w${OFFICIAL_WORKERS}-t${OFFICIAL_TARGET_TPS}-${TS}" \
    CHANNEL_NAME="passportof$(date +%m%d%H%M%S)" \
    CALIPER_EXEC_MODE="${CALIPER_EXEC_MODE}" \
    CALIPER_ENDPOINT_MODE="${CALIPER_ENDPOINT_MODE}" \
    CALIPER_DOCKER_NETWORK="${CALIPER_DOCKER_NETWORK}" \
    BENCHMARK_CHANNEL_PROFILE=PassportBenchmarkChannel \
    BENCHMARK_CHANNEL_ORGS=1,2,3,4 \
    BENCHMARK_CC_INSTALL_ORGS=1,2,3,4 \
    BENCHMARK_PEER_CONCURRENCY=true \
    BENCHMARK_PEER_ENDORSER_CONCURRENCY=5000 \
    BENCHMARK_PEER_DELIVER_CONCURRENCY=5000 \
    BENCHMARK_PEER_GATEWAY_CONCURRENCY=2000 \
    ORG=evmanufacturer \
    PREPARE_ORG=manufacturer \
    CALIPER_WORKERS="${OFFICIAL_WORKERS}" \
    CALIPER_WRITE_TARGET_TPS="${OFFICIAL_TARGET_TPS}" \
    CALIPER_RECORD_AUTO_ID="${CALIPER_RECORD_AUTO_ID}" \
    CALIPER_WRITE_TX_NUMBER=10000 \
    CALIPER_FABRIC_GATEWAY_EVENTSTRATEGY=msp_any \
    CALIPER_FABRIC_TIMEOUT_INVOKEORQUERY="${CALIPER_FABRIC_TIMEOUT_INVOKEORQUERY}" \
    CALIPER_OBSERVER_INTERNAL_INTERVAL="${CALIPER_OBSERVER_INTERNAL_INTERVAL}" \
    CALIPER_VERIFY_PREPARED_EACH_REPEAT=false \
    COLLECT_DOCKER_STATS=true \
    COLLECT_HOST_RESOURCE_STATS="${COLLECT_HOST_RESOURCE_STATS}" \
    CALIPER_SKIP_READ_ROUND=true \
    CALIPER_TXMAP_DIR="${OFFICIAL_ROOT}/txmap" \
    RECONCILE_AFTER_RUNS=true \
    RECONCILE_REQUIRED=true \
    IDENTIFY_LEDGER_VALIDITY_AFTER_RUNS=true \
    IDENTIFY_LEDGER_VALIDITY_REQUIRED=false \
    WAIT_FOR_PEER_HEIGHTS_EQUAL=true \
    WAIT_FOR_PEER_HEIGHTS_REQUIRED=true \
    WAIT_FOR_DOCKER_IDLE=true \
    WAIT_FOR_COUCHDB_ACTIVE_TASKS=true \
    UPDATE_PERFORMANCE_GOAL_RESULTS=true \
    scripts/run-official-write200-audit.sh > "${BASE}/official.log" 2>&1
  OFFICIAL_RC=$?
  set -e

  if [[ "${PACKAGE_RETURN}" == "true" ]]; then
    # Snapshot operator context before packaging so the RETURN_BUNDLE carries
    # handoff/host readiness and operator status sidecars.
    write_status
    set +e
    scripts/create-offhost-write200-return-bundle.sh --evidence-dir "${OFFICIAL_ROOT}" --operator-dir "${BASE}" --out-dir "${BASE}/return-bundle" > "${BASE}/return-bundle.log" 2>&1
    PACKAGE_RC=$?
    set -e
    if (( PACKAGE_RC == 0 )); then
      RETURN_STATUS="${BASE}/return-bundle/return-bundle-status.env"
      # shellcheck disable=SC1090
      source "${RETURN_STATUS}"
      RETURN_BUNDLE="${BUNDLE:-}"
      RETURN_BUNDLE_SHA256="${BUNDLE_SHA256:-}"
    fi
  fi
fi

write_status

if [[ "${PACKAGE_DIAGNOSTICS}" == "true" && -z "${RETURN_BUNDLE}" ]]; then
  diag_dir="${BASE}/diagnostic-bundle"
  mkdir -p "${diag_dir}"
  DIAGNOSTIC_STATUS="${diag_dir}/diagnostic-bundle-status.env"
  DIAGNOSTIC_BUNDLE="${diag_dir}/offhost-write200-operator-diagnostics-${TS}.tar.gz"
  # Pre-record the expected successful diagnostic bundle status so the
  # operator-status.env included inside the tar is self-contained. If tar
  # creation fails, the outer status file is rewritten with the real non-zero
  # DIAGNOSTIC_RC below and no usable bundle should be transferred.
  DIAGNOSTIC_RC="0"
  diag_log="${diag_dir}/diagnostic-bundle.log"
  write_status
  set +e
  tar -czf "${DIAGNOSTIC_BUNDLE}" \
    --exclude "$(basename "${BASE}")/diagnostic-bundle" \
    -C "$(dirname "${BASE}")" "$(basename "${BASE}")" \
    > "${diag_log}" 2>&1
  DIAGNOSTIC_RC=$?
  set -e
  if (( DIAGNOSTIC_RC == 0 )); then
    DIAGNOSTIC_BUNDLE_SHA256="$(sha256sum "${DIAGNOSTIC_BUNDLE}" | awk '{print $1}')"
    {
      echo "BUNDLE=${DIAGNOSTIC_BUNDLE}"
      echo "BUNDLE_SHA256=${DIAGNOSTIC_BUNDLE_SHA256}"
      echo "STATUS_ENV=${STATUS_ENV}"
      echo "CREATED_AT=$(date -Is)"
      echo "PURPOSE=operator-diagnostics-only-not-official-pass-evidence"
    } > "${DIAGNOSTIC_STATUS}"
  fi
  write_status
fi

if [[ "${SKIP_REASON}" == "blocked_underpowered_host" && "${HOST_READINESS_RC}" != "0" ]]; then
  finish_operator "${HOST_READINESS_RC}"
fi
if [[ "${SKIP_REASON}" == "handoff_readiness_failed" && "${HANDOFF_READINESS_RC}" != "0" ]]; then
  finish_operator "${HANDOFF_READINESS_RC}"
fi

case "${SKIP_REASON}" in
  preofficial_cleanup_failed_*)
    finish_operator "${PRE_OFFICIAL_CLEANUP_RC}"
    ;;
  smoke_quality_gate_failed_*|smoke_failed_*|preofficial_quality_gate_failed_*)
    # The operator may still have produced sweep/diagnostic artifacts, but a
    # smoke/pre-official failure means the official PASS path deliberately did
    # not run.
    # Return non-zero so callers cannot mistake diagnostics for completion.
    finish_operator 31
    ;;
esac

if [[ "${RUN_OFFICIAL}" == "true" ]]; then
  if [[ "${PACKAGE_RETURN}" == "true" && "${PACKAGE_RC}" != "0" ]]; then
    finish_operator "${PACKAGE_RC}"
  fi
  finish_operator "${OFFICIAL_RC}"
fi
if [[ "${RUN_SWEEP}" == "true" ]]; then
  finish_operator "${SWEEP_RC}"
fi
if [[ "${RUN_SMOKE}" == "true" ]]; then
  if [[ "${SMOKE_CLEANUP_RC}" != "not_run" && "${SMOKE_CLEANUP_RC}" != "0" ]]; then
    finish_operator "${SMOKE_CLEANUP_RC}"
  fi
  finish_operator "${SMOKE_RC}"
fi

finish_operator 0
