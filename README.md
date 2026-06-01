# BMS Secure Communication System

NXP S32K BMU/CMU 보안 통신과 Hyperledger Fabric 배터리여권을 연결하는 통합 플랫폼입니다. MATLAB Simulink 데이터가 CMU/BMU 보드를 거쳐 서명된 48-byte payload로 변환되고, `bmu-agent`와 Fabric 체인코드를 통해 배터리여권 원장·read model·웹 콘솔·MCP 모니터링까지 이어집니다.

![Hyperledger Fabric](https://img.shields.io/badge/Hyperledger_Fabric-2.5-2F3134?logo=hyperledger&logoColor=white)
![Go](https://img.shields.io/badge/Go-1.24-00ADD8?logo=go&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-Express_4-339933?logo=node.js&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![NXP S32K](https://img.shields.io/badge/MCU-S32K344_%2F_S32K144-000000?logo=nxp&logoColor=white)

---

## 목차

- [아키텍처 / 데이터 흐름](#아키텍처--데이터-흐름)
- [Quick Start](#quick-start)
- [도메인 가이드](#도메인-가이드)
  - [블록체인 (Hyperledger Fabric 인프라)](#블록체인-hyperledger-fabric-인프라)
  - [배터리여권 (Battery Passport)](#배터리여권-battery-passport)
  - [임베디드 (BMU / CMU 펌웨어)](#임베디드-bmu--cmu-펌웨어)
  - [MCP (읽기 전용 모니터링)](#mcp-읽기-전용-모니터링)
- [추가 문서](#추가-문서)

---

## 아키텍처 / 데이터 흐름

데이터는 한 방향으로만 흐릅니다: 센서 입력 → 보드 암호화 통신 → 원장 기록 → read model 조회. 원장에 쓰는 경로는 `bmu-agent` 하나뿐이고, `cloud-agent`와 `mcp-monitor`는 읽기 전용입니다.

```text
 ┌─────────────────┐   UDP    ┌─────────────────┐   UART   ┌──────────────────┐
 │ MATLAB Simulink │ ───────▶ │  dataProcess.py │ ───────▶ │   CMU  S32K144   │
 │  (시뮬레이션 입력) │          │   (호스트 브릿지)  │          │ Cortex-M4 · CSEc │
 └─────────────────┘          └─────────────────┘          └────────┬─────────┘
                                                                    │
                                              CAN-FD (AES-128 CMAC + CBC)
                                                                    │
                                                                    ▼
                                                          ┌──────────────────┐
                                                          │   BMU  S32K344   │
                                                          │ Cortex-M7 · HSE  │
                                                          └────────┬─────────┘
                                                                   │
                                          Ed25519 서명 + 48-byte payload
                                                                   │
                            ┌──────────────────┐                   ▼
                            │  Battery Passport│          ┌──────────────────┐
                            │   Web (React 19) │ ───────▶ │     bmu-agent    │  ◀── 쓰기 경로 (유일)
                            └──────────────────┘  REST    │  (Node · Express)│
                                                          └────────┬─────────┘
                                                  Fabric Gateway / submitTransaction
                                                                   │
                                                                   ▼
                                                  ┌────────────────────────────┐
                                                  │      Hyperledger Fabric     │
                                                  │  passport-contract (Go)     │
                                                  │  4-org MSP · CouchDB state   │
                                                  └──────────────┬──────────────┘
                                                                 │ Block Event
                                                                 ▼
                                                  ┌────────────────────────────┐
                                                  │         cloud-agent         │
                                                  │   MongoDB read model (CQRS) │  ◀── 읽기 전용
                                                  └──────────────┬──────────────┘
                                                                 │ read-only 관찰
                                                                 ▼
                                                  ┌────────────────────────────┐
                                                  │         mcp-monitor         │  ◀── 읽기 전용
                                                  │   Fabric / Passport / log   │
                                                  └────────────────────────────┘
```

**구성요소 요약**

| 레이어 | 디렉토리 | 스택 / 책임 |
|---|---|---|
| Fabric 인프라 | `passport-network/` | Fabric 2.5 · 4 peer-org(manufacturer / evmanufacturer / service / regulator) + orderer-org · CouchDB state |
| 체인코드 | `chaincode/passport-contract/` | Go 1.24 · GBA 배터리여권 도메인 · MSP 기반 권한제어 · BMU/VC 검증 |
| 쓰기 API 서버 | `bmu-agent/` | Node.js · Express · JWT · Fabric Gateway · BMU ingest (원장 쓰기 유일 경로) |
| 오프체인 read model | `cloud-agent/` | MongoDB · Block Event sync · Passport read API (CQRS) |
| 웹 콘솔 | `webapp/frontend-react/` | React 19 · TypeScript 5.8 · Vite 8 |
| 레거시 SPA | `webapp/frontend/` | Vue 3 (`/legacy` 보존) |
| BMU 펌웨어 | `BMU_BMS_S32K344/` | Cortex-M7 · HSE · FreeRTOS |
| CMU 펌웨어 | `CMU_BMS_S32K144/` | Cortex-M4 · CSEc · FreeRTOS |
| 공유 프로토콜 / 브릿지 | `firmware/` | 48-byte payload · UART/Agent 브릿지 · BMS binding code |
| MCP 모니터링 | `mcp-monitor/` | read-only Fabric / Passport / API / log 관찰 |

> **신원 컨텍스트.** BMU ingest는 Manufacturer M2M service identity로 실행되고, 일반 API는 요청자의 JWT identity로 실행됩니다.

---

## Quick Start

> 전제: Docker / Docker Compose, Go 1.24+, Node.js 18+, Python 3 (브릿지 도구).

```bash
# 1) 환경 설정 (1회)
cp passport-network/.env.template passport-network/.env
#   .env: CA_ADMIN_USER/PASSWORD, COUCHDB_USER/PASSWORD 설정

# 2) 4-org Fabric + CouchDB + CA 기동
./start_passport_network.sh up

# 3) React 콘솔 빌드 (bmu-agent가 dist/를 정적 서빙)
cd webapp/frontend-react && npm run build && cd -

# 4) 쓰기 API 서버(bmu-agent) 기동
cd bmu-agent && FABRIC_ORG=1 node server.js
#   → http://localhost:3001
```

임베디드 E2E(MATLAB → CMU → CAN-FD → BMU → Agent → Fabric) 빌드/플래시 절차와 운영 명령은 [임베디드 가이드](#임베디드-bmu--cmu-펌웨어) 및 [`firmware/README.md`](firmware/README.md)를 참조하세요.

---

## 도메인 가이드

### 블록체인 (Hyperledger Fabric 인프라)

<!-- BEGIN: BLOCKCHAIN — Fabric 인프라/채널/피어/CA/Agent API 담당 작성 영역 -->
배터리여권 원장은 **4-org 권한형(permissioned) Hyperledger Fabric 2.5** 네트워크 위에서 동작합니다. GBA(Global Battery Alliance) 21개 도메인 필드를 Go 체인코드로 모델링하고, MSP 기반 RBAC로 제조사·EV제조사·서비스·규제기관의 권한을 분리합니다.

#### 네트워크 토폴로지

| 구성 | 값 | 비고 |
|---|---|---|
| Fabric | **2.5** | LTS |
| 조직(MSP) | **4** — Manufacturer · EVManufacturer · Service · Regulator | 각 1 peer |
| Orderer | **1-node etcdraft (Raft)** | BatchTimeout / BatchSize 튜닝 가능 |
| State DB | **CouchDB ×4** | rich query (GBA 도메인 조회·DID 인덱싱) |
| Certificate Authority | **5** | org별 1 + orderer org |
| 채널 | `passportchannel` | 4-org 공통 원장 |
| 체인코드 | `passport-contract` (Go 1.24) | GBA 21 도메인 + MSP RBAC |

#### 체인코드 — `passport-contract`

배터리 여권 발급부터 폐기·재활용까지 전체 수명주기와, BMS 바인딩·BMU 실데이터·VC 검증을 하나의 Go 체인코드로 관리합니다. 함수는 **MSP 권한으로 게이트**되며(예: `CreateBatteryPassport`는 Manufacturer MSP 전용), 쓰기는 org peer endorsement를 거칩니다.

| 도메인 | 주요 트랜잭션 |
|---|---|
| **여권 수명주기** | `CreateBatteryPassport` · `CorrectPassportData` · `BindToVehicle` · `DisposeBattery` · `ExtractMaterials` · `LinkRawMaterials` |
| **BMS 바인딩** | `BindBMSIdentifier` · `CheckBMUHotBinding` |
| **BMU 실데이터** | `RecordBMUDataWithPayload`(서명 rawPayload 검증) · `RecordBMUData` · `RecordBMUDataAutoID` · `InvalidateBMURecord` · `ResetFCForDID`(fail-safe) |
| **출처·물리 검증** | `RecordSourceVerification` |
| **자격증명(VC)** | `IssueCredential` · `ApproveCredentialIssuance` · `LogCredentialVerification` · `GetCredentialHistory` |
| **이력 로그** | `AddMaintenanceLog` · `AddAccidentLog` |
| **조회** | `QueryPassport` · `QueryBatteryByDID` · `QueryBMURecordsByPassport` · `QueryCredentialsByHolder` · `QueryPassportsWithPagination` 외 다수 |

<details>
<summary>전체 트랜잭션 함수 (40+)</summary>

`AddAccidentLog` · `AddMaintenanceLog` · `ApproveCredentialIssuance` · `BindBMSIdentifier` · `BindToVehicle` · `CheckBMUHotBinding` · `CorrectPassportData` · `CreateBatteryPassport` · `DisposeBattery` · `ExtractMaterials` · `GetCredentialHistory` · `GetPassportHistory` · `InvalidateBMURecord` · `IssueCredential` · `LinkRawMaterials` · `LogCredentialVerification` · `QueryAllPassports` · `QueryBMURecordsByPassport` · `QueryBatteryByDID` · `QueryCorrectionHistory` · `QueryCredential(s)ByHolder/Type/Passport/Issuer` · `QueryPassport(WithPagination)` · `QueryPhysical/Regulatory/SourceVerificationHistory` · `QueryRawMaterials` · `QueryRevokedCredentials` · `RecordBMUData(AutoID/WithPayload)` · `RecordSourceVerification` · `ResetFCForDID` …

</details>

#### 거버넌스 · 무결성

- **MSP RBAC** — 함수별 호출 조직 제한 (발급=Manufacturer, 검증=Regulator 등)
- **rawPayload 해시 검증** — BMU 48B 서명 페이로드를 체인코드가 재해시·대조 (`rawPayloadHashVerified`)
- **Hot binding** — `CheckBMUHotBinding`으로 passport↔DID 활성 바인딩 정본 검증
- **FC 단조성(monotonic) 강제** — 체인코드가 `fc > lastFc` 정책 유지 (임베디드 Option B와 연계, [ADR-007](wiki/decisions/007-bmu-fc-nvm-persistence.md))

> 원장 상태 확인: `docker exec peer0.manufacturer.battery.com peer channel getinfo -c passportchannel`
> 상세: [`passport-network/`](passport-network/) · 체인코드 소스 [`chaincode/passport-contract/`](chaincode/passport-contract/)
<!-- END: BLOCKCHAIN -->

### 배터리여권 (Battery Passport)

<!-- BEGIN: PASSPORT — passport-contract, GBA 도메인, DID/VC, 웹 콘솔 연동 담당 작성 영역 -->
React 웹 콘솔 · `bmu-agent` API 서버 · 오프체인 read model(`cloud-agent`)로 GBA 배터리여권의 발급·바인딩·검증·BMU 실시간 데이터를 다룹니다. 체인코드 함수·MSP RBAC·원장 거버넌스는 [블록체인 인프라](#블록체인-hyperledger-fabric-인프라)가 담당하고, 이 섹션은 앱 관점만 다룹니다.

#### 런타임 구성

| 프로세스 | 포트 | 역할 |
|---|---|---|
| `bmu-agent` | `:3001` | 쓰기 API · BMU ingest · React `dist` 정적 서빙(레거시 Vue는 `/legacy`) |
| `cloud-agent` | `:3002` | 오프체인 read model (CQRS, **선택적**) |
| ACA-Py | `:8031` (admin) | DID verkey 해석 / VC 발급·검증 (외부 인프라) |

> 포트·채널(`passportchannel`)·컨트랙트(`passport-contract`)·MSP ID는 모두 env로 재정의 가능한 기본값입니다.

#### bmu-agent API 서버

`bmu-agent`(패키지명 `battery-passport-agent`)는 하드웨어 BMU와 콘솔을 Fabric 원장에 연결하는 Express 4 서버이며, 원장에 **쓰기가 가능한 유일한 경로**입니다.

- **인증**: `jsonwebtoken` HS256, 페이로드 `{ userId, orgMsp }`, 기본 만료 `24h`. 시크릿은 필수 env `JWT_SECRET`(없으면 기동 실패)에서 읽습니다. `authenticateToken`이 `Authorization: Bearer <token>`을 검증해 `req.user`를 세팅하고, `requireMSP(...)`가 `orgMsp` 화이트리스트로 라우트를 게이트합니다.
- **per-org Fabric Gateway**: Gateway pool을 `${mspId}:${userId}` 라벨로 캐시하고(30분 TTL, Promise dedup), 기동 시 wallet이 비어 있으면 기본 admin identity를 CA로 enroll합니다. 트랜잭션은 요청자 JWT 유무에 따라 **요청자 자기 org identity** 또는 **부팅 시 기본 admin**으로 실행됩니다.
- **정적 서빙**: `webapp/frontend-react/dist` 빌드 산출물을 `/`에 서빙(SPA fallback)하고, 레거시 Vue SPA를 `/legacy`에 마운트합니다.
- **MSP 매핑**: `ManufacturerMSP`(org1) · `EVManufacturerMSP`(org2) · `ServiceMSP`(org3) · `RegulatorMSP`(org4). 역할별 권한 정책 원본은 [블록체인 인프라](#블록체인-hyperledger-fabric-인프라)를 참조합니다.

#### 웹 콘솔 (React 19)

React 19 + TypeScript + Vite 8 + Tailwind v4, `react-router-dom` v7 기반 **13개 lazy-load 라우트**로 구성됩니다. `/`·`/login`만 공개이고 나머지 11개는 인증 가드로 보호되며, CSS design-token 시스템과 first-class 다크 모드(`ThemeContext`)를 갖춥니다. QR 식별 조회는 `html5-qrcode`를 사용하고, 레거시 Vue 3 SPA(10 페이지)는 `/legacy`에 보존됩니다.

| 라우트 | 화면 | 역할 |
|---|---|---|
| `/dashboard` | 개요 | KPI·상태 분포·최근 등록 대시보드 |
| `/passports` | 배터리 여권 등록부 | 여권 목록 / 등록 |
| `/passports/:id` | 여권 dossier | 단일 여권 상세 + 라이프사이클 액션 모달 |
| `/materials` | 공급망 등록부 | 원자재 등록 |
| `/bmu-data` | BMS 실시간 데이터 | BMU 텔레메트리 / 진단 |
| `/maintenance` | 작업 처리 | 정비 요청 / 이력 |
| `/recycling` | 재활용·ESG | 회수 / 재활용 |
| `/qr-scan` | 현장 식별 조회 | QR 기반 조회 |
| `/audit-log` | 감사·원장 | 감사 로그 뷰 |
| `/settings` | 설정 | 환경 설정 |
| `/bmu-operations` | BMU 상태와 FC fail-safe | reset-fc 운영자 폼 |

여권 상세 화면은 `useOrgRoles(org)`로 인증 org를 4개 boolean(`isManufacturer`/`isEVManufacturer`/`isService`/`isRegulator`)으로 풀어 액션 버튼을 org별로 노출·차단하고, 14종 라이프사이클 액션(Bind · 정비 요청·기록 · 분석 요청·결과 · Dispose · Correction · VC 발급·검증·폐기·요청·승인·거절 · 규제 검증 · 물리 검증)을 단일 `openModal` 상태로 한 번에 하나씩 렌더링합니다.

#### 앱 온보딩 플로우

여권은 발급 직후 확장 속성 → BMS binding → source verification 순서로 증거를 이어 기록하고, 그 다음부터 실시간 BMU ingest가 들어옵니다. 모든 단계는 Fabric에 앵커됩니다.

```text
1. POST /api/passports                          (Manufacturer)
   └▶ CreateBatteryPassport(passportId, batteryId, did, model, ...)   # 배터리 DID가 여권에 바인딩

2. POST /api/passports/:id/extended-attributes  (Manufacturer · Regulator)
   └▶ SetPassportExtendedAttributes(...)                              # 3차년도 확장 / EU-passport 속성

3. POST /api/passports/:id/bms-binding          (Manufacturer · Regulator)
   └▶ BindBMSIdentifier(bmsManagementId, bmsBindingId, evidenceHash)  # 성공 시 DID→passport 캐시 clear

4. POST /api/passports/:id/source-verification  (Manufacturer · Regulator)
   └▶ RecordSourceVerification(...)                                   # BMS binding ↔ 여권 연결 증거

──▶ 이후 POST /api/bmu/data 로 서명된 BMU 텔레메트리가 실시간 ingest
```

BMS binding 기본값 (예시 — 기본 배포 값):

```text
bmsManagementId:  BMS-MGMT-001
bmsBindingId:     did:battery:001#BMS-MGMT-001
bmsBindingCode32: 0x2c9a0e0c
evidenceHash:     b3c37ed2cdd2831cc0c212445905ced4a20ea51e129bff2e7418deddf7223178
```

`bmsBindingCode32`는 bound `bmsManagementId`에서 런타임에 파생되며, `0x2c9a0e0c`는 기본/참조 값(env `BMS_BINDING_CODE32`로 재정의 가능)입니다.

#### API ↔ Chaincode 매핑 (앱 관점)

아래 표는 "어떤 `bmu-agent` HTTP 엔드포인트가 어떤 체인코드 트랜잭션을 호출하는가"입니다(Submit=쓰기, Eval=읽기). 체인코드 함수 시그니처·내부 검증·거버넌스는 [블록체인 인프라](#블록체인-hyperledger-fabric-인프라)가 소유합니다.

| API | 체인코드 tx | 권한 |
|---|---|---|
| `POST /api/passports` | Submit `CreateBatteryPassport` | Manufacturer |
| `POST /api/passports/:id/extended-attributes` | Submit `SetPassportExtendedAttributes` | Manufacturer · Regulator |
| `POST /api/passports/:id/bms-binding` | Submit `BindBMSIdentifier` | Manufacturer · Regulator |
| `POST /api/passports/:id/source-verification` | Submit `RecordSourceVerification` | Manufacturer · Regulator |
| `PUT /api/passports/:id/bind` | Submit `BindToVehicle` | EV Manufacturer |
| `GET /api/passports` | Eval `QueryPassportsWithPagination` | 인증 |
| `GET /api/passports/:id` | Eval `QueryPassport` | 인증 |
| `GET /api/passports/:id/history` | Eval `GetPassportHistory` | 인증 |
| `POST /api/bmu/data` (bound) | Submit `RecordBMUDataWithPayload(..., rawPayload)` | Manufacturer (M2M) |
| `POST /api/bmu/data` (unbound) | Submit `RecordBMUData` | Manufacturer (M2M) |
| `GET /api/bmu/records/:passportId` | Eval `QueryBMURecordsByPassport` | 인증 |
| `POST /api/bmu/reset-fc` | Submit `ResetFCForDID` | Manufacturer · Regulator (5건/시간, fail-safe 전용) |

> **BMU ingest는 요청자 JWT가 아닌 기본 admin(Manufacturer M2M) identity로 실행됩니다.** `POST /api/bmu/data`는 의도적으로 요청자 컨텍스트를 생략(M2M 통신)하고, 나머지 passport/VC 쓰기는 요청자 JWT identity로 실행됩니다.

<details>
<summary>전체 엔드포인트 인벤토리 (prefix <code>/api</code>)</summary>

**Auth** — 체인코드 tx 없음, Fabric CA 호출:
- `POST /auth/register` → `registerUser`(CA register+enroll), JWT 반환 (`ALLOW_OPEN_REGISTRATION=true`가 아니면 인증된 호출자 필요)
- `POST /auth/login` → `loginUser`(CA enroll = 비밀번호 검증), JWT 반환

**Passports**:
- `POST /passports/:id/materials` → Submit `LinkRawMaterials` (Manufacturer)
- `POST /passports/:id/correct` → Submit `CorrectPassportData` · `GET /passports/:id/corrections` → Eval `QueryCorrectionHistory`
- `PUT /passports/:id/regulatory-verification` → Submit `UpdateRegulatoryVerification` (Regulator)
- `PUT /passports/:id/physical-verification` → Submit `VerifyPhysicalHistory`
- `POST|GET /passports/:id/vehicle-image` → `QueryPassport`(접근 확인) 후 디스크 업로드/스트리밍, tx 없음

**BMU**:
- `POST /bmu/event` → tx 없음, UART `[HSE]`/`[FATAL]` 이벤트를 `logs`에만 릴레이
- `GET /bmu/operations/status` → tx 없음, in-memory 운영 상태(최근 24h max FC, reset-fc count, alert)
- `POST /bmu/invalidate/:recordId` → Submit `InvalidateBMURecord` (Manufacturer · Regulator)

**DID** — off-chain(ACA-Py/Indy), Fabric 체인코드 tx 없음:
- `POST /did/register` · `GET /did/verkey/:did` · `POST /did/verify`

**VC** — `vcService`를 통해 Fabric에 앵커(체인코드 tx 명은 서비스 계층에 캡슐화):
- `POST /vc/schemas` · `/vc/credential-definitions` · `/vc/schemas/init`
- `POST /vc/request` · `/vc/request/:id/approve` · `/reject`
- `POST /vc/issue` (먼저 `QueryPassport`로 holder DID 검증) · `POST /vc/revoke`
- `GET /vc/verify/:id` · `POST /vc/verify-log` · 다수 조회(holder / passport / type / revoked / history)

**Status / Audit**:
- `GET /api/status` → 인증 없음, `{ fabric, channel, contract, org }`
- `GET /api/audit` → `requireMSP(Manufacturer, Regulator)`, in-memory 감사 로그

</details>

#### DID / VC 발급·검증

배터리 DID(예: `did:battery:001`)의 verkey(Ed25519 public key, base58)는 로컬에 키로 저장하지 않고 Indy/VON ledger에서 ACA-Py를 통해 해석합니다.

- **verkey 해석**: `GET ${acaPyUrl}/ledger/did-verkey?did=...`. 결과는 1h TTL로 in-process 캐시(불변 ledger verkey), LRU eviction + Promise dedup.
- **서명 검증**: `bs58.decode(verkey)` → `nacl.sign.detached.verify`(tweetnacl). DID 등록은 `POST ${acaPyUrl}/ledger/register-nym`.
- **BMU ingest 검증 파이프라인** (`POST /api/bmu/data`): 서명이 **필수**이며 정확히 128 lowercase hex(`signR(64) || signS(64)`)여야 합니다. 페이로드 바이트 위에서 Ed25519 검증(실패 → `401`) → `QueryBatteryByDID`로 DID→passport 해석(캐시) → bytes `44..47`의 `bmsBindingCode32`를 여권 bound 값과 비교(불일치 → `400`) → bound면 `RecordBMUDataWithPayload`, 아니면 `RecordBMUData`로 기록.
- **VC 라이프사이클**: 5개 사전 스키마(`BATTERY_PASSPORT` · `BATTERY_HEALTH` · `MAINTENANCE` · `COMPLIANCE` · `RECYCLING`)는 ACA-Py로, credential 앵커·감사는 Fabric으로 처리하는 하이브리드입니다. `POST /vc/issue`는 `QueryPassport`로 holder DID가 여권 DID와 일치하는지 강제하고(불일치 거절), 요청 → 승인/거절 → 발급 → 검증/로그 → 폐기 흐름과 holder/verifier 조회를 제공합니다.

#### 오프체인 read model (cloud-agent · :3002)

`cloud-agent`는 CQRS의 읽기 측입니다. Fabric은 해시·메타정보를 담는 신뢰 쓰기 저장소이고, MongoDB는 고속 조회를 위해 원본 문서를 들고 있는 오프체인 read model입니다(서버 `mongo:7` 컨테이너, Node 드라이버 `mongodb@^6.12` — 드라이버 6.x는 서버 7과 호환).

- **block-event sync**: 기동 시 `passportchannel`에 `addBlockListener`를 걸고, `passport-contract` 쓰기를 `docType`→컬렉션(`batteryPassport`→`passports`, `bmuRecord`→`bmuRecords`)으로 upsert합니다.
- **checkpoint**: `_sync_meta` 컬렉션에 `lastBlock:<channel>`을 기록해 재시작 시 마지막 블록 다음부터 resume합니다(초기 일괄 seed 후 라이브 이벤트). 채널을 완전 리셋한 경우 stale checkpoint가 없는 블록을 요청하지 않도록 read-model과 `_sync_meta`를 함께 리셋한 뒤 기동합니다.
- **denormalization**: 체인코드는 BMU record를 별도 문서로 기록하므로, listener가 `bmuRecord` 도착 시 `currentSoc`/`currentTemperature`/`currentSoh`/`totalDischargeCycles`/`lastFc` 등을 부모 여권 문서에 projection합니다.
- **read API**: `GET /api/passports` · `/api/passports/:id`(짧은 TTL 캐시) · `/api/passports/search` · `/api/bmu/:idOrDid` · `/api/stats` · `/health` — 모두 MongoDB 직결.

> **왜 CQRS인가**: on-chain `QueryPassport`는 peer-gateway concurrency에 throttle되므로, 읽기 처리량은 이 cloud-agent HTTP read model을 측정 경로로 삼습니다. 벤치 수치와 claim 경계는 [블록체인 인프라](#블록체인-hyperledger-fabric-인프라)를 참조합니다. `cloud-agent`는 **선택적** 인프라입니다.

#### 실시간 화면 반영

여권 상세 화면은 3-layer 읽기 경로로 "live" 상태를 유지합니다.

1. **cloud-agent read model 우선**: `/api/realtime/*`는 `bmu-agent`가 `cloud-agent`(`CLOUD_AGENT_BASE` 기본 `http://localhost:3002`)에 `X-API-Key`로 proxy하고, 2xx면 그대로 전달합니다.
2. **cloud-agent down → Fabric + runtime snapshot fallback**: `:3002`가 꺼져 있어도 각 realtime 라우트가 Fabric(`QueryPassport`/`QueryBMURecordsByPassport`)로 fallback하고, `passportSnapshotOverlay`가 먼저 in-memory runtime BMU snapshot을, 없으면 Fabric 최신 record를 여권에 overlay해 `current*` 필드를 살려 둡니다(체인코드 직접 조회는 `current*`를 0으로 반환하기 때문).
3. **3s silent refresh**: 여권 상세는 초기 fetch 후 3초마다 silent refetch를 돌려, 스피너 없이 SOC/SOH/temperature를 제자리에서 갱신합니다.

예시 — 2026-05-22 MATLAB/BMU live 기준 (`passportId`/`did`는 BMU 보드 세션에 묶인 값으로 세션마다 rotate되며, 라이브 원장의 체인코드 version/sequence 권위 값은 [블록체인 인프라](#블록체인-hyperledger-fabric-인프라) 참조):

```text
passportId:       MATLAB-BMU-002           # 예시 · 세션별
did:              HgBpAxtHJ4qRwsNiroaqvC   # 예시 · 세션별(rotate 이력 있음)
bmsBindingCode32: 748293644 / 0x2c9a0e0c   # 기본 배포 값(안정)
```

> Passport 전용 기동 델타: 루트 [Quick Start](#quick-start)로 Fabric + `bmu-agent`(`:3001`) 기동 후, (선택) `cd cloud-agent && node server.js`로 read model(`:3002`)을 띄웁니다. 접속 `http://localhost:3001`(레거시 Vue 콘솔은 `/legacy`).
> 상세: [bmu-agent README](bmu-agent/README.md) · [frontend-react README](webapp/frontend-react/README.md) · [cloud-agent 아키텍처](wiki/blockchain/cloud-agent-architecture.md) · 콘솔 캡처 [`wiki/passport/assets`](wiki/passport/assets/README.md) · 체인코드/원장 내부는 [블록체인 인프라](#블록체인-hyperledger-fabric-인프라)
<!-- END: PASSPORT -->

### 임베디드 (BMU / CMU 펌웨어)

<!-- BEGIN: EMBEDDED — BMU/CMU S32K, CAN-FD, HSE/CSEc 보안, 펌웨어, 브릿지 담당 작성 영역 -->
MATLAB Simulink이 만들어 낸 배터리 데이터가 **CMU → CAN-FD → BMU**를 거쳐 서명·암호화되고, 호스트 브릿지를 통해 배터리 여권 에이전트로 올라가는 구간이다. 두 개의 NXP S32K MCU가 하드웨어 보안 엔진(CSEc / HSE)으로 무결성·기밀성·신선도(anti-replay)를 보장한다.

#### 하드웨어 구성

| 노드 | MCU | 코어 | 보안 엔진 | 역할 |
|------|-----|------|-----------|------|
| **CMU** (Cell Monitoring Unit) | S32K144 | Cortex-M4 | CSEc (FlexNVM 파티션) | 셀 데이터 수집 → CMAC 생성 + AES-CBC 암호화 → CAN-FD 송신 |
| **BMU** (Battery Management Unit) | S32K344 | Cortex-M7 + FreeRTOS | HSE | CAN-FD 수신 → CMAC 검증 + 복호화 → Ed25519 서명 → UART 출력 |

#### CAN-FD 보안

MAC-then-encrypt 구조. CMAC을 **평문**에 대해 먼저 계산한 뒤 페이로드를 CBC로 암호화하며, CMAC 태그는 평문 상태로 프레임에 붙는다.

| 보안 속성 | 알고리즘 | 비고 |
|-----------|----------|------|
| **무결성** | AES-128 CMAC | 16B 태그, 입력 = `FC(4B, big-endian) ‖ payload(48B)` = 52B |
| **기밀성** | AES-128-CBC | `IV = FC(4B BE) → 16B zero-pad`, 프레임마다 IV가 달라짐 |
| **인증 (링크)** | 세션키 기반 CMAC | 세션키 = `KDF(PSK, "SessionKey" ‖ UID ‖ Seed ‖ 0x01)` |
| **인증 (체인)** | Ed25519 서명 | BMU가 검증 완료된 평문 페이로드에 서명 (TweetNaCl SW, HSE HW 가속 옵션) |

> 키 교환은 PSK로 UID·Seed를 AES-ECB 암호화해 수행하며, 이후 모든 프레임은 파생 세션키로 보호된다. 링크 계층 인증은 **CMAC**이 담당하고, **Ed25519**는 체인 단계의 출처 증명(attestation)을 담당한다 — 별개의 두 계층이다.

<details>
<summary>CAN-FD 보안 프레임 레이아웃</summary>

```
CAN ID 0x14 (BATTERY_DATA)
┌────────────────────────────┬──────────────┐
│ data[48]  (평문 or CBC암호) │ cmac[16]     │   = 64B (SecuredFrame_t)
└────────────────────────────┴──────────────┘
```
CMAC은 평문 기준으로 계산되므로 수신 측은 복호화 후가 아니라 복호화와 독립적으로 무결성을 검증할 수 있다.
</details>

#### 페이로드 레이아웃 — 48B `BatteryData_t`

`__attribute__((packed))` 구조체. 오프셋은 바이트 단위.

| 오프셋 | 필드 | 크기 | 비고 |
|:---:|------|:---:|------|
| 0..3 | `current_A` | 4 | float |
| 4..7 | `voltage_V` | 4 | float |
| 8..9 | `soc_u16` | 2 | |
| 10..11 | `discharge_cycles` | 2 | |
| 12..13 | `temperature_u16` | 2 | |
| 14..24 | `cell_voltage[11]` | 11 | |
| 25..35 | `cell_soc[11]` | 11 | |
| 36..37 | `timestamp_ms` | 2 | |
| 38 | `status_flags` | 1 | |
| 39 | `cell_count` | 1 | |
| 40..43 | `freshness_counter` | 4 | FC (CMAC 입력 시 big-endian) |
| 44..47 | `reserved[4]` ⟵ **BMS binding code** | 4 | 펌웨어 구조체상은 `reserved`, 호스트가 binding code를 기록 |

> **BMS binding code (bytes 44..47, little-endian uint32)** — 펌웨어 구조체는 이 4바이트를 `reserved[4]`로 두고 그대로 통과시키지만, 호스트의 `dataProcess.py`가 여기에 binding code를 **little-endian**으로 써넣는다. 값은 정규화된 BMS 관리 ID의 `SHA-256` 앞 32비트다. 이 데이터를 `dataProcess.py`로 거치지 않으면 binding code가 `0x00000000`이 되어 체인코드가 거부한다.
>
> 예시: `BMS binding: 0x2c9a0e0c stored in payload bytes 44..47`

#### Freshness Counter — Option B (NVM 영속화)

재부팅으로 FC가 초기화되어 과거 프레임이 재생(replay)되는 것을 막기 위해, BMU는 FC를 **HSE 모노토닉 카운터(NVM)** 에 영속화한다. 설계 전문은 → [ADR-007](wiki/decisions/007-bmu-fc-nvm-persistence.md).

| 항목 | 값 | 설명 |
|------|-----|------|
| HSE 카운터 슬롯 | `0` | `HSE_COUNTER_SLOT_BMU_FC` |
| Rollover Protection (flash) | `40 bit` | `HSE_COUNTER_RP_BITSIZE` |
| Volatile Counter (RAM) | `24 bit` | `64 - 40`; 전원 차단 시 소실 |
| 부팅 시 epoch 점프 | `+2^24` (`0x01000000`) | VC 1회 오버플로 → **RP/flash 강제 기록** → cross-boot 단조성 확보 |

- **두 개의 FC** — `g_expected_fc`(CMU-측, 세션마다 키 교환으로 리셋) vs `g_chain_fc`(BMU-측, NVM 시드 = `epoch × 2^24`, 전역 단조 증가).
- 체인 전송 직전, 페이로드의 `freshness_counter`를 `g_chain_fc`로 **재기록한 뒤 Ed25519 서명** → 체인코드가 추출하는 FC와 서명 대상이 일치.
- 다운스트림 보장: **`fc > lastFc`**. 이 단조성의 강제 검증(reject 로직)은 → [블록체인 섹션](#블록체인-hyperledger-fabric-인프라) 참조(임베디드는 보장만 제공).
- **epoch 점프는 스케줄러 기동 이후(`ProtocolTask` 진입 직후)** 수행한다. 부팅 시퀀스에서 `vTaskStartScheduler()` 이전에 HSE flash write를 하면 다른 태스크가 기동되지 않는 *Pre-Scheduler Hazard* 가 있어, 사전 단계에서는 NVM 값을 **읽기만** 한다.

<details>
<summary>알려진 한계 & fail-safe</summary>

- **256-boot wrap** — `g_chain_fc`는 `uint32`. 부팅 N회차 시작값 = `N × 2^24`(하위 32비트). `N=256`(`256 × 2^24 = 2^32`)에서 0으로 wrap. 사용자 리셋 ~3회/일 기준 **약 85일** 운용분.
- **`ResetFCForDID`** (ADR-004) — 폐기되지 않고 **DID 회전 fail-safe**로 유지. 평상시 호출 0회, 256-boot wrap 도달 또는 NVM 영구 고장 시에만 사용.
- HSE 카운터 read/epoch-advance 실패 시 BMU는 `[FATAL]`을 UART로 알리고 **halt**(anti-replay 보장을 위해 의도적으로 중단).
</details>

#### 호스트 브릿지 도구 (`firmware/tools/`)

| 도구 | 구간 | 핵심 동작 |
|------|------|-----------|
| `dataProcess.py` | MATLAB Simulink (UDP:5005) → CMU UART | 216B(double 27개) UDP 패킷을 48B `BatteryData_t`로 압축, `[0xAA][0x55][0x30][48B][CRC-8]`(52B) 프레임으로 래핑, binding code를 `reserved[44..47]`에 기록 |
| `serial_to_agent.py` | BMU UART → 여권 에이전트 | hex 프레임 검증 → SQLite 스풀 → 에이전트 POST |

**`serial_to_agent.py` 세부**

- **hex 검증** — 서명 `R`/`S`는 각 64 hex, 원시 페이로드는 96 hex 정규식으로 검사(잡음 라인 차단).
- **SQLite 스풀** — `spool.db`의 `pending` 테이블에 적재 후 재시도(최대 50회) → 에이전트 일시 다운 시에도 유실 없음.
- **HSE 이벤트 분리** — `BOOT_FC` / `COUNTER_READ_FAIL` / `CONFIG_FAIL` / `EPOCH_ADVANCE_FAIL` / `INCREMENT_WARN` 라인은 `POST /api/bmu/event`로, 정상 배터리 데이터는 `POST /api/bmu/data`로 분리 전송.
- **자격증명** — `BRIDGE_USER` / `BRIDGE_PASSWORD` 환경변수 지원(명령행 노출 방지).

> 포트/baud는 예시 기본값: CMU `COM5 @ 9600`, BMU `COM4 @ 28800`, 에이전트 `http://localhost:3001`.

#### 빌드 & 플래시

> **정정**: 루트에 `build.sh` 는 없다. 빌드는 `./e2e.sh`(또는 각 `Debug_FLASH`에서 직접 `make`), 플래시는 `./flash.sh` 로 한다.

**사전 준비 (최초 1회)** — S32DS 프로젝트의 `.args` 파일들이 `C:\BMS\...` 절대경로를 참조하므로, 클론 위치와 무관하게 정션이 필요하다.

```bat
scripts\setup-dev-env.bat        :: mklink /J  C:\BMS  <repo-root>
dir C:\BMS\config.env            :: 정션 동작 확인
```

**빌드** — `config.env`의 `BMS_MODE`(예: `BMS_MODE_EDDSA`)로 모드를 정한다.

```bash
# 각 노드 직접 빌드 (개발 빌드는 -DBMS_WHITELIST_DISCOVERY 포함, 양산은 제외)
cd BMU_BMS_S32K344/Debug_FLASH && make -j8 all CFLAGS_EXTRA="-DBMS_MODE_EDDSA -DBMS_WHITELIST_DISCOVERY"
cd CMU_BMS_S32K144/Debug_FLASH && make -j8 all CFLAGS_EXTRA="-DBMS_MODE_EDDSA -DBMS_WHITELIST_DISCOVERY"
```

**플래시** — PEmicro `pegdbserver_console.exe` 사용.

```bash
./flash.sh all        # bmu + cmu (개별: ./flash.sh bmu | cmu)
```

| 노드 | device | interface | port (예시) |
|------|--------|-----------|------|
| BMU | `NXP_S32K3xx_S32K344` | `USBMULTILINK` | `PEMF1A375` |
| CMU | `NXP_S32K1xx_S32K144F512M15` | `OPENSDA` | `FDCB6E5B` |

**원클릭 E2E** — `./e2e.sh [모드]`

| 모드 | 동작 |
|------|------|
| `full` | build + flash + 시뮬레이터 + 브릿지 |
| `nosim` | build + flash + 브릿지 |
| `simonly` | 시뮬레이터 + 브릿지 |
| `matlab` | dataProcess + 브릿지 (MATLAB이 직접 UDP 전송) |
| `bridge` | 브릿지만 |
<!-- END: EMBEDDED -->

### MCP (읽기 전용 모니터링)

<!-- BEGIN: MCP — mcp-monitor, MCP 서버/도구 담당 작성 영역 -->
[`mcp-monitor/`](mcp-monitor/)는 Fabric 원장과 Passport/BMU 검증 표면을 **읽기 전용으로만** 관찰하는 MCP 서버입니다. Fabric `evaluateTransaction`(읽기 쿼리)과 Passport `GET /api/status`·`GET /api/audit`, 그리고 로컬 로그(`logs/audit.log`, `logs/agent.log`)만 읽으며, 원장 쓰기나 Passport mutation API는 어떤 경로로도 호출하지 않습니다.

#### 제공 도구

5개 도구가 트랜잭션·BMU·VC·시스템·Passport 표면을 분담해 관찰합니다. 각 도구는 `action` 인자로 세부 동작을 선택합니다.

| 도구 | 역할 | action |
| --- | --- | --- |
| `monitor_transactions` | Fabric 트랜잭션 모니터링 (최근 목록·통계·함수명 검색, 로그+Fabric evaluate 하이브리드) | `recent` · `stats` · `search` |
| `monitor_bmu` | BMU 배터리 데이터 이상 탐지 (SOC/전압/온도 임계, 수신 빈도, HSE/boot epoch) | `anomalies` · `latest` · `frequency` · `thresholds` · `hse` |
| `monitor_vc` | Verifiable Credential 발급/폐기·만료 임박·상태 통계 추적 | `events` · `expiring` · `stats` · `revoked` |
| `system_status` | Fabric/VON/ACA-Py/Agent 컨테이너·프로세스·접속 상태 점검 | `overview` · `fabric` · `von` · `acapy` · `agent` · `docker` |
| `monitor_passport` | Passport API·감사 로그 관찰, BMU/VC/에러 trend 집계, alert payload 제공 | `status` · `audit` · `trends` · `observation_plan` |

#### 읽기 전용 원칙

모니터는 **완전한 읽기 전용 서비스**로 설계되었습니다. 과거에 Fabric admin identity를 공유하며 하드코딩된 비밀번호로 자동 CA enrollment까지 수행하던 보안 위험을 제거하기 위해 `fabric-ca-client` 의존성과 자동 enrollment를 삭제했고, identity가 없으면 명확한 에러 메시지로 안내합니다. 자세한 결정 배경은 [ADR-003](wiki/decisions/003-mcp-monitor-read-only.md)을 참조하세요.

- **읽기만 하는 것** — Fabric `evaluateTransaction`(읽기 쿼리), Passport `GET /api/status`, `GET /api/audit`(사전 주입된 ManufacturerMSP/RegulatorMSP JWT, 토큰 없으면 로컬 감사 로그 fallback), `logs/audit.log`, `logs/agent.log`.
- **절대 하지 않는 것** — 원장(ledger) 쓰기, `submitTransaction`(쓰기 트랜잭션) 호출, Passport mutation API 호출, wallet identity 변경 또는 `fabric-ca-client` 기반 특권 identity 생성.
- **identity 분리** — wallet identity는 `bmu-agent`에서 사전 등록된 것만 사용하므로 모니터는 wallet을 변경할 수 없고, 감사 추적 분리가 유지됩니다 (모니터 사용 전 `bmu-agent`가 먼저 실행되어 identity가 등록되어 있어야 합니다).
- **민감 필드 redaction** — 응답 반환 전 password/token/secret/signature/rawPayload/privateKey/authorization 키를 `[REDACTED_BY_MCP_MONITOR]`로 치환.

> 유일한 caveat: Passport 자체 감사 미들웨어가 GET 프로브에 대해 감사 엔트리를 append할 수 있으나, MCP 자신은 비즈니스 데이터나 원장 상태를 변경하지 않습니다.

#### 주요 관찰 항목

검증 이벤트, Fabric 쿼리 에러 정규화, BMS binding 증적, trend 집계를 읽기 전용으로 수집해 노출합니다.

- **검증 이벤트** — BMU: missing signature, invalid rawPayload, stale FC, DID mismatch, binding code zero/mismatch. VC: holder DID mismatch, malformed expiresAt, issue/verify 실패 trend.
- **Fabric 쿼리 에러 정규화** — `evaluateTransaction` 실패를 조용히 skip하지 않고 fail-closed로 정규화 type 코드로 노출: `DOC_TYPE_MISMATCH`, `DECODE_FAILURE`, `FABRIC_EVALUATE_ERROR`, `MONITOR_CONFIGURATION_ERROR`, 기본값 `QUERY_ERROR`. 각 에러는 `source='fabric'`, `operation='evaluateTransaction'`, `function`, `target`, `message` 필드를 동반합니다.
- **Passport validation 카테고리** — `VC_HOLDER_DID_MISMATCH`, `DID_MISMATCH`, `MALFORMED_EXPIRES_AT`, `MALFORMED_TIMESTAMP`, `INVALID_DATA_HASH`, `INVALID_RAW_PAYLOAD`, `MISSING_SIGNATURE`, `BMS_BINDING_CODE_ZERO`, `BMS_BINDING_CODE_MISMATCH`, `VC_ISSUE_VALIDATION_ERROR`, `BMU_FRESHNESS_COUNTER`, `VALIDATION_OTHER`.
- **BMS binding 증적** — `bmsManagementId`, `bmsBindingId`, `bmsBindingCode32`(0x 8자리 hex로 정규화), `rawPayloadHashVerified`, `physicalVerification.signals.bmsIdentifierMatched`, `evidenceHash` (null/빈값은 제거 후 노출).
- **Trend 집계** — BMU ingestion 건강도(recordCount, ingestionFailureTrend, ingestionErrorRate), freshness counter 이상탐지(`FRESHNESS_COUNTER_REPLAY_OR_STALE`, `FRESHNESS_COUNTER_GAP`), VC issue/verify trend, chaincode INTERNAL trend, 시간대·카테고리별 집계.
- **E2E 관찰 경로** — `BMU -> Agent -> Fabric -> Passport/MCP`: 48-byte payload/signature/FC/DID/bmsBindingCode32 → bmu-agent validation → evaluate/endorsement → `GET /api/audit`·`audit.log`·`agent.log` 순으로 증적을 추적합니다.

<details>
<summary>Sequence-3 BMS binding 기대값 (예시)</summary>

`monitor_passport`의 `summarizeSequence3Binding`은 5개 트랜잭션(`SetPassportExtendedAttributes`, `BindBMSIdentifier`, `RecordSourceVerification`, `RecordBMUDataWithPayload`, `RecordBMUData`)을 기대값과 대조해 match 리포트를 생성합니다 (값은 예시).

| 필드 | 예시 값 |
| --- | --- |
| `bmsManagementId` | `BMS-MGMT-001` |
| `bmsBindingId` | `did:battery:001#BMS-MGMT-001` |
| `bmsBindingCode32` | `0x2c9a0e0c` |
| `evidenceHash` | `b3c37ed2...` |

</details>

#### MCP 클라이언트 등록

MCP 클라이언트 설정에 서버를 등록하는 일반 형식입니다 (경로·환경값은 환경에 맞게 조정).

```json
{
  "mcpServers": {
    "bms-monitor": {
      "command": "node",
      "args": ["/absolute/path/to/mcp-monitor/src/index.js"]
    }
  }
}
```

> 상세: [`mcp-monitor/README.md`](mcp-monitor/README.md) · 읽기 전용 결정 근거 [ADR-003](wiki/decisions/003-mcp-monitor-read-only.md)
<!-- END: MCP -->

---

## 추가 문서

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — 전체 시스템 아키텍처
- [`bmu-agent/README.md`](bmu-agent/README.md) — Passport API · BMU ingest · realtime snapshot
- [`webapp/frontend-react/README.md`](webapp/frontend-react/README.md) — React Passport/Web 콘솔 구조와 테스트
- [`firmware/README.md`](firmware/README.md) — 임베디드 상세 (프로토콜 · 키 교환 · CAN 메시지 · 상태 머신)
- [`chaincode/passport-contract/`](chaincode/passport-contract/) — Go 체인코드 소스
- [`mcp-monitor/README.md`](mcp-monitor/README.md) — MCP read-only 모니터링 도구
- [`wiki/`](wiki/) — Obsidian vault (공개 기준 문서 · 디자인 토큰 · ADR)