# VELKERN Web Frontend (React)

VELKERN의 오퍼레이터 웹앱. 제조사 · EV 제조사 · 정비/분석 · 검증기관이 조직별 권한에 따라 배터리 여권 전주기(제조→바인딩→정비→분석→재활용→폐기)를 관리한다.

## 스택

- **React 19** + **TypeScript 5.8** + **Vite 8**
- **React Router 7** — SPA 라우팅 (route-level lazy loading)
- **Tailwind CSS 4** (유틸리티) + 자체 **디자인 토큰** CSS
- **html5-qrcode** — QR 스캐너 (on-demand lazy import)
- **Pretendard Variable** + **JetBrains Mono** — 한글·라틴·숫자 타이포
- **경량 SVG 차트** — 외부 차트 라이브러리 없음 (Donut/Sparkline/BarRows/ArcGauge/BatteryOutline 직접 구현)
- **브랜드 로고 asset** — `src/components/ui/BrandMark.tsx`는 로고를 재해석하지 않고 `public/velkern-logo.png` 원본 파일을 `<img>`로 그대로 사용한다.

## 주요 화면

| 라우트 | 용도 |
|--------|------|
| `/` | 랜딩 |
| `/login` | 조직 인증 (4개 조직 선택) |
| `/dashboard` | 상태 분포 도넛 · KPI 3카드 · 우선 처리 대기열 · 7일 추세 · 포트폴리오 분포 |
| `/passports` | 여권 목록 + 분포 대시보드 패널 (제조사/화학계열) |
| `/passports/:id` | 여권 상세 — 반원 ArcGauge 히어로 + 5탭 (`개요` / `규제·소재` / `운영 이력` / `진단 데이터` / `증빙`) |
| `/materials` | 원자재 공급망 추적 |
| `/bmu-data` | BMU 센서 스냅샷 + 이상 이벤트 분포 |
| `/maintenance` | 정비·사고 이력 + 정비 활동 도넛 |
| `/recycling` | 회수·재활용 lifecycle + 원소별 평균 rate |
| `/qr-scan` | QR · NFC 배터리 식별 조회 |
| `/audit-log` | 체인 이벤트 감사 로그 + 활동 분류 분포 |

## 실시간 Passport 표시 기준

- Dashboard와 Passport detail은 `/api/realtime/*`를 우선 조회한다.
- `cloud-agent:3002` read model이 꺼져 있어도 `bmu-agent`가 Fabric ledger + runtime BMU snapshot fallback으로 최신 BMU 값을 overlay한다.
- Passport detail은 3초 주기 silent refresh로 열린 화면에서도 SOC/SOH/temperature를 갱신한다.
- BMU가 제공하지 않는 `SOCE=0`은 `0%`가 아니라 `미수집`으로 표시한다.
- 현재 BMS binding E2E 기준은 `RecordBMUDataWithPayload`이며, rawPayload bytes `44..47`의 little-endian `bmsBindingCode32=0x2c9a0e0c`를 사용한다.

## 실행

```bash
npm install
npm run dev        # http://localhost:5173 (Vite dev, /api → localhost:3001 proxy)
npm run build      # dist/ 생성 — bmu-agent가 정적 서빙
npm run preview    # 프로덕션 빌드 로컬 확인
```

백엔드(`bmu-agent`, 포트 3001)가 실행 중이어야 로그인·조회가 가능하다. 빌드 산출물을 bmu-agent가 루트에서 서빙하므로 배포 시 `npm run build` → 3001로 접속.

## 디렉토리 구조

```
src/
├── pages/                  # 11 페이지 (Landing · Login · Dashboard · Passports · ...)
├── components/
│   ├── layout/             # Layout, RequireAuth
│   ├── ui/                 # Spinner, StatusPill, PageHead, SpecRow,
│   │                       # Charts (Donut/Sparkline/BarRows/LegendStack),
│   │                       # BatteryGauge (ArcGauge/BatteryOutline), Skeleton
│   ├── modals/
│   │   ├── passport-detail/  # 15개 (Bind, MLog, AResult, Correct, VcIssue, ...)
│   │   ├── passports/        # PassportCreateModal (GBA 21 필드)
│   │   ├── materials/        # Material 등록/상세
│   │   ├── maintenance/      # 사고 기록
│   │   └── recycling/        # 추출/재활용 토글
│   └── passport-detail/    # 5개 탭 (Identity/Compliance/Traceability/Data/Trust)
├── contexts/               # AuthContext, ThemeContext
├── lib/                    # api.ts, helpers.ts, useCountUp.ts
└── styles/                 # 12 CSS 파일 — tokens/base/layout/sn-*/bp-badges
```

## 디자인 시스템

