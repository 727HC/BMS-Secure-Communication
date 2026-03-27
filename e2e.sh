#!/bin/bash
# BMS E2E One-Click Runner
# Usage:
#   ./e2e.sh              Full (build+flash+sim+monitor)
#   ./e2e.sh nosim        Build+flash+monitor
#   ./e2e.sh simonly      Sim+monitor only
#   ./e2e.sh matlab       dataProcess+bridge (MATLAB에서 직접 UDP 전송 시)
#   ./e2e.sh bridge       Bridge only

set -e
BMS_DIR="$(cd "$(dirname "$0")" && pwd)"

if [ ! -f "$BMS_DIR/config.env" ]; then
    echo "!!! config.env not found"
    exit 1
fi
source "$BMS_DIR/config.env"

export PATH="$TOOLCHAIN_PATH:$MAKE_PATH:$PATH"
LOG_DIR="$BMS_DIR/logs"
mkdir -p "$LOG_DIR"

PIDS=()
cleanup() {
    echo ""
    echo "=== Shutting down... ==="
    for p in "${PIDS[@]}"; do
        kill "$p" 2>/dev/null || true
    done
    wait 2>/dev/null
    echo "=== Done ==="
    exit 0
}
trap cleanup INT TERM

do_build_flash() {
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo " [1/2] Build ($BMS_MODE)"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

    echo "  Building BMU..."
    cd "$BMS_DIR/BMU_BMS_S32K344/Debug_FLASH"
    make -j8 all CFLAGS_EXTRA="-D${BMS_MODE}" 2>&1 | tee "$LOG_DIR/build_bmu.log"
    echo "  BMU OK"

    echo "  Building CMU..."
    cd "$BMS_DIR/CMU_BMS_S32K144/Debug_FLASH"
    make -j8 all CFLAGS_EXTRA="-D${BMS_MODE}" 2>&1 | tee "$LOG_DIR/build_cmu.log"
    echo "  CMU OK"

    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo " [2/2] Flash"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

    echo "  Flashing BMU..."
    "$PEG_PATH" -device=$BMU_DEVICE \
      -interface=$BMU_INTERFACE -port=$BMU_PORT \
      -flashobjectfile="$BMS_DIR/$BMU_ELF" \
      -runafterprogramming -quitafterprogramming 2>&1 | tee -a "$LOG_DIR/flash.log"
    echo "  BMU GO"

    echo "  Flashing CMU..."
    "$PEG_PATH" -device=$CMU_DEVICE \
      -interface=$CMU_INTERFACE -port=$CMU_PORT \
      -flashobjectfile="$BMS_DIR/$CMU_ELF" \
      -runafterprogramming -quitafterprogramming 2>&1 | tee -a "$LOG_DIR/flash.log"
    echo "  CMU GO"
}

do_dataprocess() {
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo " dataProcess.py Start"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    cd "$BMS_DIR/firmware/tools"

    python -u dataProcess.py --port $CMU_COM --baud $CMU_UART_BAUD > "$LOG_DIR/dataProcess.log" 2>&1 &
    PIDS+=($!)
    echo "  dataProcess.py (PID=$!) -> $CMU_COM @ $CMU_UART_BAUD"
}

do_simulator() {
    do_dataprocess

    sleep 1

    python -u battery_simulator.py --udp 2>&1 | sed 's/^/  [SIM] /' &
    PIDS+=($!)
    echo "  battery_simulator.py (PID=$!)"
}

do_bridge() {
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo " Blockchain Bridge"
    echo " BMU($BMU_COM) -> Agent(localhost:3001)"
    echo " Ctrl+C to exit"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

    # Agent health check
    echo "  Checking Agent..."
    for i in $(seq 1 6); do
        if curl -s -o /dev/null -w '' http://localhost:3001/status 2>/dev/null; then
            echo "  Agent OK"
            break
        fi
        if [ $i -eq 6 ]; then
            echo "  [WARN] Agent not reachable, continuing anyway..."
            break
        fi
        echo "  Waiting... ($i/6)"
        sleep 5
    done

    sleep 3
    cd "$BMS_DIR/firmware/tools"
    python -u serial_to_agent.py --port $BMU_COM --baud $BMU_BAUD --agent http://localhost:3001 ${BMU_DID:+--did $BMU_DID}
}

echo "========================================"
echo "  BMS E2E Pipeline"
echo "  Mode: $BMS_MODE"
echo "========================================"

case "${1:-full}" in
    full)    do_build_flash; do_simulator; do_bridge ;;
    nosim)   do_build_flash; do_bridge ;;
    simonly) do_simulator; do_bridge ;;
    matlab)  do_dataprocess; do_bridge ;;
    bridge)  do_bridge ;;
    *)
        echo "Usage: ./e2e.sh [full|nosim|simonly|matlab|bridge]"
        ;;
esac
