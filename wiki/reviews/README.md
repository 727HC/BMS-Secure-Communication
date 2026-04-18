---
title: "reviews 폴더 안내"
date: 2026-04-15
tags: [review, qa, workflow]
doc_type: index
---
# reviews/

이 폴더는 **반복되는 리뷰 기준 / review memo / QA 결과 / release gate**를 모아두는 운영 폴더다.

## 현재 구조
- `reviews/passport/` — Passport QA 체크리스트와 결과
- `reviews/blockchain/` — Blockchain 리뷰 판정과 리스크 수용 기록

## 현재 문서
- [[reviews/passport/manual-qa-checklist|BATP 수동 QA 체크리스트]]
- [[reviews/passport/manual-qa-report-2026-04-07|BATP 실사용 QA 결과]]
- [[reviews/blockchain/review-findings-summary|코드 리뷰 사실/거짓 판별 결과]]
- [[reviews/blockchain/risk-acceptance|리스크 수용 기록]]

## 추천 형식
- review scope
- critical
- warning
- suggestion
- decision / follow-up

## 언제 쓰나
- reviewer가 같은 종류의 문제를 반복 지적할 때
- release / security / design gate를 고정하고 싶을 때
- diff만 보면 안 보이는 review context를 남겨야 할 때
