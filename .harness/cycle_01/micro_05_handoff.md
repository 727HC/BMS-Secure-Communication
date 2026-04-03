# Micro 05 Handoff

## Completed Scope

- `webapp/frontend/pages/bmu-data.js`
  - telemetry evidence ledger 방식으로 전면 재작성
  - query docket, capture mode, observation window, filed sample row 도입
  - auto refresh / countdown / search / empty states 유지

- `e2e-tests/tests/cycle01_micro02_dashboard.spec.js`
  - current shared inspection spec를 BMU ledger 검증용으로 재사용
  - desktop / live toggle / mobile screenshot capture

## Output

- `e2e-tests/screenshots/c01_m05_bmu_desktop.png`
- `e2e-tests/screenshots/c01_m05_bmu_live.png`
- `e2e-tests/screenshots/c01_m05_bmu_mobile.png`

## Key Constraint Status

- 기능 삭제 없음
- 검색 유지
- 자동 새로고침 유지
- 카운트다운 유지
- 상태 플래그 유지
- 빈 상태 유지

## Suggested Next Focus

- `maintenance-page`
  - service / repair / incident 흐름도 generic form stack에서 service docket 문법으로 재정리할 필요가 있다.
  - Micro 06은 정비 화면을 service operations desk로 전환하는 것이 적절하다.
