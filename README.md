# BMS Secure Communication System

> **NXP S32K344 (BMU) + S32K144 (CMU) 기반 CAN-FD 보안 배터리 관리 시스템**
> AES-128 CMAC 인증 · AES-128-CBC 기밀성 · KDF 세션키 · Ed25519 서명 · Hyperledger Fabric 블록체인 연동

---

## Battery Passport Platform (배터리 여권)

GBA 21 규격 배터리 여권 플랫폼 — 4-org Fabric + CouchDB + React 웹앱 + Cloud Agent 이중 저장

```bash
# 사전 준비 (처음 1회)
cp passport-network/.env.template passport-network/.env
# .env 편집: CA_ADMIN_USER/PASSWORD, COUCHDB_USER/PASSWORD 설정

# Quick Start
./start_passport_network.sh up          # 4-org Fabric + CouchDB + CA
cd bmu-agent && FABRIC_ORG=1 node server.js
# React 빌드: cd webapp/frontend-react && npm run build
# 브라우저에서 http://localhost:3001 접속
```

| 디렉토리 | 설명 |
|----------|------|
| `passport-network/` | 4-org Hyperledger Fabric 2.5 (Manufacturer, EVManufacturer, Service, Regulator) + CouchDB ×4 + CA ×5 |
| `chaincode/passport-contract/` | GBA 21 체인코드 (Go, 7파일 분리 구조, 50개 함수, 4-MSP RBAC) |
| `bmu-agent/` | Node.js API 서버 (Express 4, JWT, 구조화 로깅, rate limit, helmet) |
| `cloud-agent/` | 오프체인 read model (MongoDB, Block Event 동기화, 고속 조회 REST API) |
| `webapp/frontend-react/` | React + TypeScript + Vite (Dark mode, 11개 페이지, VC 기반 로그인) |
| `webapp/frontend/` | Vue 3 레거시 (`/legacy` 경로에 보존) |
| `mcp-monitor/` | MCP 기반 모니터링 서버 (Fabric 읽기 전용, ADR-003) |
| `docs/ARCHITECTURE.md` | 상세 아키텍처 문서 |

**BMU 데이터 흐름**: BMU(Ed25519 서명) → serial_to_agent.py → Agent(48B 파싱 + DID 검증) → Fabric → 여권 SOC/Cycles 갱신

**참고**: BMU ingest는 Manufacturer M2M service identity로 실행. 일반 API는 요청자 JWT identity로 실행.

**성능 KPI (Hyperledger Caliper 벤치마크)**:

| 구분 | 측정 대상 | TPS | 조건 | KPI 목표 |
|------|----------|-----|------|---------|
| **블록체인 읽기** | QueryPassport (GetState 단건 조회) | **1,757** | 10 workers, 100 passports | 1,500+ |
| **블록체인 쓰기** | RecordBMUData (체인코드 직접 호출) | **195** | 10 workers, 100 passports, worker별 분리 | 150+ |

- **측정 도구**: Hyperledger Caliper 0.6.0, Fabric Gateway SDK
- **측정 환경**: 4-org Fabric 2.5, CouchDB, Raft 단일 오더러, BatchTimeout 0.5s, MaxMessageCount 100
- **측정 범위**: 체인코드 직접 호출 기준 (Fabric 레이어 KPI)
- **보조 결과**: 50 passports 기준 읽기 1,532 TPS / 쓰기 196 TPS
- **재현**: `cd caliper-workspace && NUM_PASSPORTS=100 ./run-bench.sh`

> **참고**: 위 KPI는 Caliper가 Fabric Gateway를 통해 체인코드를 직접 호출한 결과입니다.
> BMU→Agent→DID 검증→Fabric 전체 시스템 E2E TPS는 별도 측정이 필요하며,
> Ed25519 서명 검증, DID→passport 캐시 조회, HTTP 오버헤드가 추가되므로 체인코드 KPI보다 낮습니다.

---

## Embedded Secure Communication (임베디드)

NXP S32K344 (BMU) + S32K144 (CMU) — HW 보안 엔진(HSE/CSEc) 기반 CAN FD 보안 통신.

**3차년도 KPI 10 달성**: 무결성(CMAC) · 인증(Ed25519) · **기밀성(AES-128-CBC MAC-then-encrypt)**

```bash
# 빌드
./build.sh all

# 플래시 (PEmicro GDB Server)
./flash.sh all

# E2E 파이프라인 (MATLAB → CMU → CAN FD → BMU → 블록체인)
python firmware/tools/dataProcess.py --port COM5 --baud 9600 &
python firmware/tools/serial_to_agent.py \
  --port COM4 --baud 28800 \
  --agent http://localhost:3001 \
  --did <BMU_DID> --user <USER> --password <PASSWORD> --org 1
```

| 디렉토리 | 설명 |
|----------|------|
| `BMU_BMS_S32K344/` | BMU 펌웨어 (Cortex-M7, HSE, FreeRTOS) — CAN FD 수신, CBC 복호화, CMAC 검증, Ed25519 서명 |
| `CMU_BMS_S32K144/` | CMU 펌웨어 (Cortex-M4, CSEc, FreeRTOS) — 센서 수집, CBC 암호화, CMAC 생성, CAN FD 송신 |
| `firmware/common/` | 공유 프로토콜 정의 (`bms_protocol.h`), 시크릿 템플릿 |
| `firmware/tools/` | PC 측 도구 — UART 브릿지, 시뮬레이터, 블록체인 에이전트 연동, MATLAB 스크립트 |
| `BMS_SecureComm.dbc` | CAN FD 메시지/시그널 DBC (스케일링 factor/offset 포함) |

**보안 프로토콜 3계층**:

| 속성 | 메커니즘 | HW | 성능 |
|------|---------|-----|------|
| 무결성 | AES-128 CMAC | CSEc/HSE | 373 µs |
| 인증 | CMAC + Ed25519 서명 | HSE | 307 ms |
| **기밀성** | **AES-128-CBC MAC-then-encrypt (IV = FC)** | CSEc/HSE | E2E 16.7 ms |

**실보드 검증**: 84/83 프레임 성공 (99%+), MATLAB Simulink → CAN FD → Fabric 전구간 동작 확인 (2026-04-14).

**상세 문서**: [`firmware/README.md`](firmware/README.md) — 아키텍처, 키 교환 프로토콜, CAN 메시지 정의, 상태 머신, 빌드/플래시 가이드, 운영 보안 권고

---

## 시스템 전체 구조

```
┌─────────────────────────────────────────────────────────────────────────┐
│                             PC / Host                                   │
│                                                                         │
│  MATLAB Simulink ──UDP──▶ dataProcess.py ──UART──▶ [CMU S32K144]       │
│                                                          │              │
│                                                          │ CAN FD       │
│                                                          ▼              │
│  Hyperledger Fabric ◀──HTTP JWT── serial_to_agent.py ◀── [BMU S32K344] │
│         (4-org + CouchDB + Caliper)                                     │
│                                                                         │
│  Battery Passport Web (React) ──▶ bmu-agent (Node.js) ──▶ Fabric/Indy  │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 참고 자료

- [`firmware/README.md`](firmware/README.md) — 임베디드 상세 (빌드, 플래시, 프로토콜, 검증)
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — 전체 시스템 아키텍처
- [`chaincode/passport-contract/`](chaincode/passport-contract/) — Go 체인코드 소스
- [`caliper-workspace/`](caliper-workspace/) — TPS 벤치마크
