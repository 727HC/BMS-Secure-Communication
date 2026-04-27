---
title: chaincode 계약 감사 — UI/bmu-agent ↔ chaincode 갭 분석
date: 2026-04-27
session: blockchain
scope: chaincode/passport-contract, passport-network
status: 보고서 (read-only audit)
---

# chaincode 계약 감사 — 2026-04-27

## 목적

`webapp/frontend-react`(velkern-brand-assets 브랜치)와 `bmu-agent`가 노출하는 배터리 여권 기능을 `chaincode/passport-contract`가 실제로 보장하는지 검증한다. 새 기능 구현이 아니라, 이미 기대되는 계약(인자/RBAC/검증/이력)에 대한 갭 분석이 목표.

검증 대상:
- chaincode: `chaincode/passport-contract/{main.go,types.go,helpers.go,passport_tx.go,bmu_tx.go,vc_tx.go,query.go}` (총 44개 contract method)
- 참조 (수정 금지): `bmu-agent/routes/*.js`, `bmu-agent/services/{fabric.service.js,vc.service.js}`, `webapp/frontend-react/src/pages/*.tsx`

---

## 1. 체인코드 함수 인벤토리 (44 contract methods)

### Material / Passport (passport_tx.go, query.go)

| # | 함수 | 위치 | Allowed MSP | UI/agent 호출 |
|---|------|------|-------------|---------------|
| 1 | RegisterRawMaterial | passport_tx.go:16 | Manufacturer | POST /api/materials |
| 2 | LinkRawMaterials | passport_tx.go:866 | Manufacturer | POST /api/passports/:id/materials |
| 3 | QueryRawMaterials | query.go:269 | Manufacturer, Regulator | GET /api/materials |
| 4 | QueryRawMaterialsWithPagination | query.go:306 | Manufacturer, Regulator | (미사용) |
| 5 | CreateBatteryPassport | passport_tx.go:76 | Manufacturer | POST /api/passports |
| 6 | BindToVehicle | passport_tx.go:198 | EVManufacturer | PUT /api/passports/:id/bind |
| 7 | CorrectPassportData | passport_tx.go:678 | per-field via fieldCorrectors | POST /api/passports/:id/correct |
| 8 | QueryPassport | query.go:15 | RBAC-filtered | GET /api/passports/:id |
| 9 | QueryAllPassports | query.go:45 | RBAC-filtered | (미사용 — Pagination 사용) |
| 10 | QueryPassportsWithPagination | query.go:53 | RBAC-filtered | GET /api/passports |
| 11 | GetPassportHistory | query.go:102 | RBAC-filtered | GET /api/passports/:id/history |
| 12 | QueryBatteryByDID | query.go:225 | Manufacturer, Regulator | (BMU 흐름에서 내부 호출) |
| 13 | QueryCorrectionHistory | query.go:592 | RBAC-filtered | GET /api/passports/:id/corrections |

### Maintenance / Analysis / Recycling (passport_tx.go)

| # | 함수 | 위치 | Allowed MSP | UI/agent 호출 |
|---|------|------|-------------|---------------|
| 14 | RequestMaintenance | passport_tx.go:264 | EVManufacturer | POST /api/maintenance/:id/request |
| 15 | AddMaintenanceLog | passport_tx.go:319 | Service | POST /api/maintenance/:id/log |
| 16 | AddAccidentLog | passport_tx.go:377 | EVManufacturer, Service | POST /api/maintenance/:id/accident |
| 17 | RequestAnalysis | passport_tx.go:430 | EVManufacturer | POST /api/analysis/:id/request |
| 18 | SubmitAnalysisResult | passport_tx.go:474 | Service | POST /api/analysis/:id/result |
| 19 | SetRecycleAvailability | passport_tx.go:540 | Service, Regulator | PUT /api/recycling/:id/availability |
| 20 | ExtractMaterials | passport_tx.go:580 | Regulator | POST /api/recycling/:id/extract |
| 21 | DisposeBattery | passport_tx.go:631 | Regulator | POST /api/recycling/:id/dispose |

### BMU (bmu_tx.go, query.go)

