#!/bin/bash
# BMS 프로젝트 빌드 + 플래싱 + 실행 원스탑 스크립트
# 사용법: ./run.sh          → 빌드+플래싱+실행
#         ./run.sh flash    → 플래싱만 (빌드 안 함)
#         ./run.sh monitor  → BMU 시리얼 모니터
#         ./run.sh matlab   → dataProcess.py 시작 (MATLAB 연결용)

BMS_DIR="$(cd "$(dirname "$0")" && pwd)"

case "${1:-full}" in
    full)
        echo "=============================="
        echo "  BMS 빌드 + 플래싱 + 실행"
        echo "=============================="
        "$BMS_DIR/build.sh" all
        echo
        "$BMS_DIR/flash.sh" all
        echo
        echo "=== 양쪽 실행 중 ==="
        ;;

    flash)
        "$BMS_DIR/flash.sh" all
        ;;

    monitor)
        echo "=== BMU 시리얼 모니터 (COM4, 28800) — Ctrl+C로 종료 ==="
        python -c "
import serial, sys
ser = serial.Serial('COM4', 28800, timeout=1)
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
        ;;

    matlab)
        echo "=== dataProcess.py 시작 (COM5, 9600) ==="
        echo "MATLAB에서 실행: run_bms_simulation 또는 replay_bev_data(simOut)"
        cd "$BMS_DIR/firmware/tools"
        python -u dataProcess.py --port COM5 --baud 9600
        ;;

    *)
        echo "사용법:"
        echo "  ./run.sh          빌드+플래싱+실행"
        echo "  ./run.sh flash    플래싱만"
        echo "  ./run.sh monitor  BMU 시리얼 모니터"
        echo "  ./run.sh matlab   MATLAB 연결 (dataProcess.py)"
        ;;
esac
