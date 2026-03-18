#!/bin/bash
# ===========================================
#  BMS 보안 통신 시스템 — 원스탑 실행 스크립트
# ===========================================
#  사용법:
#    ./start.sh                  전체 실행 (빌드+플래싱+시뮬레이터+모니터)
#    ./start.sh nosim            빌드+플래싱+모니터만 (시뮬레이터 없이)
#    ./start.sh simonly          시뮬레이터+모니터만 (빌드/플래싱 생략)
#    ./start.sh matlab           빌드+플래싱+MATLAB용 브릿지+모니터
#    ./start.sh blockchain       시뮬레이터+블록체인 브릿지 (Agent 수동 실행 필요)
#    ./start.sh blockchain-full  Fabric+Agent+빌드+플래싱+시뮬레이터+브릿지 원스탑
#  종료: Ctrl+C

set -e
BMS_DIR="$(cd "$(dirname "$0")" && pwd)"

if [ ! -f "$BMS_DIR/config.env" ]; then
    echo "!!! config.env 파일이 없습니다."
    echo "    config.env.example을 복사하여 환경에 맞게 수정하세요:"
    echo "    cp config.env.example config.env"
    exit 1
fi
source "$BMS_DIR/config.env"

export PATH="$TOOLCHAIN_PATH:$MAKE_PATH:$PATH"
LOG_DIR="$BMS_DIR/logs"
mkdir -p "$LOG_DIR"

cleanup() {
    echo ""
    echo "=== 종료 중... ==="
    kill $SIM_PID $BRIDGE_PID $WATCHDOG_PID $AGENT_PID 2>/dev/null
    wait $SIM_PID $BRIDGE_PID $WATCHDOG_PID $AGENT_PID 2>/dev/null
    echo "=== 완료 ==="
    exit 0
}
trap cleanup INT TERM

do_build_flash() {
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo " [1/4] 빌드 (build.sh 사용)"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    if ! "$BMS_DIR/build.sh" all 2>&1 | tee "$LOG_DIR/build.log" ; then
        echo "!!! 빌드 실패 — $LOG_DIR/build.log 확인"
        exit 1
    fi

    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo " [2/4] 플래싱 (BMU → CMU)"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    "$PEG_PATH" -device=$BMU_DEVICE \
      -interface=$BMU_INTERFACE -port=$BMU_PORT \
      -flashobjectfile="$BMS_DIR/$BMU_ELF" \
      -runafterprogramming -quitafterprogramming 2>&1 | tee -a "$LOG_DIR/flash.log"
    echo "  BMU GO"

    "$PEG_PATH" -device=$CMU_DEVICE \
      -interface=$CMU_INTERFACE -port=$CMU_PORT \
      -flashobjectfile="$BMS_DIR/$CMU_ELF" \
      -runafterprogramming -quitafterprogramming 2>&1 | tee -a "$LOG_DIR/flash.log"
    echo "  CMU GO"
}

do_simulator() {
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo " [3/4] 배터리 시뮬레이터 시작"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    cd "$BMS_DIR/firmware/tools"
    python -u dataProcess.py --port $CMU_COM --baud $CMU_UART_BAUD > "$LOG_DIR/dataProcess.log" 2>&1 &
    BRIDGE_PID=$!
    echo "  dataProcess.py (PID=$BRIDGE_PID) → $CMU_COM @ $CMU_UART_BAUD"
    sleep 1
    python -u battery_simulator.py --udp 2>&1 | sed 's/^/  [SIM] /' &
    SIM_PID=$!
    echo "  battery_simulator.py --udp (PID=$SIM_PID)"
}

do_matlab_bridge() {
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo " [3/4] MATLAB 브릿지 시작"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    cd "$BMS_DIR/firmware/tools"
    python -u dataProcess.py --port $CMU_COM --baud $CMU_UART_BAUD > "$LOG_DIR/dataProcess.log" 2>&1 &
    BRIDGE_PID=$!
    echo "  dataProcess.py (PID=$BRIDGE_PID) → $CMU_COM @ $CMU_UART_BAUD"
    echo "  MATLAB에서: run_bms_simulation"
}

do_monitor() {
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo " [4/4] BMU 시리얼 모니터"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "  $BMU_COM @ $BMU_BAUD baud (Ctrl+C 종료)"
    echo ""
    sleep 3
    python -u -c "
import serial, sys
ser = serial.Serial('$BMU_COM', $BMU_BAUD, timeout=1)
try:
    while True:
        data = ser.read(200)
        if data:
            text = bytes(b if 0x20 <= b <= 0x7E or b in (0x0D, 0x0A) else 0x2E for b in data)
            sys.stdout.write(text.decode())
            sys.stdout.flush()
except KeyboardInterrupt:
    pass
ser.close()
"
}

