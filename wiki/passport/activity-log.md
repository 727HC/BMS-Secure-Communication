---
title: 배터리 여권 세션 활동 로그
date: 2026-04-06
tags: [passport, log]
---

# 배터리 여권 세션 — 활동 로그

> 컨텍스트(대화) 단위로 기록. 세션이 끝나면 다음 항목을 추가한다.
> 협업 세션이면 `작업 주체`를 명시한다. 예: `Codex CLI`, `Claude Code`, `공동 작업`.

---

## Session 4 — 2026-04-08 (Claude Code)

### 작업 주체
- Claude Code 주도 작업

### 요약
`passport-detail`의 `traceability` 탭 본문을 same-file leaf component로 분리했다.

### 작업 내용
- `webapp/frontend/pages/passport-detail.js`에 `app.component('passport-detail-traceability-section', ...)` 추가
- 부모 `v-show="activeTab === 'traceability'"` 컨테이너 내부를 단일 컴포넌트 호출로 교체
- `timelineEvents`, `lifecycleSteps`, `linkedMaterialDetails`, `maintenanceLogs`, `accidentLogs`, 역할 플래그, 날짜/helper 함수, 모달 오프너를 props로 명시 전달
- 다른 탭 구조는 변경하지 않음

### 변경 파일
- `webapp/frontend/pages/passport-detail.js`

### 검증
- `node -c webapp/frontend/pages/passport-detail.js`

### 미완료
- 없음

### 교훈
- no-build Vue 파일 분리는 leaf component에 필요한 배열/함수/플래그를 전부 props로 넘기면 가장 안전하다.

---

## Session 3 — 2026-04-06 (Claude Code)

### 작업 주체
- Claude Code 주도 작업

### 요약
대시보드 리디자인 + 사이드바 전환 + 한국어 수정 + wiki 세팅

### 작업 내용 (4/6)
- 대시보드 UI 리디자인 (v1~v6, EV Data Interface 레퍼런스 기반)
  - v1~v5: 레퍼런스 복제 시도 → 가독성/밀도 문제로 실패
  - v6: BATP 데이터 기반 깔끔한 기본형으로 전환 (KPI 4개 + 보조 3개 + 상태분포 + 최근등록)
- 사이드바 네비게이션 전환 (상단 탑바 → 64px 좌측 아이콘 사이드바, ADR-001)
- 한국어 수정 (Codex가 작성한 어색한 표현: "흐름", "건", "dossier", "배터리 건강" 등)
- wiki 지식 베이스 초기 세팅 + bms-wiki MCP 서버 구축
- 세션 범위 재배분: chaincode → Blockchain, bmu-agent → Passport (ADR-002)
- design/ 폴더를 passport/로 통합

### 작업 내용 (4/7 연장)
- wiki 심링크 → 실제 디렉토리로 전환 (Codex CLI 호환 문제)
- passport/frontend.md 작성 (전 페이지 구조 + Playwright 스크린샷 10개)
- passport/overview.md 보충 (체인코드 40개 함수, API 9개 그룹, RBAC 요약)
- activity-log를 날짜 기준 → 세션(컨텍스트) 단위로 재구성
- common/architecture.md 보충 (ADR-002 반영, API 엔드포인트, 프론트엔드 구조, wiki-mcp 추가)
- claw-code 패턴 도입:
  - Task Packets: `wiki/common/task-packet-template.md` (구조화된 작업 계약)
  - 세션별 CLAUDE.md: `webapp/`, `chaincode/`, `embedded/` 각각 배치
  - 세션 격리 훅: `.claude/session-guard.sh` (다른 세션 디렉토리 수정 시 경고)
- 블록체인 세션 요청 처리: RequestMaintenance/RequestAnalysis 권한 확인 → EVManufacturer 유지 결정
- 임베디드 세션 지원: Windows 환경에서 wiki 접근 경로 안내

### 변경 파일
- `webapp/frontend/index.html` — 사이드바 레이아웃 전면 교체
- `webapp/frontend/app.js` — shell description 한국어 수정
- `webapp/frontend/pages/dashboard.js` — 대시보드 전면 재작성
- `webapp/frontend/pages/*.js` (7개) — 한국어 수정
- `CLAUDE.md` — wiki 경로, 세션 범위 재배분, 활동 로그 규칙
- `AGENTS.md` — wiki 경로, 활동 로그 규칙, 디자인 토큰 경로
- `wiki/` — 전체 구조 신규 (12+ 문서)
- `wiki-mcp/` — bms-wiki MCP 서버 신규 (5개 도구)
- `webapp/CLAUDE.md` — Passport 세션 규칙 신규
- `chaincode/CLAUDE.md` — Blockchain 세션 규칙 신규
- `embedded/CLAUDE.md` — Embedded 세션 규칙 신규
- `.claude/session-guard.sh` — 세션 격리 훅 신규
- `.claude/projects/.../settings.json` — bms-wiki MCP + 세션 격리 훅 등록

### 미완료
- 대시보드 추가 폴리싱 (차트/게이지는 데이터에 맞는 방식으로 추후)
- Codex CLI에서 Obsidian vault 경로 활용한 UI 작업은 다음 세션에서 시도

### 교훈
- 레퍼런스 복제 시 "느낌 참고" vs "구조 복제"를 사전에 명확히 합의할 것
- 다크 배경 카드, 10px 이하 텍스트, 빈 SVG 차트 = 가독성 최악
- 디자인 토큰(`wiki/passport/design-tokens.md`)을 먼저 확립하고 작업할 것
- wiki를 심링크로 연결하면 Codex CLI가 못 따라감 → 실제 디렉토리로 유지
- 세션 간 소통은 wiki activity-log + MCP 도구로 충분. 별도 채널 불필요
- Task Packet으로 작업 계약을 먼저 정의하면 5~6회 반복 실패를 줄일 수 있었음

### 다음 세션 이어갈 곳
- 대시보드 폴리싱 (Task Packet 작성 후 진행)
- 다른 페이지 시각 레퍼런스 수집/적용

---

## Session 2 — 2026-04-06 (Codex CLI)

### 작업 주체
- Codex CLI 주도 작업
- Claude Code 협업 세션 컨텍스트에서 수행
- 브랜치: `feat/batp-ui-rebuild`
- 상세 Codex 로그: `wiki/passport/activity-log-codex.md`

### 요약
BATP 프론트 구조 재편 — IA 정리, 대문/인증 분리, dossier 구조

### 작업 내용
- `feat/batp-ui-rebuild` 브랜치에서 프론트 구조 재편
- IA를 `개요 / 등록부 / 운영 / 점검 / 증빙` 기준으로 재정리
- `passport-detail`을 기술 문서(dossier) 흐름으로 재구성
- 로그인을 대문(landing) + 별도 인증 화면 구조로 전환
- 대문 우측 비주얼을 `solar-powered-ev-station` 자산으로 교체
- Playwright 회귀 검증 수행

### 변경 파일
- `webapp/frontend/app.js` — 비인증 진입 라우팅, IA 메타데이터
- `webapp/frontend/index.html` — 비인증 진입 블록 구조
- `webapp/frontend/pages/login.js` — landing + login 재작성
- `webapp/frontend/pages/dashboard.js` — 개요 카피/구조
- `webapp/frontend/pages/passports.js` — 등록부 카피
- `webapp/frontend/pages/passport-detail.js` — 기술 문서 구조
- `webapp/frontend/pages/maintenance.js`, `recycling.js`, `bmu-data.js`, `qr-scan.js`, `audit-log.js` — 카피 정리
- `webapp/frontend/solar-ev-station.png` — 랜딩 비주얼
- `e2e-tests/tests/` — 6개 테스트 파일 기대값 갱신

### 미완료
- landing 문구 최종 폴리싱
- 한국어/영문 혼합 문구 2차 정리

### 교훈
- 레퍼런스가 landing 성격이면 entry surface와 auth surface를 분리할 것
- 번역투/기획서투 문구는 구조가 좋아도 품질을 떨어뜨림
- wiki 디자인 토큰을 먼저 읽고 문구 기준까지 맞추면 재작업 감소

---

## Session 1 — ~2026-04-01 (Claude Code)

### 요약
GAN Loop 225회 + 하네스 12 Cycle 완료, Dark→Light 테마 전환