모든 색상·spacing·shadow는 CSS 변수 토큰으로 관리 (`src/styles/tokens.css`).

```css
--color-bg, --color-surface, --color-surface-alt, --color-surface-accent/warm/teal
--color-text-1/2/3, --color-border
--color-accent, --color-primary, --color-success, --color-warning, --color-danger
--font-display (Pretendard), --font-body (Pretendard), --font-mono (JetBrains Mono)
--shadow-card, --shadow-elevated, --ease-spring
```

**다크 모드**: `:root.dark` 토큰 블록으로 전체 팔레트 반전. `ThemeContext`가 `html.dark` 클래스 토글. 모든 페이지는 토큰 기반이라 자동 대응.

**타이포 클래스**:
- `.sn-page-title` (1.875rem 700) / `.sn-heading` / `.sn-body` / `.sn-caption` / `.sn-eyebrow` / `.sn-mono`
- `.sn-metric` + `.sn-metric-sm|md|lg|xl` (1.75~3.25rem) — KPI 수치
- `.sn-info-tile-value` — 대시보드 작은 수치용

**차트 컴포넌트** (`components/ui/Charts.tsx`):
- `DonutChart({ segments, size, thickness, centerLabel, centerValue, animate })`
- `Sparkline({ values, color, fillOpacity, animate })`
- `BarRows({ items: [{label, value, hint?}], max, barColor })`
- `LegendStack({ items })`

**배터리 게이지** (`components/ui/BatteryGauge.tsx`):
- `ArcGauge` — 반원 게이지 + stroke-dasharray fill 애니메이션 (SOH/SOC/GBA)
- `BatteryOutline` — 배터리 실루엣 + SOC fill + SOH bottom track

## 인증 & 권한

`AuthContext`가 토큰/userId/org를 `localStorage`에 저장. `api.ts`가 모든 요청 `Authorization: Bearer <token>` 부착. 라우트 보호는 `RequireAuth` 래퍼.

조직별(MSP) 가능 액션:
- **ManufacturerMSP**: 여권 발급, 원자재 등록, 데이터 정정, BMU 기록
- **EVManufacturerMSP**: VIN 바인딩, 정비 요청, 사고 기록
- **ServiceMSP**: 정비 완료, 분석 결과 제출
- **RegulatorMSP**: 규제 검증, 소재 추출, 폐기 승인, VC 폐기 목록 조회

## 코드 스플리팅

`App.tsx`에서 페이지는 전부 `React.lazy()` + `Suspense`. QR 스캐너의 `html5-qrcode` 본체는 카메라 시작 시점에 dynamic import. PassportDetail의 5개 탭·15개 모달도 각각 lazy chunk.

## Skeleton 로딩

모든 페이지는 `loading=true` 상태에서 `Skeleton` 컴포넌트로 실제 레이아웃을 모사한다. CLS (Cumulative Layout Shift) 최소화.

## 테스트

### 단위 테스트 (Vitest)

168개 테스트 파일 / 1,270개 케이스가 페이지·컴포넌트·모달·hooks·lib·도메인 invariant를 잠근다.

```bash
npm run test          # vitest run (CI 모드, 단발)
npm run test:watch    # vitest watch (개발 중)
```

주요 커버리지:
- `src/pages/*.test.tsx` — 라우트별 페이지 렌더 + 사용자 인터랙션
- `src/components/**/*.test.tsx` — 모달·차트·게이지 단위
- `src/lib/cross-module-consistency*.test.ts` — `STATUS_LIST↔STATUS_OPTIONS↔STATUS_COLORS`, `MSP↔MSP_LABELS↔AUDIT_ALLOWED_ORGS`, `GBA_FIELDS↔GBA_21_FIELDS` 간 일관성 lock-in
- `src/__meta__/*.test.ts` — `package.json` · `vite.config` · `tsconfig*` · `index.html` 빌드 인프라 invariant
- `src/components/dashboard/lib.test.ts` — DBC 계수(SOC=100/65535, Temperature=50/65535) · 상태 라이프사이클 lock-in

### E2E 스모크 (Playwright)

```bash
cd ../../e2e-tests
npm install
npx playwright test ui_polish_smoke.spec.js
```

검증 범위: 로그인 → 대시보드 렌더 → 여권 상세 ArcGauge → 6개 페이지 라우트 → 다크모드 토글 → ACTIVE 상태 pulse dot.

## 관련 문서

- 디자인 토큰·안티패턴: `wiki/passport/design-tokens.md`
- 활동 로그: `wiki/passport/activity-log/`
- live BMU runtime 기준: `wiki/passport/live-bmu-runtime-2026-05-08.md`
- 백엔드 API: `bmu-agent/README.md`
