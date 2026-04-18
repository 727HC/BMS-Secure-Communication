---
title: "체인코드 보안 수정 전체 이력"
date: 2026-04-13
updated: 2026-04-13
tags: [chaincode, security, review, fixes]
doc_type: reference
---
# 체인코드 보안 수정 전체 이력

5회 코드 리뷰를 거쳐 총 11건 수정 완료. 체인코드 v1.8 배포 예정.

## 수정 목록 (11건)

### Session 1 — 1차 코드 리뷰 (Codex)
커밋: `f97125c`

bmu-agent 보안 8건 수정 (Passport 세션 범위 — 블록체인 세션에서 수행)

### Session 2 — 2~4차 코드 리뷰 (외부 리뷰어 3명)

| # | 우선순위 | 수정 내용 | 함수 |
|---|---------|----------|------|
| 1 | critical | DID↔passport 매칭 강제 | RecordBMUData |
| 2 | warning | ACTIVE+VIN 재바인딩 방지 | BindToVehicle |
| 3 | warning | checkCredentialAccess RBAC 추가 | QueryCredential |
| 4 | warning | checkCredentialAccess RBAC 추가 | GetCredentialHistory |
| 5 | warning | snapshot 재계산 Temperature/StatusFlags 누락 보정 | InvalidateBMURecord |

### Session 2 — 5차 코드 리뷰 (내부 code-reviewer 에이전트)

| # | 우선순위 | 수정 내용 | 함수/범위 |
|---|---------|----------|----------|
| 6 | critical | CouchDB JSON injection 방지 — sanitizeSelector 14곳 적용 | 전체 CouchDB 쿼리 |
| 7 | critical | VerifyCredentialStatus JSON 응답 injection — json.Marshal 교체 | VerifyCredentialStatus |
| 8 | warning | FC reset 감사로그 ID 충돌 방지 — GetTxID() 사용 | ResetFCForDID |
| 9 | warning | AddMaintenanceLog 상태 가드 | AddMaintenanceLog |
| 10 | warning | RequestAnalysis/SubmitAnalysisResult 상태 가드 | RequestAnalysis, SubmitAnalysisResult |
| 11 | warning | ExtractMaterials/DisposeBattery 상태 가드 | ExtractMaterials, DisposeBattery |

## 상태 전이 머신 (수정 후)

```
MANUFACTURED → (BindToVehicle) → ACTIVE
ACTIVE → (RequestMaintenance) → MAINTENANCE
MAINTENANCE/ACTIVE → (AddMaintenanceLog) → ACTIVE
ACTIVE/MAINTENANCE → (RequestAnalysis) → ANALYSIS
ANALYSIS → (SubmitAnalysisResult) → ACTIVE
ACTIVE/ANALYSIS → (ExtractMaterials) → RECYCLING
RECYCLING/ACTIVE/ANALYSIS/MAINTENANCE → (DisposeBattery) → DISPOSED
DISPOSED → (불가, 종단 상태)
MANUFACTURED → (DisposeBattery 불가, 미활성)
```

## 관련 문서
- [[reviews/blockchain/review-findings-summary|리뷰별 사실/거짓 판별 결과]] — 리뷰별 사실/거짓 판별 결과
- [[handoffs/blockchain/passport-handoff-2026-04-13|Passport 세션 handoff]] — Passport 세션 전달 사항
