# BMS Secure Communication System

> NXP S32K3/K1 기반 CAN-FD 보안 BMS와 Hyperledger Fabric 배터리 여권을 연결하는 통합 플랫폼

3차년도 국가과제 — 임베디드 보안 통신, 블록체인 배터리 여권(GBA 21), VC/DID 신원, 웹 콘솔까지 한 저장소에서 관리합니다.

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
| MCP 모니터링 | `mcp-monitor/` | Fabric 읽기 전용 (ADR-003) |

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

## 추가 문서

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — 전체 시스템 아키텍처
- [`firmware/README.md`](firmware/README.md) — 임베디드 상세 (프로토콜, 키 교환, CAN 메시지, 상태 머신)
- [`chaincode/passport-contract/`](chaincode/passport-contract/) — Go 체인코드 소스
- [`wiki/`](wiki/) — Obsidian vault (세션별 활동 로그, 디자인 토큰, ADR)
