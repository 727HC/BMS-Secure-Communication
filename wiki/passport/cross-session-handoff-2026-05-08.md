---
title: "2026-05-08 Passport 4세션 전달 내용 및 리스크"
date: 2026-05-08
tags: [passport, handoff, mcp, embedded, blockchain]
doc_type: handoff
status: current
---
# 2026-05-08 Passport 4세션 전달 내용 및 리스크

현재 병렬 세션은 `mcp`, `배터리여권`, `임베디드`, `블록체인` 4개다.
Passport 작업은 `bmu-agent/`, `webapp/frontend-react/`, `wiki/passport/`만 수정했다. `chaincode/`, `passport-network/`, `embedded/`, `firmware/`, `mcp-monitor/`는 직접 수정하지 않았다.

## 공통 기준

참조 문서:
- `wiki/passport/review-2026-05-08-passport-code-review.md`
- `wiki/passport/bms-1-3-year-mapping-2026-05-08.md`
- `wiki/passport/completion-audit-2026-05-08-passport-goal.md`
- `wiki/Object/BMS__.pdf`

공통 완료 기준:
- 2026년은 국가과제 3차년도다.
- 1~3차년도 배터리여권/BMS 요구를 `implemented`, `partially-implemented`, `blocked-*`로 계속 추적한다.
- 세션 간 파일 범위를 침범하지 않는다.

## 2026-05-08 13:53 KST 최신 상태

- 블록체인 세션 확인 완료:
  - live Fabric `passport-contract` Version `1.4`, Sequence `5`
  - 4개 org approval true
  - Passport 기대 함수명/인자 순서와 live 계약 일치
- MATLAB/BMU live 대상:
  - `PASSPORT-E2E-20260508040123`
  - DID `4d5CE8NZbkAVJxcypzaVhw`
  - `bmsBindingCode32=748293644 / 0x2c9a0e0c`
- `bmu-agent` 최신 런타임:
  - `POST /api/bmu/data`가 bound passport에서 `RecordBMUDataWithPayload(..., rawPayload)`를 호출한다.
  - cloud-agent `localhost:3002`가 꺼져 있어도 `/api/realtime/*`와 `/api/passports*`가 Fabric fallback + runtime BMU snapshot overlay를 사용한다.
  - dashboard 개요와 passport detail 개요에서 live SOC/SOH/temperature가 0 snapshot 대신 최신 BMU 값으로 표시된다.
- 상세 기준 문서: `wiki/passport/live-bmu-runtime-2026-05-08.md`

---

## 1. 배터리여권 세션 전달 내용

### 전달할 내용
- Passport API 입력 검증이 강화됐다.
  - 주요 파일: `bmu-agent/utils/request-validation.js`, `bmu-agent/routes/*.routes.js`
  - ID, pagination, enum, object/array, 숫자 입력을 Agent 단계에서 먼저 검증한다.
- 감사 로그 민감값 마스킹이 강화됐다.
  - 주요 파일: `bmu-agent/middleware/audit.js`
  - `password`, `token`, `secret`, `signature`, `rawPayload`, `privateKey`, `authorization`을 재귀 마스킹한다.
- BMU parser가 non-hex/odd-length rawPayload를 선거부한다.
  - 주요 파일: `bmu-agent/services/bmu-parser.service.js`
- 3차년도 추가 속성 정정 UI가 열렸다.
  - 주요 파일: `webapp/frontend-react/src/components/modals/passport-detail/CorrectionModal.tsx`
  - 추가 필드: `manufacturingProcess`, `disposalMethod`, `recycledElementContent`, `extensionInfo`, `vin`, `installDate`, `evManufacturer`, `evAssemblyCountry`
- 리뷰/매핑/완료감사 산출물이 생겼다.
  - `wiki/passport/review-2026-05-08-passport-code-review.md`
  - `wiki/passport/bms-1-3-year-mapping-2026-05-08.md`
  - `wiki/passport/completion-audit-2026-05-08-passport-goal.md`
- 임베디드 세션의 BMS management identifier handoff를 Agent에 반영했다.
  - `bmu-agent/services/bmu-parser.service.js`가 rawPayload bytes `44..47`을 `readUInt32LE(44)`로 읽어 `bmsBindingCode32`/`bmsBindingCodeHex`를 노출한다.
  - `bmu-agent/routes/bmu.routes.js` 응답/로그에 binding code 증적을 포함한다.
  - `BMU_BINDING_REQUIRED=true`이면 `bmsBindingCode32 == 0`을 400 `VAL`로 거부한다.
  - physical verification signal에 `bmsIdentifierMatched`를 추가했다.
