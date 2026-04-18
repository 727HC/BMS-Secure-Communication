---
title: "Passport 세션 handoff — 체인코드 v1.8 변경사항"
aliases: [passport-session-handoff]
date: 2026-04-13
tags: [handoff, passport, chaincode, v1.8]
doc_type: handoff
---
# Passport 세션 handoff — 체인코드 v1.8

## 개요

블록체인 세션에서 체인코드 v1.8을 배포합니다.
보안 수정 11건 + 국가과제 갭 필 (struct 확장 + 함수 4개 + CouchDB 인덱스 2개) 포함.
Passport 세션에서 bmu-agent API 라우트 추가 및 기존 코드 수정이 필요합니다.

---

## 1. 신규 체인코드 함수 — API 라우트 추가 필요 (4개)

### 1-1. QueryVerificationsByCredential
- **용도**: VC 검증 이력 조회 (credential별)
- **파라미터**: `credentialId, pageSizeStr, bookmark`
- **RBAC**: credential의 연관 passport 접근 권한 (checkCredentialAccess)
- **반환**: `{records: [{verificationId, credentialId, verifierDid, verifierMsp, result, timestamp}], bookmark, count}`
- **권장 라우트**: `GET /api/vc/verify-log/:credentialId`
- **미들웨어**: `authenticateToken` 필수, `req.user` 전달

### 1-2. QueryVerificationsByVerifier
- **용도**: 검증자별 검증 이력 조회
- **파라미터**: `verifierDid, pageSizeStr, bookmark`
- **RBAC**: RegulatorMSP only
- **반환**: 동일 PaginatedVerificationResult
- **권장 라우트**: `GET /api/vc/verifier/:verifierDid/history`
- **미들웨어**: `authenticateToken` + `requireMSP(MSP.REGULATOR)`

### 1-3. UpdateRegulatoryVerification
- **용도**: 규제 검증 상태 업데이트
- **파라미터**: `passportId, status, evidenceIdsJSON`
- **status 값**: `VERIFIED | PARTIAL | PENDING | FAILED`
- **evidenceIdsJSON**: `["VC-001","VC-002"]` (존재하는 VC credentialId 배열, docType 검증됨)
- **RBAC**: RegulatorMSP only
- **권장 라우트**: `PUT /api/passports/:id/regulatory-verification`
- **미들웨어**: `authenticateToken` + `requireMSP(MSP.REGULATOR)`

### 1-4. VerifyPhysicalHistory
- **용도**: 실물-이력 일치 검증
- **파라미터**: `passportId, signalsJSON, reason`
- **signalsJSON**: `{"socMatched":true,"didMatched":true,"vinMatched":false,"fcMatched":true}`
- **허용 키**: `socMatched`, `didMatched`, `vinMatched`, `fcMatched` (고정, 다른 키 거부)
- **자동 판정**: 전부 true -> VERIFIED, 하나라도 false -> MISMATCH
- **RBAC**: ManufacturerMSP + RegulatorMSP
- **권장 라우트**: `PUT /api/passports/:id/physical-verification`
- **미들웨어**: `authenticateToken` + `requireMSP(MSP.MANUFACTURER, MSP.REGULATOR)`

---

## 2. 신규 여권 필드 — QueryPassport 응답에 자동 포함

아래 필드가 `/api/passports/:id` 응답에 추가됩니다. 프론트에서 바로 사용 가능.

```json
{
  "manufacturingProcess": "",
  "disposalMethod": "",
  "recycledElementContent": {},
  "extensionInfo": {},
  "regulatoryVerificationStatus": "",
  "regulatoryVerifiedAt": "",
  "regulatoryVerifier": "",
  "regulatoryEvidenceIds": [],
  "physicalHistoryVerification": null
}
```

### 메타 필드 설정 방법
`POST /api/passports/:id/correct` (기존 CorrectPassportData API) 사용:

```json
// manufacturingProcess 설정
{"fieldName": "manufacturingProcess", "newValue": "전극 조립 > 활성화 > 최종 검사", "reason": "초기 등록"}

// disposalMethod 설정
{"fieldName": "disposalMethod", "newValue": "지정 회수 후 습식 재활용 공정", "reason": "초기 등록"}

// recycledElementContent 설정 (JSON string)
{"fieldName": "recycledElementContent", "newValue": "{\"cobalt\":12.1,\"lithium\":18.4,\"nickel\":9.7,\"lead\":0}", "reason": "초기 등록"}

// extensionInfo 설정 (JSON string)
{"fieldName": "extensionInfo", "newValue": "{\"factorySite\":\"Busan Plant 2\",\"line\":\"LFP-03\"}", "reason": "초기 등록"}
```