### 작업 내용
- GAN Loop UI 리디자인 15×15=225회 (Industrial Precision Dark 테마)
- Clean Light 테마 전면 전환 (Pretendard, 흰 배경, AI 효과 제거)
- BATP 하네스 프로토콜 12 Cycle 완료 (구조적 리디자인)
  - Dashboard→칸반, Passports→카드그리드, Detail→스크롤문서
  - Maintenance→타임라인, Recycling→그룹섹션, AuditLog→액티비티피드
- Playwright 41/41 통과

### 미완료
- 하네스 나머지 2 Cycle (폴리싱, 선택사항)

### 교훈
- 225회 반복해도 "AI스러운 UI"에서 벗어나지 못함
- 외부 레퍼런스 없이 도메인 성격만으로 시각 언어를 끌어내기 어려움
- 디자인 결정을 기록하고 공유하는 시스템(wiki)이 필요했음

### 작업 내용 (Codex CLI — Dashboard benchmark pass)
- OpenBatteryPassport 계열 대시보드 스크린샷을 골격 레퍼런스로 삼아 대시보드 레이아웃 재구성
- BATP 랜딩과 맞춘 블루 팔레트(`#1769e0`, `#00a8ff`, `#f5f6f8`)로 KPI 카드/도넛 차트/테이블 톤 통일
- KPI 3개 + 도넛 2개 + 하단 테이블 구조로 정리
- 화학계열 분포, 상태 분류 도넛 차트 추가
- 대시보드 관련 Playwright 기대값을 새 구조에 맞게 갱신

### 변경 파일
- `webapp/frontend/pages/dashboard.js` — benchmark형 대시보드 구조 재작성
- `e2e-tests/tests/cycle02_micro11_shell.shared.js` — 대시보드 shell 기대값 갱신
- `e2e-tests/tests/cycle03_micro01_dashboard_density.shared.js` — 대시보드 밀도 기대값 갱신

### 미완료
- 실제 데이터가 충분할 때 도넛 차트 범례/라벨 미세 조정 필요
- Export/Filter/Add New 액션의 실제 기능 연결은 아직 없음 (버튼만 배치)

### 교훈
- 관리자형 배터리 여권 UI는 generic SaaS를 피하되, 배터리 여권 전용 제품에서도 검증된 B2B 골격은 적극 차용하는 편이 빠르고 안정적임
- 레퍼런스 구조를 가져오더라도 카피/지표는 BATP 도메인 용어로 다시 써야 함

### 작업 내용 (Codex CLI — Sidebar refinement pass)
- 좌측 내비게이션을 아이콘 바에서 라벨형 사이드바로 확장
- 검색 입력, 대기 항목, Support/Settings, 사용자 프로필 카드 추가
- 대시보드 benchmark pass와 맞도록 shell 테스트 기대값 정리

### 변경 파일
- `webapp/frontend/index.html` — 좌측 사이드바를 풀사이즈 라벨형 네비게이션으로 개편
- `e2e-tests/tests/cycle02_micro11_shell.shared.js` — 사이드바/쉘 기대값 갱신
- `e2e-tests/tests/cycle03_micro01_dashboard_density.shared.js` — 대시보드 제목 selector 정리

### 미완료
- Support/Settings는 현재 정적 버튼
- 검색 박스는 시각 요소만 있고 실제 검색 기능은 미연결

## Session 2C — 2026-04-06 (Codex CLI, Dashboard action/legend/sidebar polish)

### 작업 주체
- Codex CLI 주도 작업
- 브랜치: `master` 작업트리 기준 현행 프론트 수정

### 요약
대시보드 테이블 액션을 실제 라우팅으로 연결하고, 차트 범례/사이드바를 마지막 폴리싱 단계까지 정리

### 작업 내용
- 대시보드 테이블 `관리` 열에 기본 액션 + 상세 + 오버플로 메뉴를 연결
- 여권 상태에 따라 `등록부에서 확인 / 정비 완료 / 분석 등록 / 회수 검토 / 기술 문서`로 이어지는 CTA 정리
- 화학계열/상태 분포 도넛 중앙 요약과 상단 대표 항목 요약 카드 추가
- 사이드바 검색 입력을 실제 화면 이동/안내 토스트로 연결
- 고객/공급사, 접근 제어, 지원, 설정 버튼은 연결 전 상태를 설명하는 보조 문구/토스트로 정리

### 변경 파일
- `webapp/frontend/app.js`
- `webapp/frontend/index.html`
- `webapp/frontend/pages/dashboard.js`

### 검증
- `node --check webapp/frontend/app.js`
- `node --check webapp/frontend/pages/dashboard.js`
- `PW_BASE_URL=http://127.0.0.1:3001 npx playwright test tests/verify_cycle02_micro11.spec.js tests/verify_cycle03_micro01.spec.js --config=playwright.config.js` → 5 passed

### 미완료
- 보조 메뉴는 아직 실제 페이지 미연결
- 레퍼런스와 완전 동일한 밀도까지는 아직 아님 (시각 점수 88/100)

### 교훈
- 배터리 여권 대시보드는 레퍼런스 골격을 따르더라도 BATP 작업 CTA를 넣으면 액션 우선순위가 더 중요해짐
- 연결 전 기능도 토스트/보조 문구를 넣으면 더 이상 죽은 UI처럼 보이지 않음

### 작업 내용 (Codex CLI — Passport detail restructure pass)
- 배터리 상세 페이지 상단을 문서 헤더 + 3패널(핵심 식별/운영 상태/즉시 조치) 구조로 재편
- 운영 이력 섹션에 최근 운영 이벤트 카드를 추가해 표 이전에 판단 흐름이 먼저 보이도록 조정
- BMU 섹션에 요약 카드(SOC/전압/온도/방전주기/최근 수집/무효화)를 추가해 raw table 진입 전에 핵심 상태를 읽도록 정리
- 탭 라벨을 개요 / 규제·소재 / 운영 이력 / 진단 데이터 / 증빙으로 정리

### 변경 파일
- `webapp/frontend/pages/passport-detail.js`
- `e2e-tests/tests/cycle02_micro09_detail.shared.js`

### 검증
- `node --check webapp/frontend/pages/passport-detail.js`
- `node --check e2e-tests/tests/cycle02_micro09_detail.shared.js`
- `PW_BASE_URL=http://127.0.0.1:3001 npx playwright test tests/verify_cycle02_micro09.spec.js --config=playwright.config.js` → 3 passed

### 미완료
- 규제·소재 / 증빙 섹션은 기존 구조를 많이 유지하고 있어 2차 압축 여지 있음
- 상단 액션 데스크는 sticky rail이 아니라 상단 카드형으로 먼저 반영함

### 교훈
- 상세 페이지는 섹션을 많이 바꾸기보다 첫 화면과 이력/BMU의 읽는 순서를 바꾸는 것만으로도 체감이 크게 달라짐

## Session 2D — 2026-04-06 (Codex CLI, Passport detail restructure pass)

### 작업 주체
- Codex CLI 주도 작업
- 브랜치: `master` 작업트리 기준 현행 프론트 수정

### 요약
배터리 상세 페이지를 긴 정보 나열형에서 판단·조치 우선 문서형으로 재배치했다.

### 작업 내용
- 상단 hero를 모델/상태/문서 액션 중심으로 재구성
- `핵심 식별 / 운영 상태 / 즉시 조치` 3패널 추가
- 운영 이력 섹션에 최근 이벤트 카드 추가
- BMU 섹션에 요약 카드(SOC/전압/온도/방전주기/최근 수집/무효화) 추가
- 탭 라벨을 `개요 / 규제·소재 / 운영 이력 / 진단 데이터 / 증빙`으로 정리

### 변경 파일
- `webapp/frontend/pages/passport-detail.js`
- `e2e-tests/tests/cycle02_micro09_detail.shared.js`

### 검증
- `node --check webapp/frontend/pages/passport-detail.js`
- `node --check e2e-tests/tests/cycle02_micro09_detail.shared.js`
- `PW_BASE_URL=http://127.0.0.1:3001 npx playwright test tests/verify_cycle02_micro09.spec.js --config=playwright.config.js` → 3 passed

### 미완료
- 규제·소재 / 증빙 섹션은 아직 기존 정보 밀도가 남아 있음
- 우측 sticky action rail은 아직 미구현

