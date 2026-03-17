#!/bin/bash
# ===========================================
#  BMS 배포용 ZIP 생성 스크립트
# ===========================================
#  secrets.h, config.env 등 환경/키 파일을 제외하고 ZIP 생성
#  사용법: ./make_release.sh [output_name]

set -e
BMS_DIR="$(cd "$(dirname "$0")" && pwd)"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
OUTPUT="${1:-BMS_release_${TIMESTAMP}.zip}"

cd "$BMS_DIR"

zip -r "$OUTPUT" . \
    -x "**/secrets.h" \
    -x "config.env" \
    -x "logs/*" \
    -x "**/*.o" \
    -x "**/*.d" \
    -x "**/*.elf" \
    -x "**/*.map" \
    -x "**/*.siz" \
    -x "*.zip" \
    -x ".git/*" \
    -x ".metadata/*" \
    -x "workspace/*" \
    -x "workspace_bmu/*" \
    -x "workspace_cmu/*" \
    -x "__pycache__/*" \
    -x "**/__pycache__/*" \
    -x "Electric-Vehicle-Simscape-master/*" \
    -x "FreeRTOS_Toggle_Led_Example_S32K344/*" \
    -x "BMU_BMS_FreeRTOS/*" \
    -x "blockchain/fabric-samples/*" \
    -x "Thumbs.db" \
    -x ".DS_Store"

echo ""
echo "=== 배포 ZIP 생성 완료 ==="
echo "  파일: $OUTPUT"
echo "  secrets.h: 제외됨 (secrets.h.example 포함)"
echo "  config.env: 제외됨 (config.env.example 포함)"