do_fabric_setup() {
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo " [0/4] Fabric 네트워크 + Agent 시작"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

    # Fabric 네트워크 시작 + 체인코드 배포
    echo "  Fabric 네트워크 시작 중... (Docker)"
    if ! "$BMS_DIR/blockchain/start_fabric.sh" 2>&1 | tee "$LOG_DIR/fabric.log"; then
        echo "!!! Fabric 네트워크 시작 실패 — $LOG_DIR/fabric.log 확인"
        exit 1
    fi
    echo "  Fabric 네트워크 준비 완료"

    # npm install (node_modules 없을 때만)
    cd "$BMS_DIR/blockchain/bmu-agent"
    if [ ! -d "node_modules" ]; then
        echo "  npm install 실행 중..."
        npm install > "$LOG_DIR/npm_install.log" 2>&1
    fi

    # Agent 백그라운드 실행
    echo "  Agent 시작 중 (agent_ingest_bmu.js → 포트 3001)..."
    node agent_ingest_bmu.js > "$LOG_DIR/agent.log" 2>&1 &
    AGENT_PID=$!
    echo "  Agent (PID=$AGENT_PID) 시작됨"

    # Agent 준비 대기 (최대 60초 — Fabric 연결 포함)
    echo "  Agent Fabric 연결 대기 중..."
    for i in $(seq 1 12); do
        if curl -s http://localhost:3001/status 2>/dev/null | grep -q '"fabric":"connected"'; then
            echo "  Agent + Fabric 연결 확인 완료"
            return 0
        fi
        if ! kill -0 $AGENT_PID 2>/dev/null; then
            echo "!!! Agent가 비정상 종료됨 — $LOG_DIR/agent.log 확인"
            exit 1
        fi
        echo "  대기 중... ($i/12)"
        sleep 5
    done
    echo "!!! Agent가 60초 내에 Fabric에 연결되지 않았습니다."
    echo "    $LOG_DIR/agent.log 를 확인하세요."
    exit 1
}

do_blockchain_bridge() {
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo " [4/4] 블록체인 브릿지"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "  BMU Serial($BMU_COM) → BMS Agent(http://localhost:3001)"
    echo ""
    if [ -z "$BMU_DID" ]; then
        echo "!!! BMU_DID가 config.env에 설정되지 않았습니다."
        echo "    블록체인 모드에서는 BMU_DID가 필수입니다."
        echo "    config.env에 BMU_DID=<your-did> 를 추가하세요."
        exit 1
    fi

    # Agent health check (최대 30초 대기)
    echo "  Agent 연결 확인 중..."
    for i in $(seq 1 6); do
        if curl -s -o /dev/null -w '' http://localhost:3001/status 2>/dev/null; then
            echo "  Agent 연결 확인 완료"
            break
        fi
        if [ $i -eq 6 ]; then
            echo "!!! BMS Agent(http://localhost:3001)에 연결할 수 없습니다."
            echo "    node agent_ingest_bmu.js 가 실행 중인지 확인하세요."
            exit 1
        fi
        echo "  Agent 대기 중... ($i/6)"
        sleep 5
    done

    # 백그라운드 프로세스 감시 (시뮬레이터/dataProcess 죽음 감지)
    if [ -n "$SIM_PID" ] || [ -n "$BRIDGE_PID" ]; then
        (
            while true; do
                sleep 30
                if [ -n "$SIM_PID" ] && ! kill -0 $SIM_PID 2>/dev/null; then
                    echo "  [WARN] battery_simulator.py (PID=$SIM_PID) 종료됨"
                    SIM_PID=""
                fi
                if [ -n "$BRIDGE_PID" ] && ! kill -0 $BRIDGE_PID 2>/dev/null; then
                    echo "  [WARN] dataProcess.py (PID=$BRIDGE_PID) 종료됨"
                    BRIDGE_PID=""
                fi
            done
        ) &
        WATCHDOG_PID=$!
    fi

    cd "$BMS_DIR/firmware/tools"
    python -u serial_to_agent.py --port $BMU_COM --baud $BMU_BAUD --agent http://localhost:3001 ${BMU_DID:+--did $BMU_DID}
}

echo "╔══════════════════════════════════════╗"
echo "║  BMS Secure Communication System    ║"
echo "║  AES-128 CMAC + CAN-FD + KDF       ║"
echo "╚══════════════════════════════════════╝"

case "${1:-full}" in
    full)      do_build_flash; do_simulator; do_monitor ;;
    nosim)     do_build_flash; do_monitor ;;
    simonly)   do_simulator; do_monitor ;;
    matlab)    do_build_flash; do_matlab_bridge; do_monitor ;;
    blockchain)      do_build_flash; do_simulator; do_blockchain_bridge ;;
    blockchain-full) do_fabric_setup; do_build_flash; do_simulator; do_blockchain_bridge ;;
    *)
        echo "사용법:"
        echo "  ./start.sh                  전체 실행"
        echo "  ./start.sh nosim            시뮬레이터 없이"
        echo "  ./start.sh simonly          시뮬레이터+모니터만"
        echo "  ./start.sh matlab           MATLAB 연결 모드"
        echo "  ./start.sh blockchain       시뮬레이터+블록체인 브릿지 (Agent 수동)"
        echo "  ./start.sh blockchain-full  Fabric+Agent+빌드+시뮬+브릿지 원스탑"
        ;;
esac