### 교훈
- 상세 페이지는 데이터 총량보다 첫 화면의 판단 순서가 더 중요함
- 운영 이력과 BMU는 표를 지우기보다 요약층을 먼저 올리는 편이 리스크가 낮음

## Session 2E — 2026-04-06 (Codex CLI, Passport detail compression pass)

### 작업 주체
- Codex CLI 주도 작업
- 브랜치: `master` 작업트리 기준 현행 프론트 수정

### 요약
상세 페이지의 규제·소재/증빙 섹션을 더 압축하고, sticky action rail과 탭 클릭 반응을 보강했다.

### 작업 내용
- 상단 탭 버튼이 실제로 `activeTab`을 갱신하고 해당 섹션으로 스크롤되도록 수정
- active 탭 하이라이트 추가
- 상세 페이지 우측 성격의 sticky action rail 추가
- 규제·소재 섹션에 요약 카드 + 우선 보완 항목 chip 추가
- GBA 상세 체크리스트를 접이식(details) 구조로 압축
- 증빙 섹션에 요약 카드 추가
- 정정 이력 / 변경 이력을 접이식 구조로 정리

### 변경 파일
- `webapp/frontend/pages/passport-detail.js`

### 검증
- `node --check webapp/frontend/pages/passport-detail.js`
- `PW_BASE_URL=http://127.0.0.1:3001 npx playwright test tests/verify_cycle02_micro09.spec.js --config=playwright.config.js` → 3 passed

### 미완료
- 우측 rail은 진짜 컬럼형이 아니라 상단 우측 sticky 카드 수준
- 규제·소재/증빙 내부 카드 밀도는 한 번 더 줄일 수 있음

## Session 2F — 2026-04-06 (Codex CLI, Detail spacing + passports tone pass)

### 작업 주체
- Codex CLI 주도 작업
- 브랜치: `master` 작업트리 기준 현행 프론트 수정

### 요약
상세 페이지 중간 공백 문제를 제거하고, passport list 페이지 톤을 상세/대시보드와 맞췄다. 여권 발급 mock 회귀도 통과했다.

### 작업 내용
- 상세 페이지 sticky rail을 별도 행 레이아웃에서 fixed rail로 바꿔 중간이 붕 뜨는 현상 제거
- passport list cover/list panel radius/background/hover tone을 BATP 라이트 톤으로 보정
- passports 회귀 테스트 selector를 h1 기준으로 정리
- 여권 발급 wizard mock 회귀 통과 확인

### 변경 파일
- `webapp/frontend/pages/passport-detail.js`
- `webapp/frontend/pages/passports.js`
- `e2e-tests/tests/cycle02_micro08_passports.shared.js`

### 검증
- `node --check webapp/frontend/pages/passport-detail.js`
- `node --check webapp/frontend/pages/passports.js`
- `node --check e2e-tests/tests/cycle02_micro08_passports.shared.js`
- `node --check e2e-tests/tests/cycle02_micro09_detail.shared.js`
- `PW_BASE_URL=http://127.0.0.1:3001 npx playwright test tests/verify_cycle02_micro08.spec.js tests/verify_cycle02_micro09.spec.js --config=playwright.config.js` → 6 passed

### 미완료
- 실제 서버에서 여권 발급이 계속 실패하면 mock 회귀가 아니라 백엔드/Fabric 오류 로그를 추가 확인해야 함

## Session 2G — 2026-04-06 (Codex CLI, Passport issue modal fix)

### 작업 주체
- Codex CLI 주도 작업
- 브랜치: `master` 작업트리 기준 현행 프론트 수정

### 요약
실서버에서 여권 발급 버튼을 눌러도 창이 안 뜨는 문제는 백엔드가 아니라 프론트 모달 오버레이 구조 문제로 확인했고 수정했다.

### 작업 내용
- `webapp/frontend/pages/passports.js`
  - 발급 모달을 inline 블록에서 `fixed inset` 오버레이 모달로 수정
  - 오버레이 클릭 닫기 추가
- 로그 확인
  - `logs/audit.log` 기준 최근 요청에는 `POST /api/passports`가 보이지 않았음
  - 현재 시점 실서버 장애는 발급 submit 이전(UI 단계)로 판단

### 변경 파일
- `webapp/frontend/pages/passports.js`

### 검증
- `node --check webapp/frontend/pages/passports.js`
- `PW_BASE_URL=http://127.0.0.1:3001 npx playwright test tests/verify_cycle02_micro08.spec.js --config=playwright.config.js` → 3 passed

### 미완료
- 사용자가 실제 클릭한 시점의 서버 로그와 완전히 1:1 대조한 것은 아님
- 상세 rail/증빙 밀도 추가 다듬기 여지 있음

## Session 2H — 2026-04-06 (Codex CLI, Detail simplification pass)

### 작업 주체
- Codex CLI 주도 작업
- 브랜치: `master` 작업트리 기준 현행 프론트 수정

### 요약
상세 페이지의 가장 이상했던 부분인 탭-콘텐츠 불일치와 액션 중복을 정리했다.

### 작업 내용
- 탭 클릭 시 모든 섹션을 스크롤하는 구조에서 `activeTab` 단일 섹션 표시 구조로 단순화
- 상단 3번째 `즉시 조치` 카드 제거
- rail 쪽에 소규모 action button을 모아 액션 중복 제거
- detail 본문에 rail 공간을 위한 우측 여백을 확보해 겹침을 완화
- 관련 회귀 테스트 기대값 조정

### 변경 파일
- `webapp/frontend/pages/passport-detail.js`
- `e2e-tests/tests/cycle02_micro09_detail.shared.js`

### 검증
- `node --check webapp/frontend/pages/passport-detail.js`
- `node --check e2e-tests/tests/cycle02_micro09_detail.shared.js`
- `PW_BASE_URL=http://127.0.0.1:3001 npx playwright test tests/verify_cycle02_micro08.spec.js tests/verify_cycle02_micro09.spec.js --config=playwright.config.js` → 6 passed

### 미완료
- rail은 여전히 fixed 카드라서 추후 진짜 우측 레이아웃 레일로 다듬을 수 있음
- 실서버 발급 백엔드 오류는 현재 로그상 미재현

## Session 2I — 2026-04-06 (Codex CLI, Draggable rail popup pass)

### 작업 주체
- Codex CLI 주도 작업
- 브랜치: `master` 작업트리 기준 현행 프론트 수정

### 요약
상세 페이지 action rail을 축소 가능한 드래그 팝업으로 바꾸고, 상단 공백도 더 줄였다.

### 작업 내용
- rail을 fixed 카드에서 드래그 가능한 popup rail로 전환
- `+ / -`로 축소/확장 가능하게 변경
- 드래그 위치를 localStorage에 저장
- 본문 우측 여백을 desktop 전용으로 조정
- 섹션 헤더 top spacing 축소

### 변경 파일
- `webapp/frontend/pages/passport-detail.js`

### 검증
- `node --check webapp/frontend/pages/passport-detail.js`
- `PW_BASE_URL=http://127.0.0.1:3001 npx playwright test tests/verify_cycle02_micro09.spec.js --config=playwright.config.js` → 3 passed

## Session 2K — 2026-04-06 (Codex CLI, Detail readability polish)

### 작업 주체
- Codex CLI 주도 작업
- 브랜치: `master` 작업트리 기준 현행 프론트 수정

### 요약
배터리 상세 상단의 핵심 식별/운영 상태 카드를 타일형 정보 카드로 재구성해 가독성을 높였다.

### 작업 내용
- `핵심 식별` 카드를 개별 정보 타일 구조로 변경
- 라벨은 작게, 값은 크게 조정하여 위계 강화
- `운영 상태`도 동일한 타일형 밀도로 통일
- 문서 상태 카드도 같은 리듬으로 맞춤
- 사용 피드백 기준으로 “빈 큰 카드” 느낌을 줄임

### 변경 파일
- `webapp/frontend/pages/passport-detail.js`

### 검증
- `node --check webapp/frontend/pages/passport-detail.js`
- 사용자 확인 피드백: “훨씬 좋네” 확보

### 미완료
- 필요 시 rail 디자인 미세 조정 가능
- 상세 하단 섹션은 이후 추가 밀도 조정 여지 있음

## Session 2L — 2026-04-06 (Codex CLI, Detail card readability / rail interaction fix)

### 작업 주체
- Codex CLI 주도 작업
- 브랜치: `master` 작업트리 기준 현행 프론트 수정