| # | 함수 | 위치 | Allowed MSP | UI/agent 호출 |
|---|------|------|-------------|---------------|
| 22 | RecordBMUData | bmu_tx.go:15 | Manufacturer, EVManufacturer | POST /api/bmu/data |
| 23 | InvalidateBMURecord | bmu_tx.go:171 | Manufacturer, Regulator | POST /api/bmu/invalidate/:id |
| 24 | ResetFCForDID | bmu_tx.go:310 | Manufacturer, Regulator | (UI/agent 라우트 없음) |
| 25 | QueryBMURecordsByPassport | query.go:154 | RBAC-filtered | GET /api/bmu/records/:passportId |

### Verification (vc_tx.go)

| # | 함수 | 위치 | Allowed MSP | UI/agent 호출 |
|---|------|------|-------------|---------------|
| 26 | UpdateRegulatoryVerification | vc_tx.go:255 | Regulator | PUT /api/passports/:id/regulatory-verification |
| 27 | VerifyPhysicalHistory | vc_tx.go:325 | Manufacturer, Regulator | PUT /api/passports/:id/physical-verification |

### VC (vc_tx.go, query.go)

| # | 함수 | 위치 | Allowed MSP | UI/agent 호출 |
|---|------|------|-------------|---------------|
| 28 | IssueCredential | vc_tx.go:16 | per-credType (credTypeIssuers map) | POST /api/vc/issue |
| 29 | RevokeCredential | vc_tx.go:95 | issuer or Regulator | POST /api/vc/revoke |
| 30 | VerifyCredentialStatus | vc_tx.go:145 | All | GET /api/vc/verify/:id |
| 31 | LogCredentialVerification | vc_tx.go:197 | All | POST /api/vc/verify-log |
| 32 | RequestCredentialIssuance | vc_tx.go:449 | All (with passport access) | POST /api/vc/request |
| 33 | ApproveCredentialIssuance | vc_tx.go:518 | targetIssuerMsp or Regulator | POST /api/vc/request/:id/approve |
| 34 | RejectCredentialIssuance | vc_tx.go:566 | targetIssuerMsp or Regulator | POST /api/vc/request/:id/reject |
| 35 | QueryCredential | vc_tx.go:619 | RBAC-filtered | GET /api/vc/:id |
| 36 | GetCredentialHistory | vc_tx.go:649 | RBAC-filtered | GET /api/vc/:id/history |
| 37 | QueryIssuers | vc_tx.go:400 | Regulator | GET /api/vc/issuers |
| 38 | QueryCredentialTypesByIssuer | vc_tx.go:421 | self or Regulator | GET /api/vc/issuers/:msp/types |
| 39 | QueryCredentialsByPassport | query.go:355 | RBAC-filtered | GET /api/vc/passport/:id |
| 40 | QueryCredentialsByHolder | query.go:420 | Manufacturer, Regulator | GET /api/vc/holder/:did |
| 41 | QueryCredentialsByType | query.go:473 | All (filtered by issuer) | GET /api/vc/type/:type |
| 42 | QueryRevokedCredentials | query.go:545 | Regulator | GET /api/vc/revoked/list |
| 43 | QueryVerificationsByCredential | query.go:619 | RBAC-filtered | GET /api/vc/verify-log/:id |
| 44 | QueryVerificationsByVerifier | query.go:693 | Regulator | GET /api/vc/verifier/:did/history |

### 등록 (main.go)

`main.go:10`은 contractapi.NewChaincode(&PassportContract{})로 모든 export method를 자동 등록. 누락 없음.

---

## 2. UI/agent 액션 → chaincode 매핑 종합

