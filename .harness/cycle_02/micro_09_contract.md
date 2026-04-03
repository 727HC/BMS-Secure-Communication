# Micro 09 Contract

## Ledger Restatement

- Cycle 02 / target 12
- Micro-loop 09 / 15
- Completed cycles so far: 1
- Stopping allowed: NO

## Screen Focus

- `passport-detail-page` dossier handoff / action docket refinement

## Aesthetic Hypothesis

passports register를 issuance queue 문법으로 정리했으니, 다음은 detail dossier 상단과 tab evidence/action wording을 register handoff 관점으로 다시 정리하면 issuance -> dossier 전환이 더 한 제품처럼 읽힌다.

## Functional Constraints

- 기존 detail tab 구조 유지
- 기존 API fetch / route param 유지
- 기존 modal / correction / VC / material link / lifecycle action 유지

## Execution Lanes

- Lane 1 — UI rewrite: dossier cover, action docket, tab evidence wording 정리
- Lane 2 — Verification: approved shared Playwright path 또는 기존 안정 경로에 detail 검증 보강
- Lane 3 — Harness: review / handoff / ledger 동기화

## Build Intent

- register에서 넘어온 next-check가 detail dossier 상단에서 자연스럽게 이어지도록 만든다.
- traceability / trust 구역의 action wording을 current docket 중심으로 다시 쓴다.
- mobile tab reading order와 evidence summary handoff를 더 선명하게 만든다.
