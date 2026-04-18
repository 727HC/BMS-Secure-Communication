---
title: "decisions/ 폴더 허브"
date: 2026-04-18
tags: [decisions, adr, index, hub]
doc_type: index
---
# decisions/

세션을 넘겨도 유지해야 하는 아키텍처/보안/운영 결정을 ADR 형식으로 관리한다.

## ADR 목록
- [[decisions/001-sidebar-navigation|ADR-001 — 사이드바 네비게이션 전환]]
- [[decisions/002-session-scope-redistribution|ADR-002 — 세션 범위 재배분]]
- [[decisions/003-mcp-monitor-read-only|ADR-003 — MCP Monitor 읽기 전용 원칙]]
- [[decisions/004-fc-reset-mechanism|ADR-004 — Frame Counter 리셋 메커니즘]]
- [[decisions/005-mcp-session-hook-isolation|ADR-005 — MCP 세션 Hook 기반 격리]]
- [[decisions/006-embedded-security-hardening|ADR-006 — 임베디드 보안 강화 로드맵]]

## 언제 추가하나
- 코드만 보면 보이지 않는 제약이 생겼을 때
- 여러 세션/도메인에 영향을 주는 결정을 굳혀야 할 때
- 다음 작업자가 되풀이 판단하지 않게 해야 할 때

## 작성 메모
- 제목은 `ADR-xxx:` 형식을 유지한다.
- 배경 / 결정 / 영향 / 후속 액션을 함께 남긴다.