| UI 액션 (페이지) | HTTP route | chaincode 함수 | 상태 |
|----------------|------------|---------------|------|
| 여권 생성 (PassportsPage.tsx:245) | POST /api/passports | CreateBatteryPassport | ✅ |
| 여권 목록 (PassportsPage.tsx:113) | GET /api/passports | QueryPassportsWithPagination | ✅ |
| 여권 조회 (PassportDetailPage.tsx:105) | GET /api/passports/:id | QueryPassport | ✅ |
| 여권 이력 (PassportDetailPage 추정) | GET /api/passports/:id/history | GetPassportHistory | ✅ |
| 차량 바인딩 (PassportDetailPage.tsx:184) | PUT /api/passports/:id/bind | BindToVehicle | ✅ |
| 원자재 연결 | POST /api/passports/:id/materials | LinkRawMaterials | ✅ |
| 정정 (PassportDetailPage.tsx:203) | POST /api/passports/:id/correct | CorrectPassportData | ✅ |
| 정정 이력 | GET /api/passports/:id/corrections | QueryCorrectionHistory | ✅ |
| 규제 검증 (PassportDetailPage.tsx:215) | PUT /api/passports/:id/regulatory-verification | UpdateRegulatoryVerification | ✅ |
| 물리 검증 (PassportDetailPage.tsx:220) | PUT /api/passports/:id/physical-verification | VerifyPhysicalHistory | ✅ |
| 정비 요청 (MaintenancePage.tsx:239) | POST /api/maintenance/:id/request | RequestMaintenance | ✅ |
| 정비 완료 (MaintenancePage.tsx:253) | POST /api/maintenance/:id/log | AddMaintenanceLog | ✅ |
| 사고 등록 (MaintenancePage.tsx:267) | POST /api/maintenance/:id/accident | AddAccidentLog | ✅ |
| 분석 요청 (RecyclingPage.tsx:192) | POST /api/analysis/:id/request | RequestAnalysis | ✅ |
| 분석 결과 (RecyclingPage.tsx:207) | POST /api/analysis/:id/result | SubmitAnalysisResult | ✅ |
| 재활용 가능 (RecyclingPage.tsx:229) | PUT /api/recycling/:id/availability | SetRecycleAvailability | ✅ |
| 소재 추출 (RecyclingPage.tsx:249) | POST /api/recycling/:id/extract | ExtractMaterials | ✅ |
| 폐기 (RecyclingPage.tsx:265) | POST /api/recycling/:id/dispose | DisposeBattery | ✅ |
| 원자재 등록 (MaterialsPage.tsx:123) | POST /api/materials | RegisterRawMaterial | ✅ |
| 원자재 조회 (MaterialsPage.tsx:51) | GET /api/materials | QueryRawMaterials | ✅ |
| BMU 데이터 수신 | POST /api/bmu/data | RecordBMUData | ✅ |
| BMU 조회 (BmuDataPage.tsx:127) | GET /api/bmu/records/:passportId | QueryBMURecordsByPassport | ✅ |
| BMU 무효화 | POST /api/bmu/invalidate/:recordId | InvalidateBMURecord | ✅ |
| VC 발급 (PassportDetailPage.tsx:205) | POST /api/vc/issue | IssueCredential | ✅ |
| VC 폐기 (PassportDetailPage.tsx:213) | POST /api/vc/revoke | RevokeCredential | ✅ |
| VC 검증 | GET /api/vc/verify/:id | VerifyCredentialStatus | ✅ |
| VC 검증 로그 | POST /api/vc/verify-log | LogCredentialVerification | ✅ |
| VC 발급 요청 (PassportDetailPage.tsx:207) | POST /api/vc/request | RequestCredentialIssuance | ✅ |
| VC 발급 승인 (PassportDetailPage.tsx:209) | POST /api/vc/request/:id/approve | ApproveCredentialIssuance | ✅ |
| VC 발급 거부 (PassportDetailPage.tsx:211) | POST /api/vc/request/:id/reject | RejectCredentialIssuance | ✅ |
| VC 조회/이력 | GET /api/vc/:id, /api/vc/:id/history | QueryCredential, GetCredentialHistory | ✅ |
| VC 발급기관 (PassportDetailPage.tsx:142) | GET /api/vc/issuers | QueryIssuers | ✅ |
| VC 타입 by issuer (PassportDetailPage.tsx:146) | GET /api/vc/issuers/:msp/types | QueryCredentialTypesByIssuer | ✅ |
| VC by passport (PassportDetailPage.tsx:135) | GET /api/vc/passport/:id | QueryCredentialsByPassport | ✅ |
| VC by holder/type/revoked | GET /api/vc/{holder,type,revoked/list} | QueryCredentialsByHolder/Type/Revoked | ✅ |
| VC 검증 이력 (per cred / verifier) | GET /api/vc/verify-log/:id, /verifier/:did/history | QueryVerificationsByCredential/Verifier | ✅ |
| HTTP API 감사 로그 (AuditLogPage.tsx:116) | GET /api/audit | **HTTP middleware (server.js:62)** — chaincode 아님 | ✅ middleware 전용 |

**커버리지: UI/agent가 호출하는 모든 chaincode action(44개) → chaincode 함수가 존재함. 미지원 액션 0건.**

agent route ↔ chaincode args 개수/순서도 모두 일치 (예: `BindToVehicle`은 agent에서 5-arg([id,vin,installDate,evMfg,evCountry], passport.routes.js:136-138) → chaincode 5-arg(passport_tx.go:198-200)). 명백한 시그니처 미스매치 없음.

