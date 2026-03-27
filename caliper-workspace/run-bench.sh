#!/bin/bash
# Caliper 벤치마크 실행 스크립트
# keystore 파일명을 자동으로 찾아서 networkConfig.yaml에 주입

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
KEYSTORE_DIR="../passport-network/organizations/peerOrganizations/manufacturer.battery.com/users/Admin@manufacturer.battery.com/msp/keystore"

# Find the _sk file dynamically
SK_FILE=$(ls "${SCRIPT_DIR}/${KEYSTORE_DIR}"/*_sk 2>/dev/null | head -1)
if [ -z "$SK_FILE" ]; then
    echo "ERROR: No private key found in ${KEYSTORE_DIR}"
    exit 1
fi

# Convert to relative path from caliper-workspace
SK_REL="${KEYSTORE_DIR}/$(basename "$SK_FILE")"

# Replace placeholder in networkConfig
sed "s|KEYSTORE_PLACEHOLDER|${SK_REL}|" "${SCRIPT_DIR}/networkConfig.yaml" > "${SCRIPT_DIR}/networkConfig.resolved.yaml"

echo "Using key: $(basename "$SK_FILE")"
echo "Starting Caliper benchmark..."

cd "$SCRIPT_DIR"
npx caliper launch manager \
  --caliper-workspace ./ \
  --caliper-networkconfig networkConfig.resolved.yaml \
  --caliper-benchconfig benchconfig.yaml \
  --caliper-flow-only-test

# Cleanup
rm -f "${SCRIPT_DIR}/networkConfig.resolved.yaml"