- 블록체인 live Fabric `passport-contract` Version 1.4 / Sequence 5 handoff를 Agent/UI에 반영했다.
  - 최초 전달문의 이전 sequence 표기는 live network 기준 sequence 5로 정정했다.
  - Fabric client는 chaincode name `passport-contract`로 호출하므로 Agent/UI 코드에서 sequence를 별도 지정하지 않는다.
  - `POST /api/passports/:id/extended-attributes` → `SetPassportExtendedAttributes`
  - `POST /api/passports/:id/bms-binding` → `BindBMSIdentifier`
  - `POST /api/passports/:id/source-verification` → `RecordSourceVerification`
  - bound passport의 BMU ingest는 `RecordBMUDataWithPayload(..., rawPayload)`를 호출해 chaincode 저장값과 `rawPayload[44..47]`를 비교한다.
  - 초기 발급 flow는 `CreateBatteryPassport` 후 확장 속성, BMS binding, source verification을 순서대로 호출한다.
  - 블록체인 세션 live query에서 `bmsManagementId`, `bmsBindingId`, `bmsBindingCode32`, `rawPayloadHashVerified` 반환을 확인했다.
- MATLAB/BMU live UI 표시 경로를 보강했다.
  - `/api/realtime/passports/:id`, `/api/realtime/bmu/:passportId`는 cloud-agent unavailable 시 Fabric으로 fallback한다.
  - `/api/passports`, `/api/passports/:id`, `/api/realtime/passports`도 최신 BMU record/runtime snapshot을 overlay한다.
  - Fabric 첫 페이지에 live passport가 없으면 runtime snapshot의 passport를 목록 선두에 보강한다.
  - 상세 페이지는 3초 주기 silent refresh로 열린 화면에서도 최신 SOC를 반영한다.
  - SOCE 기본값 `0`은 `미수집`으로 표시한다.

### 배터리여권 세션 리스크
- 배터리여권 UI는 초기 발급 직후 `SetPassportExtendedAttributes`로 3차년도 확장 속성을 자동 보완한다. 다만 chaincode가 직접 초기 발급 인자로 받는 구조는 아니다.
- `extensionInfo`, `recycledElementContent`는 UI/Agent에서 JSON 객체 검증을 추가했지만, 최종 저장 계약은 여전히 chaincode의 JSON 문자열 정정 경로에 의존한다.
- route validation은 강화됐지만 Passport 세션 직접 Fabric/ACA-Py 연동 E2E는 실행 환경 의존이다. live Fabric 계약은 블록체인 세션이 확인했다.
- runtime BMU snapshot은 프로세스 메모리라 `bmu-agent` 재시작 직후 첫 MATLAB packet 전까지 목록 보강이 비어 있을 수 있다.
- cloud-agent read model은 아직 꺼져 있다. 현재 demo 기준은 Fabric fallback + runtime snapshot이다.
- 기존 다른 세션 변경(`chaincode/`, `passport-network/`)이 워킹트리에 있으므로 rebase/commit 시 범위 혼입 주의.

---

## 2. 블록체인 세션용 복붙 프롬프트

```text
작업 루트는 /path/to/bms-blockchain 이다. 블록체인 세션 범위(`chaincode/`, `passport-network/`)에서만 작업해줘. 배터리여권 세션 파일(`bmu-agent/`, `webapp/`, `wiki/passport/`)은 수정하지 마라.

목표: wiki/Object/BMS__.pdf 기준 3차년도 Battery Passport 요구 중 Passport 앱/API에서 blocked-by-chaincode-session으로 남은 항목을 보강해라.

반드시 확인할 Passport 산출물:
- wiki/passport/bms-1-3-year-mapping-2026-05-08.md
- wiki/passport/review-2026-05-08-passport-code-review.md
- wiki/passport/completion-audit-2026-05-08-passport-goal.md

현재 Passport 상태:
- bmu-agent/routes/passport.routes.js 는 extensionInfo/recycledElementContent/manufacturingProcess/disposalMethod 정정을 앱 레벨로 열었다.
- webapp/frontend-react/src/components/modals/passport-detail/CorrectionModal.tsx 도 해당 정정 필드를 노출한다.
- 하지만 초기 CreateBatteryPassport 인자에는 3차년도 확장 속성이 아직 없다.
- bmu-agent/services/bmu-parser.service.js 는 rawPayload bytes 44..47을 `bmsBindingCode32`로 노출한다.
- bmu-agent/routes/bmu.routes.js 는 BMU ingest 응답/로그에 `bmsBindingCode32`/`bmsBindingCodeHex`를 포함하고, `BMU_BINDING_REQUIRED=true`이면 zero code를 reject한다.
- dataHash는 48B rawPayload 전체 해시이므로 bytes 44..47도 자동 포함된다.
- bmu-agent/routes/passport.routes.js 는 `SetPassportExtendedAttributes`, `BindBMSIdentifier`, `RecordSourceVerification` API를 제공한다.
- webapp/frontend-react/src/pages/PassportsPage.tsx 는 초기 발급 직후 위 API를 호출한다.

요청 작업:
1. `chaincode/passport-contract`의 BatteryPassport 3차년도 속성 지원을 검토해라.
   - manufacturingProcess
   - disposalMethod
   - recycledElementContent
   - extensionInfo
   - BMS management identifier 또는 BMS binding identifier
   - full bmsManagementIdentifier 저장값과 `bmsBindingCode32` 비교 기준
2. 기존 `CreateBatteryPassport` 계약을 깨지 않는 방식으로 초기 발급 시 추가 속성을 기록할 수 있는 방법을 제안/구현해라.
   - 기존 인자 순서 변경 금지.
   - 가능하면 새 트랜잭션 또는 backward-compatible wrapper를 선호.
3. 스마트컨트랙트 자동 검증/업데이트 요구를 검토해라.
   - BMU data hash/signature/freshness counter 검증 상태
   - oracle/source verification result 기록
   - regulatory/physical verification event history 조회
4. Go chaincode 테스트를 추가해라.
   - 추가 속성 기록 성공/실패
   - invalid JSON/unknown key/negative recycling rate 실패
   - BMS identifier binding validation
   - 기존 CreateBatteryPassport 호환성
5. 완료 보고에 배터리여권 세션이 호출해야 할 함수명, 인자, 에러 메시지, 테스트 결과를 적어라.

완료 조건:
- chaincode/passport-contract 테스트 통과
- 기존 Passport API를 깨지 않는 migration/handoff 설명 포함
- 배터리여권 세션에 전달할 API 계약 요약 포함
```