### 요약
상세 상단 카드의 가독성을 높이고, action rail 드래그/클릭 충돌을 다시 정리했다.

### 작업 내용
- 핵심 식별/운영 상태 카드 내부 타이포 위계 재조정
- 값 텍스트 강조, 라벨 축소, 정보 타일 밀도 재정렬
- 두 카드 높이/내부 리듬 재정렬
- action rail pointer 이벤트 충돌 정리
- rail 기본 spawn 위치 및 저장 버전 갱신

### 변경 파일
- `webapp/frontend/pages/passport-detail.js`

### 검증
- `node --check webapp/frontend/pages/passport-detail.js`

## Session 2M — 2026-04-06 (Codex CLI, Typography unification pass)

### 작업 주체
- Codex CLI 주도 작업
- 브랜치: `master` 작업트리 기준 현행 프론트 수정

### 요약
상세 하단 섹션 타이포를 정리하고 dashboard/passports/detail의 톤을 BATP light system으로 더 통일했다.

### 작업 내용
- detail 하단의 EV 바인딩 / 진단 카드 / 규제 요약 / 증빙 요약 타이포를 상단 카드 리듬과 맞춤
- dashboard eyebrow를 `battery control`로 조정하고 shell 기대값 동기화
- passports eyebrow/metric label을 `battery register` 톤으로 정리
- passports hero 서브타이틀을 sn-heading 리듬에 맞춤

### 변경 파일
- `webapp/frontend/pages/passport-detail.js`
- `webapp/frontend/pages/dashboard.js`
- `webapp/frontend/pages/passports.js`
- `e2e-tests/tests/cycle02_micro11_shell.shared.js`

### 검증
- `node --check webapp/frontend/pages/passport-detail.js`
- `node --check webapp/frontend/pages/passports.js`
- `node --check webapp/frontend/pages/dashboard.js`
- `node --check e2e-tests/tests/cycle02_micro11_shell.shared.js`
- `PW_BASE_URL=http://127.0.0.1:3001 npx playwright test tests/verify_cycle02_micro08.spec.js tests/verify_cycle02_micro09.spec.js tests/verify_cycle02_micro11.spec.js --config=playwright.config.js` → 9 passed

## Session 2N — 2026-04-06 (Codex CLI, Secondary pages tone pass)

### 작업 주체
- Codex CLI 주도 작업
- 브랜치: `master` 작업트리 기준 현행 프론트 수정

### 요약
maintenance / recycling / bmu-data / audit-log를 dashboard·passports·detail과 같은 BATP light tone으로 통일했다.

### 작업 내용
- `maintenance.js`
  - hero eyebrow를 `service operations`로 정리
  - summary eyebrow를 `service brief`로 정리
- `recycling.js`
  - hero eyebrow를 `recovery operations`로 정리
  - summary eyebrow를 `recovery brief`로 정리
  - recycling 관련 대상 필터를 ACTIVE/ANALYSIS까지 포함하도록 보강
- `bmu-data.js`
  - hero eyebrow를 `inspection console`로 정리
  - summary eyebrow를 `telemetry brief`로 정리
- `audit-log.js`
  - hero eyebrow를 `evidence ledger`로 정리
  - summary eyebrow를 `evidence brief`로 정리
- 관련 회귀 테스트 기대값을 현재 BATP tone에 맞춰 정리

### 변경 파일
- `webapp/frontend/pages/maintenance.js`
- `webapp/frontend/pages/recycling.js`
- `webapp/frontend/pages/bmu-data.js`
- `webapp/frontend/pages/audit-log.js`
- `e2e-tests/tests/cycle02_micro01_maintenance.shared.js`
- `e2e-tests/tests/cycle02_micro03_recycling.shared.js`
- `e2e-tests/tests/cycle02_micro04_audit.shared.js`
- `e2e-tests/tests/cycle02_micro06_bmu.shared.js`

### 검증
- `node --check webapp/frontend/pages/maintenance.js`
- `node --check webapp/frontend/pages/recycling.js`
- `node --check webapp/frontend/pages/bmu-data.js`
- `node --check webapp/frontend/pages/audit-log.js`
- `node --check e2e-tests/tests/cycle02_micro01_maintenance.shared.js`
- `node --check e2e-tests/tests/cycle02_micro03_recycling.shared.js`
- `node --check e2e-tests/tests/cycle02_micro04_audit.shared.js`
- `node --check e2e-tests/tests/cycle02_micro06_bmu.shared.js`
- `PW_BASE_URL=http://127.0.0.1:3001 npx playwright test tests/verify_cycle02_micro01.spec.js tests/verify_cycle02_micro03.spec.js tests/verify_cycle02_micro04.spec.js tests/verify_cycle02_micro06.spec.js --config=playwright.config.js` → 12 passed

### 미완료
- materials / qr-scan도 같은 tone pass 가능
- 더 강한 제품 언어 통일이 필요하면 copy 2차 pass 가능

## Session 2O — 2026-04-07 (Codex CLI, Materials + QR tone pass)

### 작업 주체
- Codex CLI 주도 작업
- 브랜치: `master` 작업트리 기준 현행 프론트 수정

### 요약
materials와 qr-scan까지 BATP light tone으로 맞추면서 주요 내부 화면 통일을 마감했다.

### 작업 내용
- `materials.js`
  - hero eyebrow를 `material ledger`로 정리
  - provenance summary 영역에 `provenance brief` 추가
  - materials fetch가 `records` 응답도 처리하도록 보강
- `qr-scan.js`
  - hero eyebrow를 `intake station`으로 정리
  - summary eyebrow를 `intake brief`로 정리
  - NFC 미지원 환경용 fallback panel 추가
- 관련 materials / qr shared Playwright expectation 갱신

### 변경 파일
- `webapp/frontend/pages/materials.js`
- `webapp/frontend/pages/qr-scan.js`
- `e2e-tests/tests/cycle02_micro02_materials.shared.js`
- `e2e-tests/tests/cycle02_micro05_qr_scan.shared.js`

### 검증
- `node --check webapp/frontend/pages/materials.js`
- `node --check webapp/frontend/pages/qr-scan.js`
- `node --check e2e-tests/tests/cycle02_micro02_materials.shared.js`
- `node --check e2e-tests/tests/cycle02_micro05_qr_scan.shared.js`
- `PW_BASE_URL=http://127.0.0.1:3001 npx playwright test tests/verify_cycle02_micro02.spec.js tests/verify_cycle02_micro05.spec.js --config=playwright.config.js` → 6 passed

### 미완료
- copy 2차 pass를 원하면 전 페이지 문구 톤을 더 공격적으로 정리 가능

## Session 2P — 2026-04-07 (Codex CLI, Global copy polish + QA checklist)

### 작업 주체
- Codex CLI 주도 작업
- 브랜치: `master` 작업트리 기준 현행 프론트 수정

### 요약
전 페이지 한글화 copy pass를 마무리하고 실사용 수동 QA 체크리스트를 작성했다.

### 작업 내용
- 주요 내부 화면의 영문 eyebrow/brief를 한국어 중심으로 재정리
- 어색한 한국어 표현(예: 종결 대상/inspection 첫 증거 등) 정리
- `wiki/passport/manual-qa-checklist.md` 작성
  - 공통 진입
  - 대시보드
  - 등록부
  - 상세
  - 원자재
  - 정비/회수
  - BMU
  - QR/NFC
  - 감사 로그
  - 마감 확인

### 변경 파일
- `webapp/frontend/pages/dashboard.js`
- `webapp/frontend/pages/passports.js`
- `webapp/frontend/pages/passport-detail.js`
- `webapp/frontend/pages/maintenance.js`
- `webapp/frontend/pages/recycling.js`
- `webapp/frontend/pages/bmu-data.js`
- `webapp/frontend/pages/audit-log.js`
- `webapp/frontend/pages/materials.js`
- `webapp/frontend/pages/qr-scan.js`
- `webapp/frontend/app.js`
- `webapp/frontend/index.html`
- 관련 shared Playwright tests
- `wiki/passport/manual-qa-checklist.md`

### 검증
- node check 및 주요/보조 페이지 Playwright 회귀 통과
- 상세/등록부/쉘 9 passed
- 보조 페이지 12 passed
- materials/qr 6 passed

