#!/bin/bash
# Battery Passport 4-org Fabric network startup script
# Replaces start_fabric.sh for the integrated passport platform

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PASSPORT_NET="${SCRIPT_DIR}/passport-network"
FABRIC_SAMPLES="${SCRIPT_DIR}/fabric-samples"

export PATH="${FABRIC_SAMPLES}/bin:$PATH"
export FABRIC_CFG_PATH="${PASSPORT_NET}/configtx"

cd "$PASSPORT_NET" || { echo "passport-network directory not found"; exit 1; }

# .env 로드 (CA_ADMIN_USER, CA_ADMIN_PASSWORD, COUCHDB_USER, COUCHDB_PASSWORD)
if [ -f "${PASSPORT_NET}/.env" ]; then
  set -a
  source "${PASSPORT_NET}/.env"
  set +a
fi

# 필수 크레덴셜 검증
: "${CA_ADMIN_USER:?CA_ADMIN_USER must be set in passport-network/.env}"
: "${CA_ADMIN_PASSWORD:?CA_ADMIN_PASSWORD must be set in passport-network/.env}"
: "${COUCHDB_USER:?COUCHDB_USER must be set in passport-network/.env}"
: "${COUCHDB_PASSWORD:?COUCHDB_PASSWORD must be set in passport-network/.env}"

echo "=== Battery Passport Network ==="

# Parse arguments
ACTION="${1:-up}"
shift || true

case "$ACTION" in
  up)
    echo "=== Bringing up 4-org network ==="
    ./network.sh up -ca "$@"
    echo ""
    echo "=== Creating passportchannel ==="
    ./network.sh createChannel -c passportchannel
    echo ""
    echo "=== Deploying passport-contract chaincode ==="
    # Production endorsement policy: Manufacturer + any one partner org.
    ./network.sh deployCC \
      -ccn passport-contract \
      -ccp "${SCRIPT_DIR}/chaincode/passport-contract" \
      -ccl go \
      -c passportchannel \
      -ccep "OR('ManufacturerMSP.peer','EVManufacturerMSP.peer','ServiceMSP.peer','RegulatorMSP.peer')"
    echo ""
    echo "=== Passport Network Ready ==="
    echo "  Orderer:       localhost:7050"
    echo "  Manufacturer:  localhost:7051 (CA: 7054)"
    echo "  EVManufacturer: localhost:9051 (CA: 8054)"
    echo "  Service:       localhost:11051 (CA: 9054)"
    echo "  Regulator:     localhost:13051 (CA: 10054)"
    ;;
  down)
    echo "=== Tearing down network ==="
    ./network.sh down
    echo "=== Network stopped ==="
    ;;
  restart)
    echo "=== Restarting network ==="
    ./network.sh down
    sleep 2
    "$0" up
    ;;
  *)
    echo "Usage: $0 {up|down|restart}"
    exit 1
    ;;
esac
