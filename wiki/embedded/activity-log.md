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

## 2026-05-08

### 작업 내용
- Passport 세션 핸드오프(`wiki/passport/cross-session-handoff-2026-05-08.md`)의 임베디드 항목을 확인했다.
- 기존 48-byte `BatteryData_t`를 유지하면서 bytes 44..47 `reserved[4]`를 `bmsBindingCode32`로 쓰는 v1.1 방향을 확정했다.
- `dataProcess.py`, `battery_simulator.py`에 optional BMS management identifier / explicit binding code injection 옵션을 추가했다. 기본값은 0이므로 기존 payload와 호환된다.
- 장비 없이 확인 가능한 `test_bms_identifier_payload.py`를 추가했다.

### 변경 파일
- `firmware/tools/dataProcess.py`
- `firmware/tools/battery_simulator.py`
- `firmware/tools/test_bms_identifier_payload.py`
- `firmware/common/bms_protocol.h`
- `firmware/README.md`
- `wiki/embedded/bms-management-identifier-binding-2026-05-08.md`
- `wiki/embedded/README.md`
- `wiki/embedded/activity-log.md`

### 미완료
- 실제 보드 E2E에서 non-zero bytes 44..47 보존 여부 확인 필요.
- Chaincode 저장값 `bmsManagementId` / `bmsBindingId`와 Agent `bmsBindingCode32` 비교 결과가 `physicalHistoryVerification.signals.bmsIdentifierMatched`로 기록되는지 확인 필요.
- 32-bit hint는 충돌 리스크가 있으므로 production v2에서는 더 큰 signed metadata가 필요하다.

### 교훈
- 기존 CAN-FD/Agent 호환성을 유지하려면 payload 크기보다 reserved bytes 의미를 먼저 계약화하는 편이 안전하다.
- `dataHash`와 `timestamp`는 Agent 생성값이므로 임베디드 쪽은 signed 48B rawPayload 보존에 집중하면 된다.

## 2026-05-08 - BMS management identifier binding handoff

- 최종 전달 기준으로 payload 규칙을 확정했다: full ID 문자열은 싣지 않고 bytes 44..47에 `bmsBindingCode32=0x2c9a0e0c`만 저장, `dataHash`는 raw 48B 전체 SHA-256, layout 변경 시 Passport/Blockchain 선공지.
- Passport 세션이 `readUInt32LE(44)` 노출, Agent RFC3339 timestamp 유지, `BMU_BINDING_REQUIRED=true` zero binding reject를 완료했다고 전달받아 handoff의 Passport 항목을 완료 상태로 갱신했다.
- 블록체인 `BindBMSIdentifier` 계약에 맞춰 lab 기준 `bmsManagementId=BMS-MGMT-001`, `bmsBindingId=did:battery:001#BMS-MGMT-001`, `evidenceHash=b3c37ed2cdd2831cc0c212445905ced4a20ea51e129bff2e7418deddf7223178`를 확정했다.
- `wiki/Object/BMS__.pdf`와 `wiki/passport/bms-1-3-year-mapping-2026-05-08.md` 기준으로 1~3차년도 임베디드 반영 상태를 대조하고 타 세션 전달 메모를 handoff 문서에 추가했다.
- 배터리여권 전달 요청 1~5번에 대한 명시 답변을 BMS identifier handoff 문서에 추가했다.

## 2026-05-19 - CMU 재플래시 + bridge 파서 강화 + 빌드 환경 표준화 + CANoe rogue 격리

### 작업 내용

**E2E 재가동 + DID 회전 2회**
- 세션 시작 시 BMU FC가 약 4.69M까지 누적 상태. CMU `CMU_UART_SIM_FALLBACK`이 활성 펌웨어(2026-04-14 빌드, `c3fdd4c`)에 남아있어 MATLAB 침묵 시 합성 데이터 송신 → bridge가 binding=0 stream을 agent에 흘림.
- Bridge 재기동(`--did 4d5CE8NZbkAVJxcypzaVhw`) → JWT auth 정상화 후 chaincode lastFc=74471 충돌 발견. CANoe rogue가 같은 DID로 fc=74201~74471까지 올린 상태.
- 블록체인 세션이 새 DID `HgBpAxtHJ4qRwsNiroaqvC` (passport `MATLAB-BMU-002`) 발급. bridge 재기동하여 즉시 `BMU recorded OK` 회복.

**CMU 펌웨어 재빌드 + 재플래시**
- `CMU_UART_SIM_FALLBACK` 제거된 현재 source(`2c0bfd1` 이후)로 빌드 → SIM_FALLBACK 코드 경로 strings 검증 빈 출력 확인.
- PEmicro GDB Server로 CMU 보드 재플래시 (`flash.sh cmu`, CRC verified, GO).
- 이후 MATLAB 침묵 시 CMU가 CAN-FD 송신 중단 → BMU 서명 출력도 멈춤 (예상 동작).

