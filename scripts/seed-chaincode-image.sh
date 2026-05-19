#!/usr/bin/env bash
# Explicitly document and reproduce the rare Fabric dev-mode image seeding
# workaround used when a peer expects an already-built chaincode image but the
# local builder did not materialize it. This script is opt-in and refuses to
# guess source/target image names.
set -euo pipefail

SOURCE_IMAGE="${CHAINCODE_IMAGE_SEED_SOURCE:-}"
TARGET_IMAGE="${CHAINCODE_IMAGE_SEED_TARGET:-}"
OVERWRITE="${CHAINCODE_IMAGE_SEED_OVERWRITE:-false}"

usage() {
  cat <<USAGE
Usage:
  CHAINCODE_IMAGE_SEED_SOURCE=<existing-image> \\
  CHAINCODE_IMAGE_SEED_TARGET=<expected-dev-peer-image> \\
    $0

Safety:
  - source and target are required; no implicit guessing
  - target must be a Fabric dev-peer chaincode image
  - existing target is kept unless CHAINCODE_IMAGE_SEED_OVERWRITE=true
USAGE
}

if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
  usage
  exit 0
fi
if [[ -z "${SOURCE_IMAGE}" || -z "${TARGET_IMAGE}" ]]; then
  usage >&2
  echo "ERROR: CHAINCODE_IMAGE_SEED_SOURCE and CHAINCODE_IMAGE_SEED_TARGET are required" >&2
  exit 64
fi
if ! [[ "${TARGET_IMAGE}" =~ ^dev-peer0\..*-passport-contract_.*:latest$ ]]; then
  echo "ERROR: refusing non passport-contract dev-peer target image: ${TARGET_IMAGE}" >&2
  exit 65
fi
if ! docker image inspect "${SOURCE_IMAGE}" >/dev/null 2>&1; then
  echo "ERROR: source image not found: ${SOURCE_IMAGE}" >&2
  exit 66
fi
if docker image inspect "${TARGET_IMAGE}" >/dev/null 2>&1 && [[ "${OVERWRITE}" != "true" ]]; then
  echo "seed skipped: target image already exists: ${TARGET_IMAGE}"
  exit 0
fi

docker tag "${SOURCE_IMAGE}" "${TARGET_IMAGE}"
echo "seeded chaincode image: ${SOURCE_IMAGE} -> ${TARGET_IMAGE}"
