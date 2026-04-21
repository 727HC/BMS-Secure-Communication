---
title: "ADR-005: MCP 세션 Hook 기반 격리"
date: 2026-04-06
tags: [adr, mcp, workflow, hooks]
doc_type: adr
status: accepted
---
# ADR-005: MCP 세션 Hook 기반 격리

## 상태
Accepted

## 맥락
4개 세션(Passport, Blockchain, Embedded, MCP)이 동일 레포에서 병렬 작업 중. 메모리 규칙으로만 세션 범위를 관리하면 실수로 다른 세션 파일을 수정할 위험 존재.

## 결정
Claude Code Hook 시스템으로 세션 격리를 **자동 강제**:
- `PreToolUse (Edit|Write)` — `jq`로 stdin JSON 파싱, `file_path`가 `mcp-monitor/` 또는 `.claude/` 외부면 exit 2로 차단
- `PostToolUse (Edit|Write)` — `.js` 파일 수정 후 `node -c` 자동 구문 검증
- `SessionStart` — 세션 범위를 `additionalContext`로 모델에 자동 주입
- `PostCompact` — context 압축 후 세션 범위 리마인더

Hook 설정은 `mcp-monitor/.claude/settings.json`에 위치 → `mcp-monitor/`를 cwd로 시작해야 활성화.

## 결과
- 규칙 위반 시 자동 차단 (메모리 규칙 의존 탈피)
- 구문 오류 즉시 감지 (PostToolUse 검증)
- 세션 시작/compact 후 컨텍스트 자동 복원
- 다른 세션에서 같은 패턴 복제 가능 (`{dir}/.claude/settings.json` + guard script)
