---
title: "프론트엔드 구조"
date: 2026-04-06
tags: [passport, frontend, ui]
doc_type: reference
---
# 프론트엔드 구조

## 기술 스택
- Vue 3 (CDN, 빌드 없음)
- Tailwind CSS (CDN)
- Pretendard Variable + Outfit + JetBrains Mono
- 인라인 컴포넌트 (`app.component()` 패턴)

## 파일 구조

```
webapp/frontend/
├── index.html          (284줄) — 셸 레이아웃, CSS, 사이드바 네비게이션
├── app.js              (428줄) — Vue 앱 인스턴스, 라우팅, 상수, API 헬퍼
└── pages/
    ├── login.js        (246줄) — 랜딩 + 로그인/회원가입
    ├── dashboard.js    (213줄) — 대시보드 (KPI, 상태분포, 최근등록)
    ├── passports.js    (557줄) — 여권 목록 (등록부)
    ├── passport-detail.js (2707줄) — 여권 상세 (기술 문서)
    ├── materials.js    (337줄) — 원자재 원장
    ├── bmu-data.js     (412줄) — BMU 배터리 데이터
    ├── maintenance.js  (499줄) — 정비 운영
    ├── recycling.js    (712줄) — 재활용/회수
    ├── qr-scan.js      (348줄) — QR/NFC 스캔
    └── audit-log.js    (302줄) — 감사 로그
```

총 7,045줄

## 레이아웃

### 셸 (index.html)
- **사이드바**: 64px 좌측 아이콘 내비게이션 (8개 항목 + Fabric 상태 + 유저 아바타)
- **상단바**: 52px (페이지 제목 + 유저 정보)
- **콘텐츠**: `padding: 24px 32px`
- 모바일: 사이드바 숨김 + 햄버거 메뉴

### 네비게이션 구조
| 아이콘 | 라우트 | 페이지 |
|--------|--------|--------|
| 그리드 | dashboard | 대시보드 |
| 문서 | passports | 배터리 여권 |
| 큐브 | materials | 원자재 |
| 펄스 | bmu-data | 배터리 데이터 |
| 렌치 | maintenance | 정비/서비스 |
| 순환 | recycling | 재활용 |
| 뷰파인더 | qr-scan | QR / NFC |
| 클립보드 | audit-log | 감사 로그 |

## 페이지별 요약

### 랜딩 (login.js — `landing-page`)
- 대문 페이지, 히어로 섹션
- 색상: `#1769e0`, `#00a8ff`, `#f5f6f8`
- `solar-ev-station.png` 일러스트 사용
- ![[passport/assets/page-landing.png]]

### 로그인 (login.js — `login-page`)
- 로그인 / 회원가입 탭 전환
- 4개 조직 선택 (제조사, EV제조사, 정비/분석, 검증기관)
- ![[passport/assets/page-login.png]]

### 대시보드 (dashboard.js)
- KPI 카드 4개 (전체, 운행중, 바인딩 대기, 원자재)
- 보조 스탯 3개 (SOC, 온도, 후속확인)
- 상태 분포 가로 바 차트
- 최근 등록 여권 피드 (8건)
- ![[passport/assets/page-dashboard.png]]

### 배터리 여권 목록 (passports.js)
- 등록부 헤더 + 바인딩/검토 건수
- 검색 + 상태 필터 + 정렬
- 여권 카드 리스트 (모델, 제조사, 상태 배지, GBA 진행률)
- 여권 발급 모달 (제조사만)
- ![[passport/assets/page-passports.png]]

### 여권 상세 (passport-detail.js)
- 기술 문서 형태 — 단일 스크롤
- 섹션: 식별정보, GBA 규격, BMU 데이터, 정비이력, 원자재, VC 인증서
- RBAC: 조직별 다른 액션 (바인딩, 정비요청, 분석요청, 폐기 등)
- 모달: 데이터 정정, 원자재 연결, 정비요청, BMU 무효화, VC 발급
- 2,707줄 — 가장 복잡한 페이지

### 원자재 (materials.js)
- 원자재 목록 테이블
- 등록 모달 (소재명, 종류, 공급업체, 인증, 무게)
- ![[passport/assets/page-materials.png]]

### BMU 데이터 (bmu-data.js)
- BMU 원천 데이터 조회
- 여권 선택 → 레코드 목록 → 상세
- SOC/온도 스케일링 표시
- ![[passport/assets/page-bmu-data.png]]

### 정비 운영 (maintenance.js)
- 정비 대기 여권 필터
- 정비 완료 / 사고 기록 등록
- 상태별 분류 (MAINTENANCE, ANALYSIS)
- ![[passport/assets/page-maintenance.png]]

### 재활용 (recycling.js)
- 재활용 대상 여권 관리
- 분석 요청 → 재활용 판정 → 추출 → 폐기 흐름
- 조직별 액션 분리
- ![[passport/assets/page-recycling.png]]

### QR 스캔 (qr-scan.js)
- QR 코드 스캐너 (html5-qrcode)
- 수동 ID 입력
- 스캔 → 여권 상세로 이동
- ![[passport/assets/page-qr-scan.png]]

### 감사 로그 (audit-log.js)
- 블록체인 트랜잭션 이력 조회
- 시간순 정렬, 유형별 필터
- ![[passport/assets/page-audit-log.png]]

## 공유 상수 (app.js)

### MSP
```js
ManufacturerMSP   → 제조사 (Org1)
EVManufacturerMSP → EV제조사 (Org2)
ServiceMSP        → 정비/분석 (Org3)
RegulatorMSP      → 검증기관 (Org4)
```

### 상태
```js
MANUFACTURED → 제조완료 (blue)
ACTIVE       → 운행중 (green)
MAINTENANCE  → 정비중 (amber)
ANALYSIS     → 분석중 (purple)
RECYCLING    → 재활용 (cyan)
DISPOSED     → 폐기 (gray)
```

## 참고
- 디자인 토큰: [[passport/design-tokens]]
- UI 레퍼런스: [[passport/ui-references]]
- ADR: [[decisions/001-sidebar-navigation]]
