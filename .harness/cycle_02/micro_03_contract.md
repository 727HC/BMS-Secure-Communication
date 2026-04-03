# Micro 03 Contract

## Ledger Restatement

- Cycle 02 / target 12
- Micro-loop 03 / 15
- Completed cycles so far: 1
- Stopping allowed: NO

## Screen Focus

- `recycling-page` recovery / disposition ledger refinement

## Aesthetic Hypothesis

materials까지 provenance filing desk로 정리했으니, 다음은 recycling을 단순 상태 종료 화면이 아니라 recovery / disposition ledger로 재구성하면 cycle02의 secondary ledger line이 더 자연스럽게 이어진다.

## Functional Constraints

- 기존 recycling action / status flow 유지
- 기존 API / 라우팅 / 권한 조건 유지
- 기존 modal / evidence / passport linkage 훼손 금지

## Execution Lanes

- Lane 1 — UI rewrite: recovery stage, regulator/service 관점 action grammar 정리
- Lane 2 — Verification: approved shared Playwright path에 recycling 검증 추가
- Lane 3 — Harness: review / handoff / ledger 동기화

## Build Intent

- recovery intake / disposition decision / evidence handoff 순서를 명확히 만든다.
- row action을 next ledger step 중심으로 다시 쓴다.
- modal과 summary를 disposal admin이 아니라 recovery desk 언어로 맞춘다.
