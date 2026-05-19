#!/usr/bin/env bash
# Invoke ResetFCForDID safely through the local Fabric peer CLI.
# Usage: [ORG=1] [CHANNEL_NAME=passportchannel] [CC_NAME=passport-contract] \
#   scripts/invoke-reset-fc-for-did.sh <did> <reason> [passport_id]

set -eo pipefail

usage() {
  cat >&2 <<'USAGE'
Usage: scripts/invoke-reset-fc-for-did.sh <did> <reason> [passport_id]

Environment:
  ORG=1|4                       Invoker org. 1=ManufacturerMSP, 4=RegulatorMSP. Default: 1
  CHANNEL_NAME=passportchannel   Fabric channel. Default: passportchannel
  CC_NAME=passport-contract      Chaincode name. Default: passport-contract

Example:
  scripts/invoke-reset-fc-for-did.sh \
    HgBpAxtHJ4qRwsNiroaqvC \
    "BMU board reboot mid-session caused FC counter reset to 1. Restoring continuity for production validation." \
    MATLAB-BMU-002
USAGE
}

if [ "$#" -lt 2 ] || [ "$#" -gt 3 ]; then
  usage
  exit 64
fi

DID="$1"
REASON="$2"
PASSPORT_ID="${3:-}"
ORG="${ORG:-1}"
CHANNEL_NAME="${CHANNEL_NAME:-passportchannel}"
CC_NAME="${CC_NAME:-passport-contract}"

if [ -z "$DID" ] || [ -z "$REASON" ]; then
  usage
  exit 64
fi
if [ "${#REASON}" -lt 10 ]; then
  echo "ERROR: reason must be at least 10 characters" >&2
  exit 64
fi
if [ "$ORG" != "1" ] && [ "$ORG" != "4" ]; then
  echo "ERROR: ORG must be 1 (ManufacturerMSP) or 4 (RegulatorMSP) for ResetFCForDID" >&2
  exit 64
fi

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
NETWORK_HOME="$ROOT_DIR/passport-network"
export PATH="$ROOT_DIR/fabric-samples/bin:$PATH"
export FABRIC_CFG_PATH="$ROOT_DIR/fabric-samples/config"
export NETWORK_HOME

# shellcheck disable=SC1091
source "$NETWORK_HOME/scripts/envVar.sh"
setGlobals "$ORG" >/dev/null

INVOKE_PAYLOAD="$(python3 - "$DID" "$REASON" <<'PY'
import json
import sys
print(json.dumps({"Args": ["ResetFCForDID", sys.argv[1], sys.argv[2]]}, separators=(",", ":")))
PY
)"

peer chaincode invoke \
  -o localhost:7050 \
  --ordererTLSHostnameOverride orderer.battery.com \
  --tls --cafile "$ORDERER_CA" \
  -C "$CHANNEL_NAME" -n "$CC_NAME" \
  --peerAddresses "$CORE_PEER_ADDRESS" \
  --tlsRootCertFiles "$CORE_PEER_TLS_ROOTCERT_FILE" \
  -c "$INVOKE_PAYLOAD"

if [ -n "$PASSPORT_ID" ]; then
  QUERY_PAYLOAD="$(python3 - "$PASSPORT_ID" "$DID" <<'PY'
import json
import sys
print(json.dumps({"Args": ["CheckBMUHotBinding", sys.argv[1], sys.argv[2]]}, separators=(",", ":")))
PY
)"
  peer chaincode query -C "$CHANNEL_NAME" -n "$CC_NAME" -c "$QUERY_PAYLOAD"
fi
