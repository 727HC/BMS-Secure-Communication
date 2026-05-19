---
title: "BMS PDF 1~3차년도 Passport 반영 매핑"
date: 2026-05-08
tags: [passport, bms-pdf, national-project, mapping]
doc_type: reference
status: current
---
# BMS PDF 1~3차년도 Passport 반영 매핑

Source: `wiki/Object/BMS__.pdf`
기준: 2026년은 3차년도이며, Passport 세션은 `chaincode/`, `passport-network/`, `embedded/`, `firmware/`, `mcp-monitor/`를 직접 수정하지 않는다.

Status values:
- `implemented`: 현 개발물에서 동작 표면과 검증 근거가 있음
- `partially-implemented`: 일부 표면은 있으나 자동화/완성도/외부 세션 의존이 남음
- `missing-passport-scope`: Passport 세션에서 구현해야 하나 아직 없음
- `blocked-by-chaincode-session`: 체인코드/네트워크 변경이 필요
- `blocked-by-other-session`: Embedded/MCP/성능/보안 시험 등 다른 세션·환경 필요

## 1차년도

| 요구 | 상태 | 현 개발물 근거 | 이번 조치/남은 갭 |
|---|---|---|---|
| 배터리 여권 구조 상세 설계 | implemented | `bmu-agent/routes/passport.routes.js`, `webapp/frontend-react/src/components/passport-detail/*`, `chaincode/passport-contract/types.go` | API/UI 구조 유지 |
| EVB 전주기 시나리오 | partially-implemented | create/list/detail/bind/correct/history, `maintenance.routes.js`, `analysis.routes.js`, `recycling.routes.js` | 앱 표면은 있음. 체인코드 이벤트·시험 시나리오는 별도 검증 필요 |
| 내부 API/응용서비스 API 설계 | implemented | `bmu-agent/routes/*.js`, `webapp/frontend-react/src/lib/api.ts` | 입력 검증 보강 |
| DID 기반 배터리 ID, VIN, 제조/모델/시리얼/일자/국가 | implemented | `passport.routes.js`, `did.routes.js`, `CorrectionModal.tsx`, `IdentityTab.tsx` | DID/ID strict validation 추가 |
| 원자재·제조공정·규격·사용·재활용·폐기·인증·확장 속성 | partially-implemented | `material.routes.js`, `recycling.routes.js`, `vc.routes.js`, `IdentityTab.tsx`, `CorrectionModal.tsx` | 정정 UI에 제조공정/폐기/재활용 원료/확장정보 추가. 초기 발급 인자 확장은 chaincode 연계 과제 |
| BMS 보안 플랫폼: RBAC/IAM/TLS/AES/BMS-CMU | partially-implemented | JWT/RBAC: `middleware/auth.js`, `middleware/rbac.js`; BMU signature: `bmu.routes.js`, `did.service.js` | BMS-CMU TLS/AES/HSE는 Embedded 범위 |
| Fabric 기반 블록체인 구조/프로토타입 | implemented | `fabric.service.js`, `chaincode/passport-contract/*` | Passport 세션 직접 수정 없음 |

## 2차년도

| 요구 | 상태 | 현 개발물 근거 | 이번 조치/남은 갭 |
|---|---|---|---|
| Battery Passport 프로토타입 | implemented | `webapp/frontend-react/src/pages/PassportsPage.tsx`, `PassportDetailPage.tsx`, `bmu-agent/routes/passport.routes.js` | 등록부/상세 흐름 유지 |
| EVB 전주기 관리 프로토타입 | partially-implemented | 정비/분석/재활용/폐기 라우트와 페이지 | 기능 시험 자동화는 후속 |
| 서비스 UI 및 내부/API 구현 | implemented | React route pages, `src/lib/api.ts`, Express route groups | 프론트 테스트/빌드 통과 |
| DID 발행/검증/유통 구성요소 | partially-implemented | `did.routes.js`, `vc.routes.js`, `vc.service.js`, `TrustTab.tsx`, `ComplianceTab.tsx` | schema/credential 입력 검증 보강. ACA-Py 실연동 시험은 환경 의존 |
| IoT 센서 데이터 실시간 처리·자동 검증 | partially-implemented | `bmu.routes.js`, `bmu-parser.service.js`, `realtime.routes.js`, `runtimeBmuSnapshot.service.js`, BMU UI | MATLAB/BMU live data가 Fabric fallback + runtime snapshot overlay로 dashboard/detail에 표시됨. 장비·cloud-agent read model E2E는 후속 |
| BMS/블록체인/Passport 연동 모듈 | partially-implemented | `fabric.service.js`, `bmu.routes.js`, `did.service.js`, `realtime.routes.js`, `passportSnapshotOverlay.service.js` | Sequence 5 `RecordBMUDataWithPayload`와 BMS binding code 비교는 연결됨. full identifier collision/장비 검증은 후속 |

## 3차년도

