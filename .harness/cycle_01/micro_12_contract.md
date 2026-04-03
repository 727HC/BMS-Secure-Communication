# Micro 12 Contract

## Ledger Restatement

- Cycle 01 / target 12
- Micro-loop 12 / 15
- Completed cycles so far: 0
- Stopping allowed: NO

## Screen Focus

- `passport-detail-page` density optimization

## Aesthetic Hypothesis

micro11에서 만든 section hierarchy를 유지한 채 paddings, table rhythm, evidence card height를 압축하면 passport-detail이 더 기술 문서처럼 읽히고 viewport당 정보량도 올라간다.

## Functional Constraints

- micro11 hierarchy 유지
- 기존 탭 유지
- 기존 데이터 / table / modal / action 유지
- role 조건 유지
- shared Playwright spec 경로 유지

## Build Intent

- dossier / section / evidence band vertical rhythm 압축
- table row와 ledger row 밀도 상향
- gauge / summary / trust register padding 축소
- mobile에서도 hierarchy가 깨지지 않게 유지
