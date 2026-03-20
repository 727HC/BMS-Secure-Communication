#!/bin/bash
# BMS 블록체인 전체 원클릭 실행 스크립트
# VON Network + ACA-Py + Fabric Network + Agent 전부 실행
#
# 사용법:
#   ./start_all.sh              # 전체 실행
#   ./start_all.sh --skip-von   # VON/ACA-Py가 이미 실행 중이면 스킵
#   ./start_all.sh --skip-fabric # Fabric이 이미 실행 중이면 스킵
#   ./start_all.sh --agent-only  # Agent만 실행 (나머지 전부 스킵)

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
VON_DIR="${SCRIPT_DIR}/von-network"
AGENT_DIR="${SCRIPT_DIR}/bmu-agent"
LOG_DIR="${SCRIPT_DIR}/logs"
AGENT_PID=""

SKIP_VON=false
SKIP_FABRIC=false

for arg in "$@"; do
    case "$arg" in
        --skip-von)    SKIP_VON=true ;;
        --skip-fabric) SKIP_FABRIC=true ;;
        --agent-only)  SKIP_VON=true; SKIP_FABRIC=true ;;
    esac
done

cleanup() {
    echo ""
    echo "=== Shutting down ==="
    if [ -n "$AGENT_PID" ] && kill -0 "$AGENT_PID" 2>/dev/null; then
        echo "Stopping agent (PID: $AGENT_PID)..."
        kill "$AGENT_PID" 2>/dev/null
    fi
    echo "Done. (VON/ACA-Py/Fabric 컨테이너는 계속 실행 중)"
}
trap cleanup EXIT INT TERM

mkdir -p "$LOG_DIR"

# ============================================================
# [1/6] VON Network (Hyperledger Indy - 4 validator nodes)
# ============================================================
if $SKIP_VON; then
    echo "=== [1/6] VON Network: SKIPPED ==="
else
    echo "=== [1/6] Starting VON Network ==="
    if docker ps --format '{{.Names}}' | grep -q 'von-node1'; then
        echo "VON Network already running, skipping."
    else
        cd "$VON_DIR"
        docker compose up -d 2>&1 | tee "$LOG_DIR/von.log"
        # VON 준비 대기 (최대 30초)
        echo "Waiting for VON webserver..."
        for i in $(seq 1 6); do
            if curl -s http://localhost:9000/status 2>/dev/null | grep -q "ok"; then
                echo "VON Network ready."
                break
            fi
            sleep 5
            printf "."
        done
    fi
fi

# ============================================================
# [2/6] ACA-Py (Aries Cloud Agent)
# ============================================================
if $SKIP_VON; then
    echo "=== [2/6] ACA-Py: SKIPPED ==="
else
    echo "=== [2/6] Starting ACA-Py ==="
    if docker ps --format '{{.Names}}' | grep -q 'acapy-bmu'; then
        echo "ACA-Py already running, skipping."
    else
        docker run -d --name acapy-bmu \
            --network von_von \
            -p 8030:8030 -p 8031:8031 \
            ghcr.io/openwallet-foundation/acapy-agent:py3.12-1.2.2 \
            start \
            --label "BMU Agent" \
            --inbound-transport http 0.0.0.0 8030 \
            --outbound-transport http \
            --admin 0.0.0.0 8031 \
            --admin-insecure-mode \
            --genesis-url http://host.docker.internal:9000/genesis \
            --seed BMU001SecureBMSDevice00000000001 \
            --wallet-type askar \
            --wallet-name bmu_wallet2 \
            --wallet-key bmu_wallet_key \
            --auto-provision \
            --endpoint http://host.docker.internal:8030 \
            2>&1 | tee "$LOG_DIR/acapy.log"
        # ACA-Py 준비 대기 (최대 30초)
        echo "Waiting for ACA-Py..."
        for i in $(seq 1 6); do
            if curl -s http://localhost:8031/status 2>/dev/null | grep -q "version"; then
                echo "ACA-Py ready."
                break
            fi
            sleep 5
            printf "."
        done
    fi
fi

# ============================================================
# [3/6] Fabric Network + Chaincode 배포
# ============================================================
if $SKIP_FABRIC; then
    echo "=== [3/6] Fabric Network: SKIPPED ==="
else
    echo "=== [3/6] Starting Passport Network + deploying chaincode ==="
    "${SCRIPT_DIR}/start_passport_network.sh" up 2>&1 | tee "$LOG_DIR/fabric.log"
fi

# ============================================================
# [4/6] npm install
# ============================================================
echo "=== [4/6] Checking node_modules ==="
cd "$AGENT_DIR"
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install 2>&1 | tail -5
else
    echo "node_modules exists, skipping."
fi

# ============================================================
# [5/6] Wallet 초기화
# ============================================================
echo "=== [5/6] Checking wallet ==="
if [ -d "$AGENT_DIR/wallet" ]; then
    echo "Removing stale wallet for fresh enrollment..."
    rm -rf "$AGENT_DIR/wallet"
fi

# ============================================================
# [6/6] Agent 실행
# ============================================================
echo "=== [6/6] Starting Battery Passport Agent ==="
node "$AGENT_DIR/server.js" 2>&1 | tee "$LOG_DIR/agent.log" &
AGENT_PID=$!

# Fabric 연결 대기 (최대 60초)
echo "Waiting for Fabric connection..."
for i in $(seq 1 12); do
    sleep 5
    if curl -s http://localhost:3001/api/status 2>/dev/null | grep -q '"fabric":"connected"'; then
        echo ""
        echo "=========================================="
        echo "  Battery Passport Platform - All Ready!"
        echo ""
        echo "  VON Network: http://localhost:9000"
        echo "  ACA-Py:      http://localhost:8031"
        echo "  Agent API:   http://localhost:3001/api"
        echo "  Status:      http://localhost:3001/api/status"
        echo "=========================================="
        echo ""
        echo "Press Ctrl+C to stop agent."
        wait $AGENT_PID
        exit 0
    fi
    printf "."
done

echo ""
echo "[WARN] Fabric connection timeout. Agent may still be starting."
echo "Check logs: $LOG_DIR/agent.log"
wait $AGENT_PID
