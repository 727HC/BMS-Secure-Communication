---
title: "2026-05-08 chaincode sequence 5 BMS binding 반영"
date: 2026-05-08
tags: [passport, blockchain-handoff, chaincode, bms-binding, source-verification]
doc_type: activity-log
status: current
---
# 2026-05-08 chaincode sequence 5 BMS binding 반영

## 작업 주체
- Codex / 배터리여권 세션

## 작업 내용
- 블록체인 세션 live 확인사항(`passport-contract` Version 1.4 / Sequence 5, 4개 org approval true)을 Passport Agent/UI에 연결했다.
  - 최초 전달문의 이전 sequence 표기는 live network 기준 sequence 5로 정정했다.
  - Fabric client는 chaincode name `passport-contract`로 호출하므로 Agent/UI 코드에서 sequence를 별도 지정하지 않는다.
- 기존 `CreateBatteryPassport` 인자 순서는 유지하고, 초기 발급 직후 다음 API를 호출하도록 변경했다.
  - `POST /api/passports/:id/extended-attributes` → `SetPassportExtendedAttributes`
  - `POST /api/passports/:id/bms-binding` → `BindBMSIdentifier`
  - `POST /api/passports/:id/source-verification` → `RecordSourceVerification`
- 임베디드/BMU 확정값을 기본값으로 반영했다.
  - `bmsManagementId`: `BMS-MGMT-001`
  - `bmsBindingId`: `did:battery:001#BMS-MGMT-001`
  - `bmsBindingCode32`: `0x2c9a0e0c`
  - `evidenceHash`: `b3c37ed2cdd2831cc0c212445905ced4a20ea51e129bff2e7418deddf7223178`
- bound passport의 BMU ingest는 `RecordBMUDataWithPayload(..., rawPayload)`를 호출해 chaincode 저장값과 `rawPayload[44..47]` 비교 경로로 전환했다.
- BMS binding mismatch, rawPayload, source verification validation error를 `VAL` 및 한국어 토스트로 매핑했다.
- Traceability tab에 BMS management ID, 원장/최근 BMU binding code, rawPayload hash verification, `bmsIdentifierMatched` 표시를 추가했다.
- cloud-agent read model이 꺼져 있어도 배터리 여권 상세가 MATLAB/BMU 최신 데이터를 볼 수 있도록 `/api/realtime/passports/:id`, `/api/realtime/bmu/:passportId`에 Fabric fallback을 추가했다.
  - `QueryPassport` + 최신 `QueryBMURecordsByPassport` 1건으로 `currentSoc`, `temperature`, `statusFlags`, `totalDischargeCycles`, `lastBMUDataID`를 overlay한다.
  - BMU 목록은 cloud-agent 미기동 시 Fabric `QueryBMURecordsByPassport` 응답을 그대로 사용한다.
- `개요`/목록 경로가 정적 `QueryPassport` snapshot의 `0` 값을 그대로 표시하지 않도록 `/api/passports`, `/api/passports/:id`, `/api/realtime/passports`에도 최신 BMU overlay를 적용했다.
  - BMU ingest 성공 시 런타임 최신 BMU snapshot을 보관하고, cloud-agent가 꺼져 있거나 Fabric 첫 페이지에 live passport가 없으면 최신 BMU 여권을 목록 선두에 보강한다.
  - `PASSPORT-E2E-20260508040123`처럼 Caliper 테스트 여권 뒤쪽에 있는 live 여권도 dashboard `개요`에서 기본 선택되도록 했다.
- 여권 상세 화면은 이미 열린 페이지에서도 MATLAB/BMU 최신값을 반영하도록 3초 주기 silent refresh를 추가했다.
- MATLAB/BMU가 제공하지 않는 SOCE의 기본값 `0%`가 SOC처럼 보이는 혼선을 막기 위해 SOCE `0`은 `미수집`으로 표시한다.

## 블록체인 live 재확인
- 함수명/인자 순서는 Passport 기대와 일치한다.
- `QueryPassport` live 반환:
  - `bmsManagementId = BMS-MGMT-001`
  - `bmsBindingId = did:battery:001#BMS-MGMT-001`
  - `bmsBindingCode32 = 748293644 / 0x2c9a0e0c`
- `QueryBMURecordsByPassport` live 반환:
  - `bmsBindingCode32 = 748293644`
  - `rawPayloadHashVerified = true`
  - `dataHash` 반환 확인
