---
title: chaincode 에러 메시지 contract
date: 2026-04-27
session: blockchain
scope: chaincode/passport-contract
audience: bmu-agent, frontend (UI 토스트 매핑 기준)
status: stable contract — 변경 시 본 문서 + minor version bump 필수
---

# chaincode 에러 메시지 contract

UI 세션의 토스트 매핑 / agent route 의 HTTP status 분기를 위한 **chaincode 에러 메시지 안정성 contract**. 본 문서가 명시한 prefix 와 카테고리 매핑은 향후 patch 에서도 유지되며, 변경이 필요하면 (a) 본 문서를 먼저 업데이트하고 (b) 새 minor version 으로 알린다.

근거: `chaincode/passport-contract/{passport_tx,bmu_tx,vc_tx,query,helpers}.go` 전수 grep (`fmt.Errorf` 138 unique templates).

---

## 1. 안정성 약속

| 보장 수준 | 대상 | 정책 |
|---------|------|------|
| **stable prefix** | 본 문서 §3 의 카테고리별 prefix (대소문자, 콜론 위치 포함) | UI/agent 의 매핑 키. 변경 시 사전 공유 + 본 문서 갱신 필수 |
| **stable suffix structure** | placeholder 위치(`%s`/`%d`/`%f`) 와 의미 | placeholder 추가/제거는 breaking. 의미 변경(예: passport id → batch id) 도 breaking |
| **non-stable** | 한국어 번역, 에러 객체의 wrap stack | UI 가 의존하면 안 됨. 에러 분류는 prefix 로만 하되, 번역은 UI 측 dictionary 로 |
| **patch-allowed** | 새 prefix 추가 (기존 prefix 삭제 없이) | UI 에선 fallback 으로 INTERNAL/UNKNOWN 처리하도록 권고 |

**즉 UI/agent 가 의존해도 되는 것은 §3 의 prefix 패턴 + 카테고리 매핑이다.**

---

## 2. HTTP status 매핑 (agent route 권고)

agent route 가 chaincode 에러 메시지의 prefix 를 보고 다음 status code 로 매핑하면 UI 가 status 분기 가능:

| 카테고리 | HTTP status | 의미 |
|---------|-------------|------|
| AUTHZ | 403 Forbidden | RBAC/ownership 거부 |
| VAL | 400 Bad Request | 입력 검증 실패 |
| NOT_FOUND | 404 Not Found | 참조 entity 없음 |
| CONFLICT | 409 Conflict | 이미 존재 / 잘못된 status 전이 |
| PRECONDITION | 409 Conflict | 상태 가드 실패 (alt: 412 Precondition Failed) |
| INTERNAL | 500 Internal Server Error | Fabric/marshalling 실패 (코드 버그 가능) |

agent 측 매핑 함수 예시 (참고용, 실제 구현은 Passport 세션):

```js
function mapChaincodeError(msg) {
  if (msg.startsWith('access denied:') || msg.startsWith('MSP ') || msg.includes('not authorized'))
    return { status: 403, category: 'AUTHZ' };
  if (/(does not exist|no passport found)/.test(msg))
    return { status: 404, category: 'NOT_FOUND' };
  if (/(already (exists|revoked|disposed|invalidated|bound)|is not pending|already linked)/.test(msg))
    return { status: 409, category: 'CONFLICT' };
  if (/passport status must be|cannot add maintenance log|extract requires|has not been activated yet/.test(msg))
    return { status: 409, category: 'PRECONDITION' };
  if (/(must not be empty|must be non-negative|must be in \[|invalid |unknown |field '.*' is not correctable|DID mismatch|fc \d+ must be greater)/.test(msg))
    return { status: 400, category: 'VAL' };
  return { status: 500, category: 'INTERNAL' };
}
```

### 2.1 Fabric wrap strip 권고 패턴 (informational)

Fabric SDK 가 chaincode 에러를 gateway → endorsement → chaincode 다단으로 감싸면서 client 가 받는 메시지에 wrap prefix 가 1~여러 겹 붙는다. wiki §2 의 매핑 함수는 unwrap 된 chaincode 본 메시지에 대해서만 동작하므로, 매핑 직전에 wrap strip 이 필요하다.

