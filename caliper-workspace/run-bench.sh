#!/bin/bash
# Caliper 벤치마크 실행 스크립트
# 사용법:
#   ./run-bench.sh                    # 기본 (manufacturer)
#   ./run-bench.sh manufacturer       # Manufacturer org
#   ./run-bench.sh evmanufacturer     # EV Manufacturer org
#   NUM_PASSPORTS=500 ./run-bench.sh  # passport 수 변경

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
NETWORK_DIR="${SCRIPT_DIR}/../passport-network"
ORG_NAME="${1:-manufacturer}"
trap 'rm -f "${SCRIPT_DIR}/networkConfig.resolved.yaml" "${SCRIPT_DIR}/benchconfig.resolved.yaml"' EXIT

# Org → MSP/domain 매핑
declare -A ORG_MSP=(
    [manufacturer]="ManufacturerMSP"
    [evmanufacturer]="EVManufacturerMSP"
    [service]="ServiceMSP"
    [regulator]="RegulatorMSP"
)
declare -A ORG_DOMAIN=(
    [manufacturer]="manufacturer.battery.com"
    [evmanufacturer]="evmanufacturer.battery.com"
    [service]="service.battery.com"
    [regulator]="regulator.battery.com"
)

csv_to_array() {
    local -n out_ref=$1
    local csv=$2
    local raw item
    out_ref=()
    IFS=',' read -ra raw <<< "$csv"
    for item in "${raw[@]}"; do
        item="${item#"${item%%[![:space:]]*}"}"
        item="${item%"${item##*[![:space:]]}"}"
        if [ -n "$item" ]; then
            out_ref+=("$item")
        fi
    done
}

append_unique() {
    local -n out_ref=$1
    local item=$2
    local existing
    for existing in "${out_ref[@]}"; do
        if [ "$existing" = "$item" ]; then
            return
        fi
    done
    out_ref+=("$item")
}

join_csv() {
    local IFS=,
    echo "$*"
}

validate_org() {
    local org=$1
    if [ -z "${ORG_MSP[$org]}" ]; then
        echo "ERROR: Unknown org '$org'. Use: manufacturer, evmanufacturer, service, regulator"
        exit 1
    fi
}

validate_bmu_writer_org() {
    local org=$1
    case "$org" in
        manufacturer|evmanufacturer) ;;
        *)
            echo "ERROR: RecordBMUData writer org '$org' is not authorized. Use manufacturer and/or evmanufacturer."
            exit 1
            ;;
    esac
}