- rawPayload 검증:
  - rawPayload length = 48 bytes
  - bytes `44..47 = 0c0e9a2c` → LE `0x2c9a0e0c`
  - bad `bmsBindingCode32` live invoke reject 확인

## 변경 파일
- `bmu-agent/routes/passport.routes.js`
- `bmu-agent/routes/bmu.routes.js`
- `bmu-agent/routes/realtime.routes.js`
- `bmu-agent/services/passportSnapshotOverlay.service.js`
- `bmu-agent/services/runtimeBmuSnapshot.service.js`
- `bmu-agent/middleware/chaincode-error.js`
- `bmu-agent/tests/route-validation.test.js`
- `bmu-agent/tests/chaincode-error.test.js`
- `bmu-agent/README.md`
- `webapp/frontend-react/src/pages/PassportsPage.tsx`
- `webapp/frontend-react/src/pages/PassportsPage.test.tsx`
- `webapp/frontend-react/src/components/passport-detail/TraceabilityTab.tsx`
- `webapp/frontend-react/src/components/passport-detail/TraceabilityTab.test.tsx`
- `webapp/frontend-react/src/components/passport-detail/usePassportDetailData.ts`
- `webapp/frontend-react/src/components/passport-detail/IdentityTab.tsx`
- `webapp/frontend-react/src/components/passport-detail/IdentityTab.test.tsx`
- `webapp/frontend-react/src/components/passport-detail/types.ts`
- `webapp/frontend-react/src/lib/chaincodeErrorMessages.ts`
- `webapp/frontend-react/src/lib/chaincodeErrorMessages.test.ts`
- `wiki/passport/bms-1-3-year-mapping-2026-05-08.md`
- `wiki/passport/cross-session-handoff-2026-05-08.md`
- `wiki/passport/live-bmu-runtime-2026-05-08.md`
- `wiki/passport/activity-log.md`
- `wiki/passport/activity-log/2026-05-08-chaincode-sequence5-bms-binding.md`

## 검증
- `node -c bmu-agent/routes/passport.routes.js && node -c bmu-agent/routes/bmu.routes.js && node -c bmu-agent/middleware/chaincode-error.js && node -c bmu-agent/tests/route-validation.test.js && node -c bmu-agent/tests/chaincode-error.test.js` → pass
- `cd bmu-agent && npm test` → 36 tests pass
- `node -c bmu-agent/routes/realtime.routes.js && node -c bmu-agent/tests/route-validation.test.js && cd bmu-agent && npm test` → 38 tests pass
- `node -c bmu-agent/services/runtimeBmuSnapshot.service.js && node -c bmu-agent/services/passportSnapshotOverlay.service.js && node -c bmu-agent/routes/bmu.routes.js && node -c bmu-agent/routes/passport.routes.js && node -c bmu-agent/routes/realtime.routes.js && node -c bmu-agent/tests/route-validation.test.js` → pass
- `cd bmu-agent && npm test` → 40 tests pass
- `cd webapp/frontend-react && npx tsc --noEmit --pretty false` → pass
- `cd webapp/frontend-react && npm test -- --run src/pages/PassportsPage.test.tsx src/components/passport-detail/TraceabilityTab.test.tsx src/lib/chaincodeErrorMessages.test.ts` → 3 files / 50 tests pass
- `cd webapp/frontend-react && npm test -- --run src/components/passport-detail/usePassportDetailData.test.ts src/components/passport-detail/PassportDetailHero.test.tsx src/components/passport-detail/DataTab.test.tsx` → 3 files / 32 tests pass
- `cd webapp/frontend-react && npm test -- --run src/components/passport-detail/IdentityTab.test.tsx src/components/passport-detail/usePassportDetailData.test.ts src/components/passport-detail/PassportDetailHero.test.tsx` → 3 files / 38 tests pass
- `cd webapp/frontend-react && npm test` → 168 files / 1269 tests pass
- `cd webapp/frontend-react && npm run build` → pass
- `cd webapp/frontend-react && npx tsc --noEmit --pretty false && npm run build` → pass
- `git diff --check -- bmu-agent webapp/frontend-react/src wiki/passport` → pass

