#!/usr/bin/env bash
# Non-destructive benchmark-safe reproducibility runner.
# Creates a generated benchmark channel and refuses passportchannel.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CHANNEL_NAME="${CHANNEL_NAME:-}"
RUN_ID="${RUN_ID:-benchmark-safe-$(date -u +%Y%m%dT%H%M%SZ)}"
MODE="execute"
ORG="manufacturer"
READ_PROVENANCE="${READ_MODEL_PROVENANCE:-independent-service-benchmark}"
FABRIC_CHANNEL_FOR_READ="${FABRIC_CHANNEL:-independent-read-model}"

usage() {
  cat <<USAGE
Usage: $0 [--dry-run|--execute] [--channel <name>] [--run-id <id>] [--org <org>]

Runs the routine non-destructive benchmark-safe track:
  generated non-passportchannel + PassportBenchmarkChannel + exact deploy args
  + Caliper write + cloud read + evidence bundle.

Environment overrides:
  CALIPER_WRITE_TARGET_TPS (default 300)
  CALIPER_WRITE_TX_NUMBER  (default 10000)
  NUM_PASSPORTS            (default 500)
  READ_MODEL_PROVENANCE    (default independent-service-benchmark)
  FABRIC_CHANNEL           (used only for read provenance metadata)
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
    --channel)
      CHANNEL_NAME="$2"
      shift
      ;;
    --run-id)
      RUN_ID="$2"
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

if [[ -z "${CHANNEL_NAME}" ]]; then
  CHANNEL_NAME="passportbench$(date -u +%Y%m%d%H%M%S)"
fi

if [[ "${CHANNEL_NAME}" == "passportchannel" ]]; then
  echo "ERROR: benchmark-safe refuses channel 'passportchannel'. Use evaluation-dday instead." >&2
  exit 2
fi

if [[ "${READ_PROVENANCE}" == "channel-bound" && "${FABRIC_CHANNEL_FOR_READ}" != "${CHANNEL_NAME}" ]]; then
  echo "ERROR: channel-bound read evidence requires FABRIC_CHANNEL=${CHANNEL_NAME}; got ${FABRIC_CHANNEL_FOR_READ}." >&2
  exit 2
fi

WRITE_LOG="/tmp/caliper-${RUN_ID}-${CHANNEL_NAME}.log"
READ_LOG="/tmp/cloud-read-${RUN_ID}-${CHANNEL_NAME}.log"
RESULTS_ENV="${RESULTS_ENV:-/tmp/successful-kpi-${RUN_ID}-${CHANNEL_NAME}.env}"
mkdir -p "$(dirname "${RESULTS_ENV}")"

cat <<PLAN
=== Blockchain benchmark-safe plan ===
Mode: ${MODE}
Run ID: ${RUN_ID}
Channel: ${CHANNEL_NAME}
Channel profile: PassportBenchmarkChannel
Org: ${ORG}
Write log: ${WRITE_LOG}
Read log: ${READ_LOG}
Results env: ${RESULTS_ENV}
Read provenance: ${READ_PROVENANCE}
Read fabric channel metadata: ${FABRIC_CHANNEL_FOR_READ}
Commands:
  cd passport-network
  CHANNEL_PROFILE=PassportBenchmarkChannel ./network.sh createChannel -c ${CHANNEL_NAME}
  ./network.sh deployCC -ccn passport-contract -ccp ../chaincode/passport-contract -ccl go -c ${CHANNEL_NAME} -ccep "OR('ManufacturerMSP.peer','EVManufacturerMSP.peer','ServiceMSP.peer','RegulatorMSP.peer')"
  cd ../caliper-workspace
  CHANNEL_NAME=${CHANNEL_NAME} NUM_PASSPORTS=${NUM_PASSPORTS:-500} BMU_RECORD_KEYS=${BMU_RECORD_KEYS:-${CALIPER_WRITE_TX_NUMBER:-10000}} CALIPER_WRITE_TARGET_TPS=${CALIPER_WRITE_TARGET_TPS:-300} CALIPER_WRITE_TX_NUMBER=${CALIPER_WRITE_TX_NUMBER:-10000} ./run-bench.sh ${ORG}
  cd ..
  BENCH_USER=bench BENCH_PASSWORD=BENCH_PASSWORD_PLACEHOLDER BENCH_ORG=1 node scripts/tps-benchmark-cloud.js
  node scripts/collect-blockchain-evidence.js --mode benchmark-safe --channel ${CHANNEL_NAME} --profile PassportBenchmarkChannel --run-id ${RUN_ID} --write-log ${WRITE_LOG} --read-log ${READ_LOG}
PLAN

if [[ "${MODE}" == "dry-run" ]]; then
  echo "DRY-RUN: no Fabric or benchmark command executed."
  exit 0
fi

cd "${ROOT_DIR}/passport-network"
CHANNEL_PROFILE=PassportBenchmarkChannel ./network.sh createChannel -c "${CHANNEL_NAME}"
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
  --mode benchmark-safe \
  --channel "${CHANNEL_NAME}" \
  --profile PassportBenchmarkChannel \
  --run-id "${RUN_ID}" \
  --write-log "${WRITE_LOG}" \
  --read-log "${READ_LOG}" \
  --read-provenance "${READ_PROVENANCE}" \
  --fabric-channel "${FABRIC_CHANNEL_FOR_READ}"
