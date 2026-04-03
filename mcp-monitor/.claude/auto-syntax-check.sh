#!/bin/bash
# PostToolUse hook: auto syntax check after Edit/Write on .js files
input=$(cat)
file_path=$(echo "$input" | jq -r '.tool_input.file_path // .tool_response.filePath // empty' 2>/dev/null)

if [ -z "$file_path" ]; then
  exit 0
fi

# Only check .js files in mcp-monitor
case "$file_path" in
  *.js)
    if echo "$file_path" | grep -q '/mcp-monitor/'; then
      result=$(node -c "$file_path" 2>&1)
      if [ $? -ne 0 ]; then
        echo '{"hookSpecificOutput":{"additionalContext":"[SYNTAX ERROR] '"$file_path"': '"$(echo "$result" | head -3 | tr '\n' ' ')"'"}}'
      else
        echo '{"hookSpecificOutput":{"additionalContext":"[SYNTAX OK] '"$file_path"'"}}'
      fi
    fi
    ;;
esac
exit 0
