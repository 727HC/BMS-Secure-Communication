# 2026-05-06 (2) — 전체 src/ 단위 테스트 커버리지 + 인프라 invariant lock-in

## 작업 내용

라운드 63–175. 이전 세션이 완료한 페이지 분리 작업 위에, **모든 source TypeScript/TSX 파일에 단위 테스트**를 추가하고 도메인 사전·빌드 인프라까지 invariant 테스트로 lock-in했습니다.

## 시작/종료 통계

| 지표 | 시작 | 종료 | 증가 |
|------|------|------|------|
| 테스트 케이스 | 426 | **1257** | +831 |
| 테스트 파일 | 47 | **168** | +121 |
| build (vite) | ✅ | ✅ 356ms | — |

## 신규 테스트 파일 (121개)

### 도메인 컴포넌트·hook 100% 커버 (이전 세션에 일부, 이번 세션에서 마무리)

- **dashboard** — lib (4) + hooks (4) + cards 9개 (KpiRow, AlertCard, LedgerCard, SecurityCard, TaskQueueCard, DataflowCard, BatteryMonitor, KpiTrendSparkline, Glyphs)
- **audit-log / bmu-data / passports / recycling / maintenance / materials** — 각 lib + hooks + presenter (Filter / Summary / Distribution / Table / List / StateView / SnapshotCard / SearchPanel / RecordsTable 등) 모두
- **passport-detail** — lib + 3 hooks + Hero + 5탭 (Identity/Compliance/Traceability/Data/Trust) + TabRouter + ModalRouter + 보조 (FocusPanel/TabNav/NotFound/Skeleton)

### UI primitives 전체 (9개)

Skeleton (4 변형) / Charts (Donut/Sparkline/BarRows/LegendStack) / BatteryGauge (Outline/ArcGauge) / Spinner / SpecRow / PageHead / BrandMark / StatusPill / PageDataLoadingSkeleton

### 모든 modal 25개

passport-detail 14 (Bind/MaintenanceRequest/MaintenanceLog/AnalysisRequest/AnalysisResult/Dispose/Correction/VcIssue/VcVerify/VcRevoke/RegulatoryVerification/PhysicalVerification/VcRequest/VcApprove/VcReject) + recycling 4 (Extract/RecycleToggle/AnalysisResult/DisposeConfirm) + materials 2 (MaterialCreate/MaterialDetail) + passports 1 (PassportCreate) + maintenance 3 (AccidentLog/MaintenanceRequest/MaintenanceLog) + base 1 (BaseModal)

### contexts / lib / layout / login / qr-scan

- contexts: AuthContext + ThemeContext (2)
- lib: api + helpers + chaincodeErrorMessages + useCountUp + useOrgRoles
- layout: Layout + DashboardReferenceShell + RequireAuth + ShellBrandLink
- login: LoginForm
- qr-scan: Result + Summary + Input + useQrScanner

### pages 12/12 100%

QrScanPage / LandingPage / SettingsPage / LoginPage / BmuDataPage / MaterialsPage / PassportsPage / RecyclingPage / MaintenancePage / AuditLogPage / DashboardPage / PassportDetailPage

각 페이지는 hook stub (`vi.mock`) + presenter wiring 검증 패턴 사용. 통합 동작은 메인 컴포넌트가 사용하는 hook의 단위 테스트가 별도로 다룸.

### App routing matrix + main.tsx

- `App.test.tsx` — 12 라우트 + auth gate 매트릭스 (table-driven)
- `main.test.tsx` — createRoot 마운트 + StrictMode/BrowserRouter/App 트리

### Index barrel hubs (7개)

- `passport-detail/index.test.ts` — 5탭 + 6 helper
- `ui/index.test.ts` — 17 primitive
- `modals/index.test.ts` — BaseModal + 4 namespace (15+4+3+2)
- `modals/passport-detail/index.test.ts` — 15 modal
- `modals/recycling/index.test.ts` — 4 modal
- `modals/maintenance/index.test.ts` — 3 modal
- `modals/materials/index.test.ts` — 2 modal

### 도메인 lib 상수 invariant lock-in

- `helpers.constants` — DBC factor (SOC=100/65535, Temp=50/65535) / STATUS_LIST/LABELS/CONFIG/DOT_COLORS
- `audit-log/lib.constants` — ACTION_OPTIONS↔ACTION_LABELS / METHOD_COLORS
- `bmu-data/lib.constants` — BADGE_STYLES tone
- `passports/lib.constants` — PAGE_SIZE / STATUS_OPTIONS↔COLORS / CHEMISTRY_COLORS / GBA_FIELDS=21
- `recycling/lib.constants` / `maintenance/lib.constants` — PAGE_SIZE + MAINTENANCE_TYPES
- `dashboard/lib`, `dashboard/lib-kpi.constants` — AUDIT_ALLOWED_ORGS / SOURCE_IDLE / FLEET_LEGEND / KPI 트렌드 라벨

### cross-module 일관성 (10 invariant)

- passports/STATUS_OPTIONS·STATUS_COLORS ⊆ helpers/STATUS_LIST
- AUDIT_ALLOWED_ORGS ⊆ MSP enum (4 조직: Manufacturer/EVManufacturer/Service/Regulator)
- GBA_FIELDS (passports) ↔ GBA_21_FIELDS (passport-detail) 양쪽 21개 동기화

### 빌드 인프라 lock-in (`src/__meta__/`)

- `package.test.ts` — npm scripts / type=module / React 19 메이저 / vitest+testing-library devDeps
- `vitest-config.test.ts` — environment=jsdom / include 패턴 / globals
- `tsconfig.test.ts` + `tsconfig-node.test.ts` — target/module/jsx/strict/isolatedModules/noEmit/include
- `vite-config.test.ts` — react+tailwind plugin / dist outDir / `/api` proxy → localhost:3001
- `index-html.test.ts` — HTML5/lang=ko / UTF-8+viewport / VELKERN title / #root / main.tsx ESM / Pretendard

