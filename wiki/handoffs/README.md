---
title: "handoffs 폴더 안내"
date: 2026-04-15
tags: [handoff, workflow]
doc_type: index
---
# handoffs/

이 폴더는 **세션 handoff / feature handoff / task packet**을 모아두는 운영 폴더다.

## 현재 구조
- `handoffs/passport/` — Passport가 보낸/받은 handoff
- `handoffs/blockchain/` — Blockchain 관련 handoff

## 현재 문서
- [[handoffs/passport/backend-handoff-2026-04-13|Passport 백엔드 요청사항]]
- [[handoffs/blockchain/passport-handoff-2026-04-13|Blockchain → Passport handoff]]
- [[handoffs/blockchain/passport-handoff-reply-2026-04-13|Passport 요청 회신]]

## 추천 형식
- 목표
- 범위
- touched area
- done_when
- known risk
- 다음 owner

## 파일명 예시
- `passport-api-handoff-2026-04-14.md`
- `frontend-task-packet-bmu-dashboard.md`
- `security-review-followup-2026-04-14.md`

## 언제 쓰나
- 작업자가 다음 작업자에게 맥락을 넘겨야 할 때
- 구현 전에 scope와 done_when을 고정하고 싶을 때
- 세션이 분리되어도 같은 작업을 이어야 할 때
