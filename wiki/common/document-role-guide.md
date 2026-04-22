---
title: "문서 역할 / status 가이드"
date: 2026-04-22
tags: [common, guide, wiki, status]
doc_type: guide
status: current
---
# 문서 역할 / status 가이드

위키를 읽을 때 가장 먼저 구분해야 하는 것은 **이 문서가 현재 기준인지, 과거 기록인지, 보관 문서인지**다.
이 가이드는 `status` frontmatter를 언제 어떻게 쓰는지 정리한다.

## 기본 원칙
- `doc_type`은 문서 **형식**을 설명한다.
- `status`는 문서 **역할** 또는 **상태**를 설명한다.
- 둘은 서로 대체하지 않는다.

예:
- `doc_type: overview` + `status: current`
- `doc_type: log` + `status: historical`
- `doc_type: adr` + `status: accepted`

## current / historical / archive
### `status: current`
현재 onboarding이나 설계 설명의 1차 source로 써야 하는 문서.

예:
- 도메인 `README.md`
- `overview.md`
- current canonical reference
- 현재 반복 사용 가능한 checklist / template

### `status: historical`
삭제하지 않지만, 특정 시점의 판단/기록/결과를 보존하는 문서.

예:
- activity-log
- dated review report
- handoff
- legacy note

### `status: archive`
보존 가치가 있지만 현재 읽기 흐름의 전면에는 두지 않는 문서.

예:
- `_archive/` 허브
- Codex 상세 로그 인덱스
- 보관용 참고 묶음

## ADR 예외
ADR은 current / historical / archive 대신 **결정 상태**를 `status`로 쓰는 것이 더 중요하다.

예:
- `status: accepted`
- `status: superseded`
- `status: proposed`

즉, ADR은 역할보다 **결정 lifecycle**을 우선한다.

## 실무 규칙
1. 도메인 허브와 overview는 보통 `current`
2. 날짜가 박힌 report / handoff / activity-log는 보통 `historical`
3. `_archive/` 아래 인덱스나 보관 note는 보통 `archive`
4. 현재 반복 사용하는 checklist / template은 `current`
5. ADR은 accepted / superseded / proposed 같은 결정 상태를 사용

## 읽는 사람을 위한 힌트
문서를 직접 열었을 때는 frontmatter만 보지 말고 본문 첫머리에도 역할을 써준다.

권장 문구:
- Current → `현재 기준 문서`
- Historical → `과거 기준 기록`
- Archive → `보관용 참고 자료`

## 함께 보는 문서
- [[common/wiki-writing-guide|위키 작성 가이드]]
- [[common/agent-wiki-writing-guide|Agent wiki writing guide]]
- [[common/README|common/ 허브]]
