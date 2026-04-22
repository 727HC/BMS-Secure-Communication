---
title: "Agent wiki writing guide"
date: 2026-04-18
tags: [common, wiki, agents, guide]
doc_type: guide
status: current
---
# Agent wiki writing guide

> `wiki/AGENTS.md`는 자동 적용용 요약 규칙이다.  
> 이 문서는 agent가 wiki note를 어떻게 남겨야 하는지 설명하는 **정본 가이드**다.

## 1. 언제 새 wiki note를 만들까
새 문서를 만드는 경우:
- 다음 작업자도 다시 볼 가능성이 높은 구조/규칙/결정이 생겼을 때
- 코드만 보면 안 보이는 제약/맥락을 남겨야 할 때
- handoff, review, QA, activity-log처럼 기록 위치가 분명할 때

새 문서를 만들지 않는 경우:
- 하루짜리 scratch 메모
- 검증 안 된 추측
- 기존 문서에 자연스럽게 들어갈 수 있는 작은 추가 정보
- 같은 내용을 agent 시점만 바꿔 복제하는 경우

## 2. 어디에 써야 하나

| 목적 | 위치 | 예시 |
|------|------|------|
| 공통 구조/규칙/템플릿 | `wiki/common/` | 구조 가이드, 작성 가이드, 템플릿 |
| 기술 결정 | `wiki/decisions/` | ADR |
| 도메인 전용 지식 | `wiki/passport/`, `wiki/blockchain/`, `wiki/embedded/`, `wiki/mcp/` | 아키텍처, 운영 맥락, 상세 설명 |
| 인수인계 | `wiki/handoffs/` | task packet, backend handoff |
| QA / review / risk | `wiki/reviews/` | QA checklist, review memo, risk acceptance |
| 작업 타임라인 | 각 도메인 `activity-log` | 날짜별 로그, 세션 로그 |
| 원문 자료 | `wiki/Object/` | PDF, 이미지, 외부 참고 원본 |

## 3. note routing 빠른 규칙
- 재사용될 사실/규칙 → `common/`
- 결정과 근거 → `decisions/`
- 특정 세션/도메인 이야기 → 도메인 폴더
- 다음 사람에게 넘기는 실행 맥락 → `handoffs/`
- 검증/리뷰/리스크 → `reviews/`
- 오늘 무슨 작업 했는지 → `activity-log`

## 4. frontmatter 규칙

역할 구분이 필요하면 `status`를 사용한다.
- 일반 note: `current`, `historical`, `archive`
- ADR: `accepted`, `superseded`, `proposed` 등 결정 상태
- 자세한 기준: [[common/document-role-guide|문서 역할 / status 가이드]]

필수 키:
- `title`
- `date`
- `tags`
- `doc_type`

선택 키:
- `updated`
- `status`
- `aliases`

권장 `doc_type`:
- `index`
- `guide`
- `template`
- `overview`
- `reference`
- `adr`
- `handoff`
- `review`
- `log`

## 5. 작성 원칙
- 기존 note가 맞으면 새 note보다 **기존 note 수정**을 우선한다.
- note 하나에는 목적 하나만 둔다.
- 긴 raw dump 대신 정제된 사실/결정/기준을 남긴다.
- cross-folder link는 `folder/file` 형태를 우선 사용한다.
- 새 note를 만들면 최소 한 개 이상의 허브에서 발견 가능해야 한다.

## 6. 활동 로그 규칙
- substantial 변경이면 관련 도메인 `activity-log`에 요약을 남긴다.
- 세부 QA 결과는 `reviews/`에, 실행 handoff는 `handoffs/`에 두고 activity-log에는 링크만 둔다.
- archive 트랙이 있으면 시행착오/세부 로그는 archive로 보낸다.

## 7. 구조 변경 후 체크리스트
1. 관련 허브 링크 업데이트
2. broken wikilink 여부 확인
3. markdown asset link 확인
4. source ↔ mirror parity 확인
5. `python3 scripts/verify_wiki.py` 실행

## 8. 자동 적용 surface
- agent가 `wiki/**` 아래를 수정할 때는 `wiki/AGENTS.md`를 자동으로 읽는다.
- 따라서 강제 규칙은 `wiki/AGENTS.md`에 짧게 두고, 이 문서에는 rationale과 예시를 둔다.
- 규칙이 바뀌면 **이 문서를 먼저 수정**하고, 그 다음 `wiki/AGENTS.md`를 맞춘다.
