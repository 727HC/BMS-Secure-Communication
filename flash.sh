#!/bin/bash
# BMS flash+run script
# Usage: ./flash.sh [bmu|cmu|all]

BMS_DIR="$(cd "$(dirname "$0")" && pwd)"
PEG="/c/NXP/S32DS.3.6.1/eclipse/plugins/com.pemicro.debug.gdbjtag.pne_5.9.2.202409131555/win32/pegdbserver_console.exe"

flash_bmu() {
    echo "=== BMU Flash ==="
    "$PEG" -device=NXP_S32K3xx_S32K344 -startserver \
      -interface=USBMULTILINK -port=PEMF1A375 \
      -flashobjectfile="$BMS_DIR/BMU_BMS_S32K344/Debug_FLASH/BMU_BMS_S32K344.elf" \
      -runafterprogramming -quitafterprogramming 2>&1 | grep -E "Programmed|Verified|Checksum|GO|Error|fail"
}

flash_cmu() {
    echo "=== CMU Flash ==="
    "$PEG" -device=NXP_S32K1xx_S32K144F512M15 -startserver \
      -interface=OPENSDA -port=FDCB6E5B \
      -flashobjectfile="$BMS_DIR/CMU_BMS_S32K144/Debug_FLASH/CMU_BMS_S32K144.elf" \
      -runafterprogramming -quitafterprogramming 2>&1 | grep -E "Programmed|Verified|Checksum|GO|Error|fail"
}

case "${1:-all}" in
    bmu) flash_bmu ;;
    cmu) flash_cmu ;;
    all) flash_bmu; echo; flash_cmu ;;
    *) echo "Usage: ./flash.sh [bmu|cmu|all]" ;;
esac
