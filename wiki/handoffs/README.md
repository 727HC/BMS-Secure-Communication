---
title: "handoffs 폴더 안내"
date: 2026-04-20
tags: [handoff, workflow]
doc_type: index
status: historical
---
# handoffs/

이 폴더는 **현재 기준 문서가 아니라**, 세션 간 인수인계와 작업 계약을 보존하는 기록성 운영 폴더다.

## 현재 구조
- `handoffs/passport/` — Passport가 보낸/받은 handoff
- `handoffs/blockchain/` — Blockchain 관련 handoff

## 하위 허브
- [[handoffs/passport/README|Passport handoff 허브]]
- [[handoffs/blockchain/README|Blockchain handoff 허브]]

## 현재 문서
- [[handoffs/passport/backend-handoff-2026-04-13|Passport 백엔드 요청사항]]
- [[handoffs/blockchain/passport-handoff-2026-04-13|Blockchain → Passport handoff]]
- [[handoffs/blockchain/passport-handoff-reply-2026-04-13|Passport 요청 회신]]

## 언제 쓰나
- 작업자가 다음 작업자에게 맥락을 넘겨야 할 때
- 구현 전에 scope와 done_when을 고정하고 싶을 때
- 세션이 분리되어도 같은 작업을 이어야 할 때

## 주의
- onboarding의 1차 current source로 쓰지 않는다.
- 현재 구조/정책은 common 또는 도메인 허브에서 먼저 확인한다.
