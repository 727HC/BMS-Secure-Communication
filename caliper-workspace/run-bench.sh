#!/bin/bash
# Caliper 벤치마크 실행 스크립트
# 사용법:
#   ./run-bench.sh                    # 기본 (manufacturer)
#   ./run-bench.sh manufacturer       # Manufacturer org
#   ./run-bench.sh evmanufacturer      # EV Manufacturer org
#   ./run-bench.sh service             # Service org
#   ./run-bench.sh regulator           # Regulator org
#   NUM_PASSPORTS=500 ./run-bench.sh   # passport 수 변경

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
NETWORK_DIR="${SCRIPT_DIR}/../passport-network"
ORG_NAME="${1:-manufacturer}"

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

MSP="${ORG_MSP[$ORG_NAME]}"
DOMAIN="${ORG_DOMAIN[$ORG_NAME]}"

if [ -z "$MSP" ]; then
    echo "ERROR: Unknown org '$ORG_NAME'. Use: manufacturer, evmanufacturer, service, regulator"
    exit 1
fi

ORG_BASE="${NETWORK_DIR}/organizations/peerOrganizations/${DOMAIN}"
ADMIN_BASE="${ORG_BASE}/users/Admin@${DOMAIN}/msp"

# Find keystore dynamically
SK_FILE=$(ls "${ADMIN_BASE}/keystore"/*_sk 2>/dev/null | head -1)
if [ -z "$SK_FILE" ]; then
    echo "ERROR: No private key found in ${ADMIN_BASE}/keystore/"
    exit 1
fi

# Relative paths from caliper-workspace
REL_CONNPROFILE="../passport-network/organizations/peerOrganizations/${DOMAIN}/connection-${ORG_NAME}.json"
REL_KEYSTORE="../passport-network/organizations/peerOrganizations/${DOMAIN}/users/Admin@${DOMAIN}/msp/keystore/$(basename "$SK_FILE")"
REL_SIGNCERT="../passport-network/organizations/peerOrganizations/${DOMAIN}/users/Admin@${DOMAIN}/msp/signcerts/cert.pem"

# Generate resolved config
sed -e "s|ORG_MSP_PLACEHOLDER|${MSP}|" \
    -e "s|ORG_CONNPROFILE_PLACEHOLDER|${REL_CONNPROFILE}|" \
    -e "s|ORG_KEYSTORE_PLACEHOLDER|${REL_KEYSTORE}|" \
    -e "s|ORG_SIGNCERT_PLACEHOLDER|${REL_SIGNCERT}|" \
    "${SCRIPT_DIR}/networkConfig.yaml" > "${SCRIPT_DIR}/networkConfig.resolved.yaml"

echo "=== Caliper Benchmark ==="
echo "  Org:  ${ORG_NAME} (${MSP})"
echo "  Key:  $(basename "$SK_FILE")"
echo "  Passports: ${NUM_PASSPORTS:-50}"
echo "========================="

cd "$SCRIPT_DIR"

# Pass NUM_PASSPORTS to workloads via env
export NUM_PASSPORTS="${NUM_PASSPORTS:-50}"

npx caliper launch manager \
  --caliper-workspace ./ \
  --caliper-networkconfig networkConfig.resolved.yaml \
  --caliper-benchconfig benchconfig.yaml \
  --caliper-flow-only-test

# Cleanup
rm -f "${SCRIPT_DIR}/networkConfig.resolved.yaml"
