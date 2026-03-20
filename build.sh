#!/bin/bash
# BMS 빌드 스크립트 — 사용법: ./build.sh [bmu|cmu|all]
set -e
BMS_DIR="$(cd "$(dirname "$0")" && pwd)"

if [ ! -f "$BMS_DIR/config.env" ]; then
    echo "!!! config.env 파일이 없습니다. config.env.example을 복사하세요: cp config.env.example config.env"
    exit 1
fi
source "$BMS_DIR/config.env"
export PATH="$TOOLCHAIN_PATH:$MAKE_PATH:$PATH"

CFLAGS_MODE="-D${BMS_MODE}"

clean_objs() { find . \( -name "*.o" -o -name "*.d" -o -name "*.elf" -o -name "*.map" -o -name "*.siz" \) -delete; }

build_bmu() { echo "=== BMU 빌드 ($BMS_MODE) ===" && cd "$BMS_DIR/BMU_BMS_S32K344/Debug_FLASH" && clean_objs && make -j8 all CFLAGS_EXTRA="$CFLAGS_MODE" 2>&1; }
build_cmu() { echo "=== CMU 빌드 ($BMS_MODE) ===" && cd "$BMS_DIR/CMU_BMS_S32K144/Debug_FLASH" && clean_objs && make -j8 all CFLAGS_EXTRA="$CFLAGS_MODE" 2>&1; }

case "${1:-all}" in
    bmu) build_bmu ;; cmu) build_cmu ;; all) build_bmu; echo; build_cmu ;;
    *) echo "사용법: ./build.sh [bmu|cmu|all]" ;;
esac