## 런타임 재시작 확인
- 2026-05-08 13:28 KST, 2026-05-06부터 떠 있던 `bmu-agent` 프로세스를 재시작했다.
- 재시작 후 `/api/status` → `fabric=connected`, `contract=passport-contract`.
- MATLAB/BMU 수신 로그가 신규 경로로 전환됨을 확인했다.
  - `action="RecordBMUDataWithPayload"`
  - `bmsBindingCode32=748293644`
  - `bmsBindingCodeHex="0x2c9a0e0c"`
  - `bmsIdentifierMatched=true`
- `GET /api/passports/PASSPORT-E2E-20260508040123`에서 `bmsManagementId`, `bmsBindingId`, `bmsBindingCode32` 반환 확인.
- `GET /api/bmu/records/PASSPORT-E2E-20260508040123?pageSize=3`에서 `rawPayloadHashVerified=true` 반환 확인.
- 2026-05-08 13:34 KST, realtime fallback 반영 후 재시작했다.
  - `GET /api/realtime/passports/PASSPORT-E2E-20260508040123`에서 최신 MATLAB/BMU record가 여권 응답에 overlay됨을 확인했다.
  - 확인값: `currentSoc=58080`, `temperature=36532`, `lastBMUDataID=BMU-0469eb16-d7a2-4822-ae11-b7d0c4a53a75`, `bmsBindingCode32=748293644`.
  - `GET /api/realtime/bmu/PASSPORT-E2E-20260508040123?pageSize=3`에서 최신 BMU 3건, `rawPayloadHashVerified=true` 확인.
  - 이후 최신 확인값: `currentSoc=56251`, `temperature=36818`, `lastBMUDataID=BMU-fed579ee-0990-4a12-a387-e0c7827f5cac`, `rawPayloadHashVerified=true`.
  - Headless UI 확인: `http://localhost:3001/passports/PASSPORT-E2E-20260508040123`에서 SOC `50%`, SOCE `미수집` 표시.
- 2026-05-08 13:53 KST, 개요/list overlay 반영 후 `bmu-agent`를 재시작했다.
  - `/api/realtime/passports?pageSize=10` → 200, 첫 record가 `PASSPORT-E2E-20260508040123`, `currentSoc=22937`, `temperature=35965`, `lastBMUDataID=BMU-7210e52e-eddc-4cd1-811d-4fa5b76c250e`, `bmsBindingCode32=748293644`.
  - `/api/passports?pageSize=10`도 동일하게 live 여권을 선두에 보강하고 최신 BMU 값을 overlay함을 확인했다.
  - `/api/passports/PASSPORT-E2E-20260508040123`의 정적 상세 경로도 `currentSoc=22937`, `temperature=35965`로 overlay됨을 확인했다.
  - Headless UI 확인: `http://localhost:3001/dashboard`가 `?passportId=PASSPORT-E2E-20260508040123`로 보정되고 `SOC (선택)=35 %`, `SOH (선택)=100 %`, `Temperature (BMU)=27.4 ℃` 표시.
  - Headless UI 확인: `http://localhost:3001/passports/PASSPORT-E2E-20260508040123`의 `개요 / 기술 명세`에서 `SOC=35%`, `SOH=100%`, `SOCE=미수집`, `누적 방전=0 사이클` 표시.
- 간헐적 `fc ... must be greater than last valid fc ...`는 재시작 전/중 중복 또는 지연 payload로 보이며 BMS binding mismatch는 아니다.

## 미완료 / 리스크
- Passport 세션에서 직접 Fabric/ACA-Py/live BMU E2E는 실행하지 못했다. 다만 블록체인 세션이 live query/invoke로 sequence 5 계약과 rawPayload reject를 확인했다.
- full physical binding은 여전히 `partially-implemented`다. 48B payload에는 full ID 문자열이 없고 32-bit hint만 있으므로 실제 보드 E2E와 collision 리스크 평가는 후속이다.
- 워킹트리에 블록체인/MCP/임베디드 세션 변경도 함께 있으므로 커밋 시 배터리여권 범위만 분리해야 한다.

## 교훈
- Create 인자를 유지하면서 live sequence 5 트랜잭션을 후속 호출로 붙이는 방식이 가장 안전한 migration 경로다.
- rawPayload 전체를 chaincode에 넘기는 `RecordBMUDataWithPayload`가 있어야 Agent-local 비교와 원장 검증의 의미가 일치한다.