### 미완료
- 원하면 copy 3차로 더 공격적인 제품 카피 정리 가능
- 런 산출물(screenshots/test-results) 정리 여부만 남음

## Session 2Q — 2026-04-07 (Codex CLI, Live manual QA run)

### 작업 주체
- Codex CLI 주도 작업
- 브랜치: `master` 작업트리 기준 현행 프론트 점검

### 요약
실서버(`http://127.0.0.1:3001`) 기준으로 수동 QA 체크리스트를 실제 흐름으로 점검했고 결과 리포트를 작성했다.

### 작업 내용
- 대문/로그인 전환 실제 확인
- 제조사 계정으로 대시보드/등록부/여권 발급/원자재 등록/QR 수동 조회 확인
- 서비스 계정으로 정비 운영/BMU 데이터 확인
- 검증기관 계정으로 회수 운영/감사 로그 확인
- 결과 리포트 생성: `wiki/passport/manual-qa-report-2026-04-07.md`

### 결과 요약
- PASS
  - 공통 진입: 대문 노출
  - 공통 진입: 계정 등록 탭 전환
  - 대시보드: KPI/차트/테이블 확인
  - 등록부: 여권 발급 모달 오픈 및 생성
  - 원자재: 등록 모달 오픈 및 생성
  - QR/NFC: 수동 입력으로 상세 연결
  - 정비 운영: 서비스 계정 화면 진입
  - 회수 운영: 규제 계정 화면 진입
- FAIL
  - 상세: 생성 직후 새 여권 상세 진입 확인 타임아웃
  - BMU 데이터: 실제 데이터 조회 후 `판독 기록` 노출 대기 타임아웃
  - 감사 로그: `DISPOSE_BATTERY` 필터 후 `총 1건` 반영 대기 타임아웃

### 산출물
- `wiki/passport/manual-qa-checklist.md`
- `wiki/passport/manual-qa-report-2026-04-07.md`

### 미완료
- 위 3개 FAIL 항목은 실제 런타임/데이터 상태 기준 추가 확인 필요

## Session 2R — 2026-04-07 (Codex CLI, Runtime issues follow-up)

### 작업 주체
- Codex CLI 주도 작업
- 브랜치: `master` 작업트리 기준 현행 프론트/실서버 점검

### 요약
실서버 QA에서 남았던 3개 항목을 추적했고, 생성 후 상세 진입과 감사 로그 필터는 실제 해결을 확인했다. BMU 데이터는 권한 이슈를 명시적으로 드러내도록 정리했다.

### 작업 내용
- `passports.js`
  - 여권 생성 성공 직후 `passport-detail`로 자동 이동하도록 수정
- `bmu-data.js`
  - 실서버에서 ServiceMSP가 `PASSPORT-BMU-DEVICE` 조회 시 access denied가 발생함을 확인
  - generic empty state 대신 권한 안내 패널을 보여주도록 보강
- `audit-log.js`
  - 활성 필터 요약 패널 추가
  - 필터 결과 0건일 때도 명시적으로 안내되도록 보강
- 실서버 검증
  - 제조사 계정으로 생성 후 상세 URL 자동 이동 확인
  - 서비스 계정으로 BMU 조회 시 권한 안내 패널 확인
  - 검증기관 계정으로 감사 로그 `CREATE_PASSPORT` 필터 결과 확인

### 변경 파일
- `webapp/frontend/pages/passports.js`
- `webapp/frontend/pages/bmu-data.js`
- `webapp/frontend/pages/audit-log.js`
- `wiki/passport/manual-qa-report-2026-04-07.md`

### 검증
- `node --check webapp/frontend/pages/passports.js`
- `node --check webapp/frontend/pages/bmu-data.js`
- `node --check webapp/frontend/pages/audit-log.js`
- 실서버 런타임 확인 결과
  - 생성 후 상세 이동: PASS
  - BMU 권한 안내 패널: PASS
  - 감사 로그 필터(CREATE_PASSPORT): PASS

### 메모
- BMU 데이터의 원래 실패는 화면 버그보다 RBAC 제약(서비스 계정이 MANUFACTURED 여권 접근 불가) 영향이 컸음

## Session 2S — 2026-04-07 (OpenAgent, Frontend baseline + QA refresh)

### 작업 주체
- OpenAgent 주도 작업
- 브랜치: `master` 작업트리 기준 현행 프론트/QA 점검

### 요약
프론트 기준선을 다시 점검하고, 눈에 띄는 UI 클래스 오타를 정리한 뒤 Playwright와 실브라우저 흐름으로 QA 결과를 최신 상태로 갱신했다.

### 작업 내용
- `passports.js`, `bmu-data.js`, `passport-detail.js`, `maintenance.js`, `recycling.js`
  - 잘못 들어간 상태 색상 클래스 `bg-[rgba(...)]0` 오타를 실제 색상 클래스(`bg-[#ef4444]`)로 정리
- 프론트 QA 기준선 재점검
  - `e2e-tests/tests/c02_check.spec.js` 실행
  - `battery-passport.spec.js`의 프론트 네비게이션/상세 탭 구간 실행
  - 브라우저 스크립트로 상세 해시 유지, BMU 권한 안내 패널, 감사 로그 필터 동작 재확인
- `wiki/passport/manual-qa-report-2026-04-07.md`
  - 기존 FAIL 3건을 현재 동작 기준 PASS 상태로 정리
  - 자동화 검증 결과와 BMU RBAC 해석을 메모에 반영

### 변경 파일
- `webapp/frontend/pages/passports.js`
- `webapp/frontend/pages/bmu-data.js`
- `webapp/frontend/pages/passport-detail.js`
- `webapp/frontend/pages/maintenance.js`
- `webapp/frontend/pages/recycling.js`
- `wiki/passport/manual-qa-report-2026-04-07.md`
- `wiki/passport/activity-log.md`

### 검증
- `node --check webapp/frontend/pages/passports.js`
- `node --check webapp/frontend/pages/bmu-data.js`
- `node --check webapp/frontend/pages/passport-detail.js`
- `node --check webapp/frontend/pages/maintenance.js`
- `node --check webapp/frontend/pages/recycling.js`
- `cd e2e-tests && npx playwright test tests/c02_check.spec.js` → 1 passed
- `cd e2e-tests && npx playwright test tests/battery-passport.spec.js --grep "11\. 프론트엔드 네비게이션|12\. 여권 상세 탭"` → 10 passed
- 수동 브라우저 재점검
  - 상세 탭 해시 유지: PASS
  - BMU 권한 안내 패널 + 자동 새로고침 토글: PASS
  - 감사 로그 `CREATE_PASSPORT` 필터: PASS

### 미완료
- `passport-detail.js` 대형 파일 분해는 아직 시작하지 않음
- 프론트 산출물(`index.html.bak`, `test-results/`, `Zone.Identifier`) 정리는 다음 패스로 넘김

### 교훈
- 수동 QA 리포트는 후속 수정이 들어간 뒤 즉시 갱신하지 않으면 금방 stale 상태가 된다.
- BMU 화면은 데이터 유무보다 RBAC 해석을 QA 기준에 반영해야 재현과 판정이 일치한다.

## Session 2T — 2026-04-07 (OpenAgent, modal modularization + full QA closeout)

### 작업 주체
- OpenAgent 주도 작업
- 브랜치: `feature/vc-issue-modal-separation`

### 요약
`passport-detail.js`의 모달 구간을 Presentational wrapper 중심으로 대거 분리했고, 남아 있던 Playwright 실패 2건까지 현재 UI/백엔드 계약에 맞게 정리해 전체 회귀를 통과시켰다.

### 작업 내용
- `webapp/frontend/components/base-modal.js`
  - 공통 모달 셸 추가
- `webapp/frontend/components/passport-detail/*`
  - `ModalVcIssue`, `ModalBind`, `ModalDataCorrection`, `ModalBMUInvalidate`, `ModalLinkMaterials`
  - `ModalMaintenanceRequest`, `ModalMaintenanceLog`, `ModalAccidentLog`, `ModalAnalysisRequest`, `ModalAnalysisResult`, `ModalRecycle`, `ModalExtract`, `ModalDispose`
  - 기존 개별 모달 UI를 감싸는 Presentational wrapper들 추가
- `webapp/frontend/pages/passport-detail.js`
  - 인라인/직접 사용 중이던 모달 태그를 wrapper 컴포넌트 사용으로 교체
  - wrapper 글로벌 등록 추가
