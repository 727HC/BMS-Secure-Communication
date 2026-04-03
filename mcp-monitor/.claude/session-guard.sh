#!/bin/bash
# MCP Session Guard — blocks Edit/Write to files outside mcp-monitor/
# Input: JSON on stdin per Claude Code hook spec: {"tool_name":"...","tool_input":{"file_path":"..."}}

input=$(cat)
file_path=$(echo "$input" | jq -r '.tool_input.file_path // empty' 2>/dev/null)

if [ -z "$file_path" ]; then
  exit 0
fi

# Allow: mcp-monitor/, .claude/, plan files, CLAUDE.md in mcp-monitor
case "$file_path" in
  */mcp-monitor/*) exit 0 ;;
  */.claude/*)     exit 0 ;;
esac

# Block everything else with additionalContext for model awareness
echo '{"decision":"block","reason":"MCP 세션은 mcp-monitor/ 외부 파일 수정 금지","hookSpecificOutput":{"additionalContext":"[SESSION GUARD] mcp-monitor/ 외부 파일 차단됨: '"$file_path"'"}}'
exit 2