org_sk_file() {
    local org=$1
    local domain="${ORG_DOMAIN[$org]}"
    local admin_base="${NETWORK_DIR}/organizations/peerOrganizations/${domain}/users/Admin@${domain}/msp"
    local sk_file
    sk_file=$(ls "${admin_base}/keystore"/*_sk 2>/dev/null | head -1)
    if [ -z "$sk_file" ]; then
        echo "ERROR: No private key found in ${admin_base}/keystore/" >&2
        exit 1
    fi
    echo "$sk_file"
}

org_connprofile() {
    local org=$1
    if [ "$org" = "$ORG_NAME" ] && [ -n "${CALIPER_CONNPROFILE:-}" ]; then
        echo "${CALIPER_CONNPROFILE}"
    else
        echo "../passport-network/organizations/peerOrganizations/${ORG_DOMAIN[$org]}/connection-${org}.json"
    fi
}

write_network_org_block() {
    local org=$1
    local msp="${ORG_MSP[$org]}"
    local domain="${ORG_DOMAIN[$org]}"
    local sk_file
    sk_file=$(org_sk_file "$org")
    cat <<BLOCK
  - mspid: ${msp}
    connectionProfile:
      path: $(org_connprofile "$org")
      discover: true
    identities:
      certificates:
        - name: admin
          clientPrivateKey:
            path: ../passport-network/organizations/peerOrganizations/${domain}/users/Admin@${domain}/msp/keystore/$(basename "$sk_file")
          clientSignedCert:
            path: ../passport-network/organizations/peerOrganizations/${domain}/users/Admin@${domain}/msp/signcerts/cert.pem
BLOCK
}

validate_org "$ORG_NAME"
MSP="${ORG_MSP[$ORG_NAME]}"
DOMAIN="${ORG_DOMAIN[$ORG_NAME]}"
SUCCESSFUL_WRITE_MODE="${CALIPER_SUCCESSFUL_WRITE_MODE:-true}"
SKIP_PREPARE="${CALIPER_SKIP_PREPARE:-false}"
INPUT_CALIPER_RUN_ID="${CALIPER_RUN_ID:-}"

DEFAULT_WRITER_ORGS="$ORG_NAME"
if [ "${SUCCESSFUL_WRITE_MODE}" = "true" ]; then
    # Both orgs are authorized by RecordBMUData and distribute endorsement/gateway load
    # without relaxing contract validation or endorsement policy.
    DEFAULT_WRITER_ORGS="manufacturer,evmanufacturer"
fi
csv_to_array WRITER_ORG_LIST "${CALIPER_WRITER_ORGS:-$DEFAULT_WRITER_ORGS}"
if [ "${#WRITER_ORG_LIST[@]}" -eq 0 ]; then
    echo "ERROR: CALIPER_WRITER_ORGS resolved to an empty list"
    exit 1
fi

NETWORK_ORG_LIST=()
WRITER_MSP_LIST=()
append_unique NETWORK_ORG_LIST "$ORG_NAME"
for writer_org in "${WRITER_ORG_LIST[@]}"; do
    validate_org "$writer_org"
    validate_bmu_writer_org "$writer_org"
    append_unique NETWORK_ORG_LIST "$writer_org"
    WRITER_MSP_LIST+=("${ORG_MSP[$writer_org]}")
done
EFFECTIVE_WRITER_MSPS="${CALIPER_WRITER_MSPS:-$(join_csv "${WRITER_MSP_LIST[@]}")}"

# Primary org identity is used for passport setup and read round.
SK_FILE=$(org_sk_file "$ORG_NAME")
REL_CONNPROFILE="$(org_connprofile "$ORG_NAME")"
REL_KEYSTORE="../passport-network/organizations/peerOrganizations/${DOMAIN}/users/Admin@${DOMAIN}/msp/keystore/$(basename "$SK_FILE")"
REL_SIGNCERT="../passport-network/organizations/peerOrganizations/${DOMAIN}/users/Admin@${DOMAIN}/msp/signcerts/cert.pem"
if [ -z "${CHANNEL_NAME:-}" ]; then
    echo "ERROR: CHANNEL_NAME must be explicit for benchmark runs; refusing default live passportchannel." >&2
    exit 1
fi
if [ "${CHANNEL_NAME}" = "passportchannel" ] && [ "${CALIPER_ALLOW_LIVE_PASSPORTCHANNEL:-false}" != "true" ]; then
    echo "ERROR: run-bench refuses live passportchannel by default; use a disposable benchmark channel." >&2
    exit 1
fi

WORKER_COUNT="${CALIPER_WORKERS:-4}"
WRITE_TX_NUMBER="${CALIPER_WRITE_TX_NUMBER:-10000}"
READ_TX_NUMBER="${CALIPER_READ_TX_NUMBER:-1000}"
if ! [[ "${WORKER_COUNT}" =~ ^[0-9]+$ ]] || [ "${WORKER_COUNT}" -lt 1 ]; then
    echo "ERROR: CALIPER_WORKERS must be a positive integer." >&2
    exit 1
fi
if ! [[ "${WRITE_TX_NUMBER}" =~ ^[0-9]+$ ]] || [ "${WRITE_TX_NUMBER}" -lt 1 ]; then
    echo "ERROR: CALIPER_WRITE_TX_NUMBER must be a positive integer." >&2
    exit 1
fi
if [ $((WRITE_TX_NUMBER % WORKER_COUNT)) -ne 0 ]; then
    echo "ERROR: CALIPER_WRITE_TX_NUMBER (${WRITE_TX_NUMBER}) must be divisible by CALIPER_WORKERS (${WORKER_COUNT}) so Caliper submits the expected number of writes." >&2
    exit 1
fi
if [ "${CALIPER_SKIP_READ_ROUND:-false}" != "true" ]; then
    if ! [[ "${READ_TX_NUMBER}" =~ ^[0-9]+$ ]] || [ "${READ_TX_NUMBER}" -lt 1 ]; then
        echo "ERROR: CALIPER_READ_TX_NUMBER must be a positive integer." >&2
        exit 1
    fi
    if [ $((READ_TX_NUMBER % WORKER_COUNT)) -ne 0 ]; then
        echo "ERROR: CALIPER_READ_TX_NUMBER (${READ_TX_NUMBER}) must be divisible by CALIPER_WORKERS (${WORKER_COUNT}) so Caliper submits the expected number of reads." >&2
        exit 1
    fi
fi

if [ "${SKIP_PREPARE}" = "true" ]; then
    if [ -z "${INPUT_CALIPER_RUN_ID}" ]; then
        echo "ERROR: CALIPER_SKIP_PREPARE=true requires explicit CALIPER_RUN_ID for a pre-provisioned passport/DID set." >&2
        exit 1
    fi
    if [ "${CALIPER_REQUIRE_EXPLICIT_FC_START:-true}" = "true" ] && [ -z "${BMU_FC_START+x}" ]; then
        echo "ERROR: CALIPER_SKIP_PREPARE=true requires explicit BMU_FC_START. Use BMU_FC_START=0 for fresh prepared keys, or a value above ledger high-water when reusing keys." >&2
        exit 1
    fi
fi

WRITE_RATE_CONTROL_TYPE="${CALIPER_WRITE_RATE_CONTROL_TYPE:-fixed-rate}"
WRITE_RATE_CONTROL_OPTS_FILE="$(mktemp)"
case "${WRITE_RATE_CONTROL_TYPE}" in
    fixed-rate)
        printf '          tps: %s\n' "${CALIPER_WRITE_TARGET_TPS:-300}" > "${WRITE_RATE_CONTROL_OPTS_FILE}"
        ;;
    fixed-load)
        {
            printf '          startTps: %s\n' "${CALIPER_WRITE_TARGET_TPS:-300}"
            printf '          transactionLoad: %s\n' "${CALIPER_WRITE_TRANSACTION_LOAD:-1000}"
        } > "${WRITE_RATE_CONTROL_OPTS_FILE}"
        ;;
    fixed-feedback-rate)
        {
            printf '          tps: %s\n' "${CALIPER_WRITE_TARGET_TPS:-300}"
            printf '          transactionLoad: %s\n' "${CALIPER_WRITE_TRANSACTION_LOAD:-1000}"
            if [ -n "${CALIPER_WRITE_SLEEP_TIME:-}" ]; then
                printf '          sleepTime: %s\n' "${CALIPER_WRITE_SLEEP_TIME}"
            fi
        } > "${WRITE_RATE_CONTROL_OPTS_FILE}"
        ;;
    *)
        echo "ERROR: unsupported CALIPER_WRITE_RATE_CONTROL_TYPE '${WRITE_RATE_CONTROL_TYPE}'. Use fixed-rate, fixed-load, or fixed-feedback-rate." >&2
        rm -f "${WRITE_RATE_CONTROL_OPTS_FILE}"
        exit 1
        ;;
esac

# Generate resolved network and benchmark config
{
    cat <<HEADER
name: passport-network-caliper
version: "2.0.0"
caliper:
  blockchain: fabric

channels:
  - channelName: ${CHANNEL_NAME}
    contracts:
      - id: passport-contract

organizations:
HEADER
    for network_org in "${NETWORK_ORG_LIST[@]}"; do
        write_network_org_block "$network_org"
    done
} > "${SCRIPT_DIR}/networkConfig.resolved.yaml"

sed -e "s|WORKER_COUNT_PLACEHOLDER|${WORKER_COUNT}|" \
    -e "s|WRITE_TX_NUMBER_PLACEHOLDER|${WRITE_TX_NUMBER}|" \
    -e "s|WRITE_TARGET_TPS_PLACEHOLDER|${CALIPER_WRITE_TARGET_TPS:-300}|" \
    -e "s|WRITE_RATE_CONTROL_TYPE_PLACEHOLDER|${WRITE_RATE_CONTROL_TYPE}|" \
    -e "s|READ_TX_NUMBER_PLACEHOLDER|${READ_TX_NUMBER}|" \
    -e "s|READ_TARGET_TPS_PLACEHOLDER|${CALIPER_READ_TARGET_TPS:-2200}|" \
    "${SCRIPT_DIR}/benchconfig.yaml" > "${SCRIPT_DIR}/benchconfig.resolved.yaml"
awk -v replacement_file="${WRITE_RATE_CONTROL_OPTS_FILE}" '
    /WRITE_RATE_CONTROL_OPTS_PLACEHOLDER/ {
        while ((getline line < replacement_file) > 0) print line
        close(replacement_file)
        next
    }
    { print }
' "${SCRIPT_DIR}/benchconfig.resolved.yaml" > "${SCRIPT_DIR}/benchconfig.resolved.yaml.tmp"
mv "${SCRIPT_DIR}/benchconfig.resolved.yaml.tmp" "${SCRIPT_DIR}/benchconfig.resolved.yaml"
rm -f "${WRITE_RATE_CONTROL_OPTS_FILE}"
if [ "${CALIPER_SKIP_READ_ROUND:-false}" = "true" ]; then
    awk '/^    - label: read-passport/{exit} {print}' "${SCRIPT_DIR}/benchconfig.resolved.yaml" > "${SCRIPT_DIR}/benchconfig.resolved.yaml.tmp"
    mv "${SCRIPT_DIR}/benchconfig.resolved.yaml.tmp" "${SCRIPT_DIR}/benchconfig.resolved.yaml"
fi

DEFAULT_BMU_RECORD_KEYS="${NUM_PASSPORTS:-50}"
if [ "${SUCCESSFUL_WRITE_MODE}" = "true" ]; then
    DEFAULT_BMU_RECORD_KEYS="${WRITE_TX_NUMBER}"
fi

echo "=== Caliper Benchmark ==="
echo "  Org:  ${ORG_NAME} (${MSP})"
echo "  Writer orgs: $(join_csv "${WRITER_ORG_LIST[@]}")"
echo "  Writer MSPs: ${EFFECTIVE_WRITER_MSPS}"
echo "  Key:  $(basename "$SK_FILE")"
echo "  Passports: ${NUM_PASSPORTS:-50}"
echo "  BMU Record Keys: ${BMU_RECORD_KEYS:-${DEFAULT_BMU_RECORD_KEYS}}"
echo "  Successful write mode: ${SUCCESSFUL_WRITE_MODE}"
echo "  Channel: ${CHANNEL_NAME}"
echo "  Run ID: ${CALIPER_RUN_ID:-auto}"
echo "  Invoke/Query Timeout: ${CALIPER_FABRIC_TIMEOUT_INVOKEORQUERY:-180}s"
echo "  Workers: ${WORKER_COUNT}"
echo "  Write: ${WRITE_TX_NUMBER} tx @ ${CALIPER_WRITE_TARGET_TPS:-300} TPS"
echo "  Write rate control: ${WRITE_RATE_CONTROL_TYPE}"
if [ "${WRITE_RATE_CONTROL_TYPE}" != "fixed-rate" ]; then
    echo "  Write transaction load: ${CALIPER_WRITE_TRANSACTION_LOAD:-1000}"
fi
echo "  Read:  ${READ_TX_NUMBER} tx @ ${CALIPER_READ_TARGET_TPS:-2200} TPS"
echo "  Skip prepare: ${SKIP_PREPARE}"
echo "  Verify prepared: ${CALIPER_VERIFY_PREPARED:-${SKIP_PREPARE}}"
echo "  Record AutoID: ${CALIPER_RECORD_AUTO_ID:-false}"
echo "========================="

cd "$SCRIPT_DIR"

# Pass benchmark sizing and identities to workloads via env.
export NUM_PASSPORTS="${NUM_PASSPORTS:-50}"
export BMU_RECORD_KEYS="${BMU_RECORD_KEYS:-${DEFAULT_BMU_RECORD_KEYS}}"
export CALIPER_RUN_ID="${CALIPER_RUN_ID:-$(date -u +%Y%m%d%H%M%S)}"
export CALIPER_ORG_MSP="${MSP}"
export CALIPER_WRITER_MSPS="${EFFECTIVE_WRITER_MSPS}"
export CALIPER_RECORD_AUTO_ID="${CALIPER_RECORD_AUTO_ID:-false}"
export ORG_CONNPROFILE="${REL_CONNPROFILE}"
export ORG_KEYSTORE="${REL_KEYSTORE}"
export ORG_SIGNCERT="${REL_SIGNCERT}"
export CHANNEL_NAME
export CALIPER_LOGGING_TARGETS_CONSOLE_OPTIONS_LEVEL="${CALIPER_LOGGING_TARGETS_CONSOLE_OPTIONS_LEVEL:-none}"
export CALIPER_VERIFY_PREPARED="${CALIPER_VERIFY_PREPARED:-${SKIP_PREPARE}}"
echo "  Resolved Run ID: ${CALIPER_RUN_ID}"
echo "  Caliper log level: ${CALIPER_LOGGING_TARGETS_CONSOLE_OPTIONS_LEVEL}"

if [ "${SKIP_PREPARE}" = "true" ]; then
    echo "[prepare-passports] skipped by CALIPER_SKIP_PREPARE=true"
else
    node prepare-passports.js
fi

if [ "${CALIPER_VERIFY_PREPARED}" = "true" ]; then
    node verify-passports.js
fi

if [ "${CALIPER_PREPARE_ONLY:-false}" = "true" ]; then
    echo "[prepare-passports] prepare-only complete; skipping Caliper workload rounds"
    exit 0
fi

npx caliper launch manager \
  --caliper-workspace ./ \
  --caliper-networkconfig networkConfig.resolved.yaml \
  --caliper-benchconfig benchconfig.resolved.yaml \
  --caliper-fabric-timeout-invokeorquery "${CALIPER_FABRIC_TIMEOUT_INVOKEORQUERY:-180}" \
  --caliper-flow-only-test

node parse-caliper-report.js report.html
