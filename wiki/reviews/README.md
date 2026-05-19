---
title: "reviews 폴더 안내"
date: 2026-04-20
tags: [review, qa, workflow]
doc_type: index
status: historical
---
# reviews/

이 폴더는 **현재 기준 문서가 아니라**, QA / review / risk acceptance를 남기는 기록성 폴더다.

## 현재 구조
- `reviews/passport/` — Passport QA 체크리스트와 결과
- `reviews/blockchain/` — Blockchain 리뷰 판정과 리스크 수용 기록
- `reviews/` 루트 — 위키 운영/통합 점검처럼 도메인 공통 review

## 하위 허브
- [[reviews/passport/README|Passport review 허브]]
- [[reviews/blockchain/README|Blockchain review 허브]]

## 현재 문서
- [[reviews/passport/manual-qa-checklist|BATP 수동 QA 체크리스트]]
- [[reviews/passport/manual-qa-report-2026-04-07|BATP 실사용 QA 결과]]
- [[reviews/blockchain/review-findings-summary|코드 리뷰 사실/거짓 판별 결과]]
- [[reviews/blockchain/risk-acceptance|리스크 수용 기록]]

## 언제 쓰나
- reviewer가 같은 종류의 문제를 반복 지적할 때
- release / security / design gate를 고정하고 싶을 때
- diff만 보면 안 보이는 review context를 남겨야 할 때

## 주의
- onboarding의 1차 current source로 쓰지 않는다.
- 현재 구조/정책은 common 또는 도메인 허브에서 먼저 확인한다.
