# Battery Passport Platform Design Guide

이 문서는 `bms-blockchain` 프론트엔드 재작성용 디자인 기준서다.
목표는 일반적인 admin CRUD가 아니라, 배터리 여권 플랫폼을 "공적 기록 시스템 + 기술 문서 표면 + 운영 레지스트리"처럼 보이게 만드는 것이다.

## 1. Product Character

- 제품은 "대시보드 SaaS"가 아니라 "배터리 이력 등록부"다.
- 화면은 마케팅 랜딩보다 등록, 심사, 추적, 검증, 열람에 최적화돼야 한다.
- 감성 키워드:
  - formal register
  - filing surface
  - technical dossier
  - evidence ledger
  - operations brief
  - recovery disposition record
- 톤은 차갑고 정확해야 하지만, 군용 UI처럼 공격적이거나 사이버펑크처럼 과장되면 안 된다.
- "블록체인"을 시각적으로 과장하지 말고, 신뢰성은 문서 구조와 데이터 정렬로 표현한다.

## 2. Core Principles

- 모든 화면은 먼저 "무슨 기록을 다루는지"를 보여주고, 그 다음 "무슨 행동을 할 수 있는지"를 보여준다.
- 인터페이스의 중심은 장식이 아니라 데이터다.
- 중요한 값은 큰 숫자보다 문맥과 단위가 먼저 읽혀야 한다.
- 카드보다는 register row, dossier section, ledger block, stamped status가 우선이다.
- 각 페이지는 서로 다른 역할을 가져야 한다. 모든 페이지를 같은 카드 그리드로 만들지 않는다.
- 여백은 넉넉하게 두되, 과한 luxury editorial 무드로 흐르지 않는다.

## 3. Visual Direction

### Overall Mood

- 종이 문서와 산업 제어 화면의 중간 지점.
- 밝은 배경 기반.
- 광택, 유리, 네온, 과한 blur는 금지.
- 신뢰성은 대비, 선, 정렬, 타이포 계층으로 만든다.

### Surface Language

- 메인 배경은 따뜻한 오프화이트 또는 연한 석재 톤.
- 주요 surface는 흰색 또는 매우 옅은 회색.
- section 구분은 두꺼운 그림자보다 hairline border와 spacing으로 처리한다.
- radius는 작게 유지한다. 기본은 `3px`~`8px`.
- 큰 panel은 "문서함", "접수면", "기록 보드"처럼 느껴져야 한다.

## 4. Color System

### Base

- Canvas: `#fafaf9`
- Primary surface: `#ffffff`
- Secondary surface: `#f5f5f4`
- Border: `#e5e7eb`
- Strong text: `#111827`
- Body text: `#374151`
- Muted text: `#6b7280`
- Faint text: `#9ca3af`

### Signals

- Active / healthy / verified: emerald 계열
  - `#059669`
- Warning / maintenance / pending: amber 계열
  - `#d97706`
- Info / official reference / compliance: blue 계열
  - `#2563eb`
- Analysis / exceptional state: violet 계열
  - `#7c3aed`
- Disposal / inactive / terminal: slate 계열
  - `#6b7280`
- Danger / invalid / failure: red 계열
  - `#dc2626`

### Color Rules

- 한 화면에서 강조색은 1개만 주도적으로 쓴다.
- 상태색은 badge, stamp, small graph에 제한적으로 사용한다.
- 거대한 gradient hero를 만들기 위해 색을 쓰지 않는다.
- 보라색을 기본 브랜드 색처럼 남용하지 않는다.

## 5. Typography

### Font Stack

- Display / body:
  - `Pretendard Variable`, `Pretendard`, `-apple-system`, `sans-serif`
- Mono / IDs / telemetry / counts:
  - `JetBrains Mono`, `monospace`

### Type Behavior

- 제목은 낮고 단단하게. 지나치게 큰 hero typography는 피한다.
- 한국어는 조밀하게 읽히지 않도록 line-height를 충분히 확보한다.
- ID, passport number, DID, hash, telemetry 값은 monospaced로 처리한다.
- label은 작은 uppercase English 또는 짧은 한국어 표제로 쓴다.
- 숫자는 가능한 한 표와 수치 모듈 안에서 정렬 기준선을 맞춘다.

