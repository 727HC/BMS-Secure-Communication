---
title: "프론트엔드 구조"
date: 2026-04-20
tags: [passport, frontend, ui]
doc_type: reference
status: current
---
# 프론트엔드 구조

> 현재 기준 문서
>
> VELKERN의 현재 주 사용자 인터페이스는 `webapp/frontend-react/` 기준으로 유지한다.
> 예전 레거시 SPA는 호환용 경로로 남아 있지만, 이 문서는 현재 기준만 설명한다.

## 현재 기술 스택
- React 19
- TypeScript
- Vite
- React Router
- html5-qrcode
- Tailwind 4 + 공용 `sn-*` / `ev-*` 스타일 계층
- Pretendard Variable + Outfit + JetBrains Mono

## 현재 파일 구조

```text
webapp/frontend-react/
├── package.json
├── src/
│   ├── App.tsx
│   ├── contexts/
│   │   ├── AuthContext.tsx
│   │   └── ThemeContext.tsx
│   ├── components/
│   │   ├── layout/
│   │   ├── passport-detail/
│   │   ├── modals/
│   │   └── ui/
│   └── pages/
│       ├── LandingPage.tsx
│       ├── LoginPage.tsx
│       ├── DashboardPage.tsx
│       ├── PassportsPage.tsx
│       ├── PassportDetailPage.tsx
│       ├── MaterialsPage.tsx
│       ├── BmuDataPage.tsx
│       ├── MaintenancePage.tsx
│       ├── RecyclingPage.tsx
│       ├── QrScanPage.tsx
│       └── AuditLogPage.tsx
```

## 현재 라우팅
- `/` — 랜딩
- `/login` — 로그인
- `/dashboard` — 대시보드
- `/passports` — 배터리 여권 등록부
- `/passports/:id` — 여권 상세
- `/materials` — 원자재 관리
- `/bmu-data` — 배터리 데이터
- `/maintenance` — 대기 항목 / 정비 흐름
- `/recycling` — 표준/재활용
- `/qr-scan` — QR 스캔
- `/audit-log` — 감사 로그

## 현재 구조 특징
### 앱 셸
- `Layout.tsx`가 좌측 사이드바 + 상단 헤더 + 본문 영역을 담당한다.
- 보호 라우트는 `RequireAuth`와 `ProtectedPage` 래퍼로 통일한다.
- 사용자 세션은 `AuthContext`가 관리한다.
- 테마 토글은 `ThemeContext`가 담당한다.

### 페이지 분할
- 각 페이지는 `React.lazy()`로 라우트 단위 code splitting을 적용한다.
- `PassportDetailPage`는 탭/모달을 필요 시점에 lazy load한다.
- `QrScanPage`는 카메라 스캔 시점에 QR 라이브러리를 동적으로 불러온다.

### 공용 UI 계층
- `components/ui/` — 기본 스피너, 상태 pill, spec row 등
- `components/passport-detail/` — 여권 상세 탭 컴포넌트
- `components/modals/` — 상세 화면 액션 모달

## 주요 화면 요약
- `DashboardPage.tsx` — 작업/운영 상태 요약
- `PassportsPage.tsx` — 등록부와 생성 흐름
- `PassportDetailPage.tsx` — 여권 상세 dossier
- `QrScanPage.tsx` — 현장 식별 진입점
- `MaintenancePage.tsx`, `RecyclingPage.tsx` — 후속 운영 흐름

## 레거시 경로 메모
- 예전 프런트는 호환 목적의 레거시 경로로 남아 있다.
- 현재 onboarding, 설계 설명, UI 기준은 이 문서를 우선 본다.
- historical 맥락이 필요하면 [[passport/frontend-legacy-vue|레거시 프론트엔드 개요 (Vue)]]와 activity-log / archive 트랙을 참고한다.

## 함께 보는 문서
- [[passport/overview|배터리 여권 세션 개요]]
- [[common/architecture|시스템 아키텍처]]
- [[passport/design-tokens|디자인 토큰]]
- [[passport/ui-references|UI 레퍼런스]]
- [[passport/assets/README|UI asset 허브]]

## Brand asset policy — VELKERN

- VELKERN 로고는 코드/SVG로 재해석하지 않는다.
- React 앱의 `BrandMark`는 `public/velkern-logo.png` 원본 파일을 `<img>`로 직접 참조한다.
- 원본 파일은 `webapp/frontend-react/public/velkern-logo.png`에 보관한다. 현재 기준 SHA-256은 `fefbdeb3b2ddcb56cc8531bb8be8e703b309c88c1b584fe38ca89759e2210ed3`이다.
- 원본 파일이 누락된 경우에만 텍스트 fallback을 허용하고, 임의 재구성 로고를 만들지 않는다.
