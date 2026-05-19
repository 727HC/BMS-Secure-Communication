#!/usr/bin/env bash
# Non-destructive repeated Caliper successful-commit benchmark harness.
# Creates/uses a benchmark channel, prepares passports once, then repeats write rounds.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RUN_ID="${RUN_ID:-tpsrepro-$(date -u +%Y%m%dT%H%M%SZ)}"
CHANNEL_NAME="${CHANNEL_NAME:-passportrepro$(date -u +%Y%m%d%H%M%S)}"
ORG="${ORG:-manufacturer}"
PREPARE_ORG="${PREPARE_ORG:-${ORG}}"
CREATE_CHANNEL="${CREATE_CHANNEL:-true}"
BENCHMARK_CHANNEL_PROFILE="${BENCHMARK_CHANNEL_PROFILE:-PassportBenchmarkChannel}"
BENCHMARK_CHANNEL_ORGS="${BENCHMARK_CHANNEL_ORGS:-1,2,3,4}"
BENCHMARK_CC_INSTALL_ORGS="${BENCHMARK_CC_INSTALL_ORGS:-${BENCHMARK_CHANNEL_ORGS}}"
BENCHMARK_CC_END_POLICY="${BENCHMARK_CC_END_POLICY:-OR('ManufacturerMSP.peer','EVManufacturerMSP.peer','ServiceMSP.peer','RegulatorMSP.peer')}"
BENCHMARK_CC_VERSION="${BENCHMARK_CC_VERSION:-1.0}"
BENCHMARK_CC_SEQUENCE="${BENCHMARK_CC_SEQUENCE:-1}"
BENCHMARK_CC_SRC_PATH="${BENCHMARK_CC_SRC_PATH:-../chaincode/passport-contract}"
BENCHMARK_PEER_CONCURRENCY="${BENCHMARK_PEER_CONCURRENCY:-false}"
BENCHMARK_PEER_ENDORSER_CONCURRENCY="${BENCHMARK_PEER_ENDORSER_CONCURRENCY:-5000}"
BENCHMARK_PEER_DELIVER_CONCURRENCY="${BENCHMARK_PEER_DELIVER_CONCURRENCY:-5000}"
BENCHMARK_PEER_GATEWAY_CONCURRENCY="${BENCHMARK_PEER_GATEWAY_CONCURRENCY:-2000}"
REPEAT_COUNT="${REPEAT_COUNT:-5}"
WRITE_TX_NUMBER="${CALIPER_WRITE_TX_NUMBER:-5000}"
WRITE_TARGET_TPS="${CALIPER_WRITE_TARGET_TPS:-300}"
READ_TX_NUMBER="${CALIPER_READ_TX_NUMBER:-500}"
READ_TARGET_TPS="${CALIPER_READ_TARGET_TPS:-1000}"
SKIP_READ_ROUND="${CALIPER_SKIP_READ_ROUND:-false}"
RECORD_AUTO_ID="${CALIPER_RECORD_AUTO_ID:-false}"
CALIPER_WRITE_ROUND_LABEL="write-bmu-data"
CALIPER_WRITE_WORKLOAD_MODULE="workloads/recordBMUData.js"
if [[ "${RECORD_AUTO_ID,,}" == "true" ]]; then
  CALIPER_WRITE_CONTRACT_FUNCTION="RecordBMUDataAutoID"
else
  CALIPER_WRITE_CONTRACT_FUNCTION="RecordBMUData"
fi
NUM_PASSPORTS="${NUM_PASSPORTS:-500}"
BMU_RECORD_KEYS="${BMU_RECORD_KEYS:-${WRITE_TX_NUMBER}}"
BMU_FC_START_BASE="${BMU_FC_START_BASE:-0}"
REPEAT_INDEX_BASE="${REPEAT_INDEX_BASE:-0}"
DISJOINT_KEYS_PER_REPEAT="${DISJOINT_KEYS_PER_REPEAT:-false}"
INPUT_RUN_BMU_RECORD_KEYS="${RUN_BMU_RECORD_KEYS:-}"
INPUT_PREPARED_BMU_RECORD_KEYS="${PREPARED_BMU_RECORD_KEYS:-}"
INPUT_BMU_FC_STRIDE="${BMU_FC_STRIDE:-}"
RUN_BMU_RECORD_KEYS="${INPUT_RUN_BMU_RECORD_KEYS:-${BMU_RECORD_KEYS}}"
PREPARED_BMU_RECORD_KEYS="${INPUT_PREPARED_BMU_RECORD_KEYS:-${BMU_RECORD_KEYS}}"
if [[ "${DISJOINT_KEYS_PER_REPEAT}" == "true" ]]; then
  RUN_BMU_RECORD_KEYS="${INPUT_RUN_BMU_RECORD_KEYS:-${WRITE_TX_NUMBER}}"
  PREPARED_BMU_RECORD_KEYS="${INPUT_PREPARED_BMU_RECORD_KEYS:-$(( WRITE_TX_NUMBER * (REPEAT_INDEX_BASE + REPEAT_COUNT) ))}"