---

## 3. 부분 지원 — 부족한 validation/RBAC/history

### 3.1 RBAC 부족 (ownership/access check 누락)

| ID | 위치 | 갭 | 영향 |
|----|------|-----|------|
| GAP-RBAC-1 | passport_tx.go:678 `CorrectPassportData` | `fieldCorrectors`로 MSP 종류만 검증, 호출자가 해당 여권의 `CreatorMSP`/`EvBinderMSP`인지 확인 안 함. **Manufacturer A가 Manufacturer B의 여권을 정정 가능. EVManufacturer A가 EVManufacturer B가 바인딩한 차량의 vin/evManufacturer 필드를 정정 가능.** correctionLog 에 originalValue/correctedBy 가 남기는 하지만, 사후 검출이라 prevention 불가. | 보안/무결성 |
| GAP-RBAC-2 | passport_tx.go:264 `RequestMaintenance` | EVManufacturerMSP 체크만 있고 `passport.EvBinderMSP == msp` 검증 없음. 임의 EVManufacturer가 다른 회사 차량을 MAINTENANCE 상태로 전이 가능. | 가용성/혼란 유발 |
| GAP-RBAC-3 | passport_tx.go:430 `RequestAnalysis` | 위와 동일. 임의 EVManufacturer가 ANALYSIS로 전이 가능. | 가용성 |
| GAP-RBAC-4 | passport_tx.go:377 `AddAccidentLog` | EVManufacturer/Service MSP 체크만 있고 ownership 검증 없음. 임의 사고 로그 삽입 가능. | 데이터 위변조 |
| GAP-RBAC-5 | vc_tx.go:16 `IssueCredential` | `credTypeIssuers` 매핑(BATTERY_HEALTH/MAINTENANCE→Service)만 검증, 발급자가 해당 passport에 access 있는지 확인 안 함 (`checkPassportAccess` 미호출). Service A가 Service B만 정비한 passport에 대해 BATTERY_HEALTH VC 임의 발급 가능. | 신뢰성 |
| GAP-RBAC-6 | passport_tx.go:319 `AddMaintenanceLog` | ServiceMSP 체크만 있고 정비 요청자(`RequestMaintenance`로 enqueue된 service)와의 매핑 없음. 임의 Service가 다른 Service 작업을 가로채기 가능. (다중 Service 협업 의도라면 acceptable.) | 운영 일관성 |

### 3.2 Validation 부족

| ID | 위치 | 갭 | 영향 |
|----|------|-----|------|
| GAP-VAL-1 | passport_tx.go:103-131 `CreateBatteryPassport` | `cellCount`, `weight`, `totalEnergy`, `expectedLifespan` 등 숫자가 음수일 때 `strconv.Atoi`/`ParseFloat`는 통과. 0 이상 검증 없음. | 데이터 품질 |
| GAP-VAL-2 | passport_tx.go:500-513 `SubmitAnalysisResult` | `soh`/`soce` 범위 검증 없음 (음수, 100 초과 모두 허용). UI 는 % 로 표시. | 데이터 품질 |
| GAP-VAL-3 | passport_tx.go:91 `CreateBatteryPassport` | mandatory check가 `passportId,batteryId,did`만. agent route는 추가로 `serialNumber`도 요구하지만 chaincode 단에선 빈 값 허용. | 데이터 일관성 |
| GAP-VAL-4 | passport_tx.go:319/377 `AddMaintenanceLog`, `AddAccidentLog` | `type`/`severity`가 free-text. enum 강제 없음. UI는 자유 입력. | 분석/통계 일관성 |
| GAP-VAL-5 | bmu_tx.go:27 `RecordBMUData` | `timestamp`가 비어있지만 않으면 통과. ISO-8601 등 포맷 검증 없음. agent가 ISO 문자열을 보내지만 chaincode가 contract 보장 안 함. | 시간 정합성 |
| GAP-VAL-6 | vc_tx.go:42 `IssueCredential` | `dataHash`가 비어있지만 않으면 통과. 64-char hex(sha256) 등 길이/문자집합 검증 없음. | VC 무결성 |
| GAP-VAL-7 | passport_tx.go:580 `ExtractMaterials` | `recyclingRates` 값 범위(0-1 또는 0-100) 검증 없음. 음수 / 1000 모두 허용. | 데이터 품질 |
| GAP-VAL-8 | passport_tx.go:540 `SetRecycleAvailability` | 호출 시 `passport.Status == DISPOSED`여도 통과. 폐기된 여권의 가용 플래그 변경 가능. | 상태 일관성 |