### 블록체인 세션 리스크
- 기존 `CreateBatteryPassport` 인자 순서를 바꾸면 배터리여권 API와 프론트가 깨진다.
- 새 필드가 CouchDB query/index/RBAC 필터와 충돌할 수 있다.
- smart contract 자동 검증을 추가할 때 BMU/Embedded가 아직 제공하지 않는 identifier를 강제하면 ingestion이 막힐 수 있다.
- 현재 워킹트리에 블록체인 세션 변경이 이미 있으므로 Passport 변경과 섞어 커밋하지 말아야 한다.

---

## 3. 임베디드 세션용 복붙 프롬프트

```text
작업 루트는 /path/to/bms-blockchain 이다. 임베디드 세션 범위(`embedded/`, `firmware/`)에서만 작업해줘. 배터리여권/블록체인/MCP 세션 파일은 수정하지 마라.

목표: wiki/Object/BMS__.pdf 3차년도 요구 중 “DID + 실물 배터리 + BMS 관리 식별자 바인딩”과 “실시간 데이터 동기화/검증”을 Passport API가 신뢰할 수 있게 BMU payload/protocol 근거를 정리해라.

현재 Passport 근거:
- bmu-agent/routes/bmu.routes.js 는 did로 passportId를 찾고 rawPayload/signature/freshnessCounter/bmsBindingCode32를 기록·응답한다.
- bmu-agent/services/bmu-parser.service.js 는 48-byte payload를 파싱하고 bytes 44..47을 `bmsBindingCode32`로 노출한다.
- webapp/frontend-react/src/components/modals/passport-detail/PhysicalVerificationModal.tsx 는 socMatched/didMatched/vinMatched/fcMatched/bmsIdentifierMatched signals를 사용한다.

요청 작업:
1. 현재 BMU/CMU payload 또는 메시징 프로토콜에 BMS management identifier를 넣을 위치가 있는지 확인해라.
2. 없다면 backward-compatible 확장안을 제안해라.
   - reserved 4 bytes 활용 가능 여부 포함.
   - 기존 48-byte parser와 호환성 유지 여부 명시.
   - 참고: 임베디드 v1.1 회신에 따라 Agent는 bytes 44..47 `bmsBindingCode32` 파싱을 이미 반영했다.
3. DID, VIN, freshness counter, physical battery evidence를 어떤 signals로 Passport에 전달할지 명세화해라.
4. 장비 없이 검증 가능한 parser/protocol 테스트 또는 샘플 payload를 제공해라.
5. 배터리여권 세션에 전달할 필드명, 타입, 예시 payload, 실패 조건을 적어라.

완료 조건:
- BMS management identifier 처리 방향 확정
- Passport bmu-agent가 반영할 수 있는 payload/API 계약 요약 포함
- 장비/E2E 검증 필요 항목 명시
```

### 임베디드 세션 리스크
- 48-byte payload 호환성을 깨면 현재 `bmu-agent/services/bmu-parser.service.js`와 기존 테스트가 실패한다.
- reserved bytes를 재사용하면 펌웨어/Agent/Chaincode가 같은 endian·스케일·필드명을 공유해야 한다.
- DID/VIN/BMS identifier 중 하나라도 원천 데이터가 없으면 physical binding 검증은 `partially-implemented`에 머문다.
- 장비 없이 만든 샘플 payload가 실제 CMU/BMU 서명·freshness counter 동작과 다를 수 있다.

