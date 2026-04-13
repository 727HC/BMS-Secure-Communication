---
title: Passport 세션 요청 회신 — 체인코드 v1.8 정합성 확인
date: 2026-04-13
tags: [handoff, passport, reply, v1.8]
---

# Passport 세션 요청 회신

## 1. 신규 API 4개 정합성 — 확인 완료, 바로 붙일 수 있음

### QueryVerificationsByCredential
- 호출: `evaluateTransaction('QueryVerificationsByCredential', [credentialId, pageSizeStr, bookmark], req.user)`
- RBAC: credential의 연관 passport 접근 권한 (모든 org 가능, 본인 접근 범위 내)
- 응답: `{"records":[{"verificationId","credentialId","verifierDid","verifierMsp","result","timestamp"}],"bookmark":"...","count":N}`

### QueryVerificationsByVerifier
- 호출: `evaluateTransaction('QueryVerificationsByVerifier', [verifierDid, pageSizeStr, bookmark], req.user)`
- RBAC: **RegulatorMSP only**
- 응답: 동일 PaginatedVerificationResult

### UpdateRegulatoryVerification
- 호출: `submitTransaction('UpdateRegulatoryVerification', [passportId, status, evidenceIdsJSON], req.user)`
- RBAC: **RegulatorMSP only**
- status: `VERIFIED | PARTIAL | PENDING | FAILED` (다른 값 거부)
- evidenceIdsJSON: `'["VC-001","VC-002"]'` — 각 ID가 실제 VC인지 docType 검증됨
- 에러: `invalid regulatory status`, `evidence credential X does not exist`, `evidence X is not a valid credential`

### VerifyPhysicalHistory
- 호출: `submitTransaction('VerifyPhysicalHistory', [passportId, signalsJSON, reason], req.user)`
- RBAC: **ManufacturerMSP + RegulatorMSP**
- signalsJSON: `'{"socMatched":true,"didMatched":true,"vinMatched":false,"fcMatched":true}'`
- 허용 키: `socMatched`, `didMatched`, `vinMatched`, `fcMatched` (다른 키 → 에러)
- 자동 판정: 전부 true → VERIFIED, 하나라도 false → MISMATCH
- reason 필수 (빈 문자열 거부)

---

## 2. userCtx 전달 기준 — 확정

**규칙: v1.8부터 모든 VC/검증 함수에 req.user 필수.**

| 함수 | userCtx | 미전달 시 |
|------|:---:|---------|
| QueryCredential | **필수** | 서버 admin으로 실행, RBAC 우회 |
| GetCredentialHistory | **필수** | 서버 admin으로 실행, RBAC 우회 |
| QueryVerificationsByCredential | **필수** | passport 접근 권한 미확인 |
| QueryVerificationsByVerifier | **필수** | RegulatorMSP 체크 불가 |
| UpdateRegulatoryVerification | **필수** | RegulatorMSP 체크 불가 |
| VerifyPhysicalHistory | **필수** | MSP 체크 불가 |
| VerifyCredentialStatus | 권장 | 현재 RBAC 없으나 향후 추가 가능 |
| LogCredentialVerification | **필수** | MSP 기록에 영향 |

전달 방식:
```js
// evaluate (읽기)
fabricService.evaluateTransaction('QueryCredential', [credentialId], req.user)

// submit (쓰기)
fabricService.submitTransaction('UpdateRegulatoryVerification', [passportId, status, evidenceIdsJSON], req.user)
```

---

## 3. 상태 전이 에러 메시지 — 확정 (프론트에서 그대로 사용 가능)

| 상황 | 에러 메시지 |
|------|-----------|
| 정비 기록 추가 시 상태 불일치 | `cannot add maintenance log: passport status must be MAINTENANCE or ACTIVE, current: {status}` |
| 분석 요청 시 상태 불일치 | `passport status must be ACTIVE or MAINTENANCE for analysis request, current: {status}` |
| 분석 결과 제출 시 상태 불일치 | `passport status must be ANALYSIS for result submission, current: {status}` |
| 원자재 추출 시 상태 불일치 | `extract requires ACTIVE or ANALYSIS status, current: {status}` |
| 이미 폐기된 여권 | `passport {id} is already disposed` |
| 미활성 여권 폐기 시도 | `passport {id} has not been activated yet` |
| VIN 재바인딩 시도 | `passport {id} already bound to VIN {vin}; unbind first` |
| DID 불일치 BMU 기록 | `DID mismatch: passport {id} is registered to DID {did}, not {did}` |

모든 메시지는 영어이며 `current: {status}` 패턴으로 현재 상태를 포함.
프론트에서 파싱하지 말고 그대로 표시하면 됨.

---

## 4. GBA 0값 문제 — 체인코드에서는 정상

체인코드 응답 기준:
- `weight: 0` → JSON `0` (숫자)
- `recycleAvailable: false` → JSON `false`
- `manufacturingProcess: ""` → JSON `""`
- `recycledElementContent: {}` → JSON `{}`
- `physicalHistoryVerification: null` → JSON 키 생략 (omitempty)

**0, false는 정상 값으로 반환됨.** 프론트의 `fieldFilled` 함수에서:
```js
// 잘못된 방식 (0, false를 빈값 처리)
const filled = !!value;

// 올바른 방식
const filled = value != null && value !== '' && value !== undefined;
// 또는 숫자 필드는:
const filled = value != null;
```

---

## 5. 커밋 정보

- 커밋: `45725b6` (feature/react-rebuild)
- 체인코드: v1.8 / sequence 8 배포 완료
- 변경: +804행, 8파일
