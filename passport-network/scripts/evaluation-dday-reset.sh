#!/usr/bin/env bash
# Guarded destructive reset entrypoint for evaluation D-day only.
# Default is dry-run. Real execution requires explicit environment guards.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NETWORK_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
REQUIRED_PHRASE="RESET passportchannel for evaluation-dday"
MODE="dry-run"

usage() {
  cat <<USAGE
Usage: $0 [--dry-run|--execute]

Dry-run is the default. Real destructive reset requires:
  CONFIRM_DESTRUCTIVE_RESET=true
  DESTRUCTIVE_RESET_PHRASE="${REQUIRED_PHRASE}"

This wrapper is intentionally scoped to evaluation D-day. It does not change
routine developer ./network.sh down/restart behavior.
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

print_plan() {
  cat <<PLAN
=== Evaluation D-day destructive reset plan ===
Mode: ${MODE}
Target channel: passportchannel
Post-reset channel profile: PassportBenchmarkChannel
Destructive targets:
  - Docker compose resources and named volumes from passport-network compose files
  - Hyperledger Fabric containers and dev-peer chaincode containers/images
  - passport-network/channel-artifacts/*.block
  - passport-network/organizations/peerOrganizations
  - passport-network/organizations/ordererOrganizations
  - passport-network/organizations/fabric-ca/* generated MSP/TLS/DB material

Real execution command:
  CONFIRM_DESTRUCTIVE_RESET=true \
  DESTRUCTIVE_RESET_PHRASE="${REQUIRED_PHRASE}" \
    ${0} --execute
PLAN
}

print_plan

if [[ "${MODE}" != "execute" ]]; then
  echo "DRY-RUN: no destructive command executed."
  exit 0
fi

if [[ "${CONFIRM_DESTRUCTIVE_RESET:-}" != "true" ]]; then
  echo "ERROR: refusing destructive reset: CONFIRM_DESTRUCTIVE_RESET=true is required." >&2
  exit 2
fi

if [[ "${DESTRUCTIVE_RESET_PHRASE:-}" != "${REQUIRED_PHRASE}" ]]; then
  echo "ERROR: refusing destructive reset: DESTRUCTIVE_RESET_PHRASE must be exactly '${REQUIRED_PHRASE}'." >&2
  exit 2
fi

echo "CONFIRMED: executing evaluation D-day reset."
cd "${NETWORK_DIR}"
./network.sh down