fi
DEFAULT_BMU_FC_STRIDE=$(( (WRITE_TX_NUMBER + RUN_BMU_RECORD_KEYS - 1) / RUN_BMU_RECORD_KEYS ))
BMU_FC_STRIDE="${INPUT_BMU_FC_STRIDE:-${DEFAULT_BMU_FC_STRIDE}}"
QUIET_SECONDS="${QUIET_SECONDS:-20}"
PREPARE_CONCURRENCY="${CALIPER_PREPARE_CONCURRENCY:-50}"
PREPARE_ASYNC="${CALIPER_PREPARE_ASYNC:-false}"
PREPARE_ASYNC_WINDOW="${CALIPER_PREPARE_ASYNC_WINDOW:-${PREPARE_CONCURRENCY}}"
FRESH_KEYS_PER_REPEAT="${FRESH_KEYS_PER_REPEAT:-false}"
FRESH_CHANNEL_PER_REPEAT="${FRESH_CHANNEL_PER_REPEAT:-false}"
SKIP_INITIAL_PREPARE="${SKIP_INITIAL_PREPARE:-false}"
VERIFY_PREPARED_EACH_REPEAT="${CALIPER_VERIFY_PREPARED_EACH_REPEAT:-false}"
EVIDENCE_ROOT="${EVIDENCE_ROOT:-${ROOT_DIR}/outputs/evidence/blockchain/${RUN_ID}}"
if [[ "${EVIDENCE_ROOT}" != /* ]]; then
  EVIDENCE_ROOT="${ROOT_DIR}/${EVIDENCE_ROOT}"
fi
INPUT_CALIPER_TXMAP_DIR="${CALIPER_TXMAP_DIR:-}"
CALIPER_TXMAP_DIR_HOST=""
if [[ -n "${INPUT_CALIPER_TXMAP_DIR}" ]]; then
  if [[ "${INPUT_CALIPER_TXMAP_DIR}" == /* ]]; then
    CALIPER_TXMAP_DIR_HOST="${INPUT_CALIPER_TXMAP_DIR}"
  else
    CALIPER_TXMAP_DIR_HOST="${ROOT_DIR}/${INPUT_CALIPER_TXMAP_DIR}"
  fi
  mkdir -p "${CALIPER_TXMAP_DIR_HOST}"
  unset CALIPER_TXMAP_DIR
fi
RESULTS_CSV="${RESULTS_CSV:-${EVIDENCE_ROOT}/repeat-results.csv}"
SUMMARY_ENV="${SUMMARY_ENV:-${EVIDENCE_ROOT}/summary.env}"
SUMMARY_JSON="${SUMMARY_JSON:-${EVIDENCE_ROOT}/summary.json}"
LIVE_DIAGNOSTIC_LOG="${LIVE_DIAGNOSTIC_LOG:-${EVIDENCE_ROOT}/live-passportchannel-diagnostic.log}"
WAIT_FOR_DOCKER_IDLE="${WAIT_FOR_DOCKER_IDLE:-true}"
DOCKER_IDLE_MAX_CPU="${DOCKER_IDLE_MAX_CPU:-15}"
DOCKER_IDLE_CONSECUTIVE="${DOCKER_IDLE_CONSECUTIVE:-2}"
DOCKER_IDLE_TIMEOUT="${DOCKER_IDLE_TIMEOUT:-600}"
DOCKER_IDLE_INTERVAL="${DOCKER_IDLE_INTERVAL:-10}"
WAIT_FOR_COUCHDB_ACTIVE_TASKS="${WAIT_FOR_COUCHDB_ACTIVE_TASKS:-true}"
WAIT_FOR_PEER_HEIGHTS_EQUAL="${WAIT_FOR_PEER_HEIGHTS_EQUAL:-false}"
WAIT_FOR_PEER_HEIGHTS_REQUIRED="${WAIT_FOR_PEER_HEIGHTS_REQUIRED:-false}"
PEER_HEIGHTS_TIMEOUT="${PEER_HEIGHTS_TIMEOUT:-300}"
PEER_HEIGHTS_INTERVAL="${PEER_HEIGHTS_INTERVAL:-5}"
COLLECT_DOCKER_STATS="${COLLECT_DOCKER_STATS:-true}"
DOCKER_STATS_INTERVAL="${DOCKER_STATS_INTERVAL:-2}"
DOCKER_STATS_CONTAINERS="${DOCKER_STATS_CONTAINERS:-peer0.manufacturer.battery.com peer0.evmanufacturer.battery.com peer0.service.battery.com peer0.regulator.battery.com couchdb0 couchdb1 couchdb2 couchdb3 orderer.battery.com}"
COLLECT_HOST_RESOURCE_STATS="${COLLECT_HOST_RESOURCE_STATS:-true}"
HOST_RESOURCE_STATS_INTERVAL="${HOST_RESOURCE_STATS_INTERVAL:-2}"
QUIESCE_AUX_CONTAINERS="${QUIESCE_AUX_CONTAINERS:-false}"
QUIESCE_AUX_PATTERN="${QUIESCE_AUX_PATTERN:-^(von-|acapy-)}"
QUIESCED_CONTAINERS=()
CHAINCODE_IMAGE_SEED_SOURCE="${CHAINCODE_IMAGE_SEED_SOURCE:-}"
CHAINCODE_IMAGE_SEED_TARGET="${CHAINCODE_IMAGE_SEED_TARGET:-}"
CALIPER_EXEC_MODE="${CALIPER_EXEC_MODE:-host}"
CALIPER_DOCKER_IMAGE="${CALIPER_DOCKER_IMAGE:-hyperledger/fabric-tools:latest}"
CALIPER_DOCKER_NETWORK="${CALIPER_DOCKER_NETWORK:-passport_net}"
CALIPER_DOCKER_WORKDIR="${CALIPER_DOCKER_WORKDIR:-/work}"
RECONCILE_AFTER_RUNS="${RECONCILE_AFTER_RUNS:-false}"
RECONCILE_REQUIRED="${RECONCILE_REQUIRED:-false}"
IDENTIFY_LEDGER_VALIDITY_AFTER_RUNS="${IDENTIFY_LEDGER_VALIDITY_AFTER_RUNS:-false}"
IDENTIFY_LEDGER_VALIDITY_REQUIRED="${IDENTIFY_LEDGER_VALIDITY_REQUIRED:-false}"

usage() {
  cat <<USAGE
Usage: $0 [--dry-run]

Environment:
  CHANNEL_NAME                 default generated passportrepro<UTC>
  RUN_ID                       default tpsrepro-<UTC>
  CREATE_CHANNEL               default true; creates non-passportchannel PassportBenchmarkChannel and deploys chaincode
  BENCHMARK_CHANNEL_PROFILE    default PassportBenchmarkChannel
  BENCHMARK_CHANNEL_ORGS       default 1,2,3,4; use 1,2 for writer-hot-path or 1 for solo upper-bound profiles
  BENCHMARK_CC_INSTALL_ORGS    default BENCHMARK_CHANNEL_ORGS; set 1 for endorser-only install on 4-org commit topology
  BENCHMARK_CC_END_POLICY      default OR across all 4 org peers
  BENCHMARK_CC_VERSION         default 1.0; use a unique value to avoid reusing packages preinstalled on commit-only peers
  BENCHMARK_CC_SEQUENCE        default 1
  BENCHMARK_CC_SRC_PATH        default ../chaincode/passport-contract; benchmark-only staging path is allowed
  BENCHMARK_PEER_CONCURRENCY   default false; true applies benchmark-only peer concurrency compose override when the network starts
  BENCHMARK_PEER_ENDORSER_CONCURRENCY default 5000
  BENCHMARK_PEER_DELIVER_CONCURRENCY  default 5000
  BENCHMARK_PEER_GATEWAY_CONCURRENCY  default 2000
  PREPARE_ORG                  default ORG; org identity used only for CreateBatteryPassport setup
  REPEAT_COUNT                 default 5
  CALIPER_WRITE_TX_NUMBER      default 5000
  CALIPER_WRITE_TARGET_TPS     default 300
  CALIPER_READ_TX_NUMBER       default 500
  CALIPER_READ_TARGET_TPS      default 1000
  CALIPER_SKIP_READ_ROUND      default false; true removes Caliper's internal read-passport round
  CALIPER_RECORD_AUTO_ID       default false; true derives recordId from Fabric txID
  NUM_PASSPORTS                default 500
  BMU_RECORD_KEYS              default write tx count
  RUN_BMU_RECORD_KEYS          default BMU_RECORD_KEYS; per-repeat key count
  PREPARED_BMU_RECORD_KEYS     default BMU_RECORD_KEYS; initial prepared key count
  BMU_FC_START_BASE            default 0; increase when reusing a run id after prior successful rounds
  BMU_FC_STRIDE                default ceil(write tx / per-repeat key count); repeat-to-repeat FC high-water advance
  REPEAT_INDEX_BASE            default 0; increase when appending rounds to avoid duplicate record IDs
  DISJOINT_KEYS_PER_REPEAT     default false; true uses a fresh prepared passport/DID slice for every repeat
  QUIET_SECONDS                default 20
  CALIPER_PREPARE_ASYNC        default false; setup-only submitAsync pipeline with commit status verification
  CALIPER_PREPARE_ASYNC_WINDOW default CALIPER_PREPARE_CONCURRENCY
  FRESH_KEYS_PER_REPEAT        default false; prepare a new CALIPER_RUN_ID for each repeat
  FRESH_CHANNEL_PER_REPEAT     default false; create a fresh benchmark channel for each repeat
  SKIP_INITIAL_PREPARE         default false; require an already-prepared CHANNEL_NAME/CALIPER_RUN_ID
  CALIPER_VERIFY_PREPARED_EACH_REPEAT default false; initial prepare verification remains on, repeat-time read noise is avoided
  WAIT_FOR_DOCKER_IDLE         default true; waits for peer/orderer/CouchDB CPU to settle
  DOCKER_IDLE_MAX_CPU          default 15 (% per observed container)
  DOCKER_IDLE_TIMEOUT          default 600 seconds
  WAIT_FOR_COUCHDB_ACTIVE_TASKS default true; also require CouchDB _active_tasks to be empty
  WAIT_FOR_PEER_HEIGHTS_EQUAL  default false; true waits for all benchmark peers to report equal channel height after each write run
  WAIT_FOR_PEER_HEIGHTS_REQUIRED default false; true fails the harness if peer height convergence times out
  PEER_HEIGHTS_TIMEOUT         default 300 seconds
  PEER_HEIGHTS_INTERVAL        default 5 seconds
  QUIESCE_AUX_CONTAINERS       default false; pause non-Fabric auxiliary containers during the write benchmark
  QUIESCE_AUX_PATTERN          default ^(von-|acapy-)
  CHAINCODE_IMAGE_SEED_SOURCE  optional explicit source image for documented peer-builder image seeding workaround
  CHAINCODE_IMAGE_SEED_TARGET  optional explicit target dev-peer image for documented peer-builder image seeding workaround
  CALIPER_EXEC_MODE            default host; set docker to run Caliper/prepare inside CALIPER_DOCKER_NETWORK
  CALIPER_DOCKER_IMAGE         default hyperledger/fabric-tools:latest; host Node runtime is mounted read-only
  CALIPER_DOCKER_NETWORK       default passport_net
  CALIPER_DOCKER_WORKDIR       default /work; repository mount point inside the runner container
  EVIDENCE_ROOT                default outputs/evidence/blockchain/<RUN_ID>
  RECONCILE_AFTER_RUNS         default false; true writes ledger-reconciliation.json before any external cleanup
  RECONCILE_REQUIRED           default false; true fails the harness if reconciliation collection fails
  IDENTIFY_LEDGER_VALIDITY_AFTER_RUNS default false; true runs read-only ledgerutil identifytxs evidence after repeats
  IDENTIFY_LEDGER_VALIDITY_REQUIRED default false; true fails the harness if ledgerutil validation collection fails
  COLLECT_DOCKER_STATS         default true; writes docker-stats-repeat-<n>.log during each write repeat
  COLLECT_HOST_RESOURCE_STATS  default true; writes optional iostat-repeat-<n>.log and pidstat-repeat-<n>.log when sysstat tools exist
USAGE
}

DRY_RUN=false
while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run) DRY_RUN=true ;;
    -h|--help) usage; exit 0 ;;
    *) echo "ERROR: unknown argument: $1" >&2; usage >&2; exit 64 ;;
  esac
  shift
done

if [[ "${CHANNEL_NAME}" == "passportchannel" ]]; then
  echo "ERROR: live passportchannel reset/use as fresh benchmark target is forbidden by this reproducibility harness." >&2
  exit 2
fi
if ! [[ "${REPEAT_COUNT}" =~ ^[0-9]+$ ]] || (( REPEAT_COUNT < 1 )); then
  echo "ERROR: REPEAT_COUNT must be a positive integer" >&2
  exit 2
fi

mkdir -p "${EVIDENCE_ROOT}"

{
  echo "RUN_ID=${RUN_ID}"
  echo "CHANNEL_NAME=${CHANNEL_NAME}"
  echo "EVIDENCE_ROOT=${EVIDENCE_ROOT}"
  echo "CREATE_CHANNEL=${CREATE_CHANNEL}"
  echo "ORG=${ORG}"
  echo "PREPARE_ORG=${PREPARE_ORG}"
  echo "REPEAT_COUNT=${REPEAT_COUNT}"
  echo "CALIPER_WRITE_TX_NUMBER=${WRITE_TX_NUMBER}"
  echo "CALIPER_WRITE_TARGET_TPS=${WRITE_TARGET_TPS}"
  echo "CALIPER_WRITE_RATE_CONTROL_TYPE=${CALIPER_WRITE_RATE_CONTROL_TYPE:-fixed-rate}"
  echo "CALIPER_WRITE_TRANSACTION_LOAD=${CALIPER_WRITE_TRANSACTION_LOAD:-}"
  echo "CALIPER_READ_TX_NUMBER=${READ_TX_NUMBER}"
  echo "CALIPER_READ_TARGET_TPS=${READ_TARGET_TPS}"
  echo "CALIPER_SKIP_READ_ROUND=${SKIP_READ_ROUND}"
  echo "CALIPER_RECORD_AUTO_ID=${RECORD_AUTO_ID}"
  echo "CALIPER_WRITE_ROUND_LABEL=${CALIPER_WRITE_ROUND_LABEL}"
  echo "CALIPER_WRITE_WORKLOAD_MODULE=${CALIPER_WRITE_WORKLOAD_MODULE}"
  echo "CALIPER_WRITE_CONTRACT_FUNCTION=${CALIPER_WRITE_CONTRACT_FUNCTION}"
  echo "CALIPER_WORKERS=${CALIPER_WORKERS:-}"
  echo "CALIPER_EXEC_MODE=${CALIPER_EXEC_MODE}"
  echo "CALIPER_ENDPOINT_MODE=${CALIPER_ENDPOINT_MODE:-host}"
  echo "CALIPER_DOCKER_NETWORK=${CALIPER_DOCKER_NETWORK}"
  echo "CALIPER_DOCKER_IMAGE=${CALIPER_DOCKER_IMAGE}"
  echo "CALIPER_FABRIC_GATEWAY_EVENTSTRATEGY=${CALIPER_FABRIC_GATEWAY_EVENTSTRATEGY:-}"
  echo "CALIPER_FABRIC_TIMEOUT_INVOKEORQUERY=${CALIPER_FABRIC_TIMEOUT_INVOKEORQUERY:-}"
  echo "CALIPER_OBSERVER_INTERNAL_INTERVAL=${CALIPER_OBSERVER_INTERNAL_INTERVAL:-}"
  echo "CALIPER_VERIFY_PREPARED_EACH_REPEAT=${VERIFY_PREPARED_EACH_REPEAT}"
  echo "BENCHMARK_CHANNEL_PROFILE=${BENCHMARK_CHANNEL_PROFILE}"
  echo "BENCHMARK_CHANNEL_ORGS=${BENCHMARK_CHANNEL_ORGS}"
  echo "BENCHMARK_CC_INSTALL_ORGS=${BENCHMARK_CC_INSTALL_ORGS}"
  echo "BENCHMARK_CC_VERSION=${BENCHMARK_CC_VERSION}"
  echo "BENCHMARK_CC_SEQUENCE=${BENCHMARK_CC_SEQUENCE}"
  echo "BENCHMARK_CC_SRC_PATH=${BENCHMARK_CC_SRC_PATH}"
  printf 'BENCHMARK_CC_END_POLICY=%q\n' "${BENCHMARK_CC_END_POLICY}"
  echo "BENCHMARK_PEER_CONCURRENCY=${BENCHMARK_PEER_CONCURRENCY}"
  echo "BENCHMARK_PEER_ENDORSER_CONCURRENCY=${BENCHMARK_PEER_ENDORSER_CONCURRENCY}"
  echo "BENCHMARK_PEER_DELIVER_CONCURRENCY=${BENCHMARK_PEER_DELIVER_CONCURRENCY}"
  echo "BENCHMARK_PEER_GATEWAY_CONCURRENCY=${BENCHMARK_PEER_GATEWAY_CONCURRENCY}"
  echo "NUM_PASSPORTS=${NUM_PASSPORTS}"
  echo "BMU_RECORD_KEYS=${BMU_RECORD_KEYS}"
  echo "PREPARED_BMU_RECORD_KEYS=${PREPARED_BMU_RECORD_KEYS}"
  echo "RUN_BMU_RECORD_KEYS=${RUN_BMU_RECORD_KEYS}"
  echo "BMU_FC_START_BASE=${BMU_FC_START_BASE}"
  echo "BMU_FC_STRIDE=${BMU_FC_STRIDE}"
  echo "DISJOINT_KEYS_PER_REPEAT=${DISJOINT_KEYS_PER_REPEAT}"
  echo "PREPARE_CONCURRENCY=${PREPARE_CONCURRENCY}"
  echo "PREPARE_ASYNC=${PREPARE_ASYNC}"
  echo "PREPARE_ASYNC_WINDOW=${PREPARE_ASYNC_WINDOW}"
  echo "FRESH_KEYS_PER_REPEAT=${FRESH_KEYS_PER_REPEAT}"
  echo "FRESH_CHANNEL_PER_REPEAT=${FRESH_CHANNEL_PER_REPEAT}"
  echo "SKIP_INITIAL_PREPARE=${SKIP_INITIAL_PREPARE}"
  echo "CALIPER_TXMAP_DIR_HOST=${CALIPER_TXMAP_DIR_HOST}"
  echo "RECONCILE_AFTER_RUNS=${RECONCILE_AFTER_RUNS}"
  echo "RECONCILE_REQUIRED=${RECONCILE_REQUIRED}"
  echo "IDENTIFY_LEDGER_VALIDITY_AFTER_RUNS=${IDENTIFY_LEDGER_VALIDITY_AFTER_RUNS}"
  echo "IDENTIFY_LEDGER_VALIDITY_REQUIRED=${IDENTIFY_LEDGER_VALIDITY_REQUIRED}"
  echo "WAIT_FOR_PEER_HEIGHTS_EQUAL=${WAIT_FOR_PEER_HEIGHTS_EQUAL}"
  echo "WAIT_FOR_PEER_HEIGHTS_REQUIRED=${WAIT_FOR_PEER_HEIGHTS_REQUIRED}"
  echo "WAIT_FOR_DOCKER_IDLE=${WAIT_FOR_DOCKER_IDLE}"
  echo "WAIT_FOR_COUCHDB_ACTIVE_TASKS=${WAIT_FOR_COUCHDB_ACTIVE_TASKS}"
  echo "COLLECT_DOCKER_STATS=${COLLECT_DOCKER_STATS}"
  echo "COLLECT_HOST_RESOURCE_STATS=${COLLECT_HOST_RESOURCE_STATS}"
  echo "QUIESCE_AUX_CONTAINERS=${QUIESCE_AUX_CONTAINERS}"
} > "${EVIDENCE_ROOT}/effective-config.env"

host_to_caliper_path() {
  local path=$1
  case "${CALIPER_EXEC_MODE}" in
    docker)
      if [[ "${path}" == "${ROOT_DIR}" ]]; then
        echo "${CALIPER_DOCKER_WORKDIR}"
      elif [[ "${path}" == "${ROOT_DIR}/"* ]]; then
        echo "${CALIPER_DOCKER_WORKDIR}/${path#"${ROOT_DIR}/"}"
      else
        echo "${path}"
      fi
      ;;
    host) echo "${path}" ;;
    *)
      echo "ERROR: Unknown CALIPER_EXEC_MODE='${CALIPER_EXEC_MODE}'. Use host or docker." >&2
      exit 2
      ;;
  esac
}

run_caliper_workspace() {
  local org_arg=$1
  shift
  local -a env_args=("$@")

  case "${CALIPER_EXEC_MODE}" in
    host)
      (
        cd "${ROOT_DIR}/caliper-workspace"
        env "${env_args[@]}" ./run-bench.sh "${org_arg}"
      )
      ;;
    docker)
      local node_bin node_root
      node_bin="$(command -v node 2>/dev/null || true)"
      if [[ -z "${node_bin}" ]]; then
        echo "ERROR: CALIPER_EXEC_MODE=docker requires a host node binary to mount into the runner." >&2
        exit 2
      fi
      node_root="$(cd "$(dirname "$(dirname "${node_bin}")")" && pwd)"

      local -a docker_env=(
        -e "PATH=${node_root}/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"
        -e "HOME=/tmp"
      )
      local name pair
      for name in \
        CALIPER_ENDPOINT_MODE \
        CALIPER_DISCOVER \
        CALIPER_WRITER_ORGS \
        CALIPER_WRITER_MSPS \
        CALIPER_WRITER_SELECTION \
        CALIPER_WORKERS \
        CALIPER_WRITE_RATE_CONTROL_TYPE \
        CALIPER_WRITE_TRANSACTION_LOAD \
        CALIPER_LOGGING_TARGETS_CONSOLE_OPTIONS_LEVEL \
        CALIPER_FABRIC_TIMEOUT_INVOKEORQUERY \
        CALIPER_FABRIC_GATEWAY_EVENTSTRATEGY \
        CALIPER_OBSERVER_INTERNAL_INTERVAL \
        CALIPER_SUCCESSFUL_WRITE_MODE \
        CALIPER_RECORD_AUTO_ID \
        CALIPER_REQUIRE_EXPLICIT_FC_START
      do
        if [[ -v "${name}" ]]; then
          docker_env+=(-e "${name}=${!name}")
        fi
      done
      for pair in "${env_args[@]}"; do
        docker_env+=(-e "${pair}")
      done

      docker run --rm \
        --user "$(id -u):$(id -g)" \
        --network "${CALIPER_DOCKER_NETWORK}" \
        -v "${ROOT_DIR}:${CALIPER_DOCKER_WORKDIR}" \
        -v "${node_root}:${node_root}:ro" \
        -w "${CALIPER_DOCKER_WORKDIR}/caliper-workspace" \
        "${docker_env[@]}" \
        "${CALIPER_DOCKER_IMAGE}" \
        bash -lc './run-bench.sh "$@"' _ "${org_arg}"
      ;;
    *)
      echo "ERROR: Unknown CALIPER_EXEC_MODE='${CALIPER_EXEC_MODE}'. Use host or docker." >&2
      exit 2
      ;;
  esac
}

unquiesce_aux_containers() {
  if (( ${#QUIESCED_CONTAINERS[@]} == 0 )); then
    return 0
  fi
  echo "[quiesce] unpausing auxiliary containers: ${QUIESCED_CONTAINERS[*]}" | tee -a "${EVIDENCE_ROOT}/quiesce.log"
  docker unpause "${QUIESCED_CONTAINERS[@]}" >> "${EVIDENCE_ROOT}/quiesce.log" 2>&1 || true
}

quiesce_aux_containers() {
  local log="${EVIDENCE_ROOT}/quiesce.log"
  if [[ "${QUIESCE_AUX_CONTAINERS}" != "true" ]]; then
    echo "[quiesce] skipped" | tee -a "${log}"
    return 0
  fi

  mapfile -t QUIESCED_CONTAINERS < <(
    docker ps --format '{{.Names}} {{.Status}}' |
      awk -v pattern="${QUIESCE_AUX_PATTERN}" '$1 ~ pattern && $0 !~ /Paused/ { print $1 }'
  )
  if (( ${#QUIESCED_CONTAINERS[@]} == 0 )); then
    echo "[quiesce] no matching auxiliary containers for pattern ${QUIESCE_AUX_PATTERN}" | tee -a "${log}"
    return 0
  fi
  echo "[quiesce] pausing auxiliary containers: ${QUIESCED_CONTAINERS[*]}" | tee -a "${log}"
  docker pause "${QUIESCED_CONTAINERS[@]}" >> "${log}" 2>&1
}

trap unquiesce_aux_containers EXIT
quiesce_aux_containers

wait_for_docker_idle() {
  local label=$1
  local log="${EVIDENCE_ROOT}/docker-idle.log"
  if [[ "${WAIT_FOR_DOCKER_IDLE}" != "true" ]]; then
    echo "[idle] ${label}: skipped" | tee -a "${log}"
    return 0
  fi

  local deadline=$((SECONDS + DOCKER_IDLE_TIMEOUT))
  local stable=0
  echo "[idle] ${label}: waiting for peer/orderer/CouchDB CPU <= ${DOCKER_IDLE_MAX_CPU}% (${DOCKER_IDLE_CONSECUTIVE} consecutive samples)" | tee -a "${log}"
  while (( SECONDS < deadline )); do
    local max_cpu
    max_cpu="$(
      docker stats --no-stream --format '{{.Name}} {{.CPUPerc}}' |
        awk '
          $1 ~ /^(couchdb[0-9]|orderer\\.battery\\.com|peer0\\.(manufacturer|evmanufacturer|service|regulator)\\.battery\\.com)$/ {
            gsub(/%/, "", $2)
            if (($2 + 0) > max) max = $2 + 0
          }
          END { printf "%.2f", max }
        '
    )"
    echo "[idle] ${label}: max_cpu=${max_cpu}%" | tee -a "${log}"
    local active_tasks=0
    if [[ "${WAIT_FOR_COUCHDB_ACTIVE_TASKS}" == "true" ]]; then
      if [[ -z "${COUCHDB_USER:-}" || -z "${COUCHDB_PASSWORD:-}" ]]; then
        # shellcheck disable=SC1091
        [[ -f "${ROOT_DIR}/passport-network/.env" ]] && source "${ROOT_DIR}/passport-network/.env"
      fi
      if [[ -n "${COUCHDB_USER:-}" && -n "${COUCHDB_PASSWORD:-}" ]]; then
        active_tasks="$(
          for couch in couchdb0 couchdb1 couchdb2 couchdb3; do
            docker exec "${couch}" curl -fsS -u "${COUCHDB_USER}:${COUCHDB_PASSWORD}" \
              http://127.0.0.1:5984/_active_tasks 2>/dev/null | jq 'length' 2>/dev/null || echo 999
          done | awk '{ sum += $1 } END { print sum + 0 }'
        )"
        echo "[idle] ${label}: couchdb_active_tasks=${active_tasks}" | tee -a "${log}"
      else
        echo "[idle] ${label}: couchdb_active_tasks=skipped missing credentials" | tee -a "${log}"
      fi
    fi
    if awk -v v="${max_cpu}" -v max="${DOCKER_IDLE_MAX_CPU}" -v tasks="${active_tasks}" 'BEGIN { exit !(v <= max && tasks == 0) }'; then
      stable=$((stable + 1))
      if (( stable >= DOCKER_IDLE_CONSECUTIVE )); then
        echo "[idle] ${label}: stable" | tee -a "${log}"
        return 0
      fi
    else
      stable=0
    fi
    sleep "${DOCKER_IDLE_INTERVAL}"
  done
  echo "ERROR: timed out waiting for docker idle during ${label}" | tee -a "${log}" >&2
  return 3
}

wait_for_peer_heights_equal() {
  local channel=$1
  local label=$2
  local log="${EVIDENCE_ROOT}/peer-heights.log"
  local output="${EVIDENCE_ROOT}/peer-heights-${label}.json"
  if [[ "${WAIT_FOR_PEER_HEIGHTS_EQUAL}" != "true" ]]; then
    echo "[peer-heights] ${label}: skipped" | tee -a "${log}"
    return 0
  fi

  echo "[peer-heights] ${label}: waiting for equal heights on ${channel}" | tee -a "${log}"
  if scripts/wait-peer-heights-equal.sh \
    --channel "${channel}" \
    --timeout "${PEER_HEIGHTS_TIMEOUT}" \
    --interval "${PEER_HEIGHTS_INTERVAL}" \
    --output "${output}" >> "${log}" 2>&1; then
    echo "[peer-heights] ${label}: equal (${output})" | tee -a "${log}"
    return 0
  fi

  echo "ERROR: peer heights did not converge for ${label}; see ${output}" | tee -a "${log}" >&2
  if [[ "${WAIT_FOR_PEER_HEIGHTS_REQUIRED}" == "true" ]]; then
    return 7
  fi
  return 0
}

start_docker_stats_monitor() {
  local label=$1
  local log=$2
  if [[ "${COLLECT_DOCKER_STATS}" != "true" ]]; then
    echo ""
    return
  fi
  if ! command -v docker >/dev/null 2>&1; then
    echo "[repro] docker not found; skipping docker stats monitor for ${label}" >> "${log}"
    echo ""
    return
  fi
  (
    echo "[repro] docker stats monitor start label=${label} interval=${DOCKER_STATS_INTERVAL}s containers=${DOCKER_STATS_CONTAINERS}"
    while true; do
      date -Is
      # shellcheck disable=SC2086
      docker stats --no-stream ${DOCKER_STATS_CONTAINERS} || true
      sleep "${DOCKER_STATS_INTERVAL}"
    done
  ) > "${log}" 2>&1 &
  echo "$!"
}

start_iostat_monitor() {
  local label=$1
  local log=$2
  if [[ "${COLLECT_HOST_RESOURCE_STATS}" != "true" ]]; then
    echo ""
    return
  fi
  if ! command -v iostat >/dev/null 2>&1; then
    echo "[repro] iostat not found; skipping host disk stats monitor for ${label}" > "${log}"
    echo ""
    return
  fi
  (
    echo "[repro] iostat monitor start label=${label} interval=${HOST_RESOURCE_STATS_INTERVAL}s"
    iostat -xz "${HOST_RESOURCE_STATS_INTERVAL}"
  ) > "${log}" 2>&1 &
  echo "$!"
}

start_pidstat_monitor() {
  local label=$1
  local log=$2
  if [[ "${COLLECT_HOST_RESOURCE_STATS}" != "true" ]]; then
    echo ""
    return
  fi
  if ! command -v pidstat >/dev/null 2>&1; then
    echo "[repro] pidstat not found; skipping host process stats monitor for ${label}" > "${log}"
    echo ""
    return
  fi
  (
    echo "[repro] pidstat monitor start label=${label} interval=${HOST_RESOURCE_STATS_INTERVAL}s"
    pidstat -durh "${HOST_RESOURCE_STATS_INTERVAL}"
  ) > "${log}" 2>&1 &
  echo "$!"
}

stop_background_monitor() {
  local pid=$1
  if [[ -z "${pid}" ]]; then
    return
  fi
  kill "${pid}" 2>/dev/null || true
  wait "${pid}" 2>/dev/null || true
}

cat <<PLAN | tee "${EVIDENCE_ROOT}/plan.txt"
=== Blockchain TPS reproducibility harness ===
Run ID: ${RUN_ID}
Channel: ${CHANNEL_NAME}
Create channel: ${CREATE_CHANNEL}
Profile: ${BENCHMARK_CHANNEL_PROFILE}
Channel orgs: ${BENCHMARK_CHANNEL_ORGS}
Chaincode install orgs: ${BENCHMARK_CC_INSTALL_ORGS}
Chaincode endorsement policy: ${BENCHMARK_CC_END_POLICY}
Chaincode version/sequence: ${BENCHMARK_CC_VERSION}/${BENCHMARK_CC_SEQUENCE}
Chaincode source path: ${BENCHMARK_CC_SRC_PATH}
Org: ${ORG}
Prepare org: ${PREPARE_ORG}
Repeats: ${REPEAT_COUNT}
Write: ${WRITE_TX_NUMBER} tx @ ${WRITE_TARGET_TPS} TPS
Read: ${READ_TX_NUMBER} tx @ ${READ_TARGET_TPS} TPS
Skip read round: ${SKIP_READ_ROUND}
BMU record keys: ${BMU_RECORD_KEYS}
Prepared BMU record keys: ${PREPARED_BMU_RECORD_KEYS}
Per-repeat BMU record keys: ${RUN_BMU_RECORD_KEYS}
BMU FC start base/stride: ${BMU_FC_START_BASE}/${BMU_FC_STRIDE}
Disjoint keys per repeat: ${DISJOINT_KEYS_PER_REPEAT}
Prepare concurrency: ${PREPARE_CONCURRENCY}
Prepare async/window: ${PREPARE_ASYNC}/${PREPARE_ASYNC_WINDOW}
Fresh keys per repeat: ${FRESH_KEYS_PER_REPEAT}
Fresh channel per repeat: ${FRESH_CHANNEL_PER_REPEAT}
Skip initial prepare: ${SKIP_INITIAL_PREPARE}
Verify prepared each repeat: ${VERIFY_PREPARED_EACH_REPEAT}
Quiesce aux containers: ${QUIESCE_AUX_CONTAINERS}
Chaincode image seed source: ${CHAINCODE_IMAGE_SEED_SOURCE:-<none>}
Chaincode image seed target: ${CHAINCODE_IMAGE_SEED_TARGET:-<none>}
Benchmark peer concurrency override: ${BENCHMARK_PEER_CONCURRENCY}
Benchmark peer concurrency limits: endorser=${BENCHMARK_PEER_ENDORSER_CONCURRENCY}, deliver=${BENCHMARK_PEER_DELIVER_CONCURRENCY}, gateway=${BENCHMARK_PEER_GATEWAY_CONCURRENCY}
Caliper exec mode: ${CALIPER_EXEC_MODE}
Caliper docker image/network/workdir: ${CALIPER_DOCKER_IMAGE}/${CALIPER_DOCKER_NETWORK}/${CALIPER_DOCKER_WORKDIR}
Caliper txmap host dir: ${CALIPER_TXMAP_DIR_HOST:-<disabled>}
Caliper txmap runtime dir: $([[ -n "${CALIPER_TXMAP_DIR_HOST}" ]] && host_to_caliper_path "${CALIPER_TXMAP_DIR_HOST}" || echo "<disabled>")
Record auto ID: ${RECORD_AUTO_ID}
Reconcile after runs/required: ${RECONCILE_AFTER_RUNS}/${RECONCILE_REQUIRED}
Ledger validity after runs/required: ${IDENTIFY_LEDGER_VALIDITY_AFTER_RUNS}/${IDENTIFY_LEDGER_VALIDITY_REQUIRED}
Wait peer heights equal/required: ${WAIT_FOR_PEER_HEIGHTS_EQUAL}/${WAIT_FOR_PEER_HEIGHTS_REQUIRED}
Docker stats collection/interval: ${COLLECT_DOCKER_STATS}/${DOCKER_STATS_INTERVAL}s
Host resource stats collection/interval: ${COLLECT_HOST_RESOURCE_STATS}/${HOST_RESOURCE_STATS_INTERVAL}s
Quiet seconds after prepare: ${QUIET_SECONDS}
Evidence: ${EVIDENCE_ROOT}
CSV: ${RESULTS_CSV}
Summary env: ${SUMMARY_ENV}
PLAN

if [[ "${DRY_RUN}" == "true" ]]; then
  echo "DRY-RUN: no Fabric or benchmark command executed."
  exit 0
fi

create_benchmark_channel() {
  local channel=$1
  (
    cd "${ROOT_DIR}/passport-network"
    BENCHMARK_PEER_CONCURRENCY="${BENCHMARK_PEER_CONCURRENCY}" \
    BENCHMARK_PEER_ENDORSER_CONCURRENCY="${BENCHMARK_PEER_ENDORSER_CONCURRENCY}" \
    BENCHMARK_PEER_DELIVER_CONCURRENCY="${BENCHMARK_PEER_DELIVER_CONCURRENCY}" \
    BENCHMARK_PEER_GATEWAY_CONCURRENCY="${BENCHMARK_PEER_GATEWAY_CONCURRENCY}" \
    CHANNEL_PROFILE="${BENCHMARK_CHANNEL_PROFILE}" \
    CHANNEL_ORGS="${BENCHMARK_CHANNEL_ORGS}" \
      ./network.sh createChannel -c "${channel}"
    CHANNEL_ORGS="${BENCHMARK_CHANNEL_ORGS}" \
    CHAINCODE_INSTALL_ORGS="${BENCHMARK_CC_INSTALL_ORGS}" \
    ./network.sh deployCC \
      -ccn passport-contract \
      -ccp "${BENCHMARK_CC_SRC_PATH}" \
      -ccl go \
      -ccv "${BENCHMARK_CC_VERSION}" \
      -ccs "${BENCHMARK_CC_SEQUENCE}" \
      -c "${channel}" \
      -ccep "${BENCHMARK_CC_END_POLICY}"
  ) 2>&1 | tee "${EVIDENCE_ROOT}/channel-deploy-${channel}.log"
  if [[ -n "${CHAINCODE_IMAGE_SEED_SOURCE}" || -n "${CHAINCODE_IMAGE_SEED_TARGET}" ]]; then
    CHAINCODE_IMAGE_SEED_SOURCE="${CHAINCODE_IMAGE_SEED_SOURCE}" \
    CHAINCODE_IMAGE_SEED_TARGET="${CHAINCODE_IMAGE_SEED_TARGET}" \
      "${ROOT_DIR}/scripts/seed-chaincode-image.sh" 2>&1 | tee -a "${EVIDENCE_ROOT}/channel-deploy-${channel}.log"
  fi
}

if [[ "${CREATE_CHANNEL}" == "true" && "${FRESH_CHANNEL_PER_REPEAT}" != "true" ]]; then
  create_benchmark_channel "${CHANNEL_NAME}"
fi

wait_for_docker_idle "post-channel-deploy"

prepare_run_id() {
  local channel=$1
  local prepare_run_id=$2
  local prepare_log=$3
  local prepare_bmu_record_keys=$4
  run_caliper_workspace "${PREPARE_ORG}" \
    "CHANNEL_NAME=${channel}" \
    "CALIPER_RUN_ID=${prepare_run_id}" \
    "CALIPER_PREPARE_ONLY=true" \
    "CALIPER_VERIFY_PREPARED=true" \
    "CALIPER_PREPARE_CONCURRENCY=${PREPARE_CONCURRENCY}" \
    "CALIPER_PREPARE_ASYNC=${PREPARE_ASYNC}" \
    "CALIPER_PREPARE_ASYNC_WINDOW=${PREPARE_ASYNC_WINDOW}" \
    "CALIPER_WRITE_TX_NUMBER=${WRITE_TX_NUMBER}" \
    "CALIPER_WRITE_TARGET_TPS=${WRITE_TARGET_TPS}" \
    "CALIPER_READ_TX_NUMBER=${READ_TX_NUMBER}" \
    "CALIPER_READ_TARGET_TPS=${READ_TARGET_TPS}" \
    "CALIPER_SKIP_READ_ROUND=${SKIP_READ_ROUND}" \
    "CALIPER_RECORD_AUTO_ID=${RECORD_AUTO_ID}" \
    "NUM_PASSPORTS=${NUM_PASSPORTS}" \
    "BMU_RECORD_KEYS=${prepare_bmu_record_keys}" \
    > "${prepare_log}" 2>&1

  echo "[repro] prepare-only complete: ${prepare_log}"
  sleep "${QUIET_SECONDS}"
  wait_for_docker_idle "post-prepare-${prepare_run_id}"
  wait_for_peer_heights_equal "${channel}" "post-prepare-${prepare_run_id}"
}

if [[ "${FRESH_KEYS_PER_REPEAT}" != "true" && "${FRESH_CHANNEL_PER_REPEAT}" != "true" && "${SKIP_INITIAL_PREPARE}" != "true" ]]; then
  prepare_run_id "${CHANNEL_NAME}" "${RUN_ID}" "${EVIDENCE_ROOT}/prepare-only.log" "${PREPARED_BMU_RECORD_KEYS}"
elif [[ "${SKIP_INITIAL_PREPARE}" == "true" ]]; then
  echo "[repro] skipping initial prepare; expecting pre-provisioned CHANNEL_NAME=${CHANNEL_NAME} CALIPER_RUN_ID=${RUN_ID}" | tee "${EVIDENCE_ROOT}/prepare-skip.log"
fi

echo 'run,log,env,expected,succ,fail,reject,successful_tps,throughput_tps,send_rate_tps,avg_latency_s' > "${RESULTS_CSV}"

RECONCILE_KEYS=()
declare -A RECONCILE_EXPECTED_BY_KEY=()

for (( i=1; i<=REPEAT_COUNT; i++ )); do
  wait_for_docker_idle "pre-run-${i}"
  run_number=$(( REPEAT_INDEX_BASE + i ))
  run_log="${EVIDENCE_ROOT}/caliper-repeat-${i}.log"
  run_env="${EVIDENCE_ROOT}/caliper-repeat-${i}.env"
  iteration_channel="${CHANNEL_NAME}"
  if [[ "${FRESH_CHANNEL_PER_REPEAT}" == "true" ]]; then
    iteration_channel="${CHANNEL_NAME}r${run_number}"
    if [[ "${CREATE_CHANNEL}" == "true" ]]; then
      create_benchmark_channel "${iteration_channel}"
      wait_for_docker_idle "post-channel-deploy-${iteration_channel}"
    fi
    iteration_run_id="${RUN_ID}-r${run_number}"
    prepare_run_id "${iteration_channel}" "${iteration_run_id}" "${EVIDENCE_ROOT}/prepare-only-${i}.log" "${PREPARED_BMU_RECORD_KEYS}"
    fc_start="${BMU_FC_START_BASE}"
  elif [[ "${FRESH_KEYS_PER_REPEAT}" == "true" ]]; then
    iteration_run_id="${RUN_ID}-r${run_number}"
    prepare_run_id "${iteration_channel}" "${iteration_run_id}" "${EVIDENCE_ROOT}/prepare-only-${i}.log" "${PREPARED_BMU_RECORD_KEYS}"
    fc_start="${BMU_FC_START_BASE}"
  else
    iteration_run_id="${RUN_ID}"
    if [[ "${DISJOINT_KEYS_PER_REPEAT}" == "true" ]]; then
      fc_start="${BMU_FC_START_BASE}"
    else
      fc_start=$(( BMU_FC_START_BASE + (i - 1) * BMU_FC_STRIDE ))
    fi
  fi
  key_offset=0
  if [[ "${DISJOINT_KEYS_PER_REPEAT}" == "true" ]]; then
    key_offset=$(( (run_number - 1) * RUN_BMU_RECORD_KEYS ))
  fi
  run_env_for_caliper="$(host_to_caliper_path "${run_env}")"
  txmap_dir_for_caliper=""
  txmap_env_args=()
  if [[ -n "${CALIPER_TXMAP_DIR_HOST}" ]]; then
    txmap_dir_for_caliper="$(host_to_caliper_path "${CALIPER_TXMAP_DIR_HOST}")"
    txmap_env_args=("CALIPER_TXMAP_DIR=${txmap_dir_for_caliper}")
  fi
  echo "[repro] run ${i}/${REPEAT_COUNT}: logical=${run_number} CHANNEL_NAME=${iteration_channel} CALIPER_RUN_ID=${iteration_run_id} BMU_FC_START=${fc_start} BMU_RECORD_KEY_OFFSET=${key_offset} log=${run_log}"
  stats_log="${EVIDENCE_ROOT}/docker-stats-repeat-${i}.log"
  stats_pid="$(start_docker_stats_monitor "repeat-${i}" "${stats_log}")"
  iostat_log="${EVIDENCE_ROOT}/iostat-repeat-${i}.log"
  iostat_pid="$(start_iostat_monitor "repeat-${i}" "${iostat_log}")"
  pidstat_log="${EVIDENCE_ROOT}/pidstat-repeat-${i}.log"
  pidstat_pid="$(start_pidstat_monitor "repeat-${i}" "${pidstat_log}")"
  # Keep record IDs compact: RUN_ID is already folded into recordPrefix by the workload,
  # so the repeat number is sufficient to keep records unique across repeats.
  set +e
  run_caliper_workspace "${ORG}" \
    "CHANNEL_NAME=${iteration_channel}" \
    "CALIPER_RUN_ID=${iteration_run_id}" \
    "CALIPER_SKIP_PREPARE=true" \
    "CALIPER_VERIFY_PREPARED=${VERIFY_PREPARED_EACH_REPEAT}" \
    "BMU_FC_START=${fc_start}" \
    "CALIPER_RECORD_EPOCH=r${run_number}" \
    "BMU_RECORD_KEY_OFFSET=${key_offset}" \
    "CALIPER_WRITE_TX_NUMBER=${WRITE_TX_NUMBER}" \
    "CALIPER_WRITE_TARGET_TPS=${WRITE_TARGET_TPS}" \
    "CALIPER_READ_TX_NUMBER=${READ_TX_NUMBER}" \
    "CALIPER_READ_TARGET_TPS=${READ_TARGET_TPS}" \
    "CALIPER_SKIP_READ_ROUND=${SKIP_READ_ROUND}" \
    "CALIPER_RECORD_AUTO_ID=${RECORD_AUTO_ID}" \
    "NUM_PASSPORTS=${NUM_PASSPORTS}" \
    "BMU_RECORD_KEYS=${RUN_BMU_RECORD_KEYS}" \
    "CALIPER_RESULTS_ENV=${run_env_for_caliper}" \
    "${txmap_env_args[@]}" \
    > "${run_log}" 2>&1
  run_rc=$?
  set -e
  stop_background_monitor "${stats_pid}"
  stop_background_monitor "${iostat_pid}"
  stop_background_monitor "${pidstat_pid}"
  if (( run_rc != 0 )); then
    echo "[repro] Caliper repeat ${i} failed with rc=${run_rc}; stats logs=${stats_log},${iostat_log},${pidstat_log}" >&2
    exit "${run_rc}"
  fi

  # shellcheck disable=SC1090
  source "${run_env}"
  send_rate="$(grep -E 'write-bmu-data: Succ ' "${run_log}" | sed -E 's/.*Send Rate ([0-9.]+) TPS.*/\1/' | tail -1)"
  avg_latency="$(grep -E 'write-bmu-data: Succ ' "${run_log}" | sed -E 's/.*Avg Latency ([0-9.]+)s.*/\1/' | tail -1)"
  echo "${i},${run_log},${run_env},${WRITE_TX_NUMBER},${WRITE_SUCC_COUNT},${WRITE_FAIL_COUNT},${WRITE_REJECT_COUNT},${SUCCESSFUL_WRITE_TPS},${WRITE_THROUGHPUT_TPS},${send_rate},${avg_latency}" >> "${RESULTS_CSV}"
  reconcile_key="${iteration_channel}|${iteration_run_id}"
  if [[ -z "${RECONCILE_EXPECTED_BY_KEY[$reconcile_key]+set}" ]]; then
    RECONCILE_KEYS+=("${reconcile_key}")
    RECONCILE_EXPECTED_BY_KEY[$reconcile_key]=0
  fi
  current_expected="${RECONCILE_EXPECTED_BY_KEY[$reconcile_key]}"
  RECONCILE_EXPECTED_BY_KEY[$reconcile_key]=$(( current_expected + WRITE_TX_NUMBER ))
  wait_for_docker_idle "post-run-${i}"
  wait_for_peer_heights_equal "${iteration_channel}" "post-run-${i}"
done

if [[ "${RECONCILE_AFTER_RUNS}" == "true" ]]; then
  reconcile_log="${EVIDENCE_ROOT}/ledger-reconciliation.log"
  reconcile_status=0
  echo "[repro] collecting ledger/CouchDB reconciliation evidence" | tee "${reconcile_log}"
  for (( r=0; r<${#RECONCILE_KEYS[@]}; r++ )); do
    reconcile_key="${RECONCILE_KEYS[$r]}"
    iteration_channel="${reconcile_key%%|*}"
    iteration_run_id="${reconcile_key#*|}"
    expected_for_key="${RECONCILE_EXPECTED_BY_KEY[$reconcile_key]}"
    suffix=""
    if (( ${#RECONCILE_KEYS[@]} > 1 )); then
      suffix="-$((r + 1))"
    fi
    out="${EVIDENCE_ROOT}/ledger-reconciliation${suffix}.json"
    txmap_arg=()
    if [[ -n "${CALIPER_TXMAP_DIR_HOST}" ]]; then
      txmap_arg=(--txmap-dir "${CALIPER_TXMAP_DIR_HOST}")
    fi
    if ! node "${ROOT_DIR}/scripts/reconcile-benchmark-state.js" \
      --run-id "${iteration_run_id}" \
      --channel "${iteration_channel}" \
      --expected "${expected_for_key}" \
      --evidence-dir "${EVIDENCE_ROOT}" \
      --summary "${SUMMARY_JSON}" \
      --csv "${RESULTS_CSV}" \
      "${txmap_arg[@]}" \
      --output "${out}" >> "${reconcile_log}" 2>&1; then
      reconcile_status=1
      echo "[repro] reconciliation failed for run_id=${iteration_run_id} channel=${iteration_channel} expected=${expected_for_key} output=${out}" | tee -a "${reconcile_log}"
      if [[ "${RECONCILE_REQUIRED}" == "true" ]]; then
        exit 5
      fi
    else
      echo "[repro] reconciliation written: ${out}" | tee -a "${reconcile_log}"
    fi
  done
  if (( reconcile_status != 0 )); then
    echo "[repro] reconciliation completed with non-fatal errors; set RECONCILE_REQUIRED=true to fail hard" | tee -a "${reconcile_log}"
  fi
fi

if [[ "${IDENTIFY_LEDGER_VALIDITY_AFTER_RUNS}" == "true" ]]; then
  ledger_validity_log="${EVIDENCE_ROOT}/ledger-validity.log"
  ledger_validity_status=0
  echo "[repro] collecting ledgerutil validation evidence" | tee "${ledger_validity_log}"
  for (( r=0; r<${#RECONCILE_KEYS[@]}; r++ )); do
    reconcile_key="${RECONCILE_KEYS[$r]}"
    iteration_channel="${reconcile_key%%|*}"
    iteration_run_id="${reconcile_key#*|}"
    expected_for_key="${RECONCILE_EXPECTED_BY_KEY[$reconcile_key]}"
    suffix=""
    if (( ${#RECONCILE_KEYS[@]} > 1 )); then
      suffix="-$((r + 1))"
    fi
    txmap_arg=()
    if [[ -n "${CALIPER_TXMAP_DIR_HOST}" ]]; then
      txmap_arg=(--txmap-dir "${CALIPER_TXMAP_DIR_HOST}")
    fi
    out_dir="${EVIDENCE_ROOT}/ledger-validity${suffix}"
    if ! scripts/identify-benchmark-ledger-validity.sh \
      --run-id "${iteration_run_id}" \
      --channel "${iteration_channel}" \
      --expected "${expected_for_key}" \
      --evidence-dir "${EVIDENCE_ROOT}" \
      --output-dir "${out_dir}" \
      "${txmap_arg[@]}" >> "${ledger_validity_log}" 2>&1; then
      ledger_validity_status=1
      echo "[repro] ledgerutil validation failed for run_id=${iteration_run_id} channel=${iteration_channel} expected=${expected_for_key} output=${out_dir}" | tee -a "${ledger_validity_log}"
      if [[ "${IDENTIFY_LEDGER_VALIDITY_REQUIRED}" == "true" ]]; then
        exit 6
      fi
    else
      echo "[repro] ledgerutil validation written: ${out_dir}/summary.json" | tee -a "${ledger_validity_log}"
    fi
  done
  if (( ledger_validity_status != 0 )); then
    echo "[repro] ledgerutil validation completed with non-fatal errors; set IDENTIFY_LEDGER_VALIDITY_REQUIRED=true to fail hard" | tee -a "${ledger_validity_log}"
  fi
fi

python3 - "${RESULTS_CSV}" "${SUMMARY_ENV}" "${SUMMARY_JSON}" "${RUN_ID}" "${CHANNEL_NAME}" "${EVIDENCE_ROOT}" "${LIVE_DIAGNOSTIC_LOG}" <<'PY'
import csv, json, math, statistics, sys
csv_path, env_path, json_path, run_id, channel, evidence, live_log = sys.argv[1:]
rows=[]
with open(csv_path, newline='') as f:
    for row in csv.DictReader(f):
        rows.append(row)
if not rows:
    raise SystemExit('no repeat rows')
tps=[float(r['successful_tps']) for r in rows]
succ=[int(r['succ']) for r in rows]
expected=[int(r['expected']) for r in rows]
fails=[int(r['fail']) for r in rows]
rejects=[int(r['reject']) for r in rows]

def percentile_nearest_rank(values, percentile):
    ordered = sorted(values)
    rank = max(1, math.ceil((percentile / 100.0) * len(ordered)))
    return ordered[rank - 1]

summary={
    'runId': run_id,
    'channel': channel,
    'basis': 'successful_commit',
    'repeatRunCount': len(rows),
    'minTps': min(tps),
    'p10Tps': percentile_nearest_rank(tps, 10),
    'p50Tps': statistics.median(tps),
    'medianTps': statistics.median(tps),
    'meanTps': statistics.mean(tps),
    'maxTps': max(tps),
    'stddevTps': statistics.pstdev(tps) if len(tps) > 1 else 0.0,
    'allRunsSuccExpected': all(s == e for s, e in zip(succ, expected)),
    'allRunsFailZero': all(v == 0 for v in fails),
    'allRunsRejectZero': all(v == 0 for v in rejects),
    'runs': rows,
}
with open(json_path, 'w') as f:
    json.dump(summary, f, indent=2)
with open(env_path, 'w') as f:
    f.write('WRITE_KPI_BASIS=successful_commit\n')
    f.write(f'REPEAT_RUN_COUNT={len(rows)}\n')
    f.write(f'PHASE_A_MIN_TPS={summary["minTps"]:.1f}\n')
    f.write(f'WRITE200_MIN_TPS={summary["minTps"]:.1f}\n')
    f.write(f'WRITE200_P10_TPS={summary["p10Tps"]:.1f}\n')
    f.write(f'WRITE200_P50_TPS={summary["p50Tps"]:.1f}\n')
    f.write(f'WRITE200_MEDIAN_TPS={summary["medianTps"]:.1f}\n')
    f.write(f'WRITE200_MEAN_TPS={summary["meanTps"]:.1f}\n')
    f.write(f'WRITE200_MAX_TPS={summary["maxTps"]:.1f}\n')
    f.write(f'WRITE200_STDDEV_TPS={summary["stddevTps"]:.2f}\n')
    f.write(f'ALL_RUNS_SUCC_EXPECTED={str(summary["allRunsSuccExpected"]).lower()}\n')
    f.write(f'ALL_RUNS_FAIL_ZERO={str(summary["allRunsFailZero"]).lower()}\n')
    f.write(f'ALL_RUNS_REJECT_ZERO={str(summary["allRunsRejectZero"]).lower()}\n')
    f.write(f'REPEAT_RESULTS_CSV={csv_path}\n')
    f.write(f'EVIDENCE_BUNDLE={evidence}\n')
    f.write(f'LIVE_DIAGNOSTIC_LOG={live_log}\n')
print(json.dumps(summary, indent=2))
PY

{
  echo "[live-diagnostic] no reset performed"
  echo "timestamp=$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  docker exec peer0.manufacturer.battery.com peer channel getinfo -c passportchannel || true
} > "${LIVE_DIAGNOSTIC_LOG}" 2>&1

{
  echo "CALIPER_WRITE_TX_NUMBER=${WRITE_TX_NUMBER}"
  echo "CALIPER_WRITE_TARGET_TPS=${WRITE_TARGET_TPS}"
  echo "CALIPER_RECORD_AUTO_ID=${RECORD_AUTO_ID}"
  echo "CALIPER_WRITE_ROUND_LABEL=${CALIPER_WRITE_ROUND_LABEL}"
  echo "CALIPER_WRITE_WORKLOAD_MODULE=${CALIPER_WRITE_WORKLOAD_MODULE}"
  echo "CALIPER_WRITE_CONTRACT_FUNCTION=${CALIPER_WRITE_CONTRACT_FUNCTION}"
  echo "CALIPER_WORKERS=${CALIPER_WORKERS:-}"
  echo "NUM_PASSPORTS=${NUM_PASSPORTS}"
  echo "BMU_RECORD_KEYS=${BMU_RECORD_KEYS}"
  echo "PREPARED_BMU_RECORD_KEYS=${PREPARED_BMU_RECORD_KEYS}"
  echo "RUN_BMU_RECORD_KEYS=${RUN_BMU_RECORD_KEYS}"
  echo "BENCHMARK_PROFILE=${BENCHMARK_CHANNEL_PROFILE}"
  echo "BENCHMARK_CHANNEL_ORGS=${BENCHMARK_CHANNEL_ORGS}"
  echo "BENCHMARK_BATCH_TIMEOUT_HINT=${BENCHMARK_BATCH_TIMEOUT_HINT:-4s}"
  echo "BENCHMARK_MAX_MESSAGE_COUNT_HINT=${BENCHMARK_MAX_MESSAGE_COUNT_HINT:-2000}"
  echo "BENCHMARK_PREFERRED_MAX_BYTES_HINT=${BENCHMARK_PREFERRED_MAX_BYTES_HINT:-4MB}"
  echo "BENCHMARK_CC_INSTALL_ORGS=${BENCHMARK_CC_INSTALL_ORGS}"
  echo "BENCHMARK_CC_VERSION=${BENCHMARK_CC_VERSION}"
  echo "BENCHMARK_CC_SEQUENCE=${BENCHMARK_CC_SEQUENCE}"
  echo "BENCHMARK_CC_SRC_PATH=${BENCHMARK_CC_SRC_PATH}"
  printf 'BENCHMARK_CC_END_POLICY=%q\n' "${BENCHMARK_CC_END_POLICY}"
  echo "LIVE_DIAGNOSTIC_RECORDED=true"
  echo "LIVE_RESET_PERFORMED_FALSE=true"
  echo "LIVE_PASSPORTCHANNEL_DIAGNOSTIC_TPS=0"
} >> "${SUMMARY_ENV}"

cat "${SUMMARY_ENV}"
echo "[repro] summary: ${SUMMARY_JSON}"