| 요구 | 상태 | 현 개발물 근거 | 이번 조치/남은 갭 |
|---|---|---|---|
| 발행/등록/수정/검증/이력추적/상태조회/활용/폐기 | partially-implemented | `passport.routes.js`, `vc.routes.js`, `recycling.routes.js`, `PassportDetailPage.tsx`, `QrScanPage.tsx` | 수정/검증 라우트 입력 검증 보강. 자동 기능 시험은 후속 |
| DID + 실물 배터리 + BMS 관리 식별자 바인딩 | partially-implemented | DID/VIN/physical verification: `did.routes.js`, `passport.routes.js`, `PhysicalVerificationModal.tsx`; BMU payload hint: `bmu-parser.service.js` `bmsBindingCode32`, `bmu.routes.js`; `BindBMSIdentifier` | 임베디드 v1.1 bytes 44..47 hint를 Agent가 노출하고 live chaincode Sequence 5 저장값 `748293644 / 0x2c9a0e0c`와 비교한다. 실제 보드 E2E와 32-bit hint collision 평가는 후속 |
| 실시간 데이터 동기화와 QR/NFC 식별/접근 | partially-implemented | `bmu.routes.js`, `realtime.routes.js`, `passportSnapshotOverlay.service.js`, `runtimeBmuSnapshot.service.js`, `components/qr-scan/*` | `PASSPORT-E2E-20260508040123` MATLAB/BMU live data가 dashboard/detail 개요에 표시됨. QR/NFC UI 있음. 실제 NFC/현장 태그 연동 검증은 장비 의존 |
| 추가 속성 기록/확장 속성 | partially-implemented | `PassportCreateModal.tsx`, `PassportsPage.tsx`, `CorrectionModal.tsx`, `passport.routes.js`; `SetPassportExtendedAttributes` API | 초기 발급 직후 `POST /passports/:id/extended-attributes`로 live chaincode Version 1.4 / Sequence 5 트랜잭션 호출. 기존 CreateBatteryPassport 인자 순서는 유지 |
| 스마트컨트랙트 자동 데이터 검증/업데이트 | partially-implemented | `RecordBMUDataWithPayload`, `RecordSourceVerification` 호출 표면 추가, `chaincodeErrorMessages.ts`, `TraceabilityTab.tsx` | BMU rawPayload hash/BMS code 비교는 bound passport에서 동작하고 `rawPayloadHashVerified=true` live 반환 확인. 운영 성능/장비 검증은 후속 |
| 실물 배터리 바인딩 검증 시스템 | partially-implemented | `VerifyPhysicalHistory` API, `PhysicalVerificationModal.tsx`, `TraceabilityTab.tsx`, `BindBMSIdentifier` API | `bmsIdentifierMatched` signal과 BMS binding code 표시 추가. 실제 보드 데이터 원천 검증은 다른 세션 |
| 재활용/폐기 규제 준수 자동 검증·보고·모니터링 | partially-implemented | `recycling.routes.js`, `RegulatoryVerificationModal.tsx`, `ComplianceTab.tsx`, audit log | `recyclingRates` 객체/범위 검증 추가. 자동 보고서/공인시험은 후속 |
| 이해관계자 UI/UX: 제조사/유통·EV/최종사용자/규제기관 | implemented | RBAC 기반 페이지/액션, `useOrgRoles`, dashboard/passports/detail/maintenance/recycling/audit | admin CRUD가 아닌 dossier/register/ledger 흐름 유지 |
| EVB 전주기 기능 시험 | partially-implemented | bmu-agent route tests, frontend component tests | E2E/장비 포함 기능 시험은 후속 |
| 대규모 데이터·부하 안정성 검증 | blocked-by-other-session | `scripts/tps-benchmark*`, frontend/bmu tests는 존재 | 대규모 부하 시험은 별도 목표 필요 |
| 보안취약점/침투/암호화·데이터 보호 | partially-implemented | JWT/RBAC, CORS/security headers, audit redaction, signed BMU verify | 침투 테스트와 BMS-CMU 암호 검증은 다른 세션 필요 |
| 로그/오류 모니터링/추적/감사 | implemented | `middleware/audit.js`, `/api/audit`, frontend AuditLogPage | 감사 마스킹 강화 |
| BMS/블록체인/BMS보안/Passport 메시징 | partially-implemented | `bmu.routes.js`, `did.service.js`, `fabric.service.js`, `realtime.routes.js` | 메시징 프로토콜 명세/성능 검증은 blockchain/embedded 연계 과제 |

## 결론
- Passport 앱/API 표면에서는 1~3차년도 핵심 흐름이 `partially-implemented` 이상으로 존재한다.
- 이번 패치로 Passport 세션에서 가능한 위험 완화, 3차년도 추가 속성 정정 표면, 초기 발급 직후 자동 보완 흐름을 보강했다.
- 2026-05-08 runtime 기준으로 MATLAB/BMU → `RecordBMUDataWithPayload` → Fabric ledger → dashboard/detail 개요 최신값 표시까지 Passport 범위에서 확인했다.
- 완전 충족에는 chaincode 초기 발급 확장, smart contract 자동 검증, full BMS management identifier 저장/검증, 장비/E2E/부하/침투 시험이 필요하다.
