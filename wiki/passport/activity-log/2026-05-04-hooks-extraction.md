# 2026-05-04 (3) — 페이지 로직을 커스텀 훅으로 통합

## 작업 내용

`section-extraction` 라운드에서 컴포넌트 분리를 완료한 9개 페이지를 추가로 정리했습니다. 페이지에 남아 있던 데이터 페치/필터/페이지네이션/뮤테이션/뷰모델 useMemo/derived label 로직을 페이지별 커스텀 훅으로 추출해 페이지 컴포넌트를 호출 부 + JSX 위주로 단순화했습니다.

## 추출한 훅 (15개)

### 데이터 페치 + 페이지네이션
- `useDashboardData` — 4개 useEffect (passports/status/bmu/audit) + 9개 source/data 상태 + selectedPassportId 동기화
- `usePassportDetailData` — fetchAll Promise.allSettled (passport+bmu) + trust 탭 진입 시 vc/issuer 페치
- `usePassportsData` — fetch + 검색/상태/GBA 필터 + latest/gba 정렬 + 페이지네이션
- `useMaintenanceData` — fetch + 3-탭 필터 + 페이지네이션 + tabCounts
- `useRecyclingData` — fetch + 4-탭 필터 + 페이지네이션 + tabCounts
- `useMaterialsData` — fetch + 검색 필터 + 페이지네이션 + categoryDist/originUniqueCount
- `useAuditLogFetcher` — fetchLogs + 5초 auto-refresh interval
- `useBmuDataFetcher` — fetch + 10초 auto-refresh + countdown 타이머

### 분석/뷰모델
- `useDashboardViewModels` — kpiCards (47줄) + fleetGauges + dataflowNodes + securityRows (53줄)
- `usePassportsAnalytics` — 카운트 7종 + 분포 4종
- `useMaintenanceAnalytics` — extStats (긴급 대응/평균 정비 간격 등 5종) + maintenanceTypeBreakdown + donutSegments
- `useRecyclingAnalytics` — avgSoh/avgRemaining/avgRates/lifecycleMetrics
- `useAuditLogAnalytics` — 6개 useMemo (activeActionLabel/distribution 3종/timeSummary/statusSummary)
- `useBmuAnalytics` — sortedRecords + recentSlice + eventDistribution + latestRecord
- `usePassportDossierLabels` — 8개 derived label (warningMessages/lifecycleLabel/roleDeskLabel 등)

### 뮤테이션 (try/catch 보일러플레이트 통합)
- `usePassportMutations` — 14개 mutation 핸들러 + withSubmit 헬퍼
- `useRecyclingMutations` — 5개 mutation 핸들러 (requestAnalysis/submitAnalysisResult 등) + withSelectedSubmit
- `useMaintenanceMutations` — 3개 submit 핸들러 (request/log/accident) + withSelectedSubmit

### 통합 도메인
- `useQrScanner` — startScan/stopScan/startNfc/stopNfc/handleManualSearch/lookupPassport + 7개 상태 + 2개 ref + cleanup useEffect

## 결과

| 페이지 | 시작 | 종료 | 감소 |
|--------|------|------|------|
| DashboardPage.tsx | 487 | 218 | -269 |
| PassportDetailPage.tsx | 646 | 232 | -414 |
| PassportsPage.tsx | 510 | 202 | -308 |
| MaintenancePage.tsx | 575 | 196 | -379 |
| RecyclingPage.tsx | 612 | 220 | -392 |
| MaterialsPage.tsx | 365 | 170 | -195 |
| AuditLogPage.tsx | 593 | 174 | -419 |
| BmuDataPage.tsx | 420 | 145 | -275 |
| QrScanPage.tsx | 490 | 66 | -424 |
| LoginPage.tsx | 274 | 193 | -81 |

세션 누적 (45라운드): 페이지 코드 -2,961줄 / 49개 컴포넌트·훅 신규 생성

모든 페이지가 240줄 이하로 정리되었으며, `npm run build`는 모든 라운드에서 통과했습니다.

## 변경 파일 (대표)

- 추출 훅 15개: `src/components/{audit-log,bmu-data,dashboard,maintenance,materials,passport-detail,passports,qr-scan,recycling}/use*.ts`
- 페이지 컴포넌트 9개 모두 슬림화

## 교훈

- 페이지 컴포넌트가 데이터 페치 + 필터 + 페이지네이션 + 분석 + 뮤테이션을 모두 들고 있으면 빠르게 500줄을 넘어선다. 페이지별 커스텀 훅으로 분리하면 페이지가 호출 부 + JSX 위주로 줄어든다.
- 동일한 try/catch 보일러플레이트가 여러 mutation 핸들러에 반복되면 `withSubmit` / `withSelectedSubmit` 헬퍼 한 곳에 모으는 것이 코드량과 일관성 양쪽에서 효과적이다.
- 페이지의 `derived label` (역할별 텍스트 분기)이 30줄 이상으로 늘어나면 별도 hook으로 빼서 prop 객체 하나로 hero/summary 컴포넌트에 전달하는 편이 읽기 쉽다.
- IDE 오토포매터가 Edit 직후 파일을 건드려 "File modified" 충돌을 자주 발생시키지만 재읽기 후 같은 Edit를 다시 시도하면 항상 통과한다.
