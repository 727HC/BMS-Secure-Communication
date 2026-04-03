#!/bin/bash
# PostCompact hook: remind to preserve session state after compaction
# stdin: {"summary": "compacted conversation summary..."}

summary_preview=$(cat | jq -r '.summary // empty' 2>/dev/null | head -c 200)

echo '{"hookSpecificOutput":{"additionalContext":"[POST-COMPACT] 컨텍스트 압축 완료. 현재 세션: MCP 모니터링 (mcp-monitor/). 중요 상태가 있으면 메모리에 저장할 것. 수정 범위: mcp-monitor/ 내부만."}}'
exit 0