ed2b977 (Stage 1) `bmu-agent/middleware/chaincode-error.js` 가 채택한 wrap prefix 4종 (다른 클라이언트/agent 도 동일 패턴 권고):

```js
const FABRIC_WRAP_PREFIXES = [
  'Failed to evaluate transaction: ',
  'Failed to submit transaction: ',
  'transaction returned with failure: ',
  'error in simulation: ',
];
```

다중 wrap 가능성 (예: `Failed to submit transaction: error in simulation: <chaincode msg>`) 때문에 **반복 strip 권고**:

```js
function unwrapFabricError(msg) {
  let unwrapped = msg;
  let changed = true;
  while (changed) {
    changed = false;
    for (const prefix of FABRIC_WRAP_PREFIXES) {
      if (unwrapped.startsWith(prefix)) {
        unwrapped = unwrapped.slice(prefix.length);
        changed = true;
      }
    }
  }
  return unwrapped;
}
```

이 부록은 informational — 진실 공급원은 `bmu-agent/middleware/chaincode-error.js` 이고 Passport 세션이 유지보수한다. wrap prefix 가 새로 발견되거나 Fabric SDK 업그레이드로 변경되면 미들웨어와 본 부록 동시 갱신.

---

## 3. 카테고리별 stable prefix 인벤토리

### 3.1 AUTHZ (403)

