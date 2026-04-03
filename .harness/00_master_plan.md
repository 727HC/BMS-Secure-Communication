# 00 Master Plan

## 1. Current Diagnosis

현재 프론트는 일부 화면이 이미 밝은 테마와 문서형 어휘를 쓰고 있지만, 제품 전체로 보면 아직 일관된 배터리 여권 인터페이스로 느껴지지 않는다.

주요 문제:

- 로그인은 여전히 일반적인 centered auth card에 머물러 있다.
- 대시보드는 운영 브리프라기보다 안전한 통계 요약 화면에 가깝다.
- 목록 화면은 일부 register 문법을 쓰지만, 전체적으로는 "정돈된 admin CRUD" 인상을 완전히 벗어나지 못했다.
- 상세 화면은 정보량은 많지만, 문서 계층과 핵심 증빙의 우선순위가 더 강하게 잡혀야 한다.
- 여러 화면이 공통 surface를 공유하지만, 페이지별 문서 타입이 더 분명히 갈라져야 한다.

## 2. Why Current UI Feels AI-Generated

- 안전한 light theme + rounded card + tidy table 조합이 반복된다.
- “이 제품만의 기록 방식”보다 “익숙한 관리도구” 문법이 먼저 읽힌다.
- 색, badge, stat, tab을 무난하게 배치해 깨끗하지만 정체성이 약하다.
- 중요한 도메인인 provenance, compliance, auditability, inspection evidence가 구조보다 라벨 수준에서만 드러난다.
- 페이지 간 차이가 정보 종류의 차이보다 배치 차이 정도로 보인다.

## 3. Chosen Metaphor

주 메타포는 `technical certificate system` 으로 잡는다.

보조 메타포:

- compliance dossier
- provenance ledger
- inspection register

즉, 이 제품은 SaaS dashboard가 아니라 “배터리 이력과 판정을 발급, 기록, 검증, 열람하는 공적 기술 문서 시스템”처럼 느껴져야 한다.

## 4. Design Thesis

Battery Passport UI는 화려한 analytics product가 아니라, 고신뢰 기술 기록 시스템이어야 한다.

핵심 방향:

- 문서처럼 읽히되 답답하지 않아야 한다.
- 규제와 추적성을 보여주되 관료적으로만 보이면 안 된다.
- 상태, ID, 이력, 판정, 출처, 증빙이 구조적으로 드러나야 한다.
- 각 화면은 하나의 문서 타입으로 해석 가능해야 한다.

## 5. Mandatory Product Qualities

- high trust
- traceability
- provenance visibility
- compliance readability
- lifecycle transparency
- inspection evidence clarity
- operational usability
- mobile readability
- 기능 보존

`기능 보존`은 필수다.
기존에 존재하는 API 호출, 모달, 라우팅, 상세 진입, 등록 플로우, 필터, 조회, 제출 동작은 삭제하지 않는다.
재작성은 UI와 정보 구조 중심으로 진행한다.

## 6. Anti-Patterns

- generic SaaS admin layout
- hero + KPI cards + charts + recent activity table
- 모든 화면이 비슷한 카드 묶음으로 보이는 구조
- default Tailwind/shadcn 인상
- 보라/핑크 중심 AI 스타일
- glow, glassmorphism, floating gradient
- 과하게 둥근 반경과 무난한 그림자
- “깔끔하지만 아무 제품 같지 않은” 안전한 화면
- 페이지마다 같은 block composition 반복

## 7. Cycle Roadmap

- Cycle 01: 현재 generic 구조를 끊고, 핵심 진입점과 기본 제품 언어를 다시 세운다.
- Cycle 02: registry / dossier / ledger / desk 문법을 주요 화면에 확장한다.
- Cycle 03: 정보 밀도, 계층, 반응형 구조를 정제한다.
- Cycle 04: navigation, shell, action grammar를 일관화한다.
- Cycle 05: lifecycle 페이지들(maintenance, recycling, telemetry)을 도메인 문서 구조로 재편한다.
- Cycle 06: audit, materials, QR/NFC 같은 도구형 페이지를 제품 문법 안으로 통합한다.
- Cycle 07: table-to-ledger mobile 전환과 정보 압축을 개선한다.
- Cycle 08: micro-interaction, stamp, status, evidence presentation을 정교화한다.
- Cycle 09: cross-page consistency와 density 균형을 맞춘다.
- Cycle 10: 전체 제품 차원의 polish와 회귀 검증을 수행한다.
- Cycle 11: evaluator가 요구할 경우 refine 또는 pivot한다.
- Cycle 12: default target finalization cycle. 필요 시 13~15에서 추가 refine.

## 8. Evaluation Logic

Evaluator는 각 micro-loop마다 아래를 본다.

- Domain character: 이 화면이 배터리 여권 제품처럼 보이는가
- Originality: 흔한 admin/dashboard 톤을 벗어났는가
- Polish: 타이포, 간격, 상태표시, 정보 정렬이 정교한가
- Function retention: 기존 기능이 그대로 유지되는가
- Behavioral validation: Playwright 상에서 실제 렌더와 핵심 상호작용이 확인됐는가

평가 방식:

- PASS / REJECT
- 디자인, 독창성, 사용성, 기능보존 관점의 간단 점수
- 다음 방향은 `refine` 또는 `pivot`

## 9. Stop / Continue Rules

- 15 micro-loops가 1 cycle이다.
- 최소 10 cycle 이전에는 중단 불가다.
- cycle은 15개 micro-loop와 cycle summary가 모두 있어야 완료다.
- micro-loop는 contract, build, Playwright inspection, review, handoff가 모두 있어야 완료다.
- Cycle 10, 11, 12 이후에는 evaluator가 continue 여부를 판단한다.

