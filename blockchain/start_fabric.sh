#!/bin/bash
# Fabric 테스트 네트워크 시작 (WSL에서 실행)
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
FABRIC_SAMPLES="${SCRIPT_DIR}/fabric-samples"

export PATH="${FABRIC_SAMPLES}/bin:$PATH"
export FABRIC_CFG_PATH="${FABRIC_SAMPLES}/config"

cd "${FABRIC_SAMPLES}/test-network" || { echo "fabric-samples not found. Run install-fabric.sh first."; exit 1; }

echo "=== Fabric Network Down ==="
./network.sh down 2>&1 | tail -3

echo "=== Fabric Network Up ==="
./network.sh up createChannel -c bmschannel 2>&1 | tail -20