### 3.3 이벤트/히스토리 부족

| ID | 갭 | 영향 |
|----|-----|------|
| GAP-EVT-1 | chaincode 전체에서 `SetEvent` 호출 0건 (grep으로 확인). cloud-agent는 Fabric block listener로 writeset을 받아 동작하므로 운영상 작동하나, 외부 구독자/MCP 등이 contract event 명으로 필터하려면 사용 불가. | 확장성 |
| GAP-EVT-2 | BMU record key에 대한 `GetHistoryForKey` 래퍼가 없음. `InvalidateBMURecord` 후 원본 상태 회수가 chaincode API로 노출되지 않음. (passport 키와 credential 키만 history 노출.) | 감사 |
| GAP-EVT-3 | `CredentialRequest` 키(승인/거부 상태 변천)에 대한 history query 래퍼 없음. block event로만 추적 가능. | 감사 |
| GAP-EVT-4 | `AccidentLogs`/`MaintenanceLogs` 전용 query가 없어 UI는 항상 passport 전체를 가져와 임베디드 배열을 읽어야 함. 무한히 자라는 배열로 인한 페이로드 비대화 위험. | 성능/UX |

---

## 4. 미지원 — UI/backend 액션 대비 누락 chaincode 기능

**없음.** UI/agent가 호출하는 모든 mutation/query에 대응되는 chaincode 함수가 존재한다.

참고:
- `ResetFCForDID` (bmu_tx.go:310)는 chaincode에 존재하지만 agent route가 노출하지 않음(필요 시 추후 노출 — 보안 민감 작업이라 의도적 미공개로 보임).
- `/api/audit`는 chaincode가 아닌 HTTP middleware(`bmu-agent/middleware/audit.js`)로 구현. **이는 AuditLogPage가 보는 "API 호출 감사"이고, 블록체인 거래 감사가 아니다.** 블록체인 거래 감사는 `GetPassportHistory` / `GetCredentialHistory` / `QueryCorrectionHistory` 가 담당.

---

## 5. 수정 필요 우선순위

### P0 (보안/무결성, 즉시 수정 권고)

- **P0-1 GAP-RBAC-1**: `CorrectPassportData`에 ownership 체크 추가.
  - Manufacturer 필드 정정: `passport.CreatorMSP == msp` 또는 `msp == Regulator` 만 허용.
  - EVManufacturer 필드(vin/installDate/evManufacturer/evAssemblyCountry) 정정: `passport.EvBinderMSP == msp` 또는 `msp == Regulator` 만 허용.
  - 현재는 fieldCorrectors map의 MSP 종류만 본다(passport_tx.go:686-692). 후속 정정자가 임의 여권을 수정할 수 있어 attribution이 깨진다.
  - 수정 위치: `passport_tx.go` `CorrectPassportData` 내 `requireMSP` 호출 직후 또는 `getClientMSP` 직후에 ownership 체크 분기 추가.

### P1 (기능적 갭, 다음 스프린트)

- **P1-1 GAP-RBAC-2/3 (RequestMaintenance, RequestAnalysis)**: `passport.EvBinderMSP == msp` 검증 추가. 미바인딩(`MANUFACTURED`) 단계에서는 허용하지 않으므로 ownership만 체크하면 됨.
- **P1-2 GAP-RBAC-4 (AddAccidentLog)**: 호출자가 `EvBinderMSP` 또는 과거 정비 이력을 가진 Service인지 확인 (이미 `checkPassportAccess`에 동일 로직 존재 — 이를 재사용).
- **P1-3 GAP-RBAC-5 (IssueCredential)**: passport 존재 확인 후 `checkPassportAccess(passport)` 호출 추가. `RequestCredentialIssuance`는 이미 호출(vc_tx.go:483)하므로 일관성 측면.
- **P1-4 GAP-VAL-1 (CreateBatteryPassport 음수 차단)**: `cellCount < 0`, `weight < 0`, `totalEnergy < 0`, `expectedLifespan < 0` 명시 검증.
- **P1-5 GAP-VAL-2 (SubmitAnalysisResult 범위)**: `soh`/`soce`는 `0 ≤ x ≤ 100` 검증. `remainingLifeCycle ≥ 0`.