- `e2e-tests/tests/battery-passport.spec.js`
  - 로그인 UI 테스트를 현재 `#login` 구조와 실제 placeholder/조직 카드 기준으로 안정화
  - BMU records 테스트를 현재 시드 여권과 응답 shape(`count`, `bookmark`, `records[]`) 기준으로 정리

### 변경 파일
- `webapp/frontend/components/base-modal.js`
- `webapp/frontend/components/passport-detail/ModalVcIssue.js`
- `webapp/frontend/components/passport-detail/ModalBind.js`
- `webapp/frontend/components/passport-detail/ModalDataCorrection.js`
- `webapp/frontend/components/passport-detail/ModalBMUInvalidate.js`
- `webapp/frontend/components/passport-detail/ModalLinkMaterials.js`
- `webapp/frontend/components/passport-detail/ModalMaintenanceRequest.js`
- `webapp/frontend/components/passport-detail/ModalMaintenanceLog.js`
- `webapp/frontend/components/passport-detail/ModalAccidentLog.js`
- `webapp/frontend/components/passport-detail/ModalAnalysisRequest.js`
- `webapp/frontend/components/passport-detail/ModalAnalysisResult.js`
- `webapp/frontend/components/passport-detail/ModalRecycle.js`
- `webapp/frontend/components/passport-detail/ModalExtract.js`
- `webapp/frontend/components/passport-detail/ModalDispose.js`
- `webapp/frontend/pages/passport-detail.js`
- `e2e-tests/tests/battery-passport.spec.js`
- `wiki/passport/manual-qa-report-2026-04-07.md`
- `wiki/passport/activity-log.md`

### 검증
- `node -c e2e-tests/tests/battery-passport.spec.js`
- `cd e2e-tests && npx playwright test tests/battery-passport.spec.js --config=playwright.config.js` → 41 passed
- `cd e2e-tests && npx playwright test tests/c02_check.spec.js --config=playwright.config.js` → 1 passed
- 수동 브라우저 확인
  - `#login` heading 노출: PASS
  - 로그인 후 `#passports` 진입: PASS

### 미완료
- wrapper 파일들의 주석/스타일 정리 패스는 아직 남아 있음
- `passport-detail.js`는 모달 구간이 줄었지만 여전히 추가 분해 여지가 큼

### 교훈
- 프론트 회귀 실패는 구현보다 테스트 선택자/시드 데이터 가정이 먼저 오래될 수 있다.
- BMU records 같은 API는 "무조건 200"보다 현재 백엔드 계약과 시드 상태를 함께 테스트해야 안정적이다.

## Session 2U — 2026-04-07 (OpenAgent, copy/typography cleanup + badge alignment)

### 작업 주체
- OpenAgent 주도 작업
- 브랜치: `feature/vc-issue-modal-separation`

### 요약
프론트의 AI스러운 한국어 표현과 작은 글씨를 전반적으로 정리했고, `대기 항목` 배지와 실제 정비 목록 기준을 맞춰 숫자와 화면이 어긋나지 않게 했다.

### 작업 내용
- `webapp/frontend/app.js`
  - `maintenance` 배지 계산에서 Service의 `ANALYSIS` 포함 문제와 EV 제조사 대기 기준을 실제 화면 조건과 맞춤
- `webapp/frontend/pages/maintenance.js`
  - EV 제조사의 `ACTIVE + VIN` 대상을 실제 전체 목록 기준에도 반영하도록 정리
  - 정비 요청/정비 기록/사고 기록 write 호출을 `retryOnConflict` 패턴으로 통일
- `webapp/frontend/pages/recycling.js`
  - 분석/재활용 판정/추출/폐기 write 호출을 `retryOnConflict` 패턴으로 통일
  - 작은 텍스트와 과한 문서체를 줄이고 자연스러운 표현으로 정리
- 카피/타이포 정리 대상
  - `login.js`, `dashboard.js`, `passports.js`, `passport-detail.js`, `maintenance.js`, `recycling.js`, `audit-log.js`, `bmu-data.js`, `materials.js`, `qr-scan.js`
  - `등록부/대장/원장/증빙` 남발을 줄이고 `목록/기록/정비 관리/재활용 처리/감사 기록/상세 보기` 계열로 정리
  - 사용자 노출 10~11px 텍스트를 줄이고 라벨/보조 텍스트를 12px 이상 쪽으로 정리
- `.omc` 운영 메모
  - Gemini 3.1 Pro = 넓은 탐색/장문 초안, GPT-5.4 = 최종 판단/위험 변경/UI 카피 사인오프 규칙을 메모리와 프로젝트 지시에 추가

### 변경 파일
- `webapp/frontend/app.js`
- `webapp/frontend/pages/login.js`
- `webapp/frontend/pages/dashboard.js`
- `webapp/frontend/pages/passports.js`
- `webapp/frontend/pages/passport-detail.js`
- `webapp/frontend/pages/maintenance.js`
- `webapp/frontend/pages/recycling.js`
- `webapp/frontend/pages/audit-log.js`
- `webapp/frontend/pages/bmu-data.js`
- `webapp/frontend/pages/materials.js`
- `webapp/frontend/pages/qr-scan.js`
- `wiki/passport/manual-qa-report-2026-04-07.md`
- `wiki/passport/activity-log.md`

### 검증
- `node --check`:
  - `login.js`, `dashboard.js`, `passports.js`, `passport-detail.js`, `maintenance.js`, `recycling.js`, `audit-log.js`, `bmu-data.js`, `materials.js`, `qr-scan.js`
- `cd e2e-tests && npx playwright test tests/battery-passport.spec.js --config=playwright.config.js` → 41 passed
- `cd e2e-tests && npx playwright test tests/c02_check.spec.js --config=playwright.config.js` → 1 passed
- 추가 회귀
  - 대시보드 관련 2건 통과
  - 정비/재활용/상세/로그인 관련 회귀 통과

### 미완료
- `materials.js`, `bmu-data.js`, `qr-scan.js`도 정리했지만, 아직 전체 프론트를 디자인 기준으로 2차 미세 조정할 여지는 남아 있음
- `passport-detail.js`는 구조적으로 여전히 큰 파일이라, 후속 패스에서 섹션 단위 리팩터링이 필요함

### 교훈
- 한국어를 제품답게 만들려면 단순 번역보다 과한 문서체를 줄이는 쪽이 효과가 크다.
- 폰트 크기 문제는 기능보다 먼저 사용 피로를 만든다. 운영 화면의 작은 수치/라벨부터 잡는 게 효율적이다.

## Session 2V — 2026-04-08 (OpenAgent, CSS cleanup phase 1)

### 작업 주체
- OpenAgent 주도 작업
- 브랜치: `feature/vc-issue-modal-separation`

### 요약
전역 스타일 계층을 `index.html`에 보강하고, 운영 화면의 반복 inline style을 공통 클래스 중심으로 1차 정리했다. 화면 동작은 그대로 유지하면서 이후 리팩터링에 필요한 CSS 뼈대를 만들었다.

### 작업 내용
- `webapp/frontend/index.html`
  - 공통 스타일 클래스 추가
  - `sn-page-head`, `sn-page-title`, `sn-page-subtitle`, `sn-page-actions`
  - `sn-summary-grid-*`, `sn-summary-lead`, `sn-summary-copy-*`
  - `sn-stat-*`, `sn-toolbar`, `sn-filter-tabs`, `sn-filter-tab`, `sn-filter-tab-chip`
  - `sn-section-card`, `sn-section-head`, `sn-section-head-row`, `sn-kpi-mini`, `sn-info-grid`, `sn-info-tile`
- 적용 페이지
  - `maintenance.js`, `recycling.js`, `audit-log.js`, `bmu-data.js`, `materials.js`, `passports.js`, `dashboard.js`
  - 반복되던 헤더/요약/상태카드/툴바/탭바 inline style을 공통 클래스로 치환
- `login.js`
  - landing 과정에서 남은 불필요 데이터(`roleCards`) 제거

### 변경 파일
- `webapp/frontend/index.html`
- `webapp/frontend/pages/login.js`
- `webapp/frontend/pages/dashboard.js`
- `webapp/frontend/pages/passports.js`
- `webapp/frontend/pages/maintenance.js`
- `webapp/frontend/pages/recycling.js`
- `webapp/frontend/pages/audit-log.js`
- `webapp/frontend/pages/bmu-data.js`
- `webapp/frontend/pages/materials.js`