| Prefix | Placeholder 의미 | 발생 함수 |
|--------|----------------|-----------|
| `access denied: MSP {msp} not in allowed list {[...]}` | 호출자 MSP, 허용 MSP 목록 | requireMSP (전 함수 공통) |
| `access denied: MSP {msp} cannot access passport {passportId}` | 호출자 MSP, 여권 ID | checkPassportAccess |
| `access denied: credential {credentialId} has no accessible passport` | credential ID | checkCredentialAccess |
| `access denied: passport {passportId} was created by {creatorMsp}, caller {msp} cannot correct it` | 여권 ID, 원 발급 MSP, 호출자 MSP | CorrectPassportData (Manufacturer 분기) |
| `access denied: passport {passportId} was bound by {binderMsp}, caller {msp} cannot correct EV fields` | 여권 ID, 바인더 MSP, 호출자 MSP | CorrectPassportData (EVManufacturer 분기) |
| `access denied: passport {passportId} is bound to {binderMsp}, caller {msp} cannot request maintenance` | 여권 ID, 바인더 MSP, 호출자 MSP | RequestMaintenance |
| `access denied: passport {passportId} is bound to {binderMsp}, caller {msp} cannot request analysis` | 여권 ID, 바인더 MSP, 호출자 MSP | RequestAnalysis |
| `access denied: passport {passportId} is bound to {binderMsp}, caller {msp} cannot log accidents` | 여권 ID, 바인더 MSP, 호출자 MSP | AddAccidentLog |
| `access denied: only {targetMsp} or RegulatorMSP can approve this request` | 대상 issuer MSP | ApproveCredentialIssuance |
| `access denied: only {targetMsp} or RegulatorMSP can reject this request` | 대상 issuer MSP | RejectCredentialIssuance |
| `access denied: only issuer ({issuerMsp}) or RegulatorMSP can revoke` | issuer MSP | RevokeCredential |
| `access denied: can only query own issuer types or require RegulatorMSP` | (없음) | QueryCredentialTypesByIssuer |
| `MSP {msp} is not authorized to issue {credType} credentials` | 호출자 MSP, credential 타입 | IssueCredential |
| `MSP not authorized to correct field '{fieldName}': {wrappedMspErr}` | 필드명 + requireMSP wrapped 에러 | CorrectPassportData (필드별 |
| `unknown MSP: {msp}` | 호출자 MSP | buildPassportQuery (default branch) |

UI 매핑 권고: 모두 한국어 "접근 권한이 없습니다" 계열로 통합. 디버그용으로 prefix 유지.

### 3.2 VAL (400) — 입력 검증

#### 3.2.1 빈 값 거부

| Prefix | 발생 함수 |
|--------|-----------|
| `materialId, name, origin must not be empty` | RegisterRawMaterial |
| `passportId, batteryId, did, serialNumber must not be empty` | CreateBatteryPassport |
| `passportId must not be empty` | BindToVehicle |
| `vin must not be empty` | BindToVehicle |
| `passportId, fieldName, newValue, reason must not be empty` | CorrectPassportData |
| `passportId, materialIds must not be empty` | LinkRawMaterials |
| `recordId, passportId, did, dataHash, timestamp must not be empty` | RecordBMUData |
| `recordId and reason must not be empty` | InvalidateBMURecord |
| `did and reason must not be empty` | ResetFCForDID |
| `credentialId, passportId, holderDid, dataHash must not be empty` | IssueCredential |
| `verificationId and credentialId must not be empty` | LogCredentialVerification |
| `requestId, passportId, credType must not be empty` | RequestCredentialIssuance |
| `rejection reason must not be empty` | RejectCredentialIssuance |
| `reason must not be empty` | VerifyPhysicalHistory |
| `signals must not be empty` | VerifyPhysicalHistory |

#### 3.2.2 숫자 범위/타입

| Prefix | 발생 함수 |
|--------|-----------|
| `invalid {fieldName} value: {wrappedErr}` (cellCount/weight/totalEnergy/energyDensity/ratedCapacity/expectedLifespan/carbonFootprint/quantity/fc/soc/voltage/current/temperature/statusFlags/dischargeCycles/soh/soce/remainingLifeCycle) | strconv 파싱 실패 |
| `cellCount must be non-negative, got {value}` | CreateBatteryPassport |
| `weight must be non-negative, got {value}` | CreateBatteryPassport |
| `totalEnergy must be non-negative, got {value}` | CreateBatteryPassport |
| `energyDensity must be non-negative, got {value}` | CreateBatteryPassport |
| `ratedCapacity must be non-negative, got {value}` | CreateBatteryPassport |
| `expectedLifespan must be non-negative, got {value}` | CreateBatteryPassport |
| `carbonFootprint must be non-negative, got {value}` | CreateBatteryPassport |
| `soh must be in [0, 100], got {value}` | SubmitAnalysisResult |
| `soce must be in [0, 100], got {value}` | SubmitAnalysisResult |
| `remainingLifeCycle must be non-negative, got {value}` | SubmitAnalysisResult |
| `fc {fc} must be greater than last valid fc {lastFc} for DID {did}` | RecordBMUData |

#### 3.2.3 enum/format

| Prefix | 발생 함수 |
|--------|-----------|
| `invalid credential type: {credType} (allowed: BATTERY_PASSPORT, BATTERY_HEALTH, MAINTENANCE, COMPLIANCE, RECYCLING)` | IssueCredential, RequestCredentialIssuance |
| `invalid regulatory status: {status} (must be VERIFIED, PARTIAL, PENDING, or FAILED)` | UpdateRegulatoryVerification |
| `unknown signal key: {key} (valid: socMatched, didMatched, vinMatched, fcMatched)` | VerifyPhysicalHistory |
| `field '{fieldName}' is not correctable` | CorrectPassportData |
| `invalid signals JSON: {wrappedErr}` | VerifyPhysicalHistory |
| `invalid evidenceIds JSON: {wrappedErr}` | UpdateRegulatoryVerification |
| `invalid recycledElementContent JSON: {wrappedErr}` | CorrectPassportData |
| `invalid extensionInfo JSON: {wrappedErr}` | CorrectPassportData |
| `invalid recycling rates JSON: {wrappedErr}` | ExtractMaterials |
| `invalid recycling rate for {material}: must be in [0, 1], got {value}` | ExtractMaterials (P2-4) |
| `DID mismatch: passport {passportId} is registered to DID {expectedDid}, not {gotDid}` | RecordBMUData |
| `evidence {credId} is not a valid credential` | UpdateRegulatoryVerification |
| `no new materials to link (all already linked or empty)` | LinkRawMaterials |

### 3.3 NOT_FOUND (404)

| Prefix | 발생 함수 |
|--------|-----------|
| `passport {passportId} does not exist` | 다수 (BindToVehicle 외) |
| `BMU record {recordId} does not exist` | InvalidateBMURecord |
| `credential {credentialId} does not exist` | RevokeCredential, VerifyCredentialStatus, LogCredentialVerification, QueryCredential, GetCredentialHistory, QueryVerificationsByCredential |
| `credential request {requestId} does not exist` | ApproveCredentialIssuance, RejectCredentialIssuance |
| `evidence credential {credId} does not exist` | UpdateRegulatoryVerification |
| `raw material {id} does not exist` | LinkRawMaterials |
| `no passport found for DID {did}` | QueryBatteryByDID |

### 3.4 CONFLICT (409) — 중복 / 상태 충돌

| Prefix | 발생 함수 |
|--------|-----------|
| `passport {passportId} already exists` | CreateBatteryPassport |
| `BMU record {recordId} already exists` | RecordBMUData |
| `BMU record {recordId} is already invalidated` | InvalidateBMURecord |
| `credential {credentialId} already exists` | IssueCredential |
| `credential {credentialId} is already revoked` | RevokeCredential |
| `credential request {requestId} already exists` | RequestCredentialIssuance |
| `credential request {requestId} is not pending, current status: {status}` | ApproveCredentialIssuance, RejectCredentialIssuance |
| `verification {verificationId} already exists` | LogCredentialVerification |
| `raw material {materialId} already exists` | RegisterRawMaterial |
| `passport {passportId} is already disposed` | DisposeBattery |
| `passport {passportId} already bound to VIN {vin}; unbind first` | BindToVehicle |

### 3.5 PRECONDITION (409) — 상태 가드 실패

| Prefix | 발생 함수 |
|--------|-----------|
| `passport status must be MANUFACTURED or ACTIVE, current: {status}` | BindToVehicle |
| `passport status must be ACTIVE for maintenance request, current: {status}` | RequestMaintenance |
| `passport status must be ACTIVE or MAINTENANCE for analysis request, current: {status}` | RequestAnalysis |
| `passport status must be ANALYSIS for result submission, current: {status}` | SubmitAnalysisResult |
| `passport status must be ACTIVE or ANALYSIS or RECYCLING for recycle availability change, current: {status}` | SetRecycleAvailability (P2-5) |
| `cannot add maintenance log: passport status must be MAINTENANCE or ACTIVE, current: {status}` | AddMaintenanceLog |
| `extract requires ACTIVE or ANALYSIS status, current: {status}` | ExtractMaterials |
| `passport {passportId} has not been activated yet` | DisposeBattery |

### 3.6 INTERNAL (500) — 내부/Fabric 오류

`failed to {verb} ...:` 로 시작하는 모든 메시지는 INTERNAL 로 매핑한다. 카테고리:
- `failed to read|check|store|update|delete {entity}: ...` — Fabric state DB 접근 실패
- `failed to marshal|unmarshal {entity}: ...` — JSON 직렬화 실패 (코드 버그 가능성)
- `failed to query {entity}: ...` — CouchDB 쿼리 실패
- `failed to build query: ...` — Mango selector 빌드 실패
- `failed to get client MSP: ...` — Fabric MSP 추출 실패
- `failed to get (tx )?timestamp: ...`, `tx timestamp is nil` — txTimestamp 실패
- `failed to create lastFc composite key: ...` — composite key API 실패
- `failed to get history: ...`, `failed to get credential history: ...` — GetHistoryForKey 실패

UI 권고: 사용자에겐 "일시적 오류" 표시 + 디버그 콘솔로 raw 메시지 노출.

**모든 사용자 입력 JSON 파싱 실패는 `invalid XXX JSON:` 패턴으로 통일**되어 VAL 로 분류된다 (signals/evidenceIds/recycledElementContent/extensionInfo/recyclingRates 모두 §3.2.3 참조). `failed to ...` prefix 는 INTERNAL 만 발생.

---

## 4. UI 토스트 한국어 매핑 (참고용 1차 dictionary)

UI 세션이 자체 dictionary 를 만들겠지만 1차 시안:

| 카테고리 | 토스트 메시지 |
|---------|-------------|
| AUTHZ | "이 작업에 대한 권한이 없습니다." (디버그 콘솔에 상세 reason) |
| VAL — 빈 값 | "필수 입력값이 누락되었습니다: {placeholder list}" |
| VAL — 숫자 범위 | "{필드명} 값이 허용 범위를 벗어났습니다." |
| VAL — enum | "{필드명}: 허용된 값이 아닙니다. ({allowed list})" |
| NOT_FOUND | "요청한 {entity}을(를) 찾을 수 없습니다." |
| CONFLICT — 중복 | "이미 존재하는 {entity}입니다." |
| CONFLICT — 상태 | "현재 상태에서는 이 작업을 수행할 수 없습니다." |
| PRECONDITION | "여권 상태가 작업 조건과 맞지 않습니다. (현재: {status})" |
| INTERNAL | "일시적인 오류가 발생했습니다. 잠시 후 다시 시도해 주세요." |

---

## 5. 향후 chaincode patch 가 본 contract 에 영향 미칠 때

블록체인 세션 후속 작업 (특히 P2 백로그) 진행 시 본 문서를 다음 규칙으로 갱신:

| 변경 종류 | 절차 |
|----------|------|
| 새 prefix 추가 (기존 미변경) | 본 문서 §3 해당 카테고리 표에 추가. UI 측 매핑 함수는 fallback 처리되므로 호환 깨지지 않음 |
| 기존 prefix 삭제 | breaking. 사전 공지 + UI 세션과 머지 타이밍 합의 |
| 기존 prefix 의 placeholder 추가 | breaking. UI 가 정규식으로 파싱 시 깨질 수 있음. UI 매핑이 prefix 만 본다면 호환 |
| 카테고리 변경 (예: VAL → AUTHZ) | breaking. HTTP status 분기가 깨짐 |
| 한국어 번역 변경 | non-breaking. 본 문서 §4 만 갱신 |

### 5.1 세션 간 sync 책임 분담 (2026-04-27 합의)

| 책임 | 세션 | 대상 |
|------|------|------|
| chaincode 패치와 wiki §2 매핑 정규식 + §3 prefix 표 동시 갱신 | **blockchain** | chaincode/passport-contract/*.go + 본 문서 §2/§3 |
| `bmu-agent/middleware/chaincode-error.js` 의 정규식 sync | **Passport** | wiki §2 의 코드 블록을 미들웨어로 이식 |
| `webapp/frontend-react/src/lib/chaincodeErrorMessages.ts` (한국어 dictionary) sync | **Passport** | wiki §4 의 한국어 매핑 |

운영 규칙:
1. blockchain 세션이 chaincode mutation 중 새 prefix 를 추가/삭제하면, **같은 commit 에 wiki §2 정규식 patch 와 §3 prefix 표 갱신을 묶는다**. wiki 가 single source of truth.
2. breaking 변경 (prefix 삭제 / placeholder 추가 / 카테고리 변경) 의 경우 commit 메시지에 `BREAKING: chaincode error prefix changed — agent middleware sync required` 표식을 명시한다. Passport 세션이 grep 으로 인지 가능.
3. Passport 세션은 wiki §2 commit SHA 를 `bmu-agent/middleware/chaincode-error.js` 헤더 주석에 `// synced from chaincode-error-contract.md @<SHA>` 로 기록 권고.
4. non-breaking (새 prefix 추가) 은 Passport 세션의 다음 정기 sync 시점에 일괄 반영해도 무방. fallback 으로 INTERNAL/UNKNOWN 처리되므로 동작 안전.

---

## 6. 부록 — 전체 에러 메시지 인벤토리 추출 명령

```bash
grep -hoE 'fmt\.Errorf\("[^"]*"' chaincode/passport-contract/*.go \
  | sed 's/fmt.Errorf("//; s/"$//' \
  | sort -u
```

본 문서 작성 시점(2026-04-27) 기준 138 unique templates. 차후 patch 시 동일 명령으로 diff 검증 권고.

---

## 7. 관련 문서

- [[blockchain/chaincode-contract-audit-2026-04-27|chaincode 계약 감사 보고서 (2026-04-27)]]
- [[blockchain/activity-log|활동 로그]]