### P2 (강화/하드닝, 백로그)

- **P2-1 GAP-RBAC-6 (AddMaintenanceLog 매핑)**: 정비 요청자–수행자 매핑 정책 결정 (단일 Service vs 다중 Service). 결정 후 chaincode/agent 양쪽에 반영.
- **P2-2 GAP-VAL-3 (CreateBatteryPassport mandatory)**: `serialNumber` chaincode-side mandatory 추가 (agent에서 이미 강제하므로 priority 낮음).
- **P2-3 GAP-VAL-4/5/6**: enum/포맷 검증 (maintenance type, severity, ISO-8601 timestamp, hex64 dataHash).
- **P2-4 GAP-VAL-7 (ExtractMaterials)**: `recyclingRates` 값 범위 검증 (예: `0 ≤ rate ≤ 1`).
- **P2-5 GAP-VAL-8 (SetRecycleAvailability)**: `passport.Status != DISPOSED` 가드.
- **P2-6 GAP-EVT-1**: 주요 mutation (Issue/Revoke/Regulatory/Physical/Dispose 등)에 `SetEvent` 추가. cloud-agent block event 의존을 줄이고 외부 통합(MCP, Webhook) 여지 확보.
- **P2-7 GAP-EVT-2/3**: `GetBMURecordHistory(recordId)`, `GetCredentialRequestHistory(requestId)` 래퍼 추가.
- **P2-8 GAP-EVT-4**: `QueryAccidentsByPassport(passportId, pageSize, bookmark)` 별도 페이지네이션 query — 임베디드 배열 비대화 대비.

---

## 6. 검증되지 않은 영역(Out of Scope, 참고)

- **bmu-agent 자체 검증 로직**: 이 보고서는 chaincode 보장만 다룬다. agent route가 추가 검증을 하더라도 chaincode가 enforcer가 되는 게 정석. 현재 agent route는 대부분 type-check 수준.
- **passport-network 인프라**: registerEnroll.sh, configtx.yaml, 채널/MSP 설정 — 본 검증에서 제외 (별도 벤치마크 / 운영 wiki 참조).
- **embedded BMU 서명 로직**: `services/did.service.js`의 Ed25519 검증은 agent 영역으로 chaincode 외부.
- **frontend 시각/레이아웃 변경 (velkern-brand-assets)**: API 계약 변경 없음을 확인. UI 수정으로 인한 chaincode 영향은 없음.

---

## 7. 결론

UI/bmu-agent가 노출하는 배터리 여권 기능 44종 모두에 대해 chaincode 함수가 존재하고 호출 시그니처도 일치한다. **기능 구현 자체의 미지원은 0건.**

실질적 갭은 다음 두 축에 집중된다:

1. **소유권/접근 통제 부족 (P0/P1)**: MSP 종류 검증은 있으나 "어느 회사의 여권인지"를 확인하지 않는 mutation 함수가 다수. CorrectPassportData가 가장 위험. RequestMaintenance/RequestAnalysis/AddAccidentLog/IssueCredential 도 동일 패턴.
2. **Deterministic 입력 검증 부족 (P1/P2)**: 빈 값 검사는 일관되지만 음수/범위/enum/포맷 강제가 부족. agent에서 일부 보강하나 chaincode 단의 강제력이 약함.

블록체인 세션 작업 권고:
- 다음 스프린트에 P0-1만이라도 chaincode patch + caliper regression. 나머지는 P1/P2를 묶어 별도 PR.
- 새 기능을 추가하기 전에 이 갭들을 먼저 닫는 것이 ledger 무결성 측면에서 우선.

---

## 8. 부록 — 참고한 파일

| 영역 | 파일 |
|------|------|
| chaincode (수정 대상) | `chaincode/passport-contract/{main.go,types.go,helpers.go,passport_tx.go,bmu_tx.go,vc_tx.go,query.go}` |
| bmu-agent route (참조) | `bmu-agent/routes/{passport,bmu,maintenance,analysis,recycling,material,vc}.routes.js`, `bmu-agent/server.js` |
| bmu-agent service (참조) | `bmu-agent/services/{fabric,vc}.service.js` |
| UI page (참조) | `webapp/frontend-react/src/pages/{PassportDetailPage,PassportsPage,MaintenancePage,RecyclingPage,MaterialsPage,BmuDataPage,AuditLogPage}.tsx` |

근거 인용은 본문에서 `파일:라인` 형식으로 표시.