### 검증
- `node --check`
  - `login.js`, `dashboard.js`, `passports.js`, `maintenance.js`, `recycling.js`, `audit-log.js`, `bmu-data.js`, `materials.js`
- `cd e2e-tests && npx playwright test tests/battery-passport.spec.js --config=playwright.config.js --grep "3\. 프론트엔드 로그인|4\. 대시보드|11\. 프론트엔드 네비게이션.*(passports|bmu-data|materials|maintenance|recycling|audit-log|dashboard) 페이지 로드|12\. 여권 상세 탭"` → 11 passed

### 미완료
- `passport-detail.js`, `qr-scan.js` 등은 still-heavy 상태로, 2차 CSS 정리에서 공통 클래스 치환을 더 진행해야 함
- landing 페이지는 시각 비율 조정이 많이 들어가서 후속 미세조정 여지가 있음

### 교훈
- 전역 토큰만 있는 상태에선 리팩터링이 느리다. 공통 레이아웃/요약/상태 카드 클래스부터 먼저 만들어야 이후 inline style 정리가 빨라진다.

## Session 2W — 2026-04-08 (OpenAgent, CSS cleanup phase 2-3)

### 작업 주체
- OpenAgent 주도 작업
- 브랜치: `feature/vc-issue-modal-separation`

### 요약
전역 공통 스타일 계층을 더 확장하고, 운영 화면 전반과 `passport-detail` 상단부까지 반복 inline style을 공통 클래스로 옮겼다. 이후 프론트 핵심 회귀를 다시 돌려 CSS 정리가 동작을 깨지 않았음을 확인했다.

### 작업 내용
- `webapp/frontend/index.html`
  - 2차 공통 스타일 계층 추가
  - `sn-scan-*`, `sn-result-*`, `sn-detail-*` 계열 보강
- 공통화 반영 파일
  - `dashboard.js`
  - `passports.js`
  - `maintenance.js`
  - `recycling.js`
  - `audit-log.js`
  - `bmu-data.js`
  - `materials.js`
  - `qr-scan.js`
  - `passport-detail.js` 상단 hero / overview / 일부 section surface / section header 구간
- `login.js`
  - landing 구조 조정 과정에서 불필요한 데이터 정리

### 변경 파일
- `webapp/frontend/index.html`
- `webapp/frontend/pages/login.js`
- `webapp/frontend/pages/dashboard.js`
- `webapp/frontend/pages/passports.js`
- `webapp/frontend/pages/maintenance.js`
- `webapp/frontend/pages/recycling.js`
- `webapp/frontend/pages/audit-log.js`
- `webapp/frontend/pages/bmu-data.js`
- `webapp/frontend/pages/materials.js`
- `webapp/frontend/pages/qr-scan.js`
- `webapp/frontend/pages/passport-detail.js`

### 검증
- `node --check`
  - `login.js`, `dashboard.js`, `passports.js`, `maintenance.js`, `recycling.js`, `audit-log.js`, `bmu-data.js`, `materials.js`, `qr-scan.js`, `passport-detail.js`
- `cd e2e-tests && npx playwright test tests/battery-passport.spec.js --config=playwright.config.js --grep "3\. 프론트엔드 로그인|4\. 대시보드|11\. 프론트엔드 네비게이션.*(dashboard|passports|bmu-data|materials|maintenance|recycling|qr-scan|audit-log) 페이지 로드|12\. 여권 상세 탭"` → 12 passed
- `cd e2e-tests && npx playwright test tests/c02_check.spec.js --config=playwright.config.js` → 1 passed

### 미완료
- `passport-detail.js` 본문 중하단 섹션은 여전히 inline style이 많이 남아 있음
- landing/login은 비율 조정이 여러 차례 들어가 후속 미세 조정 여지가 남아 있음

### 교훈
- CSS 전체 정리는 한 번에 끝내기보다, 전역 클래스 계층을 먼저 만들고 반복 구간부터 묶는 방식이 안전하다.
- 가장 큰 파일(`passport-detail.js`)은 상단/중단/하단으로 나눠 순차 정리해야 회귀를 덜 만든다.

## Session 2X — 2026-04-08 (OpenAgent, CSS cleanup phase 4)

### 작업 주체
- OpenAgent 주도 작업
- 브랜치: `feature/vc-issue-modal-separation`

### 요약
`passport-detail.js` 중하단까지 공통 스타일 적용 범위를 더 넓혀, 잔여 inline style이 많은 구간을 추가 정리했다. 전체 프론트 핵심 회귀를 다시 돌려 안정성을 확인했다.

### 작업 내용
- `webapp/frontend/index.html`
  - `sn-detail-banner`, `sn-detail-banner-icon`, `sn-detail-event-grid`, `sn-detail-event-card`, `sn-detail-rail*` 계열 추가
- `webapp/frontend/pages/passport-detail.js`
  - 규제·소재 / 운영 이력 / 진단 데이터 / 증빙 section header를 `sn-detail-section-*` 계열로 정리
  - compliance summary tile, trust summary tile, surface 컨테이너 일부를 `sn-detail-surface(-soft)` 계열로 치환
  - 정비 요청/분석 요청/재활용 대기 배너를 `sn-detail-banner` 계열로 정리
  - 운영 이벤트 카드 그리드를 `sn-detail-event-grid` 계열로 정리
  - 라이프사이클 레일을 `sn-detail-rail*` 계열로 정리

### 변경 파일
- `webapp/frontend/index.html`
- `webapp/frontend/pages/passport-detail.js`

### 검증
- `node --check`
  - `passport-detail.js`, `qr-scan.js`, `login.js`, `dashboard.js`, `passports.js`, `maintenance.js`, `recycling.js`, `audit-log.js`, `bmu-data.js`, `materials.js`
- `cd e2e-tests && npx playwright test tests/battery-passport.spec.js --config=playwright.config.js --grep "3\. 프론트엔드 로그인|4\. 대시보드|11\. 프론트엔드 네비게이션.*(dashboard|passports|bmu-data|materials|maintenance|recycling|qr-scan|audit-log) 페이지 로드|12\. 여권 상세 탭"` → 12 passed
- `cd e2e-tests && npx playwright test tests/c02_check.spec.js --config=playwright.config.js` → 1 passed

### 미완료
- `passport-detail.js` 내부의 개별 카드/테이블/모달 세부 요소에는 아직 inline style이 남아 있음
- 완전한 CSS 정리 완료라기보다, 공통화 가능한 큰 패턴을 대부분 걷어낸 상태

### 교훈
- 가장 큰 파일은 section 단위로 레일/배너/표면(surface)부터 공통화해야 체감 정리 효과가 크다.

## Session 2Y — 2026-04-08 (OpenAgent, passport-detail compliance leaf split)

### 작업 주체
- OpenAgent 주도 작업
- 브랜치: `feature/vc-issue-modal-separation`

### 요약
`passport-detail.js`에서 `규제·소재` 탭을 같은 파일 안 전역 leaf component로 실제 분리했다. no-build 구조를 깨지 않으면서 section 단위 분해가 가능한지 확인하는 첫 구조 분해 패스다.

### 작업 내용
- `webapp/frontend/pages/passport-detail.js`
  - `app.component('passport-detail-compliance-section', ...)` 추가
  - 기존 compliance 탭 부모 템플릿 본문을 `<passport-detail-compliance-section ...>` 호출로 교체
  - 전달 props
    - `passport`
    - `gbaCompliance`
    - `complianceGrade`
    - `missingGbaFields`
    - `linkedMaterialDetails`
    - `estimatedCarbonFootprint`
    - `carbonGrade`
    - `gaugeReady`
    - `complianceGaugeCircumference`

### 검증
- `node --check`
  - `passport-detail.js`, `qr-scan.js`, `login.js`, `dashboard.js`, `passports.js`, `maintenance.js`, `recycling.js`, `audit-log.js`, `bmu-data.js`, `materials.js`
- `cd e2e-tests && npx playwright test tests/battery-passport.spec.js --config=playwright.config.js --grep "3\. 프론트엔드 로그인|4\. 대시보드|11\. 프론트엔드 네비게이션.*(dashboard|passports|bmu-data|materials|maintenance|recycling|qr-scan|audit-log) 페이지 로드|12\. 여권 상세 탭"` → 12 passed
- `cd e2e-tests && npx playwright test tests/c02_check.spec.js --config=playwright.config.js` → 1 passed

