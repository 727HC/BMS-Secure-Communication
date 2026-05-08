---
title: "2026-05-08 VC holder DID/expiry 계약 동기화"
date: 2026-05-08
tags: [passport, vc, chaincode-contract, validation]
doc_type: activity-log
status: current
---
# 2026-05-08 VC holder DID/expiry 계약 동기화

## 작업 주체
- Codex / 배터리여권 세션

## 작업 내용
- 블록체인 세션 전달 계약 반영:
  - `IssueCredential`의 `holderDid`는 `passport.did`로 고정.
  - VC `expiresAt` date-only 입력(`YYYY-MM-DD`)은 원장 제출 전 `YYYY-MM-DDT00:00:00Z`로 정규화.
  - `holder DID mismatch`, malformed RFC3339, `dataHash`, `signature` 계열 validation error를 `VAL`/한국어 토스트로 매핑.
- VC 발급 모달에서 임의 Holder DID 입력을 제거하고 원장 여권 DID read-only 표시로 변경.
- VC 발급 credType 옵션을 chaincode 허용 값(`BATTERY_PASSPORT`, `BATTERY_HEALTH`, `MAINTENANCE`, `COMPLIANCE`, `RECYCLING`)으로 정리.
- `bmu-agent` `/api/vc/issue`가 `QueryPassport`로 `passport.did`를 확인하고 blank holderDid를 기본값 처리하며 mismatch는 chaincode submit 전에 400으로 거부.

## 변경 파일
- `bmu-agent/routes/vc.routes.js`
- `bmu-agent/middleware/chaincode-error.js`
- `bmu-agent/tests/route-validation.test.js`
- `bmu-agent/tests/chaincode-error.test.js`
- `webapp/frontend-react/src/components/modals/passport-detail/VcIssueModal.tsx`
- `webapp/frontend-react/src/components/modals/passport-detail/VcIssueModal.test.tsx`
- `webapp/frontend-react/src/components/passport-detail/PassportDetailModalRouter.tsx`
- `webapp/frontend-react/src/components/passport-detail/PassportDetailModalRouter.test.tsx`
- `webapp/frontend-react/src/components/passport-detail/usePassportMutations.ts`
- `webapp/frontend-react/src/components/passport-detail/usePassportMutations.test.ts`
- `webapp/frontend-react/src/pages/PassportDetailPage.tsx`
- `webapp/frontend-react/src/lib/chaincodeErrorMessages.ts`
- `webapp/frontend-react/src/lib/chaincodeErrorMessages.test.ts`
- `wiki/passport/activity-log.md`
- `wiki/passport/activity-log/2026-05-08-vc-holder-expiry-contract.md`

## 검증
- `node -c bmu-agent/routes/vc.routes.js && node -c bmu-agent/middleware/chaincode-error.js && node -c bmu-agent/tests/route-validation.test.js && node -c bmu-agent/tests/chaincode-error.test.js` → pass
- `cd bmu-agent && npm test` → 26 tests pass
- `cd webapp/frontend-react && npx tsc --noEmit --pretty false` → pass
- `cd webapp/frontend-react && npm test -- --run src/components/modals/passport-detail/VcIssueModal.test.tsx src/components/passport-detail/PassportDetailModalRouter.test.tsx src/components/passport-detail/usePassportMutations.test.ts src/lib/chaincodeErrorMessages.test.ts` → 4 files / 69 tests pass
- `cd webapp/frontend-react && npm test` → 168 files / 1267 tests pass
- `cd webapp/frontend-react && npm run build` → pass
- `git diff --check -- bmu-agent webapp/frontend-react/src wiki/passport` → pass

## 미완료 / 리스크
- 실제 Fabric/ACA-Py 환경에서 VC 발급 E2E는 실행하지 못했다. route test는 Fabric service mock 기반이다.
- `git status --short` 기준 블록체인/MCP 세션 파일 변경이 같은 워킹트리에 존재한다. 배터리여권 커밋/패치 작성 시 범위 혼입 주의.

## 교훈
- chaincode가 holder/evidence binding을 강화하면 UI에서 임의 DID 입력을 남겨두면 사용자 실패 경로가 된다.
- HTML date input은 date-only 값을 내보내므로 API mutation 또는 agent 계층에서 원장 제출 형식을 명시적으로 정규화해야 한다.
