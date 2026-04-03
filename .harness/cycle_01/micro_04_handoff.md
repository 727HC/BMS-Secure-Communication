# Micro 04 Handoff

## Completed Scope

- `webapp/frontend/pages/passport-detail.js`
  - technical dossier cover / record identity / telemetry strip 구조로 상단부 재작성
  - 뒤로가기, 상태 badge, 이미지 업로드, SOC/SOH, 기존 탭 및 하위 액션 유지

- `e2e-tests/tests/cycle01_micro02_dashboard.spec.js`
  - current shared inspection spec를 detail dossier 검증용으로 재사용
  - desktop top / desktop full / mobile screenshot capture

## Output

- `e2e-tests/screenshots/c01_m04_detail_top.png`
- `e2e-tests/screenshots/c01_m04_detail_full.png`
- `e2e-tests/screenshots/c01_m04_detail_mobile.png`

## Key Constraint Status

- 기능 삭제 없음
- 상단 상태 정보 유지
- 하위 탭 유지
- 차량 이미지 연계 유지
- 기존 데이터 로딩 유지

## Suggested Next Focus

- `bmu-data-page`
  - detail dossier와 맞물리는 측정 증빙 장부가 필요하다.
  - Micro 05는 BMU 표를 `telemetry evidence ledger`로 바꾸는 것이 적절하다.
