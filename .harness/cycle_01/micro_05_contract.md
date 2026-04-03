# Micro 05 Contract

## Ledger Restatement

- Cycle 01 / target 12
- Micro-loop 05 / 15
- Completed cycles so far: 0
- Stopping allowed: NO

## Screen Focus

- `bmu-data-page`

## Aesthetic Hypothesis

BMU 데이터를 단순 계측 테이블이 아니라 `telemetry evidence ledger`로 바꾸면, 배터리 여권 제품의 기술 증빙 성격이 더 선명해진다.

## Functional Constraints

- 여권 ID 조회 유지
- Enter 검색 유지
- 자동 새로고침 유지
- 카운트다운 유지
- 상태 플래그 표시 유지
- 빈 상태 / no record 상태 유지

## Build Intent

- 상단을 telemetry brief / query docket / capture mode로 재구성
- 하단 테이블을 filed sample ledger row 구조로 재작성
- 최신 샘플, 평균값, 이상 플래그를 summary로 노출
