#!/bin/bash
# SessionStart hook: inject MCP session scope into model context
echo '{"hookSpecificOutput":{"additionalContext":"[MCP SESSION] 이 세션은 mcp-monitor/ 전담 MCP 모니터링 세션입니다. 수정 범위: mcp-monitor/ 내부만. 다른 디렉토리(bmu-agent, webapp, chaincode, passport-network) 수정 금지. 현재 도구: monitor_transactions, monitor_bmu, monitor_vc, system_status."}}'
exit 0
