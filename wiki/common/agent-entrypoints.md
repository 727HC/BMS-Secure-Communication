---
title: "Agent별 위키 시작점"
date: 2026-04-14
tags: [common, workflow, agents, wiki]
doc_type: guide
---
# Agent별 위키 시작점

## canonical root
- source: `/home/heechan/bms-blockchain/wiki`
- Windows mirror: `C:\Users\heechan\Documents\BMS-Knowledge`

한 줄 원칙:
> 위키는 하나로 유지하고, agent마다 읽는 시작점만 다르게 둔다.

## main / leader
1. [[common/knowledge-map]]
2. [[common/architecture]]
3. [[common/terminology]]
4. 관련 overview / ADR

기대 산출물:
- 현재 작업 범위
- 관련 결정 1~3개
- 다음 action

## coder / executor
1. [[common/architecture]]
2. 담당 도메인 `overview.md`
3. 관련 handoff / task packet
4. 필요한 ADR

기대 산출물:
- touched area
- 구현 제약
- 검증 포인트

## reviewer
1. [[common/architecture]]
2. [[common/terminology]]
3. `decisions/`
4. 관련 review note / handoff

기대 산출물:
- review scope
- violated boundary
- critical / warning / suggestion

## researcher
1. [[common/terminology]]
2. [[common/architecture]]
3. 관련 도메인 문서
4. 필요한 ADR

기대 산출물:
- 비교 기준
- 자료 출처
- adoption risk

## designer
1. [[passport/design-tokens]]
2. 관련 feature note
3. [[common/architecture]]
4. 필요한 ADR

기대 산출물:
- hierarchy issue
- UI change direction
- implementation handoff