### 미완료
- `identity`, `traceability`, `data`, `trust` 탭은 아직 부모 템플릿에 그대로 남아 있음
- 다음 구조 분해는 `identity` 또는 `data` 탭이 가장 안전함

### 교훈
- 이 저장소에선 별도 파일 분리보다 같은 파일 안 `app.component(...)` leaf split이 훨씬 안전하다.

## Session 2Z — 2026-04-08 (OpenAgent, passport-detail identity leaf split)

### 작업 주체
- OpenAgent 주도 작업
- 브랜치: `feature/vc-issue-modal-separation`

### 요약
`passport-detail.js`의 `개요(identity)` 탭도 같은 파일 안 leaf component로 분리했다. 이제 `규제·소재`, `개요` 두 섹션이 동일한 no-build safe 패턴으로 분리된 상태다.

### 작업 내용
- `webapp/frontend/pages/passport-detail.js`
  - `app.component('passport-detail-identity-section', ...)` 추가
  - 부모 템플릿의 `v-show="activeTab === 'identity'"` 내부를 `<passport-detail-identity-section ...>` 호출로 교체
  - 전달 props
    - `passport`
    - `formatDate`
    - `parseVoltageRange`
    - `parseTempRange`
    - `isEv`
    - `openBindModal`
    - `scaleSoc`
    - `getSocHex`
    - `getSohColor`
    - `gaugeCircumference`
    - `gaugeReady`

### 검증
- `node --check`
  - `passport-detail.js`, `login.js`, `dashboard.js`, `passports.js`, `maintenance.js`, `recycling.js`, `audit-log.js`, `bmu-data.js`, `materials.js`, `qr-scan.js`
- `cd e2e-tests && npx playwright test tests/battery-passport.spec.js --config=playwright.config.js --grep "3\. 프론트엔드 로그인|4\. 대시보드|11\. 프론트엔드 네비게이션.*(dashboard|passports|bmu-data|materials|maintenance|recycling|qr-scan|audit-log) 페이지 로드|12\. 여권 상세 탭"` → 12 passed
- `cd e2e-tests && npx playwright test tests/c02_check.spec.js --config=playwright.config.js` → 1 passed

### 미완료
- `traceability`, `data`, `trust` 탭은 아직 부모 템플릿 내부에 남아 있음
- 다음 안전한 구조 분해 대상은 `data` 탭임

### 교훈
- `identity`처럼 helper가 많아도, props로 명시적으로 넘기면 same-file leaf split이 충분히 안전하게 작동한다.

## Session 3A — 2026-04-08 (OpenAgent, passport-detail data leaf split)

### 작업 주체
- OpenAgent 주도 작업
- 브랜치: `feature/vc-issue-modal-separation`

### 요약
`passport-detail.js`의 `진단 데이터(data)` 탭도 같은 파일 안 leaf component로 분리했다. 이제 `compliance`, `identity`, `data` 세 탭이 동일한 same-file 패턴으로 분리된 상태다.

### 작업 내용
- `webapp/frontend/pages/passport-detail.js`
  - `app.component('passport-detail-data-section', ...)` 추가
  - 부모 템플릿의 `section-data` 내부를 `<passport-detail-data-section ...>` 호출로 교체
  - 전달 props
    - `bmuLoading`
    - `bmuRecords`
    - `bmuOverviewCards`
    - `formatDate`
    - `scaleSOC`
    - `scaleTemp`
    - `decodeStatusFlags`
    - 권한 플래그(`isManufacturer`, `isRegulator`)
    - `openInvalidateModal`
    - `navigateToBmuData`

### 검증
- `node --check`
  - `passport-detail.js`, `qr-scan.js`, `login.js`, `dashboard.js`, `passports.js`, `maintenance.js`, `recycling.js`, `audit-log.js`, `bmu-data.js`, `materials.js`
- `cd e2e-tests && npx playwright test tests/battery-passport.spec.js --config=playwright.config.js --grep "3\. 프론트엔드 로그인|4\. 대시보드|11\. 프론트엔드 네비게이션.*(dashboard|passports|bmu-data|materials|maintenance|recycling|qr-scan|audit-log) 페이지 로드|12\. 여권 상세 탭"` → 12 passed
- `cd e2e-tests && npx playwright test tests/c02_check.spec.js --config=playwright.config.js` → 1 passed

### 미완료
- `traceability`, `trust` 탭은 아직 부모 템플릿에 남아 있음
- 다음 분해 대상은 `traceability`가 우선, `trust`가 마지막이 안전함

### 교훈
- `data`처럼 테이블/권한 버튼/이동 액션이 있어도, props로 핸들러를 넘기면 same-file leaf split이 충분히 버틴다.

## Session 3B — 2026-04-08 (OpenAgent, passport-detail traceability leaf split)

### 작업 주체
- OpenAgent 주도 작업
- 브랜치: `feature/vc-issue-modal-separation`

### 요약
`passport-detail.js`의 `운영 이력(traceability)` 탭을 same-file leaf component로 분리했다. 배너, 운영 이벤트, 라이프사이클 레일, 원자재/정비/사고 기록, 작업 버튼까지 props 기반으로 이동했다.

### 작업 내용
- `webapp/frontend/pages/passport-detail.js`
  - `app.component('passport-detail-traceability-section', ...)` 추가
  - 부모 템플릿의 `section-traceability` 내부를 `<passport-detail-traceability-section ...>` 호출로 교체
  - 전달 props
    - `passport`, `timelineEvents`, `lifecycleSteps`, `linkedMaterialDetails`, `maintenanceLogs`, `accidentLogs`
    - `formatDate`, `getLifecycleState`
    - 역할 플래그(`isEV`, `isService`, `isRegulator`)
    - `show*Modal` 오프너 함수들

### 검증
- `node --check`
  - `passport-detail.js`
- 전체 프론트 회귀는 다음 trust split 후 일괄 재실행

### 미완료
- `trust` 탭은 아직 부모 템플릿에 남아 있음

### 교훈
- 배너/타임라인/작업 버튼이 섞인 탭도 handler를 props로 넘기면 same-file split이 가능하다.

## Session 3C — 2026-04-08 (OpenAgent, passport-detail trust leaf split)

### 작업 주체
- OpenAgent 주도 작업
- 브랜치: `feature/vc-issue-modal-separation`

### 요약
`passport-detail.js`의 마지막 남은 `증빙(trust)` 탭도 same-file leaf component로 분리했다. 이로써 5개 본문 탭이 모두 같은 no-build safe 구조로 분리됐다.

### 작업 내용
- `webapp/frontend/pages/passport-detail.js`
  - `app.component('passport-detail-trust-section', ...)` 추가
  - 부모 템플릿의 `section-trust` 내부를 `<passport-detail-trust-section ...>` 호출로 교체
  - 전달 props
    - `passport`, `vcList`, `vcLoading`, `correctionHistory`, `history`
    - `formatDate`, `getStatusBadge`
    - DID/QR 관련 값과 helpers
    - 역할 플래그, `copyToClipboard`, `downloadQr`, `verifyVc`, `revokeVc`

### 검증
- `node --check`
  - `passport-detail.js`, `qr-scan.js`, `login.js`, `dashboard.js`, `passports.js`, `maintenance.js`, `recycling.js`, `audit-log.js`, `bmu-data.js`, `materials.js`
- `cd e2e-tests && npx playwright test tests/battery-passport.spec.js --config=playwright.config.js --grep "3\. 프론트엔드 로그인|4\. 대시보드|11\. 프론트엔드 네비게이션.*(dashboard|passports|bmu-data|materials|maintenance|recycling|qr-scan|audit-log) 페이지 로드|12\. 여권 상세 탭"` → 12 passed
- `cd e2e-tests && npx playwright test tests/c02_check.spec.js --config=playwright.config.js` → 1 passed

### 완료 상태
- `compliance`, `identity`, `data`, `traceability`, `trust` 탭 모두 same-file leaf component 분리 완료

### 교훈
- 이 저장소의 no-build 구조에서는 `passport-detail.js` 본문 분해도 same-file global component 패턴으로 끝까지 밀 수 있다.
