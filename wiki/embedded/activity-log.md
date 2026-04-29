---
title: "임베디드 세션 활동 로그"
date: 2026-04-06
tags: [embedded, log]
doc_type: log
status: historical
---
# 임베디드 세션 — 활동 로그

> 과거 기준 기록
>
> 이 문서는 임베디드 세션의 시계열 작업 로그를 보존한다.
> 현재 구조/정책 설명은 [[embedded/overview|세션 개요]]와 [[embedded/README|embedded 허브]]를 먼저 본다.

> 매 세션 종료 시 아래 형식으로 기록을 남긴다.

<!--
## YYYY-MM-DD

### 작업 내용
- 

### 변경 파일
- 

### 미완료
- 

### 교훈
- 
-->

## 2026-04-29

### 작업 내용
- Codex adversarial-review 1회 (working tree = `_backup/`만 스캔). 3건 finding 모두 사실이지만 임베디드 영역 무관.
- E2E 6계층 라이브 검증: MATLAB Simulink → UDP → dataProcess.py → CMU(CAN-FD) → BMU(검증·서명) → bridge → bmu-agent → Fabric → cloud-agent → MongoDB → frontend.
- bridge JWT 인증 401 회복: ledger reset으로 사라진 `testmfg` 사용자 재등록 (`ALLOW_OPEN_REGISTRATION=true`).
- agent 측 signature 검증 강화로 인한 400 발생 → bridge에서 hex lowercase 변환 적용.
- 새 passport 등록(`PASSPORT-BMU-T9CvMCAR`)로 BMU DID 매핑 후 첫 OK 통과.
- CANoe Bus load 0%로 측정값 안 들어오는 문제: 보드 reset 1회로 CAN transceiver silent 상태 풀림 → 0x14/0x15/0x16 정상 캡처. (0x17은 정상 운용 시 미발생이 맞음)
- CANoe `.cfg` 변경분 재구성 (이전 작업본은 사용자 Save 누락으로 휘발).
- DBC 시그널 scale factor 표 정리 후 양 세션에 회신: SOC=0.001525902, Temperature=0.000762951, CellVolt=0.006666667+2.5, Voltage/Current/Cycles factor 1.
- 화면 SOC 56.3% 미스터리 진단: frontend `helpers.ts SOC_SCALE_DIVISOR=1000`이 BMU/DBC 인코딩과 불일치 → Passport 세션이 helpers.ts 수정 진행 합의.
- MATLAB 종료 후에도 CMU가 last-value hold-and-resend 동작 확인 (펌웨어 설계상 정상).
- spool DB 비움, bridge OK 누적 ~190건, onchain records 151+ 건 검증.

### 변경 파일
- `firmware/tools/serial_to_agent.py` — `build_payload`에서 signature를 lowercase로 변환 (agent 측 128 lowercase hex 검증 통과).
- `canoe/BMS_Test.cfg` — Channel/DBC/Trace/Panel 재구성 (이번엔 Save 명시적으로 수행).
- `wiki/embedded/activity-log.md` — 본 기록.

### 미완료 (다른 세션 영역)
- `webapp/frontend-react/.../helpers.ts` SOC/Temp/CellVolt SCALE 정정 — Passport 세션 작업.
- bmu-agent → cloud-agent 프록시 route 추가 (옵션 b) — Passport/블록체인 세션 합의 진행.
- chaincode `RecordBMUData`의 passport snapshot 미갱신은 옵션 C(cloud-agent MongoDB read model)로 우회 결정됨 (chaincode 수정 없음).

### 교훈
- **CANoe Bus load 0%가 항상 결선 문제는 아님.** Bridge가 [SIGN] 정상 수신해도 외부 노드(CANoe)는 silent일 수 있음. 보드 CAN transceiver의 internal silent state가 있고, 보드 reset이 단번에 풀어줌. 사용자가 "이전엔 됐다 / 핀 안 만졌다"고 하면 결선 의심을 깎고 보드 reset을 먼저 시도할 것.
- **DBC factor는 모든 layer에서 동일해야 한다.** 펌웨어/DBC만 맞춰도 frontend에서 mis-scale하면 화면값이 실제와 무관. raw 41650 → 펌웨어 63.55%, frontend(÷1000) 41.65%, 실제 표시 56.3%. 세 layer가 동기화 안 되면 어디서든 사용자 신뢰가 깨짐.
- **CMU UART hold-and-resend 동작.** UART 입력 끊기면 CMU는 마지막 평문값을 200ms마다 무한 재송신. 안전 측면에선 합리적이지만 onchain에 같은 raw가 누적되어 storage 낭비. timeout 후 stale flag 또는 송신 중지 옵션 검토 가치 있음.
- **CANoe Save 강제.** Save 누락 시 작업 전체 휘발. 이전 세션 작업 history는 mtime으로 추적 불가. .cfg 갱신 후 즉시 Ctrl+S 확인 필수.
- **ledger reset 시 BMU 보드 reset과 동기화하면 FC=1부터 깨끗.** chaincode lastFc 초기화 + BMU FC 초기화가 동시 정렬되면 spool 잡음 없이 정상 진행.

