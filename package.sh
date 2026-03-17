#!/bin/bash
# BMS 배포용 ZIP 생성 (secrets.h 제외)
BMS_DIR="$(cd "$(dirname "$0")" && pwd)"
OUTPUT="$HOME/Desktop/BMS_latest.zip"

rm -f "$OUTPUT"

cd "$BMS_DIR/.."
powershell -Command "
\$exclude = @('*secrets.h')
Get-ChildItem -Path 'BMS\BMU_BMS_S32K344','BMS\CMU_BMS_S32K144','BMS\firmware','BMS\canoe','BMS\simulink' -Recurse |
  Where-Object { \$_.Name -notlike 'secrets.h' } |
  Compress-Archive -DestinationPath '$OUTPUT' -Update
Get-ChildItem -Path 'BMS\BMS_SecureComm.dbc','BMS\start.sh','BMS\build.sh','BMS\flash.sh','BMS\config.env','BMS\.gitignore','BMS\dataProcess.py','BMS\package.sh' |
  Compress-Archive -DestinationPath '$OUTPUT' -Update
"

echo "배포 ZIP 생성: $OUTPUT (secrets.h 제외)"
ls -lh "$OUTPUT"
