# BMS Secure Communication System

> NXP S32K3/K1 기반 CAN-FD 보안 BMS와 Hyperledger Fabric 배터리 여권을 연결하는 통합 플랫폼

임베디드 보안 통신, 블록체인 배터리 여권(GBA 21), VC/DID 신원, 웹 콘솔까지 한 저장소에서 관리합니다.

---

## 구성

| 영역 | 디렉토리 | 스택 |
|---|---|---|
| Hyperledger Fabric 인프라 | `passport-network/` | Fabric 2.5, CouchDB ×4, CA ×5, 4 MSP |
| 체인코드 | `chaincode/passport-contract/` | Go, GBA 21 도메인, MSP RBAC |
| API 서버 | `bmu-agent/` | Node.js, Express, JWT, Fabric Gateway |
| 오프체인 read model | `cloud-agent/` | MongoDB, Block Event 동기화 |
| 웹 콘솔 | `webapp/frontend-react/` | React 19 + TypeScript + Vite |
| 레거시 SPA | `webapp/frontend/` | Vue 3 (`/legacy` 보존) |
| BMU 펌웨어 | `BMU_BMS_S32K344/` | Cortex-M7, HSE, FreeRTOS |
| CMU 펌웨어 | `CMU_BMS_S32K144/` | Cortex-M4, CSEc, FreeRTOS |
| 공유 프로토콜 | `firmware/common/` | `bms_protocol.h`, 시크릿 템플릿 |
| MCP 모니터링 | `mcp-monitor/` | 읽기 전용 Fabric/Passport/API/로그 관찰 (ADR-003) |

---

## Quick Start

### 1. 블록체인 + API + 웹 콘솔

```bash
# 사전 준비 (1회)
cp passport-network/.env.template passport-network/.env
# .env: CA_ADMIN_USER/PASSWORD, COUCHDB_USER/PASSWORD 설정

# 네트워크 부트스트랩
./start_passport_network.sh up      # 4-org Fabric + CouchDB + CA

# Agent 기동
cd bmu-agent && FABRIC_ORG=1 node server.js

# 웹 콘솔 빌드 (bmu-agent가 dist/를 정적 서빙)
cd webapp/frontend-react && npm run build

# 접속: http://localhost:3001
```

### 2. 임베디드 (BMU + CMU)

```bash
# 빌드 / 플래시 (PEmicro GDB Server)
./build.sh all
./flash.sh all

# E2E 파이프라인 (MATLAB → CMU → CAN-FD → BMU → 블록체인)
python firmware/tools/dataProcess.py --port COM5 --baud 9600 &
python firmware/tools/serial_to_agent.py \
  --port COM4 --baud 28800 \
  --agent http://localhost:3001 \
  --did <BMU_DID> --user <USER> --password <PASSWORD> --org 1
```

---

## 보안 통신 (CAN-FD)

| 속성 | 메커니즘 | HW |
|---|---|---|
| 무결성 | AES-128 CMAC | CSEc / HSE |
| 인증 | CMAC + Ed25519 서명 | HSE |
| 기밀성 | AES-128-CBC MAC-then-encrypt (IV = FC) | CSEc / HSE |

3차년도 KPI 10 항목(무결성·인증·기밀성) 모두 충족. 실보드 검증에서 MATLAB Simulink → CAN-FD → Fabric 전구간 동작 확인.

---

## 데이터 흐름

```
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
```

BMU ingest는 Manufacturer M2M service identity로 실행, 일반 API는 요청자 JWT identity로 실행됩니다.

---

## MCP 읽기 전용 모니터링

`mcp-monitor/`는 운영 상태와 3차년도 증적을 관찰하는 MCP 서버다. 원장 쓰기나 Passport mutation API를 호출하지 않고, Fabric `evaluateTransaction`, `GET /api/status`, `GET /api/audit`, `logs/audit.log`, `logs/agent.log`만 읽는다. `/api/audit`는 ManufacturerMSP/RegulatorMSP 토큰이 있을 때만 호출하며, 토큰이 없으면 로컬 감사 로그 fallback을 사용한다.

제공 도구:

| Tool | 역할 |
|---|---|
| `monitor_transactions` | Fabric/Agent tx 로그, Sequence 3 tx, TPS/성공률 |
| `monitor_bmu` | BMU 최신값, 이상치, 수신 빈도, 임계값 |
| `monitor_vc` | VC 발급/검증/만료/폐기 추세 |
| `system_status` | Fabric/VON/ACA-Py/Agent/Docker 상태 |
| `monitor_passport` | Passport `/api/status`·`/api/audit`, validation trend, BMS binding 증적 |

주요 관찰 항목:

- rich-query / typed state loader 오류: `DOC_TYPE_MISMATCH`, decode failure, chaincode `INTERNAL` trend를 숨기지 않고 노출
- BMU validation events: missing signature, invalid rawPayload, stale FC, DID mismatch, binding code zero/mismatch
- VC/BMU 실패 추세 분리: `vc.issueFailureTrend`, `bmu.ingestionFailureTrend`
- Sequence 3 BMS binding tx: `SetPassportExtendedAttributes`, `BindBMSIdentifier`, `RecordSourceVerification`, `RecordBMUDataWithPayload`, 기존 `RecordBMUData`
- Sequence 3 필드: `bmsManagementId`, `bmsBindingId`, `bmsBindingCode32`, `rawPayloadHashVerified`, `physicalVerification.signals.bmsIdentifierMatched`, source verification 최신 상태
- 증적 경로: `BMU -> Agent -> Fabric -> Passport/MCP`

확정 BMS binding 기준값:

```text
bmsManagementId: BMS-MGMT-001
bmsBindingId: did:battery:001#BMS-MGMT-001
bmsBindingCode32: 0x2c9a0e0c
evidenceHash: b3c37ed2cdd2831cc0c212445905ced4a20ea51e129bff2e7418deddf7223178
```

---

## 추가 문서

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — 전체 시스템 아키텍처
- [`firmware/README.md`](firmware/README.md) — 임베디드 상세 (프로토콜, 키 교환, CAN 메시지, 상태 머신)
- [`chaincode/passport-contract/`](chaincode/passport-contract/) — Go 체인코드 소스
- [`mcp-monitor/README.md`](mcp-monitor/README.md) — MCP read-only 모니터링 도구와 Passport/BMS binding 관찰 항목
- [`wiki/`](wiki/) — Obsidian vault (세션별 활동 로그, 디자인 토큰, ADR)
