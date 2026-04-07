#!/bin/bash
# 체인코드 업그레이드 스크립트
# 사용법: ./upgrade_chaincode.sh <version> <sequence>
# 예시:   ./upgrade_chaincode.sh 1.3 3

set -e

VERSION="${1:?Usage: $0 <version> <sequence>}"
SEQUENCE="${2:?Usage: $0 <version> <sequence>}"
CC_NAME="passport-contract"
CC_PATH="./chaincode/passport-contract"
CHANNEL="passportchannel"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
NET="$SCRIPT_DIR/passport-network/organizations"
PEER_BIN="$SCRIPT_DIR/fabric-samples/bin/peer"
FABRIC_CFG_PATH="$SCRIPT_DIR/passport-network/compose/docker/peercfg"
PKG_FILE="/tmp/${CC_NAME}-${VERSION}.tar.gz"

ORDERER_TLS_CA="$NET/ordererOrganizations/battery.com/orderers/orderer.battery.com/msp/tlscacerts/tlsca.battery.com-cert.pem"

PEERS=(
  "manufacturer:peer0.manufacturer.battery.com:ManufacturerMSP"
  "evmanufacturer:peer0.evmanufacturer.battery.com:EVManufacturerMSP"
  "service:peer0.service.battery.com:ServiceMSP"
  "regulator:peer0.regulator.battery.com:RegulatorMSP"
)

echo "=== Chaincode Upgrade: ${CC_NAME} v${VERSION} (sequence ${SEQUENCE}) ==="

# 1. Package
echo ""
echo "[1/4] Packaging chaincode..."
cd "$SCRIPT_DIR"
FABRIC_CFG_PATH="$FABRIC_CFG_PATH" $PEER_BIN lifecycle chaincode package "$PKG_FILE" \
  --path "$CC_PATH" --lang golang --label "${CC_NAME}_${VERSION}"
echo "  Package: $PKG_FILE"

# 2. Install on all peers
echo ""
echo "[2/4] Installing on all peers..."
for ENTRY in "${PEERS[@]}"; do
  IFS=':' read -r ORG PEER MSP <<< "$ENTRY"
  echo "  Installing on $PEER..."
  docker cp "$PKG_FILE" "${PEER}:/tmp/chaincode.tar.gz"
  ADMIN_MSP="$NET/peerOrganizations/${ORG}.battery.com/users/Admin@${ORG}.battery.com/msp"
  docker cp "$ADMIN_MSP" "${PEER}:/tmp/admin-msp"
  docker exec -e CORE_PEER_MSPCONFIGPATH=/tmp/admin-msp \
    "$PEER" peer lifecycle chaincode install /tmp/chaincode.tar.gz 2>&1 | tail -1
done

# Get package ID
CC_PKG_ID=$(docker exec -e CORE_PEER_MSPCONFIGPATH=/tmp/admin-msp \
  peer0.manufacturer.battery.com peer lifecycle chaincode queryinstalled 2>&1 \
  | grep "${CC_NAME}_${VERSION}" | sed 's/.*Package ID: //' | sed 's/, Label.*//')
echo "  Package ID: $CC_PKG_ID"

if [ -z "$CC_PKG_ID" ]; then
  echo "ERROR: Failed to get package ID"
  exit 1
fi

# 3. Approve for all orgs
echo ""
echo "[3/4] Approving for all orgs..."
for ENTRY in "${PEERS[@]}"; do
  IFS=':' read -r ORG PEER MSP <<< "$ENTRY"
  echo "  Approving for $MSP..."
  docker cp "$ORDERER_TLS_CA" "${PEER}:/tmp/orderer-tls-ca.pem"
  docker exec -e CORE_PEER_MSPCONFIGPATH=/tmp/admin-msp \
    "$PEER" peer lifecycle chaincode approveformyorg \
    -o orderer.battery.com:7050 --channelID "$CHANNEL" \
    --name "$CC_NAME" --version "$VERSION" --package-id "$CC_PKG_ID" --sequence "$SEQUENCE" \
    --tls --cafile /tmp/orderer-tls-ca.pem 2>&1 | tail -1
done

# 4. Commit
echo ""
echo "[4/4] Committing..."
COMMIT_PEER="peer0.manufacturer.battery.com"

# Copy other peers' TLS certs to commit peer
docker cp "$NET/peerOrganizations/evmanufacturer.battery.com/peers/peer0.evmanufacturer.battery.com/tls/ca.crt" "${COMMIT_PEER}:/tmp/evmfg-tls-ca.pem"
docker cp "$NET/peerOrganizations/service.battery.com/peers/peer0.service.battery.com/tls/ca.crt" "${COMMIT_PEER}:/tmp/service-tls-ca.pem"
docker cp "$NET/peerOrganizations/regulator.battery.com/peers/peer0.regulator.battery.com/tls/ca.crt" "${COMMIT_PEER}:/tmp/regulator-tls-ca.pem"

docker exec -e CORE_PEER_MSPCONFIGPATH=/tmp/admin-msp \
  "$COMMIT_PEER" peer lifecycle chaincode commit \
  -o orderer.battery.com:7050 --channelID "$CHANNEL" \
  --name "$CC_NAME" --version "$VERSION" --sequence "$SEQUENCE" \
  --tls --cafile /tmp/orderer-tls-ca.pem \
  --peerAddresses peer0.manufacturer.battery.com:7051 --tlsRootCertFiles /etc/hyperledger/fabric/tls/ca.crt \
  --peerAddresses peer0.evmanufacturer.battery.com:9051 --tlsRootCertFiles /tmp/evmfg-tls-ca.pem \
  --peerAddresses peer0.service.battery.com:11051 --tlsRootCertFiles /tmp/service-tls-ca.pem \
  --peerAddresses peer0.regulator.battery.com:13051 --tlsRootCertFiles /tmp/regulator-tls-ca.pem \
  2>&1

# Verify
echo ""
echo "=== Verifying ==="
docker exec -e CORE_PEER_MSPCONFIGPATH=/tmp/admin-msp \
  "$COMMIT_PEER" peer lifecycle chaincode querycommitted \
  --channelID "$CHANNEL" --name "$CC_NAME" 2>&1

echo ""
echo "=== Done: ${CC_NAME} v${VERSION} (sequence ${SEQUENCE}) deployed ==="
