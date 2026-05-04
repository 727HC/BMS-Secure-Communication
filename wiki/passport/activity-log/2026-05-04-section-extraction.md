---
title: "2026-05-04 (2) 4개 페이지 섹션 컴포넌트 분리"
date: 2026-05-04
tags: [passport, log, refactor]
doc_type: log
status: historical
---
# 2026-05-04 (2) 4개 페이지 섹션 컴포넌트 분리

## Session — 헬퍼 추출 후속, 메이저 섹션 분리
- 작업 주체: Claude Opus 4.7
- 배경: 같은 날 1차에서 5개 페이지 헬퍼/타입을 lib.ts로 분리(-276 lines). 2차로 가장 명확한 섹션부터 sub-component 추출.
- 작업 내용:
  - **BmuRecordsTable.tsx** (179 lines) — 판독 기록 테이블(상단바 + 표 + 페이지네이션)
  - **MaintenanceSummaryCard.tsx** (~85 lines) — 작업 처리 요약 (info-grid + summary-grid)
  - **RecyclingSummaryCard.tsx** (~85 lines) — 생애 주기 등재 요약
  - **PassportsSummaryCard.tsx** (~85 lines) — 등록 파일 요약 + stamps
- 페이지 사이즈 변화 (이번 라운드):
  | 페이지 | After helper | After section | Δ |
  |---|---|---|---|
  | BmuDataPage.tsx | 552 | 420 | -132 |
  | MaintenancePage.tsx | 631 | 574 | -57 |
  | RecyclingPage.tsx | 667 | 611 | -56 |
  | PassportsPage.tsx | 570 | 509 | -61 |
  | **합계** | 2420 | 2114 | **-306** |
- 검증: 매 단계 `npm run build` 통과, TS 진단 0건.
- 커밋: `0ccbdc3` (BmuRecordsTable), `d0a7010` (MaintenanceSummaryCard), `ba8c3f0` (RecyclingSummaryCard), `f338b2a` (PassportsSummaryCard).

## 누적 진행 (2026-04-27 ~ 2026-05-04)
- DashboardPage 1598 → 487 (-69%) + 9개 sub-component
- 5개 페이지 helpers 분리 (-276 lines, 5개 도메인 lib)
- 4개 페이지 섹션 분리 (-306 lines, 4개 sub-component)
- 총 페이지 코드량 감소: ~700 lines, 컴포넌트 모듈 18개 신규

## 미완료
- AuditLogPage 메인 테이블(195줄, 복잡한 prop 인터페이스)은 보류
- 각 페이지의 나머지 작은 섹션(회수 단계 분포, 정비 분포 chart 등)은 별도 라운드
- CSS dead code AST 분석은 도구 도입 후로 보류
