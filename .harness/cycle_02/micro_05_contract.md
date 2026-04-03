# Micro 05 Contract

## Ledger Restatement

- Cycle 02 / target 12
- Micro-loop 05 / 15
- Completed cycles so far: 1
- Stopping allowed: NO

## Screen Focus

- `qr-scan-page` intake scan station refinement

## Aesthetic Hypothesis

maintenance, materials, recycling, audit까지 secondary ledger 문법을 맞췄으니, 이제 qr-scan을 단순 utility가 아니라 intake scan station으로 정리하면 cycle02 전체 보조 surface의 언어가 거의 한 줄로 맞춰진다.

## Functional Constraints

- 기존 scan / verify / parsing flow 유지
- 기존 API / routing / action 조건 유지
- camera / QR / NFC 관련 기존 fallback 훼손 금지

## Execution Lanes

- Lane 1 — UI rewrite: intake scan station 문법, result hierarchy 정리
- Lane 2 — Verification: approved shared Playwright path 또는 안정 경로에 scan 검증 추가
- Lane 3 — Harness: review / handoff / ledger 동기화

## Build Intent

- scan intake -> decode result -> ledger handoff 순서를 명확히 만든다.
- utility tone보다 filing / verification station 톤을 강화한다.
- mobile scan read order와 fallback 안내를 더 선명하게 만든다.
