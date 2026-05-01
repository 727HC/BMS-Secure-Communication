---
title: "2026-05-01 (2) CSS/컴포넌트 정리 — DashboardPage 모듈화"
date: 2026-05-01
tags: [passport, log, refactor, dashboard]
doc_type: log
status: historical
---
# 2026-05-01 (2) CSS/컴포넌트 정리

## Session 2 — DashboardPage 1598 → 784 lines (51% 감소)

### Phase 1 (CSS) — 보류
- 14개 .css 파일, 3,218줄 전수 점검
- 모든 파일이 import 사용 중 (file-level dead 없음)
- per-selector dead code는 dynamic class 패턴 다수(예: `vk-kpi vk-kpi--${tone}`, `bp-status-${status}`, `vk-alerts__icon--${severity}`)로 정적 grep 매칭 부정확
- 안전한 자동 삭제 어려움 → 보류, 향후 AST 기반 분석 도구 도입 시 재시도

### Phase 2 (Dashboard 컴포넌트 분리) — 4 commit 완료
- 작업 주체: Claude Opus 4.7
- 작업 내용:
  1. **`components/dashboard/Glyphs.tsx` (73 lines)** — SVG 글리프 6개 + 아이콘 4개 분리
     - AlertGlyph, ConnectorArrow, FleetGauge, NodeGlyph, SecurityGlyph, TaskGlyph
     - KpiIcon, ChevronDownIcon, ChevronRightIcon, ExpandIcon
     - 공통 `stroke` 객체 모듈 스코프로 통합
  2. **`components/dashboard/lib.ts` (728 lines)** — 타입/순수 헬퍼/빌더 일괄 분리
     - 타입 24개 (DashboardPassport, KpiCardViewModel, AlertRowViewModel 등)
     - 상수 7개 (DASHBOARD_AUDIT_PATH, AUDIT_ALLOWED_ORGS, FLEET_LEGEND, KPI_FILTERS 등)
     - 함수 38개 (sourceLoading/Loaded/Error, normalizePassport/Status/BmuRecord/AuditRecord, buildAlertRows/TaskRows/LedgerRows/KpiSnapshot/SnapshotSparkline/DailyKindTrend/KpiVisual, formatRelativeTime/MetricNumber/Percent, clamp01/niceCeil 등)
     - DashboardPage에서는 사용하는 41개만 named import
  3. **`components/dashboard/KpiTrendSparkline.tsx` (65 lines)** — sparkline SVG 렌더러 분리
- 변경 파일: `webapp/frontend-react/src/pages/DashboardPage.tsx`, `webapp/frontend-react/src/components/dashboard/{Glyphs.tsx, lib.ts, KpiTrendSparkline.tsx}` (3 신규)
- 검증: 매 단계 `npm run build` 통과, TS 진단 0건, 미사용 import 정리.
- 커밋:
  - `b899f3a` Glyph SVG 컴포넌트 추출
  - `eaf1f2d` KPI/Chevron/Expand 아이콘 추가 분리
  - `ddeb79a` lib.ts 일괄 추출 (728 lines)
  - `df4a0f9` KpiTrendSparkline 분리

## 결과
- DashboardPage.tsx: **1598 → 784 lines (-51%)**
- 파일 구성: DashboardPage(784) + lib(728) + Glyphs(73) + KpiTrendSparkline(65) = 1650 lines (+52, import/export 오버헤드)
- 순수 helpers + SVG glyph + KPI sparkline 모두 별도 모듈
- 다른 페이지/컴포넌트에서도 동일 헬퍼 재사용 가능

## Phase 2.2 — JSX 섹션 컴포넌트 분리 완료 (별도 라운드)
- KpiRow.tsx (29) — 4개 KPI 카드
- SecurityCard.tsx (42) — 보안 상태 카드
- TaskQueueCard.tsx (52) — 작업 대기열 카드
- LedgerCard.tsx (61) — 블록체인 원장 테이블
- AlertCard.tsx (70) — 알림 리스트 + onPassportClick 콜백
- DataflowCard.tsx (44) — CMU→BMU→Agent→Blockchain→Passport 파이프라인
- BatteryMonitor.tsx (124) — 배터리 선택 dropdown + Fleet visual + gauges (state 캡슐화)

DashboardPage.tsx **1598 → 487 (-69%)**.
파일 구성: DashboardPage(487) + lib(728) + sub-components 9개(560) = 1775 lines.

각 sub-component 인터페이스:
- 순수 presenter — props만 받고 상태 없음 (BatteryMonitor만 dropdown 로컬 state)
- 라우팅 콜백은 onNavigate / onPassportClick으로 외부 위임
- ViewModel 타입을 props로 받아 부모-자식 결합 최소화

커밋:
- `b899f3a`, `eaf1f2d`, `ddeb79a`, `df4a0f9` (Phase 2.1)
- (PR #2 머지 + master 작업 시작)
- `b899f3a` (KpiRow + SecurityCard + TaskQueueCard) — squashed 표시 위해 1개 커밋으로 묶음
- `4e74ec6` (LedgerCard + AlertCard + DataflowCard + BatteryMonitor)

## 미완료
- 페이지별 분리(MaintenancePage 677, RecyclingPage 706, AuditLogPage 673, PassportDetailPage 646, BmuDataPage 589, PassportsPage 644)는 별도 라운드.
- CSS dead code per-selector 분석은 AST 도구 도입 후 재시도.
