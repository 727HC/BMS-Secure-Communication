#!/bin/bash
# BMS E2E preflight check
# Usage: ./scripts/preflight-check.sh [--strict]
#
# Inventories what's running on the system so silent rogue POSTers / port
# collisions / stale processes don't poison the next test run.
#
# Output is human-readable + non-zero exit when --strict is set and known-bad
# patterns are detected (Vector CANoe, multiple bmu-agent instances, etc.).

set -uo pipefail
STRICT=0
[ "${1:-}" = "--strict" ] && STRICT=1

WARN_COUNT=0
warn() { echo "  ⚠ $1"; WARN_COUNT=$((WARN_COUNT + 1)); }
info() { echo "  · $1"; }
section() { echo ""; echo "── $1 ──"; }

echo "BMS E2E preflight @ $(date '+%Y-%m-%d %H:%M:%S')"

section "C:\\BMS junction"
if [ -d /c/BMS ] || [ -d "C:/BMS" ]; then
    info "junction present — embedded builds will work"
else
    warn "C:\\BMS junction MISSING. Run: scripts/setup-dev-env.bat"
fi

section "Python processes (BMS-related)"
if command -v wmic >/dev/null 2>&1 || command -v tasklist >/dev/null 2>&1; then
    # Windows host: enumerate via tasklist + PowerShell for cmdline
    powershell.exe -NoProfile -Command "Get-Process python -ErrorAction SilentlyContinue | Select-Object Id,@{n='cmd';e={(Get-CimInstance Win32_Process -Filter \"ProcessId=\$(\$_.Id)\").CommandLine}} | Format-Table -AutoSize -Wrap" 2>/dev/null | head -20 || true
else
    ps -eo pid,user,cmd 2>/dev/null | grep -E 'serial_to_agent|dataProcess|battery_simulator' | grep -v grep || info "no BMS python procs running"
fi

section "Port 3001 listeners (bmu-agent)"
LISTENERS=$(netstat -ano 2>/dev/null | grep -c ":3001 .*LISTENING" || echo 0)
if [ "$LISTENERS" -eq 1 ]; then
    info "single listener on :3001"
elif [ "$LISTENERS" -gt 1 ]; then
    warn "$LISTENERS listeners on :3001 — bmu-agent + something else (CANoe?)"
elif [ "$LISTENERS" -eq 0 ]; then
    warn "no listener on :3001 — bmu-agent not running"
fi

section "External POSTer detection"
# Vector CANoe — known historical rogue (HTTP binding posting hardcoded fixture)
if pgrep -f CANoe64 >/dev/null 2>&1 || tasklist 2>/dev/null | grep -qi CANoe64; then
    warn "Vector CANoe64 is running. If BMS_Test.cfg is loaded with HTTP binding, it will POST hardcoded fixtures to /api/bmu/data."
    warn "  → STOP measurement in CANoe, or use disabled cfg variant (see wiki/decisions/006-canoe-bmu-poster.md)"
fi

section "COM ports (BMU/CMU expected)"
if command -v powershell.exe >/dev/null 2>&1; then
    powershell.exe -NoProfile -Command "[System.IO.Ports.SerialPort]::GetPortNames() -join ', '" 2>/dev/null || true
fi

section "spool.db pending count"
SPOOL="${BMS_SPOOL_DB:-}"
if [ -z "$SPOOL" ]; then
    for candidate in firmware/tools/spool.db C:/BMS/firmware/tools/spool.db /c/BMS/firmware/tools/spool.db; do
        if [ -f "$candidate" ]; then
            SPOOL="$candidate"
            break
        fi
    done
fi
if [ -n "$SPOOL" ] && [ -f "$SPOOL" ]; then
    COUNT=$(python -c "import sqlite3, sys; c=sqlite3.connect(sys.argv[1]); print(c.execute('SELECT COUNT(*) FROM pending').fetchone()[0]); c.close()" "$SPOOL" 2>/dev/null || echo "?")
    if [ "$COUNT" = "0" ]; then
        info "spool empty"
    elif [ "$COUNT" -gt 100 ] 2>/dev/null; then
        warn "spool has $COUNT pending — likely stale (old DID or down agent). Consider DELETE."
    else
        info "spool: $COUNT pending"
    fi
else
    info "no spool.db (first run)"
fi

echo ""
if [ "$WARN_COUNT" -eq 0 ]; then
    echo "✓ preflight OK"
    exit 0
elif [ "$STRICT" -eq 1 ]; then
    echo "✗ preflight failed ($WARN_COUNT warnings) — fix above before E2E (strict mode)"
    exit 1
else
    echo "⚠ preflight: $WARN_COUNT warnings (non-strict — continuing)"
    exit 0
fi
