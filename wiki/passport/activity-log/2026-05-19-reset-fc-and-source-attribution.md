---
title: "배터리 여권 세션 활동 로그 — 2026-05-19"
date: 2026-05-19
tags: [passport, log, bmu-agent, webapp, reset-fc, source-attribution]
doc_type: log
---
# 배터리 여권 세션 활동 로그 — 2026-05-19

## Session 1 — 2026-05-19 (Claude Code)

### 작업 주체
- Claude Code

### 요약
매트랩 시뮬레이션 → BMU → bmu-agent 데이터 인입을 추적·디버깅하면서 두 종류의 source 문제(CANoe HTTP Binding rogue replay, BMU 재부팅 후 FC 카운터 리셋)를 식별했다. 그 진단 도구였던 임시 ingest debug 미들웨어를 정식 구조화 로그로 격상하고, BMU 보드 재부팅 등 운영 사유로 발생하는 FC monotonic 충돌을 사람 운영자가 명시 호출로 풀 수 있는 `POST /api/bmu/reset-fc` API + webapp 별도 "BMU 운영" 섹션 UI를 새로 깔았다.

### 작업 내용

**진단 (incident response)**
- 매트랩 텔레메트리 `/api/bmu/data` 인입을 추적해 두 종류의 rejected payload 식별
  - **그룹 A**: `bmsBindingCode32=0` legacy frame — 보드 재플래시 후 사라짐
  - **그룹 B**: `fc=74483` 고정 + `sigLen=100` + 동일 `rawHead` 반복 — CANoe HTTP Binding 잔재 (~40초 주기 hard-coded replay). 동일 DID `4d5CE8NZbkAVJxcypzaVhw`를 임베디드 bridge와 공유 → bridge의 carry-over FC가 74471까지 끌려갔던 원인
- BMU 보드 재부팅 후 새 DID `HgBpAxtHJ4qRwsNiroaqvC`로 stream 전환됐을 때 발생한 38건 4xx의 원인이 monotonic FC violation임을 확인 — agent validation 자체는 정상

**API 신설**
- `POST /api/bmu/reset-fc` (bmu-agent/routes/bmu.routes.js)
  - Manufacturer/Regulator MSP 이중 RBAC (서버 + 체인코드)
  - Body: `did`, `reason ≥50자`, `confirm:true`, `expected_next_fc?` (audit-only)
  - Rate limit: 사용자당 5건/시간
  - 자동 호출 path 전무 — 운영자 명시 호출만 가능
  - `RESET_FC_REQUIRE_DUAL_APPROVAL=true` 시 501 반환 (2-eye flag, 임베디드와 합의된 future toggle)
  - 성공 시 DID→passport 캐시 무효화 + audit.log + chaincode FCRESET log 이중 기록
- 테스트 6건 추가 (권한 외 MSP 거부 / reason 짧음 / confirm 누락 / expected_next_fc 음수 / dual-approval flag / happy path)

**Webapp UI**
- 신규 페이지 `/bmu-operations` (BmuOperationsPage.tsx) + 사이드바 별도 "운영" 섹션
  - Manufacturer/Regulator만 nav 노출 + 직접 진입 시 `<Navigate>` 차단
  - 빨간 경고 배너 + DID 두 번 입력(오타 방지) + 50자 사유 카운터 + confirm 체크박스
  - `expected_next_fc` 선택 입력 (Number 검증)
- 테스트 8건 추가 (RBAC 렌더/리다이렉트, 폼 검증, happy path, expected_next_fc 포함 케이스, 서버 에러 표시)

**구조화 로그 영구화**
- `[BMU-INGEST]` env-gated console.log → `log.info('BMU ingest', ...)` 정규 logger (bmu-agent/routes/bmu.routes.js)
- agent.log NDJSON으로 직접 떨어지고 10MB rotation 적용. 전체 payload·signature 절대 노출 안 됨 (bind/rawLen/sigLen/rawHead 24-char prefix만)
- 매 BMU POST마다 source 식별이 5분 안에 가능해야 운영상 의미가 있음을 이번 incident가 증명함

**기타**
- `passport.routes.js` bms-binding 업데이트 직후 DID→passport 캐시 무효화 한 줄 fix (이전 세션 잔재 포함 별도 commit)

### 변경 파일
- `bmu-agent/routes/bmu.routes.js` — reset-fc route + 구조화 ingest log
- `bmu-agent/routes/passport.routes.js` — bms-binding 후 캐시 무효화 (별도 commit)
- `bmu-agent/tests/route-validation.test.js` — reset-fc 테스트 6건
- `webapp/frontend-react/src/pages/BmuOperationsPage.tsx` (신규)
- `webapp/frontend-react/src/pages/BmuOperationsPage.test.tsx` (신규)
- `webapp/frontend-react/src/components/layout/Layout.tsx` — "운영" 섹션 + RBAC 게이트
- `webapp/frontend-react/src/App.tsx` — `/bmu-operations` 라우트
- `wiki/passport/activity-log/2026-05-19-reset-fc-and-source-attribution.md` (이 문서)

### 검증
- bmu-agent: `npm test` — 47/47 pass (신규 6건 포함)
- webapp: `npm test -- --run` — 169 files / 1278 tests pass (신규 8건 포함)
- TypeScript: `tsc -b --noEmit` 0 error
- `vite build` 657ms 성공
- 실제 bmu-agent 재기동 후 구조화 ingest log 한 건 캡처 — 정상 NDJSON 떨어짐 확인

### 미완료 / 후속
- 4개 커밋 (`4bcd354`, `0f5d1c5`, `5e614b2`, `eb75b2c`) push 대기 — 사용자가 다른 커밋과 묶어서 push 예정
- 2-eye approval 워크플로우 본격 구현은 별도 PR (현재는 env flag로 501만 반환). approval token endpoint 신설 시 enable
- 운영 가시성: "최근 24시간 reset 이력" UI 패널은 follow-up (현재는 audit.log 직접 조회)
- 임베디드 측 약속: `serial_to_agent.py`에 BMU reboot 감지 + `[ALERT]` 메시지를 manual peer invoke → HTTP POST 가이드 문구로 업데이트 (다른 세션 영역)

### 교훈
- **동일 DID multi-source 공유는 monotonic FC 충돌로 발현됨** — bridge가 정상 작동하더라도 다른 source가 같은 DID를 쓰면 carry-over FC가 끌려가고, 재시작 후 fresh counter 부족으로 정상 stream이 reject됨. DID당 source 1개 강제(또는 충돌 시 감지)가 임베디드 측 설계 룰로 필요
- **debug log gated console.log → structured logger info**가 incident response 시 결정적. 매 POST에 ip/rp/ua/bind/sigLen prefix 정도는 평시 로깅 가치가 비용을 압도. logger의 rotation/JSON 구조 덕에 follow-up grep/awk이 즉시 가능
- **파괴적 운영 API는 별도 UI 섹션 + 다단계 확인**이 옳음 — 일반 admin 메뉴에 묻으면 위험도 인지가 흐려진다는 임베디드 지적이 정확. 50자 사유 + DID 재입력 + confirm 체크박스는 1-eye 모드 보강 조건으로 충분
- **체인코드와 agent의 RBAC 이중화**는 중복이 아니라 방어 계층 — agent가 우회되거나 DB 직접 접근이 발생해도 체인코드가 마지막 게이트
