# MCP Monitor — Session Guide

이 디렉토리는 **MCP 세션** 전담. BMS 블록체인 모니터링 MCP 서버.

## Scope

이 세션은 `mcp-monitor/` 내부만 수정한다.
- `src/index.js` — MCP 서버 진입점, 도구 등록
- `src/tools/` — tx-monitor, bmu-monitor, vc-monitor, system-status
- `src/utils/` — fabric-client (읽기 전용), log-reader
- `package.json` — 의존성 관리

## Architecture

```
MCP Client (Claude Code) ←stdio→ index.js ←→ tools/*.js ←→ Fabric / Logs / Docker
```

- **Read-only**: 블록체인에 쓰기 없음, evaluateTransaction만 사용
- **Hybrid data**: Fabric 쿼리 + 구조화 JSON 로그 (logs/agent.log) 이중 소스
- **4 Tools**: monitor_transactions, monitor_bmu, monitor_vc, system_status

## Key Decisions

- Wallet identity는 bmu-agent에서 사전 등록 필요 (자동 enrollment 제거됨)
- 로그 중복제거: tee + logger 이중 기록 대응 (timestamp|category|message 키)
- BMU 레코드: status=INVALIDATED 필터링 필수
- VC 쿼리: org MSP에 따라 데이터 범위 다름 → dataScope 필드 포함
- 에러: throw로 통일 → index.js catch에서 isError: true 설정

## Don'ts

- `bmu-agent/`, `webapp/`, `chaincode/`, `passport-network/` 수정 금지
- fabric-ca-client 재도입 금지 (보안 이유로 제거됨)
- 블록체인 쓰기(submitTransaction) 금지
- `start_all.sh` 수정 금지 (다른 세션 담당)

## Verification Protocol

코드를 읽고 "맞는 것 같다"로 끝내지 말 것. **반드시 실행해서 확인**.

모든 검증은 이 포맷을 따른다:
```
### Check: [검증 대상]
**Command:** [실행한 명령어]
**Output:** [실제 터미널 출력 — 복붙, 의역 금지]
**Result:** PASS 또는 FAIL (Expected vs Actual)
```

규칙:
- PASS 전에 최소 1개 adversarial probe 실행 (경계값, 잘못된 입력 등)
- "코드를 읽어보니 맞다" → 검증 아님, 실행해야 검증
- 테스트가 통과해도 "무엇을 테스트하는지" 확인 — AI slop 테스트(mock만, 코드 동작 assert) 경계

## Subagent Delegation Rules

서브에이전트에게 작업 위임 시:
- **Never delegate understanding**: "결과 보고 수정해" 금지 → 파일 경로, 라인 번호, 구체적 변경사항 명시
- **위임 전 본인이 이해**: 탐색은 위임 가능, 판단/종합은 본인이 수행
- Worker fork 응답 규칙: `Scope:` 시작, 500단어 이하, 도구 호출 사이 텍스트 금지
- 병렬 실행이 기본: 독립적 작업은 single message, multiple tool calls

## Testing

```bash
# 구문 검증 (PostToolUse hook이 자동 실행하지만 수동으로도 가능)
node -c src/index.js && node -c src/utils/fabric-client.js && node -c src/utils/log-reader.js && node -c src/tools/tx-monitor.js && node -c src/tools/bmu-monitor.js && node -c src/tools/vc-monitor.js && node -c src/tools/system-status.js

# 의존성 확인
cd mcp-monitor && npm ls --depth=0
```

## Hooks (자동화)

`mcp-monitor/.claude/` 에 설정됨:
- **SessionStart**: 세션 범위 자동 주입 (`session-start.sh`)
- **PreToolUse (Edit|Write)**: 세션 격리 guard (`session-guard.sh`) — mcp-monitor/ 외부 차단
- **PostToolUse (Edit|Write)**: .js 파일 자동 구문 검증 (`auto-syntax-check.sh`)
- **PostCompact**: 작업 상태 메모리 자동 저장 (`post-compact.sh`)
