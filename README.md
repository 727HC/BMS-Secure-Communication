# BMS Secure Communication System

> NXP S32K BMU/CMU 보안 통신과 Hyperledger Fabric 배터리여권을 연결하는 통합 플랫폼

MATLAB Simulink 데이터가 CMU/BMU 보드를 거쳐 서명된 48-byte payload로 변환되고, `bmu-agent`와 Fabric 체인코드를 통해 배터리여권 원장·read model·웹 콘솔·MCP 모니터링까지 이어집니다.

---

## 구성

| 영역 | 디렉토리 | 스택 / 책임 |
|---|---|---|
| Hyperledger Fabric 인프라 | `passport-network/` | Fabric 2.5, CouchDB ×4, CA ×5, 4 MSP |
| 체인코드 | `chaincode/passport-contract/` | Go, GBA 21 도메인, MSP RBAC, BMU/VC 검증 |
| 배터리여권 API 서버 | `bmu-agent/` | Node.js, Express, JWT, Fabric Gateway, BMU ingest |
| 오프체인 read model | `cloud-agent/` | MongoDB, block event sync, Passport read API |
| 배터리여권 웹 콘솔 | `webapp/frontend-react/` | React 19 + TypeScript + Vite |
| 레거시 SPA | `webapp/frontend/` | Vue 3 (`/legacy` 보존) |
| BMU 펌웨어 | `BMU_BMS_S32K344/` | Cortex-M7, HSE, FreeRTOS |
| CMU 펌웨어 | `CMU_BMS_S32K144/` | Cortex-M4, CSEc, FreeRTOS |
| 공유 프로토콜/브릿지 | `firmware/` | 48B payload, UART/Agent bridge, BMS binding code 보존 |
| MCP 모니터링 | `mcp-monitor/` | read-only Fabric/Passport/API/log 관찰 |

---

## Quick Start

### 1. Fabric + Agent + Web

```bash
# 사전 준비 (1회)
cp passport-network/.env.template passport-network/.env
# .env: CA_ADMIN_USER/PASSWORD, COUCHDB_USER/PASSWORD 설정

# 4-org Fabric + CouchDB + CA
./start_passport_network.sh up

# React 콘솔 빌드 (bmu-agent가 dist/를 정적 서빙)
cd webapp/frontend-react && npm run build

# Agent 기동
cd ../../bmu-agent && FABRIC_ORG=1 node server.js

# 접속
# http://localhost:3001
```

### 2. 임베디드 E2E

```bash
# 사전 setup (최초 1회) — S32DS 빌드 인자가 C:\BMS 절대경로 참조
scripts/setup-dev-env.bat            # mklink /J C:\BMS <repo>

# E2E 시작 전 인벤토리 (외부 POSTer / 충돌 / 정션 검증)
bash scripts/preflight-check.sh

# 빌드 / 플래시 (PEmicro GDB Server)
./build.sh all
./flash.sh all

# MATLAB → CMU → CAN-FD → BMU → Agent → Fabric
python firmware/tools/dataProcess.py --port COM5 --baud 9600 --bms-management-id BMS-MGMT-001 &
python firmware/tools/serial_to_agent.py \
  --port COM4 --baud 28800 \
  --agent http://localhost:3001 \
  --did <BMU_DID> --user <USER> --password <PASSWORD> --org 1 \
  [--min-fc <N>]                     # legacy/fail-safe catch-up 보호 (선택)
```

#### Bridge 운영 기능 (`serial_to_agent.py`)

- **Hex 검증**: UART jitter로 garbage 페이로드가 chain에 들어가는 사고 차단. 64/96 hex char 검증 미통과 시 silent drop
- **SQLite spool**: agent 일시 중단 시 페이로드 누적, 복구 시 자동 재전송 (`spool.db`)
- **Option B FC 영속화**: BMU가 HSE NVM-backed counter로 부팅마다 `0xNN000000` 형태의 FC를 jump-start한다. CMU의 `1,2,3...` 카운터는 BMU에서 재작성되므로 chain에 도달하지 않는다.
- **HSE/FATAL 이벤트 분리**: BMU UART의 `[HSE]`, `[FATAL]` 라인은 sample ingest와 독립적으로 `POST /api/bmu/event`로 올라가고, `logs/agent.log`에 `category="hse"`로 남는다.
- **`[ALERT] BMU FC regression` / `--min-fc N`**: Option B 이전 또는 fail-safe 상황의 보호 장치로 보존한다. 정상 운영에서는 `ResetFCForDID` 자동 호출이 없고, 호출 발생 자체가 운영 alert다.

#### FC 운영 / 복구

