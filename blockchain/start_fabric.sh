#!/bin/bash
# Fabric 테스트 네트워크 시작 (WSL에서 실행)
cd /mnt/c/Users/<USER>/Desktop/BMS/blockchain/fabric-samples/test-network
export PATH="/mnt/c/Users/<USER>/Desktop/BMS/blockchain/fabric-samples/bin:$PATH"
export FABRIC_CFG_PATH="/mnt/c/Users/<USER>/Desktop/BMS/blockchain/fabric-samples/config"

echo "=== Fabric Network Down ==="
./network.sh down 2>&1 | tail -3

echo "=== Fabric Network Up ==="
./network.sh up createChannel -c bmschannel 2>&1 | tail -20