---

## 4. MCP 세션용 복붙 프롬프트

```text
작업 루트는 /path/to/bms-blockchain 이다. MCP 세션 범위(`mcp-monitor/`)에서만 작업해줘. 배터리여권/블록체인/임베디드 세션 파일은 수정하지 마라.

목표: wiki/Object/BMS__.pdf 3차년도 요구 중 “실시간 문제 추적/해결 모니터링”, “로그 및 오류 모니터링/추적/감사”, “대규모 데이터 처리 안정성 관찰”을 MCP 모니터링 표면에서 검증 가능하게 정리해라.

현재 Passport 근거:
- bmu-agent/middleware/audit.js 는 `/api/**` 감사 로그를 NDJSON + memory buffer로 남긴다.
- bmu-agent/server.js 는 `/api/status`, `/api/audit`를 제공한다.
- bmu-agent/routes/bmu.routes.js 는 BMU record/invalidate 흐름을 제공한다.
- wiki/passport/bms-1-3-year-mapping-2026-05-08.md 에 MCP/모니터링 관련 blocked-by-other-session 항목이 있다.

요청 작업:
1. `mcp-monitor/`가 Passport 상태를 읽기 전용으로 관찰할 수 있는지 확인해라.
   - `/api/status`
   - `/api/audit`
   - BMU record count / invalidation / error trend
   - VC verification trend
2. Passport 3차년도 기능 시험에 필요한 MCP 관찰 항목을 정의해라.
   - ingestion error rate
   - validation error category count
   - missing signature
   - invalid rawPayload
   - BMU freshness counter anomaly
   - DID mismatch
   - BMS binding code zero/mismatch
   - regulatory/physical verification status
   - chaincode INTERNAL error trend
3. MCP가 직접 원장을 쓰지 않도록 read-only 원칙을 유지해라.
4. 배터리여권/블록체인/임베디드 세션으로 넘길 alert payload 예시를 작성해라.
5. 실행 가능한 검증 명령과 pass/fail 기준을 남겨라.

완료 조건:
- MCP monitor가 Passport 3차년도 상태를 관찰할 수 있는 항목 목록 작성
- read-only 보장
- alert/handoff payload 예시 포함
- 실행한 테스트 또는 실행 불가 사유 기록
```

### MCP 세션 리스크
- `/api/audit`는 인증/RBAC가 필요하므로 MCP가 어떤 identity로 읽을지 정해야 한다.
- 감사 로그는 민감값이 마스킹되므로 디버깅에 필요한 원문 payload를 기대하면 안 된다.
- MCP가 원장 쓰기 또는 Passport API mutation을 수행하면 세션 책임이 깨진다.
- 대규모 모니터링은 로그 보존/rotation 정책과 충돌할 수 있다.

---

## 최종 공통 리스크 요약

| 리스크 | 영향 세션 | 대응 |
|---|---|---|
| 초기 발급 시 3차년도 확장 속성 직접 인자 미지원 | 배터리여권, 블록체인 | 배터리여권은 발급 직후 정정 원장으로 자동 보완. 블록체인은 backward-compatible 직접 계약 검토 |
| full BMS management identifier 저장/검증 부재 | 배터리여권, 임베디드, 블록체인 | 임베디드 v1.1 `bmsBindingCode32` hint는 Agent에 반영. 블록체인은 full ID 저장/검증 계약과 32-bit hint 비교 기준 제공 필요 |
| Smart contract 자동 검증/업데이트 미완성 | 블록체인, 배터리여권 | 새 트랜잭션/이벤트/검증 상태 계약 정의 |
| 장비 기반 physical binding 검증 미완성 | 임베디드, 배터리여권 | 샘플 payload + 장비 E2E 검증 분리 |
| cloud-agent read model 미기동 | 배터리여권, MCP | 현재 Passport는 Fabric fallback + runtime snapshot으로 demo를 유지. MCP는 read model 재기동/관찰 여부 별도 확인 |
| runtime BMU snapshot 메모리 의존 | 배터리여권 | `bmu-agent` 재시작 후 첫 MATLAB packet 전까지 live 목록 보강이 비어 있을 수 있음 |
| 실시간 문제 추적/감사 모니터링 부족 | MCP, 배터리여권 | MCP read-only 관찰 항목과 alert payload 정의 |
| 대규모 부하/침투/공인시험 검증 미수행 | MCP, 블록체인, 배터리여권 | 별도 QA/성능 goal 또는 MCP 관찰 기반 시험 계획 필요 |
| 워킹트리의 다른 세션 변경 혼입 | 전체 | 커밋/패치 전 `git status --short`로 세션별 파일 범위 확인 |