임베디드 Option B 적용 후 BMU는 HSE Monotonic Counter 기반 boot epoch를 FC 상위 바이트에 반영해 chain에 **globally monotonic FC**를 보냅니다. 정상 보드 재부팅은 더 이상 `fc=1` 회귀로 처리되지 않고 `0x01000000`, `0x02000000`, ...처럼 `+2^24` 단위 점프가 발생합니다.

운영 기준:

- 체인코드는 기존 `fc > lastFc` 정책을 유지합니다. boot epoch 점프는 정상 monotonic 증가입니다.
- `POST /api/bmu/reset-fc` / `ResetFCForDID`는 삭제하지 않고 emergency fail-safe로만 사용합니다.
- 평상시 `FCRESET-*` audit event는 **0건/일**이 정상입니다. 발생하면 DID 회전, counter 손상, manufacturing/onboarding, 256-boot wrap 여부를 확인합니다.
- 256-boot wrap으로 FC가 `0xFFFFFFFF` 이후 `0x00000000`으로 돌아오면 chain reject가 시작되므로 DID 회전 + 수동 reset 절차를 사용합니다.

비상 수동 복구:

```bash
# Manufacturer 또는 Regulator JWT 필요
curl -X POST http://localhost:3001/api/bmu/reset-fc \
  -H "Authorization: Bearer <JWT>" \
  -H "Content-Type: application/json" \
  -d '{"did":"<did>","reason":"<50+ chars reason>","confirm":true}'
```

#### 임베디드 측 ADR

- [ADR-004 FC reset / Option B](wiki/decisions/004-fc-reset-mechanism.md) — ResetFCForDID는 fail-safe, 정상 재부팅은 HSE monotonic FC로 처리
- [ADR-005 build paths](wiki/decisions/005-build-paths.md) — `C:\BMS` 정션 우회 + 장기 마이그레이션
- [ADR-006 CANoe HTTP rogue](wiki/decisions/006-canoe-bmu-poster.md) — Vector CANoe HTTP Binding이 `/api/bmu/data` 점유한 사건 격리. **운영 규칙: CANoe configuration에 HTTP Binding 절대 활성화 금지**
- [ResetFCForDID runbook](wiki/blockchain/reset-fc-runbook.md) — emergency manual recovery 절차와 감사 기준

## 보안 통신 (CAN-FD)

| 속성 | 메커니즘 | HW |
|---|---|---|
| 무결성 | AES-128 CMAC | CSEc / HSE |
| 인증 | CMAC + Ed25519 서명 | HSE |
| 기밀성 | AES-128-CBC MAC-then-encrypt (IV = FC) | CSEc / HSE |

48-byte BMU payload는 기존 layout을 유지하고, bytes `44..47` reserved 영역에 BMS binding code를 little-endian으로 보존합니다.

```text
bmsBindingCode32: 0x2c9a0e0c
rawPayload bytes 44..47: 0c 0e 9a 2c
```

---

## 데이터 흐름

```text
MATLAB Simulink ──UDP──▶ dataProcess.py ──UART──▶ [CMU S32K144]
                                                       │
                                                       │ CAN-FD (CMAC + CBC)
                                                       ▼
                                                  [BMU S32K344]
                                                       │
                                                       │ Ed25519 서명 + 48B 페이로드
                                                       ▼
Battery Passport Web ──▶ bmu-agent ──▶ Hyperledger Fabric
        (React)            (Node.js)        (4-org + CouchDB)
                                                ▲
                                                │ Block Event
                                                │
                                          cloud-agent
                                          (MongoDB read model)
                                                ▲
                                                │ read-only observation
                                                │
                                          mcp-monitor
```

BMU ingest는 Manufacturer M2M service identity로 실행하고, 일반 API는 요청자 JWT identity로 실행합니다.

---

## 배터리여권(Passport)

React 웹 콘솔과 `bmu-agent`가 배터리 여권 발급, 확장 속성, BMS binding, BMU 실시간 데이터를 담당합니다.

### 체인코드 연동

- 체인코드는 배터리여권 발급, BMS binding, BMU 기록, VC/검증 상태를 관리합니다.
- Agent는 sequence를 직접 지정하지 않고 contract name `passport-contract`만 호출합니다.
- `CreateBatteryPassport` 인자 순서는 유지하고, 발급 직후 확장 속성·BMS binding·source evidence를 이어서 기록합니다.

