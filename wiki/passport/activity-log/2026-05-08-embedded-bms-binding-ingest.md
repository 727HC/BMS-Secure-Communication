---
title: "2026-05-08 임베디드 BMS binding handoff 반영"
date: 2026-05-08
tags: [passport, embedded-handoff, bmu, bms-identifier, binding]
doc_type: activity-log
status: current
---
# 2026-05-08 임베디드 BMS binding handoff 반영

## 작업 주체
- Codex / 배터리여권 세션

## 작업 내용
- 임베디드 세션의 `wiki/embedded/bms-management-identifier-binding-2026-05-08.md` 전달사항을 Passport 범위에 반영했다.
- `rawPayload` bytes `44..47`을 `readUInt32LE(44)`로 읽어 `bmsBindingCode32`와 `bmsBindingCodeHex`를 노출했다.
- payload 내부 `timestamp_ms`는 계속 센서 내부 tick으로만 유지하고, chaincode용 RFC3339 timestamp는 `/api/bmu/data`에서 `new Date().toISOString()`으로 생성하는 기존 계약을 확인했다.
- `BMU_BINDING_REQUIRED=true` 환경에서는 `bmsBindingCode32 == 0`을 400 `VAL`로 거부하도록 했다. 기본값은 legacy 호환을 위해 false다.
- invalid rawPayload parser 오류를 500이 아니라 400 `VAL`로 반환하도록 정리했다.
- physical verification signal에 chaincode 키와 맞춘 `bmsIdentifierMatched`를 추가했다.

## 변경 파일
- `bmu-agent/services/bmu-parser.service.js`
- `bmu-agent/routes/bmu.routes.js`
- `bmu-agent/routes/passport.routes.js`
- `bmu-agent/tests/bmu-parser.test.js`
- `bmu-agent/tests/route-validation.test.js`
- `bmu-agent/README.md`
- `webapp/frontend-react/src/components/modals/passport-detail/PhysicalVerificationModal.tsx`
- `webapp/frontend-react/src/components/modals/passport-detail/PhysicalVerificationModal.test.tsx`
- `webapp/frontend-react/src/components/passport-detail/usePassportMutations.ts`
- `webapp/frontend-react/src/components/passport-detail/usePassportMutations.test.ts`
- `webapp/frontend-react/src/components/passport-detail/types.ts`
- `wiki/passport/bms-1-3-year-mapping-2026-05-08.md`
- `wiki/passport/cross-session-handoff-2026-05-08.md`
- `wiki/passport/activity-log.md`
- `wiki/passport/activity-log/2026-05-08-embedded-bms-binding-ingest.md`

## 검증
- `node -c bmu-agent/services/bmu-parser.service.js && node -c bmu-agent/routes/bmu.routes.js && node -c bmu-agent/routes/passport.routes.js && node -c bmu-agent/tests/bmu-parser.test.js && node -c bmu-agent/tests/route-validation.test.js` → pass
- `cd bmu-agent && npm test` → 30 tests pass
- `cd webapp/frontend-react && npx tsc --noEmit --pretty false` → pass
- `cd webapp/frontend-react && npm test -- --run src/components/modals/passport-detail/PhysicalVerificationModal.test.tsx src/components/passport-detail/usePassportMutations.test.ts` → 2 files / 22 tests pass
- `cd webapp/frontend-react && npm test` → 168 files / 1267 tests pass
- `cd webapp/frontend-react && npm run build` → pass
- `git diff --check -- bmu-agent webapp/frontend-react/src wiki/passport` → pass

## 미완료 / 리스크
- full `bmsManagementIdentifier` 저장/검증 계약은 chaincode/블록체인 세션이 필요하다.
- `bmsBindingCode32`는 32-bit hint이므로 충돌 리스크가 있다. production v2에서는 더 큰 signed metadata가 필요하다.
- 실제 보드 E2E에서 non-zero bytes 44..47이 CAN-FD, BMU 서명, `serial_to_agent.py`, Agent까지 보존되는지 확인이 필요하다.
- binding mismatch 비교는 stored full ID 계약이 없어서 아직 Agent 단독으로 수행하지 않는다.

## 교훈
- 48B payload 호환을 유지하려면 reserved bytes를 먼저 증적 필드로 노출하고, full identifier 검증은 chaincode 계약과 분리하는 방식이 안전하다.
