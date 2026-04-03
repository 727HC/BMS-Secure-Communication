# Micro 08 Contract

## Ledger Restatement

- Cycle 02 / target 12
- Micro-loop 08 / 15
- Completed cycles so far: 1
- Stopping allowed: NO

## Screen Focus

- `passports-page` issuance register refinement

## Aesthetic Hypothesis

dashboard operations brief까지 cycle02 문법으로 맞췄으니, 다음은 passports register를 docket / queue / next-check 중심으로 한 번 더 정리하면 issuance line도 현재 secondary surfaces와 더 잘 맞는다.

## Functional Constraints

- 기존 passport list / filters / route 진입 유지
- 기존 create / open detail / status badge 유지
- 기존 API shape 유지

## Execution Lanes

- Lane 1 — UI rewrite: issuance register hierarchy와 next-check wording 정리
- Lane 2 — Verification: approved shared Playwright path 또는 기존 안정 경로에 passports 검증 보강
- Lane 3 — Harness: review / handoff / ledger 동기화

## Build Intent

- register 상단을 queue / docket / current posture 문법으로 다시 쓴다.
- row action과 status summary의 다음 조치를 더 분명하게 만든다.
- mobile register 읽기 순서를 더 선명하게 만든다.
