---
title: "ResetFCForDID 운영 runbook"
date: 2026-05-19
tags: [blockchain, operations, bmu]
doc_type: runbook
status: current
---
# ResetFCForDID 운영 runbook

## 목적

BMU/CMU 재부팅으로 FC가 1부터 다시 시작해 체인코드의 DID별 단조 증가 검증(`fc > lastFc`)에 막힐 때, passport binding은 유지한 채 FC high-water만 운영자가 명시적으로 reset한다.

## 전제

- 체인코드: `passport-contract` v1.2 / sequence 3 이상
- 함수: `ResetFCForDID(did, reason)`
- 권한: `ManufacturerMSP` 또는 `RegulatorMSP`
- 자동 호출 금지: bridge/agent는 reset을 직접 호출하지 않고 alert만 낸다.

## 수동 호출

```bash
scripts/invoke-reset-fc-for-did.sh \
  HgBpAxtHJ4qRwsNiroaqvC \
  "BMU board reboot mid-session caused FC counter reset to 1. Chaincode lastFc=18846 from prior valid stream. Restoring continuity for production validation." \
  MATLAB-BMU-002
```

RegulatorMSP로 호출해야 하면:

```bash
ORG=4 scripts/invoke-reset-fc-for-did.sh <did> "<reason >= 10 chars>" <passport_id>
```

## 기대 결과

- invoke 결과: `status:200`
- `CheckBMUHotBinding(passportId,did)`:
  - `status=canonical`
  - `boundPassportId=<passport_id>`
  - `hasFc=false`
  - `legacy=false`
  - `mismatch=false`
- bridge를 `--min-fc` 없이 재기동하면 현재 BMU FC부터 기록이 재개된다.

## 감사 흔적

체인코드는 reset마다 다음을 남긴다.

- state key/event name: `FCRESET-{did}-{txid}`
- payload: DID, passportId, reason, previousFc, hasFc, invoker MSP, resetAt

## 금지/주의

- 자동 reset 호출 금지. 운영자 확인 후 수동 호출만 허용한다.
- CANoe/fixture replay가 남아 있는 DID에는 reset을 남발하지 않는다.
- reason에 secret, token, 개인 로컬 경로를 넣지 않는다.
- reset 직후 live ingest가 실제로 재개되는지 확인한다.