### Size Mood

- Page title: `28px`~`34px`
- Section title: `14px`~`18px`
- Body: `13px`~`15px`
- Metadata / overline / labels: `11px`~`12px`
- Large mono figures: `20px`~`36px`

## 6. Layout Grammar

### Global Shell

- 좌측 navigation + 상단 context header + 중앙 document area 구조를 기본으로 한다.
- shell은 app chrome처럼 보이되, 내부 페이지는 각자 다른 문서 타입을 가져야 한다.
- 본문은 너무 넓게 퍼지지 않게 제한하고, 읽기 단위를 명확히 끊는다.

### Spacing

- 기본 간격은 `4 / 8 / 12 / 16 / 24 / 32 / 48` 리듬을 사용한다.
- 좁은 표면에서는 촘촘하게, 문서 블록 간에는 넉넉하게.
- 섹션 구분은 그림자보다 상하 spacing과 divider line이 먼저다.

### Responsive

- 모바일에서는 "축소판"이 아니라 "문서 재편집"처럼 재배치한다.
- 테이블은 무조건 유지하지 말고, 필요한 경우 stacked ledger row로 전환한다.
- 상단 요약 수치, 상태 stamp, 핵심 action은 모바일에서 먼저 보여야 한다.

## 7. Component Language

### Preferred Components

- registry table
- filing tabs
- dossier section
- evidence card
- status stamp
- mono stat strip
- document header
- inspection row
- timeline ledger
- split metadata grid

### Buttons

- 직사각형 또는 낮은 radius.
- primary button은 짙은 잉크색 또는 신호색을 한정적으로 사용한다.
- ghost button은 문서 UI 안에서 튀지 않아야 한다.
- FAB, floating candy button, oversized rounded CTA는 지양한다.

### Inputs

- 입력창은 "폼 장난감"이 아니라 "기록 입력란"처럼 보여야 한다.
- border와 focus ring은 선명하지만 조용해야 한다.
- placeholder는 설명이 아니라 예시 수준으로 짧게 쓴다.

### Status

- 상태 표시는 pill보다 stamp나 label block에 가깝게 간다.
- 상태 텍스트는 짧고 명확하게 유지한다.
- 색만으로 상태를 구분하지 말고 텍스트를 항상 같이 제공한다.

### Data Visualization

- 큰 마케팅 차트보다 작은 operational visualization을 선호한다.
- donut, bar, stacked strip, gauge는 허용하지만 얇고 절제된 스타일로 사용한다.
- 차트는 decoration이 아니라 판단 도구여야 한다.

## 8. Content and Language

### Copy Tone

- 짧고 공식적이며, 약간의 운영 문체를 사용한다.
- 불필요한 감탄, 마케팅 문구, 미래지향적 수사는 피한다.
- "배터리 여권", "등록", "검증", "이력", "판정", "추출", "폐기" 같은 행정/기술 어휘를 우선한다.

### Naming Style

- 메뉴명은 기능보다 기록 단위를 반영한다.
- 예:
  - `Dashboard` -> `Operations Brief`
  - `Passports` -> `Passport Register`
  - `Passport Detail` -> `Technical Dossier`
  - `BMU Data` -> `Telemetry Ledger`
  - `Maintenance` -> `Service Docket`
  - `Recycling` -> `Recovery / Disposition`
  - `Login` -> `Access Desk`

### Labels

- label은 짧게.
- 설명 문장은 한 줄 또는 두 줄 안에서 끝낸다.
- 중요한 값에는 단위와 기준을 붙인다.

## 9. Motion

- motion은 적어야 한다.
- page load 시 약한 fade + slight rise 정도만 허용한다.
- 행 단위 등장 애니메이션은 짧고 순차적으로.
- hover는 색 변화 또는 배경 tint 정도로 제한한다.
- 과한 parallax, elastic motion, long easing, glass blur animation은 금지.

## 10. Imagery and Decoration