**`serial_to_agent.py` 파서 강화**
- `[SIGN]` 정규식 매치 이후에도 `signR`/`signS`가 정확히 64 hex chars인지, DATA가 96 hex chars인지 검증.
- 비통과 시 라인 drop 또는 rawPayload만 제외(signature는 보존). 단위 테스트 4건 통과.

**빌드 환경 표준화**
- `BMU_BMS_S32K344/Debug_FLASH/src/main.args` 등 6+ 파일이 `C:/BMS/...` 절대경로 박혀있음 — 정션 없이 빌드 불가.
- `scripts/setup-dev-env.bat`: `mklink /J C:\BMS <project_root>` 1회 실행 도우미 (관리자 권한 불필요).
- `firmware/README.md` 빌드 섹션 맨 앞에 사전 setup 안내 + ADR-005 링크.

**CANoe rogue POSTer 격리**
- Vector CANoe 19 (`CANoe64.exe` PID 49128)가 `BMS_Test.cfg`의 HTTP Binding으로 약 35초마다 `/api/bmu/data`에 하드코딩 fixture(fc=74483, rawHead=`C02D73C032EB...`, sigLen=100) POST 중인 것 확인.
- 사용자가 CANoe measurement Stop → replay 즉시 중단.
- 영구 격리: `canoe/BMS_Test.cfg` → `canoe/BMS_Test.cfg.disabled-20260519` 이름 변경, `_backup/canoe-with-http-rogue-20260519/`에 원본 전체 백업.
- 차후 CAN 작업 필요 시 ADR-006의 옵션 A/B/C 참조.

**관측성 + 운영 도구**
- `scripts/preflight-check.sh`: E2E 시작 전 C:\BMS 정션, BMS python procs, :3001 listener 수, CANoe64 실행 여부, COM 포트, spool.db pending 인벤토리.
- 새 DID 적용 후 spool.db에 누적된 옛 DID 항목 49,686건 정리 → 0건.

**문서 + 백로그**
- 루트 `CLAUDE.md` / `AGENTS.md` / `DESIGN.md` git 추적 제거 (`.gitignore` 등록, 로컬 파일 유지, public 노출 차단).
- `firmware/README.md` 디렉토리 구조 섹션 보강 (BMU/CMU 전 디렉토리 + 핵심 파일 역할).
- `wiki/decisions/005-build-paths.md` 신규 — `C:\BMS` 정션 우회 + 장기 마이그레이션 옵션.
- `wiki/decisions/006-canoe-bmu-poster.md` 신규 — CANoe rogue 격리 사건 + 운영 규칙.

### 변경 파일

- `firmware/tools/serial_to_agent.py` — hex 검증 추가
- `CMU_BMS_S32K144/Debug_FLASH/CMU_BMS_S32K144.elf` — 재빌드 산출물 (커밋 대상 아님)
- `scripts/setup-dev-env.bat` (신규)
- `scripts/preflight-check.sh` (신규)
- `firmware/README.md` — 디렉토리 구조 + 빌드 사전 setup 섹션
- `wiki/decisions/005-build-paths.md` (신규)
- `wiki/decisions/006-canoe-bmu-poster.md` (신규)
- `.gitignore` — 내부 md 3개 + canoe/.disabled 패턴
- `canoe/BMS_Test.cfg` → `BMS_Test.cfg.disabled-20260519` (rename)
- `_backup/canoe-with-http-rogue-20260519/` (백업, 커밋 안 함)

### 미완료 / 후속

- bmu-agent `[BMU-INGEST]` 미들웨어 영구화 (passport 세션 책임)
- bmu-agent 옛 DID `4d5CE8NZbkAVJxcypzaVhw` blacklist (passport 세션, optional)
- CANoe configuration 재구성 시 HTTP Binding 절대 활성화 안 하는 운영 규칙 합의 (ADR-006 명시)
- W5/W6 백로그 (`mighty-fluttering-pine.md`) — secrets 관리 문서화, FC reset ADR

### 교훈

- **부수 자산은 stateful + invisible**: CANoe configuration, MATLAB Simulink 설정, IDE workspace state 등 부수 도구가 정상 endpoint를 점유할 수 있다. observability 없으면 영원히 묻힌다.
- **observability가 토대보다 먼저**: 보안 통신·체인코드는 멀쩡해도 source 추적 미들웨어 없으면 운영 불능. passport 세션 미들웨어 추가가 오늘 사건 전부 풀어준 키 트리거.
- **cold-start 시나리오가 happy-path보다 더 많은 버그 드러냄**: MATLAB silent 상태로 보드만 켜놓는 케이스 처음 시도해서 SIM_FALLBACK + CANoe rogue 동시 발견.
- **invisible setup의 위험**: `C:\BMS` 정션처럼 한 머신에서만 동작하는 환경 가정은 README 미명시 시 다음 개발자에게 함정. setup 스크립트로 강제 명문화.
- **DID 회전은 격리 도구지, 근본 해결책이 아님**: 옛 DID로 떠드는 source가 살아있으면 audit log noise 누적. 동시에 source 제거 작업 필요.
