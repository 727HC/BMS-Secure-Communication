#!/usr/bin/env bash
# Guarded D-day reproducibility runner for exact passportchannel + PassportBenchmarkChannel.
# Dry-run by default; real execution requires destructive reset guards.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RUN_ID="${RUN_ID:-evaluation-dday-$(date -u +%Y%m%dT%H%M%SZ)}"
MODE="dry-run"
ORG="manufacturer"
CHANNEL_NAME="passportchannel"
PROFILE="PassportBenchmarkChannel"
WRITE_LOG="/tmp/caliper-${RUN_ID}-${CHANNEL_NAME}.log"
READ_LOG="/tmp/cloud-read-${RUN_ID}-${CHANNEL_NAME}.log"
RESULTS_ENV="${RESULTS_ENV:-/tmp/successful-kpi-${RUN_ID}-${CHANNEL_NAME}.env}"
mkdir -p "$(dirname "${RESULTS_ENV}")"

usage() {
  cat <<USAGE
Usage: $0 [--dry-run|--execute] [--run-id <id>] [--org <org>]

Dry-run is default. Real execution requires:
  CONFIRM_DESTRUCTIVE_RESET=true
  DESTRUCTIVE_RESET_PHRASE="RESET passportchannel for evaluation-dday"
USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run)
      MODE="dry-run"
      ;;
    --execute)
      MODE="execute"
      ;;
    --run-id)
      RUN_ID="$2"
      WRITE_LOG="/tmp/caliper-${RUN_ID}-${CHANNEL_NAME}.log"
      READ_LOG="/tmp/cloud-read-${RUN_ID}-${CHANNEL_NAME}.log"
      shift
      ;;
    --org)
      ORG="$2"
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "ERROR: unknown argument: $1" >&2
      usage >&2
      exit 64
      ;;
  esac
  shift
done

cat <<PLAN
=== Blockchain evaluation D-day plan ===
Mode: ${MODE}
Run ID: ${RUN_ID}
Channel: ${CHANNEL_NAME}
Channel profile: ${PROFILE}
Org: ${ORG}
Write log: ${WRITE_LOG}
Read log: ${READ_LOG}
Results env: ${RESULTS_ENV}
Sequence:
  1. guarded destructive reset via passport-network/scripts/evaluation-dday-reset.sh
  2. ./network.sh up
  3. CHANNEL_PROFILE=${PROFILE} ./network.sh createChannel -c ${CHANNEL_NAME}
  4. exact passport-contract deploy with 1-of-4 endorsement
  5. Caliper write on ${CHANNEL_NAME}
     NUM_PASSPORTS=${NUM_PASSPORTS:-500} BMU_RECORD_KEYS=${BMU_RECORD_KEYS:-${CALIPER_WRITE_TX_NUMBER:-10000}} CALIPER_WRITE_TX_NUMBER=${CALIPER_WRITE_TX_NUMBER:-10000}
  6. Cloud read benchmark
  7. Evidence collection
PLAN

if [[ "${MODE}" == "dry-run" ]]; then
  "${ROOT_DIR}/passport-network/scripts/evaluation-dday-reset.sh" --dry-run
  echo "DRY-RUN: no Fabric, reset, or benchmark command executed."
  exit 0
fi

if [[ "${FABRIC_CHANNEL:-passportchannel}" != "${CHANNEL_NAME}" ]]; then
  echo "ERROR: evaluation-dday channel-bound read evidence requires FABRIC_CHANNEL=${CHANNEL_NAME}; got ${FABRIC_CHANNEL:-unset}." >&2
  exit 2
fi

"${ROOT_DIR}/passport-network/scripts/evaluation-dday-reset.sh" --execute

cd "${ROOT_DIR}/passport-network"
./network.sh up
CHANNEL_PROFILE="${PROFILE}" ./network.sh createChannel -c "${CHANNEL_NAME}"
./network.sh deployCC \
  -ccn passport-contract \
  -ccp ../chaincode/passport-contract \
  -ccl go \
  -c "${CHANNEL_NAME}" \
  -ccep "OR('ManufacturerMSP.peer','EVManufacturerMSP.peer','ServiceMSP.peer','RegulatorMSP.peer')"

cd "${ROOT_DIR}/caliper-workspace"
CHANNEL_NAME="${CHANNEL_NAME}" \
NUM_PASSPORTS="${NUM_PASSPORTS:-500}" \
BMU_RECORD_KEYS="${BMU_RECORD_KEYS:-${CALIPER_WRITE_TX_NUMBER:-10000}}" \
CALIPER_WRITE_TARGET_TPS="${CALIPER_WRITE_TARGET_TPS:-300}" \
CALIPER_WRITE_TX_NUMBER="${CALIPER_WRITE_TX_NUMBER:-10000}" \
CALIPER_RUN_ID="${RUN_ID}" \
CALIPER_RESULTS_ENV="${RESULTS_ENV}" \
  ./run-bench.sh "${ORG}" > "${WRITE_LOG}" 2>&1

cd "${ROOT_DIR}"
BENCH_USER="${BENCH_USER:-bench}" \
BENCH_PASSWORD="${BENCH_PASSWORD:-BENCH_PASSWORD_PLACEHOLDER}" \
BENCH_ORG="${BENCH_ORG:-1}" \
  node scripts/tps-benchmark-cloud.js > "${READ_LOG}" 2>&1

CLOUD_READ_TPS="$(grep -Eo 'CLOUD READ TPS: [0-9.]+' "${READ_LOG}" | awk '{print $4}' | tail -1)"
{
  echo "CLOUD_READ_TPS=${CLOUD_READ_TPS}"
  echo "WRITE_LOG=${WRITE_LOG}"
  echo "READ_LOG=${READ_LOG}"
} >> "${RESULTS_ENV}"

node scripts/collect-blockchain-evidence.js \
  --mode evaluation-dday \
  --channel "${CHANNEL_NAME}" \
  --profile "${PROFILE}" \
  --run-id "${RUN_ID}" \
  --write-log "${WRITE_LOG}" \
  --read-log "${READ_LOG}" \
  --read-provenance channel-bound \
  --fabric-channel "${FABRIC_CHANNEL:-passportchannel}"