- 이미지는 증빙 사진, 차량 사진, 공정 관련 시각자료처럼 "기록의 일부"로 다룬다.
- background decoration은 거의 쓰지 않는다.
- 패턴이 필요하면 종이 질감이 아니라 아주 미세한 grid, line, sheet 구분 정도로 제한한다.
- 아이콘은 단순 선형 또는 실무적 pictogram 계열을 사용한다.

## 11. Page Archetypes

### Dashboard

- 역할: 운영 브리프
- 첫 화면은 KPI wall이 아니라 "현재 등록부 상태 요약"이어야 한다.
- 최근 등록, 상태 분포, 화학계 분포 같은 운영 판단용 블록을 우선한다.

### Passport Register

- 역할: formal register
- 목록은 카드 grid보다 표, ledger row, filing tab 구조를 우선한다.
- 검색, 필터, 상태 전환이 헤더 아래에서 바로 작동해야 한다.
- 생성 modal은 workflow wizard처럼 보이되, 과하게 앱스럽지 않아야 한다.

### Passport Detail

- 역할: technical dossier
- hero summary + compliance + traceability + trust record로 읽혀야 한다.
- 데이터는 탭 안에 숨어도 되지만, 핵심 식별 정보는 상단에서 즉시 보여야 한다.

### Login

- 역할: access desk
- "멋진 로그인 랜딩"이 아니라 접근 권한 접수면처럼 설계한다.
- 조직 선택, 자격 입력, 오류 표시가 핵심이다.

### BMU / Telemetry

- 역할: inspection log / telemetry ledger
- 그래프보다 측정 근거와 시점이 먼저 읽혀야 한다.
- 값은 모노 타이포, 단위 정렬, 이상치 강조 중심으로 구성한다.

### Maintenance

- 역할: service docket
- 정비 요청, 정비 이력, 사고 기록, 상태 전이를 문서 흐름처럼 보여준다.

### Recycling

- 역할: recovery / disposition ledger
- 분석 판정, 추출률, 재활용 가능 여부, 폐기 여부를 행정 기록처럼 정리한다.
- 친환경 마케팅 화면처럼 보이면 실패다.

## 12. Hard Constraints

다음 패턴은 피한다.

- generic SaaS hero
- centered marketing landing
- huge gradient blob background
- excessive dark mode neon interface
- glassmorphism
- round bubbly cards everywhere
- purple-first startup styling
- fintech-like dashboard tiles repeated on every page
- decorative charts without operational meaning
- consumer-mobile-app style bottom nav

## 13. Implementation Notes

- 가능한 한 기존 Tailwind utility와 inline style 조합을 유지하되, 결과는 일관돼야 한다.
- 공통 색/타이포/spacing은 root variable로 승격한다.
- 상태 badge, mono number, section header, table label은 재사용 패턴으로 묶는다.
- 새 화면을 만들 때는 먼저 "이 페이지의 문서 타입이 무엇인가"를 정하고 시작한다.

## 14. AI Prompt Scaffold

AI에게 화면을 만들라고 할 때는 아래 형식을 기본으로 사용한다.

```text
Rebuild this screen for the Battery Passport Platform.

Design it as a formal industrial register, not a generic SaaS dashboard.
The interface should feel like a filing surface, technical dossier, evidence ledger, or operations brief depending on the page type.

Use a bright paper-like base, restrained borders, compact radii, Pretendard-style Korean typography, and JetBrains Mono for IDs and telemetry values.
Prioritize document structure, record readability, status stamps, metadata hierarchy, and operational clarity.

Avoid glassmorphism, dark neon UI, giant gradients, bubbly cards, startup landing page patterns, and generic analytics dashboards.

This product tracks battery passports across manufacturing, operation, maintenance, analysis, recycling, and disposal.
It must feel regulatory, traceable, and technical.
```

## 15. Current Direction Snapshot

현재 이 저장소의 재작성 방향은 아래 문법을 따른다.

- shell: registry index
- dashboard: operations brief
- passports: formal register
- passport detail: technical dossier
- login: access desk
- bmu data: telemetry ledger
- maintenance: service docket
- recycling: recovery / disposition ledger

새 작업도 이 결을 유지한다.
