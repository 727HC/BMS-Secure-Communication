#!/bin/bash
# BMS 플래싱 스크립트 — 사용법: ./flash.sh [bmu|cmu|all]
set -e
BMS_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$BMS_DIR/config.env"

flash_bmu() {
    echo "=== BMU 플래싱 ==="
    "$PEG_PATH" -device=$BMU_DEVICE -interface=$BMU_INTERFACE -port=$BMU_PORT \
      -flashobjectfile="$BMS_DIR/$BMU_ELF" \
      -runafterprogramming -quitafterprogramming 2>&1
    echo "  BMU GO"
}
flash_cmu() {
    echo "=== CMU 플래싱 ==="
    "$PEG_PATH" -device=$CMU_DEVICE -interface=$CMU_INTERFACE -port=$CMU_PORT \
      -flashobjectfile="$BMS_DIR/$CMU_ELF" \
      -runafterprogramming -quitafterprogramming 2>&1
    echo "  CMU GO"
}

case "${1:-all}" in
    bmu) flash_bmu ;; cmu) flash_cmu ;; all) flash_bmu; echo; flash_cmu ;;
    *) echo "사용법: ./flash.sh [bmu|cmu|all]" ;;
esac
