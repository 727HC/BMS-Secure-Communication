#!/bin/bash
# ===========================================
#  BMS 보안 통신 시스템 — 원스탑 실행 스크립트
# ===========================================
#  사용법:
#    ./start.sh              전체 실행 (빌드+플래싱+시뮬레이터+모니터)
#    ./start.sh nosim        빌드+플래싱+모니터만 (시뮬레이터 없이)
#    ./start.sh simonly      시뮬레이터+모니터만 (빌드/플래싱 생략)
#    ./start.sh matlab       빌드+플래싱+MATLAB용 브릿지+모니터
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
    kill $SIM_PID $BRIDGE_PID 2>/dev/null
    wait $SIM_PID $BRIDGE_PID 2>/dev/null
    echo "=== 완료 ==="
    exit 0
}
trap cleanup INT TERM

do_build_flash() {
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo " [1/4] 빌드"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    cd "$BMS_DIR/BMU_BMS_S32K344/Debug_FLASH"
    find . \( -name "*.o" -o -name "*.d" -o -name "*.elf" -o -name "*.map" -o -name "*.siz" \) -delete
    if ! make -j8 all CFLAGS_EXTRA="-D${BMS_MODE}" 2>&1 | tee "$LOG_DIR/build_bmu.log" ; then
        echo "!!! BMU 빌드 실패 — $LOG_DIR/build_bmu.log 확인"
        exit 1
    fi
    cd "$BMS_DIR/CMU_BMS_S32K144/Debug_FLASH"
    find . \( -name "*.o" -o -name "*.d" -o -name "*.elf" -o -name "*.map" -o -name "*.siz" \) -delete
    if ! make -j8 all CFLAGS_EXTRA="-D${BMS_MODE}" 2>&1 | tee "$LOG_DIR/build_cmu.log" ; then
        echo "!!! CMU 빌드 실패 — $LOG_DIR/build_cmu.log 확인"
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

do_blockchain_bridge() {
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo " [4/4] 블록체인 브릿지"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "  BMU Serial($BMU_COM) → BMS Agent(http://localhost:3001)"
    echo ""
    sleep 3
    cd "$BMS_DIR/firmware/tools"
    python -u serial_to_agent.py --port $BMU_COM --baud $BMU_BAUD --agent http://localhost:3001
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
    blockchain) do_build_flash; do_simulator; do_blockchain_bridge ;;
    *)
        echo "사용법:"
        echo "  ./start.sh              전체 실행"
        echo "  ./start.sh nosim        시뮬레이터 없이"
        echo "  ./start.sh simonly      시뮬레이터+모니터만"
        echo "  ./start.sh matlab       MATLAB 연결 모드"
        echo "  ./start.sh blockchain   시뮬레이터+블록체인 브릿지"
        ;;
esac
