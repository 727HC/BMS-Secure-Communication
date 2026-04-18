---
title: "배터리 여권 세션 개요"
date: 2026-04-06
tags: [passport, overview]
doc_type: overview
---
# 배터리 여권 세션

## 담당 범위
- `bmu-agent/` — Node.js API 서버 (41개 엔드포인트, 9개 라우트 그룹)
- `webapp/frontend/` — Vue 3 SPA (10개 페이지)

> 체인코드(`chaincode/`)는 블록체인 세션 범위 (2026-04-06 재배분)

## 현재 상태
- Phase 1 구현 완료 (2026-03-20)
- BATP 하네스 리디자인 12 Cycle 완료
- 프론트엔드 사이드바 레이아웃 전환 완료
- 대시보드 리디자인 진행 중

## 핵심 기술 스택
- Hyperledger Fabric 2.5, Go 1.22
- Node.js (Express), Fabric SDK, ACA-Py
- Vue 3 (CDN), Tailwind CSS, Pretendard + JetBrains Mono

## 체인코드 함수 (passport-contract, 40개)

### 내부 헬퍼 (4개)
`getClientMSP`, `requireMSP`, `mergeSnapshot`, `checkPassportAccess`, `buildPassportQuery`

### 여권 CRUD (6개)
| 함수 | 권한 | 설명 |
|------|------|------|
| `CreateBatteryPassport` | Manufacturer | 여권 생성 (GBA 21 필드) |
| `BindToVehicle` | EVManufacturer | VIN 바인딩 → ACTIVE |
| `CorrectPassportData` | Manufacturer | 데이터 정정 |
| `QueryPassport` | 전체 (필드별 접근제어) | 단건 조회 |
| `QueryAllPassports` | 전체 | 전체 조회 |
| `QueryPassportsWithPagination` | 전체 | 페이지네이션 조회 |

### 정비/분석 (5개)
| 함수 | 권한 | 설명 |
|------|------|------|
| `RequestMaintenance` | EVManufacturer | 정비 요청 (ACTIVE→MAINTENANCE) |
| `AddMaintenanceLog` | Service | 정비 기록 추가 |
| `AddAccidentLog` | EVManufacturer | 사고 기록 추가 |
| `RequestAnalysis` | EVManufacturer | 분석 요청 (→ANALYSIS) |
| `SubmitAnalysisResult` | Service | 분석 결과 제출 |

### 재활용/폐기 (3개)
| 함수 | 권한 | 설명 |
|------|------|------|
| `SetRecycleAvailability` | Regulator | 재활용 가능 설정 |
| `ExtractMaterials` | Regulator | 소재 추출 (→RECYCLING) |
| `DisposeBattery` | Regulator | 폐기 처리 (→DISPOSED) |

### BMU 데이터 (3개)
| 함수 | 권한 | 설명 |
|------|------|------|
| `RecordBMUData` | Manufacturer | BMU 스냅샷 기록 |
| `QueryBMURecordsByPassport` | 전체 | BMU 레코드 조회 |
| `InvalidateBMURecord` | Manufacturer | 레코드 무효화 |

### 원자재 (3개)
`RegisterRawMaterial`, `QueryRawMaterials`, `LinkRawMaterials`

### DID/VC (11개)
`IssueCredential`, `RevokeCredential`, `QueryCredential`, `QueryCredentialsByPassport`, `QueryCredentialsByHolder`, `QueryCredentialsByType`, `VerifyCredentialStatus`, `LogCredentialVerification`, `GetCredentialHistory`, `QueryRevokedCredentials`, `QueryBatteryByDID`

### 이력 (2개)
`GetPassportHistory`, `QueryCorrectionHistory`

## API 엔드포인트 (bmu-agent, 9개 라우트 그룹)

| 그룹 | 경로 | 주요 엔드포인트 |
|------|------|----------------|
| auth | `/api/auth` | POST login, POST register |
| passport | `/api/passports` | GET /, POST /, GET /:id, PUT /:id/bind, POST /:id/correct |
| material | `/api/materials` | GET /, POST /, POST /:id/materials (link) |
| bmu | `/api/bmu` | POST /data, GET /records/:passportId, POST /invalidate/:recordId |
| maintenance | `/api/maintenance` | POST /:id/request, POST /:id/log, POST /:id/accident |
| analysis | `/api/analysis` | POST /:id/request, POST /:id/result |
| recycling | `/api/recycling` | PUT /:id/availability, POST /:id/extract, POST /:id/dispose |
| vc | `/api/vc` | POST /issue, POST /revoke, GET /verify/:credentialId |
| did | `/api/did` | GET /verkey/:did, POST /schemas, POST /credential-definitions |

## RBAC 요약

| 조직 | 주요 권한 |
|------|----------|
| Manufacturer (Org1) | 여권 생성, 데이터 정정, BMU 기록, 원자재 등록 |
| EVManufacturer (Org2) | VIN 바인딩, 정비/분석 요청, 사고 기록 |
| Service (Org3) | 정비 완료, 분석 결과 제출 |
| Regulator (Org4) | 재활용 설정, 소재 추출, 폐기 처리 |

## 참고
- 프론트엔드 구조: [[passport/frontend]]
- 디자인 가이드: [[passport/design-tokens]]
- UI 레퍼런스: [[passport/ui-references]]
- 아키텍처: [[common/architecture]]