---

## 3. 기존 코드 수정 필요 사항

### 3-1. VC 엔드포인트 인증 추가 (보안)
- `vc.routes.js:120` — `GET /verify/:credentialId` → `authenticateToken` 추가 + `req.user` 전달
- `vc.routes.js:159` — `GET /:credentialId` → `authenticateToken` 추가 + `req.user` 전달
- `vc.routes.js:227` — `GET /:credentialId/history` → `authenticateToken` 추가 + `req.user` 전달

체인코드 v1.8부터 `QueryCredential`, `GetCredentialHistory`에 RBAC 추가됨.
`req.user` 없이 호출하면 서버 admin identity로 실행되므로 **반드시 전달 필요**.

### 3-2. DID lookup timeout 추가
- `did.service.js:35` — `axios.get(url, { params, timeout: 5000 })` 추가

### 3-3. BMU DID→passport 에러 개선
- `bmu.routes.js:102-112` — passportId null이면 체인코드 보내지 말고 Agent에서 404 반환:
```js
if (!passportId) {
  return res.status(404).json({ error: `no passport found for DID ${did}` });
}
```

### 3-4. 기타 권장
- `bmu.routes.js:88` — 중복 서명 체크 if문 제거 (dead code)
- `bmu.routes.js:36` — `didPassportCache` 사이즈 제한 추가
- `bmu.routes.js:18` — `rateBuckets` 주기적 cleanup 타이머
- `auth.routes.js`, `passport.routes.js` — `console.error` → `createLogger` 통일

---

## 4. 상태 전이 변경 (프론트 에러 처리 필요)

v1.8부터 상태 전이가 엄격해짐. 아래 케이스에서 에러 반환:

| 함수 | 거부 조건 |
|------|----------|
| AddMaintenanceLog | status가 MAINTENANCE/ACTIVE가 아닐 때 |
| RequestAnalysis | status가 ACTIVE/MAINTENANCE가 아닐 때 |
| SubmitAnalysisResult | status가 ANALYSIS가 아닐 때 |
| ExtractMaterials | status가 ACTIVE/ANALYSIS가 아닐 때 |
| DisposeBattery | status가 DISPOSED이거나 MANUFACTURED일 때 |
| BindToVehicle | ACTIVE + 기존 VIN 있을 때 (재바인딩 거부) |
| RecordBMUData | passport.DID != 요청 DID일 때 |

프론트에서 해당 에러 메시지를 사용자에게 적절히 표시해야 함.

---

## 5. 미구현 — 추후 협의

### VC 발급요청/승인 분리 (국가과제 2차년도 #10-12)
현재 `IssueCredential` 단일 함수만 있음. request → PENDING → approve 흐름 필요.
프론트/API 설계와 함께 진행해야 의미 있으므로 Passport 세션 주도.
블록체인 세션은 체인코드 함수 추가 요청 시 대응 예정.

### Credential 제출/다운로드
체인코드가 아닌 API/프론트 레벨 기능. Passport 세션 범위.

---

## 6. 보안 수정 요약 (v1.8 포함)

| # | 수정 | 영향 |
|---|------|------|
| 1 | CouchDB JSON injection 방지 (sanitizeSelector 14곳) | 쿼리 입력 이스케이프 |
| 2 | VerifyCredentialStatus JSON injection 방지 | json.Marshal 사용 |
| 3 | DID↔passport 매칭 강제 | RecordBMUData |
| 4 | BindToVehicle 재바인딩 방지 | ACTIVE+VIN 거부 |
| 5 | QueryCredential/GetCredentialHistory RBAC | checkCredentialAccess |
| 6 | InvalidateBMURecord snapshot Temperature/StatusFlags | 재계산 보정 |
| 7 | FC reset 감사로그 ID 충돌 방지 | GetTxID() 사용 |
| 8-11 | 상태 전이 가드 4개 함수 | 위 표 참조 |
