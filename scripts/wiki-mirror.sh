#!/bin/bash
# wiki-mirror.sh — WSL wiki → Windows Obsidian vault 자동 동기화
# 사용법: nohup bash scripts/wiki-mirror.sh &

WIKI="/path/to/bms-blockchain/wiki"
VAULT="/path/to/BMS-Knowledge"
INTERVAL=10  # 초

echo "[wiki-mirror] started: $WIKI → $VAULT (every ${INTERVAL}s)"

while true; do
  rsync -a --update --exclude='.obsidian' --exclude='.trash' "$WIKI/" "$VAULT/" 2>/dev/null
  sleep $INTERVAL
done