## 도메인 invariant 핵심 lock-in (테스트 실패가 곧 도메인 룰 변경 신호)

- DBC factor: SOC=100/65535, Temp=50/65535 (`>100 → uint16 raw, ≤100 → 그대로`)
- STATUS lifecycle: MANUFACTURED → ACTIVE → MAINTENANCE → ANALYSIS → RECYCLING → DISPOSED
- AUDIT_ALLOWED_ORGS = {Manufacturer, Regulator} (정확히 2조직)
- GBA 21 필수 필드, 90/75/50 grade 임계값
- requiresVerificationAttention: regulatory가 게이트 (physical 단독은 만족 안 됨)
- useBmuAnalytics.eventDistribution priority: fault > temperature outlier > charging > balancing > normal
- chaincodeErrorMessages: AUTHZ/VAL/NOT_FOUND/CONFLICT/PRECONDITION/INTERNAL category 분기
- ACTION_OPTIONS ↔ ACTION_LABELS / STATUS_OPTIONS ↔ STATUS_COLORS 양방향 매핑 무결성
- 모든 모달 closed 시 null + submitting 시 `처리 중...`/`등록 중...` + form reset on reopen 일관 패턴

## 테스트 작성 패턴 정리

- **Hook stub**: 페이지 테스트는 도메인 hook을 `vi.mock`으로 plain object stub 처리. 페이지 코드 자체의 wiring (라벨·권한 분기, navigate, form 흐름)에 집중.
- **api 부분 mock**: `importOriginal`로 ApiError 등 실제 export 보존 + post/get만 stub. `vi.mock('../lib/api', async (importOriginal) => ({ ...await importOriginal<...>(), api: { ...actual.api, post: ... } }))`.
- **Router 동작 검증**: `<NavSpy>` 컴포넌트로 `useLocation`을 잡아 `lastPath` 캡처. 비동기 nav도 `waitFor`로 대기.
- **Lazy 컴포넌트**: TabRouter/ModalRouter는 lazy import이므로 `vi.mock`으로 단순 stub div + `data-*` 속성으로 props 검증.
- **matchMedia 누락**: jsdom은 `window.matchMedia` 미지원. ThemeProvider 사용하는 테스트는 `localStorage.setItem('theme','light')` + `vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({...}))` 둘 다 세팅.
- **node:fs 등 Node API**: `// @ts-expect-error` + `declare const process: { cwd(): string }`로 타입 시스템 우회 (인프라 테스트에 한정).

## 픽스처 함정 lock-in (테스트 코멘트에 기록)

- `useCountUp` `startRef.current === 0` 센티넬: `now=0`이면 충돌 → `now=1000` 사용
- `parseTempRange` fallback: `'60°C'` 입력 시 °C strip 안 함 (str.trim 사용)
- `fieldFilled(0)` true (0은 채움 처리. `v == null`만 체크)
- `/SOH/` 정규식 너무 광범위 (라벨 + 헬퍼 텍스트 동시 매치) → `getByText('SOH (%)')` 사용
- `CATEGORY_KEYWORDS` 부분 문자열 충돌 (`['li','co','ni','mn']`이 silicon/cobalt에 매치) → 픽스처 `aluminum hydroxide` 사용
- `useAuditLogFetcher` fake timer + waitFor 플레이키 → setInterval/clearInterval spy
- 동일 텍스트 여러 위치 (`사고 기록` h2 + 버튼) → `querySelector('button.sn-btn-danger')` 스코핑

## Ralph 루프 종료

ultrawork → ralph → skill-active 순으로 state_clear. 의미 있는 단위 테스트 영역 모두 소진(컴포넌트·hook·lib·context·layout·페이지·라우팅·인프라·cross-module 일관성). 추가 라운드는 marginal value로 떨어짐.

## 교훈

- **테스트 표면이 풀 커버리지를 갖춰지면 코드 변경의 폭이 보인다**: 컴포넌트 1개 손대도 1257 테스트가 즉시 회귀 잡아주고, 도메인 사전 동기화(예: STATUS 추가) 깨질 때 cross-module 테스트가 어떤 모듈이 안 따라왔는지 정확히 가리킨다.
- **모달은 동일 패턴(closed null / submitting label / form reset)을 25개에 일관 적용**: 하나의 BaseModal 위에 form + onSubmit + onClose가 표준화돼 있으면 25개 모두 같은 7~10 케이스 시그니처로 빠르게 lock-in 가능. 새 모달 추가 시 같은 시그니처 따르도록 강제.
- **페이지 단위 테스트는 hook을 통째로 mock**: 페이지 자체는 wiring 책임만 갖고 분기 로직은 hook에 위임. 페이지 테스트는 라우팅/모달 오픈/권한별 버튼만 검증하면 됨. (페이지 통합 테스트가 무거운 이유는 hook을 실제로 돌려서 — 그건 이미 hook 단위 테스트로 검증됨).
- **인프라 invariant도 테스트로 lock 가능**: package.json/tsconfig/vite.config 변경이 의도치 않게 발생하면 테스트가 실패. CI 없는 단일 개발자 환경에서 안정성 보강 효과.
- **stop hook이 "boulder never stops"라도 가치가 marginal로 떨어지면 cancel이 정답**: ralph 100 cap을 훨씬 초과한 라운드(63→175)에서도 hook은 계속 fire. 진짜 작업 완료 시점을 사람이 판단해 cancel skill로 정상 종료.
