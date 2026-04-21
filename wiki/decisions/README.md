---
title: "decisions/ 폴더 허브"
date: 2026-04-21
tags: [decisions, adr, index, hub]
doc_type: index
status: current
---
# decisions/

세션을 넘겨도 유지해야 하는 아키텍처 / 보안 / 운영 결정을 ADR 형식으로 관리하는 **현재 기준 거버넌스 허브**다.

## 먼저 읽을 결정
- [[decisions/002-session-scope-redistribution|ADR-002 — 세션 범위 재배분]]
- [[decisions/001-sidebar-navigation|ADR-001 — 사이드바 네비게이션 전환]]
- [[decisions/003-mcp-monitor-read-only|ADR-003 — MCP Monitor 읽기 전용 원칙]]

## 도메인별 결정 묶음
### 공통 / 운영
- [[decisions/001-sidebar-navigation|ADR-001]]
- [[decisions/002-session-scope-redistribution|ADR-002]]

### MCP
- [[decisions/003-mcp-monitor-read-only|ADR-003]]
- [[decisions/005-mcp-session-hook-isolation|ADR-005]]

### Embedded / Blockchain 연계
- [[decisions/004-fc-reset-mechanism|ADR-004]]
- [[decisions/006-embedded-security-hardening|ADR-006]]

## 이 폴더에 두는 것
- 세션 간 유지해야 하는 기술 / 운영 결정
- 보안 원칙, 구조 경계, 제약 합의
- 이후 handoff / review에서 반복 참조할 기준

## 읽는 법
- 현재 구조를 이해할 때는 overview / architecture를 읽은 뒤 필요한 ADR로 내려간다.
- activity-log나 review에서 언급된 결정 번호를 보면 이 허브로 돌아와 원문을 확인한다.
- Accepted ADR은 현재 기준으로 간주하고, historical 로그와는 역할을 구분한다.

## 함께 보는 문서
- [[common/architecture|시스템 아키텍처]]
- [[common/terminology|용어 사전]]
- [[handoffs/README|handoff 기록 허브]]
- [[reviews/README|review 기록 허브]]

## 작성 메모
- 제목은 `ADR-xxx:` 형식을 유지한다.
- 배경 / 결정 / 결과 / 후속 액션을 함께 남긴다.