| API | Chaincode |
|---|---|
| `POST /api/passports/:id/extended-attributes` | `SetPassportExtendedAttributes` |
| `POST /api/passports/:id/bms-binding` | `BindBMSIdentifier` |
| `POST /api/passports/:id/source-verification` | `RecordSourceVerification` |
| `POST /api/bmu/data` (bound passport) | `RecordBMUDataWithPayload(..., rawPayload)` |
| `POST /api/bmu/reset-fc` (Manufacturer · Regulator, 5건/시간) | `ResetFCForDID(did, reason)` — Option B 이후 비상 fail-safe. 성공 호출은 `RESET_FC_CALLED` alert |
| `POST /api/bmu/event` (Manufacturer) | Chaincode write 없음 — BMU UART `[HSE]`/`[FATAL]` 이벤트를 `logs/agent.log`에 `category="hse"`로 기록 |
| `GET /api/bmu/operations/status` (Manufacturer · Regulator) | 최근 24h max FC, reset-fc count, `FC_WRAP_NEAR` / `RESET_FC_CALLED` 상태 조회 |

기본 BMS binding 값:

```text
bmsManagementId: BMS-MGMT-001
bmsBindingId: did:battery:001#BMS-MGMT-001
bmsBindingCode32: 0x2c9a0e0c
evidenceHash: b3c37ed2cdd2831cc0c212445905ced4a20ea51e129bff2e7418deddf7223178
```

현재 MATLAB/BMU live 기준:

```text
passportId: MATLAB-BMU-002
did: HgBpAxtHJ4qRwsNiroaqvC
bmsBindingCode32: 748293644 / 0x2c9a0e0c
chaincode: passport-contract Version 1.4 / Sequence 5
```

### 실시간 화면 반영

- 기본 흐름은 `cloud-agent` read model을 사용합니다.
- `cloud-agent:3002`가 꺼져 있어도 `bmu-agent`가 Fabric BMU record와 runtime snapshot으로 화면 값을 보강합니다.
- Dashboard 개요, Passport detail 개요, BMU 진단 탭은 같은 BMU 기준값을 봅니다.
- Passport detail은 열린 상태에서도 3초마다 SOC/SOH/temperature를 조용히 갱신합니다.
- `/bmu-operations`는 Option B 운영 상태, 최근 24h max FC, reset-fc alert를 표시하고 reset-fc를 fail-safe 폼으로만 노출합니다.

---

## MCP 읽기 전용 모니터링

`mcp-monitor/`는 운영 상태와 Passport/BMU 검증 표면을 관찰하는 MCP 서버입니다. 원장 쓰기나 Passport mutation API를 호출하지 않고 Fabric `evaluateTransaction`, `GET /api/status`, `GET /api/audit`, `logs/audit.log`, `logs/agent.log`만 읽습니다.

제공 도구:

| Tool | 역할 |
|---|---|
| `monitor_transactions` | Fabric/Agent tx 로그와 상태 |
| `monitor_bmu` | BMU 최신값, 이상치, 수신 빈도, 임계값, HSE/boot FC event |
| `monitor_vc` | VC 발급/검증/만료/폐기 추세 |
| `system_status` | Fabric/VON/ACA-Py/Agent/Docker 상태 |
| `monitor_passport` | Passport `/api/status`·`/api/audit`, validation trend, BMS binding 증적 |

주요 관찰 항목:

- rich-query / typed state loader 오류: `DOC_TYPE_MISMATCH`, decode failure, chaincode `INTERNAL` trend
- BMU validation events: missing signature, invalid rawPayload, stale FC, DID mismatch, binding code zero/mismatch
- VC validation events: holder DID mismatch, malformed `expiresAt`, issue/verify failure trend
- BMS binding 증적: `bmsManagementId`, `bmsBindingId`, `bmsBindingCode32`, `rawPayloadHashVerified`, `physicalVerification.signals.bmsIdentifierMatched`
- E2E 관찰 경로: `BMU -> Agent -> Fabric -> Passport/MCP`

---

## 추가 문서

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — 전체 시스템 아키텍처
- [`bmu-agent/README.md`](bmu-agent/README.md) — Passport API, BMU ingest, realtime snapshot
- [`webapp/frontend-react/README.md`](webapp/frontend-react/README.md) — React Passport/Web 콘솔 구조와 테스트
- [`firmware/README.md`](firmware/README.md) — 임베디드 상세 (프로토콜, 키 교환, CAN 메시지, 상태 머신)
- [`chaincode/passport-contract/`](chaincode/passport-contract/) — Go 체인코드 소스
- [`mcp-monitor/README.md`](mcp-monitor/README.md) — MCP read-only 모니터링 도구
- [`wiki/`](wiki/) — Obsidian vault (공개 기준 문서, 디자인 토큰, ADR)
