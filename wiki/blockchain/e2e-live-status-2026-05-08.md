---
title: "E2E Live Status — 2026-05-08"
date: 2026-05-08
tags: [blockchain, e2e, fabric, bmu, bms-binding]
doc_type: status
status: current
---
# E2E Live Status — 2026-05-08

## 현재 결론

MATLAB → dataProcess.py → CMU → BMU → serial_to_agent.py → bmu-agent → Fabric 경로가 정상 동작 중이다.

블록체인 기준으로 BMU 데이터는 `RecordBMUDataWithPayload` 경로를 타고 있으며, raw 48B payload hash와 BMS management identifier binding 검증을 통과한다.

## Live Fabric 기준

- Channel: `passportchannel`
- Chaincode: `passport-contract`
- Version: `1.4`
- Sequence: `6`
- Endorsement policy: `OR('ManufacturerMSP.peer','EVManufacturerMSP.peer','ServiceMSP.peer','RegulatorMSP.peer')`
- 다음 lifecycle 변경: sequence `7`부터 진행

## E2E 식별자

- DID: `4d5CE8NZbkAVJxcypzaVhw`
- Passport: `PASSPORT-E2E-20260508040123`
- Battery: `BATT-E2E-20260508040123`
- BMS management id: `BMS-MGMT-001`
- BMS binding id: `did:battery:001#BMS-MGMT-001`
- BMS binding code:
  - decimal: `748293644`
  - uint32 hex: `0x2c9a0e0c`
  - raw bytes 44..47: `0c 0e 9a 2c`

## 정상 로그 패턴

`/tmp/bmu.log`에서 다음 필드가 함께 보여야 한다.

```json
{
  "message": "BMU recorded",
  "action": "RecordBMUDataWithPayload",
  "did": "4d5CE8NZbkAVJxcypzaVhw",
  "passportId": "PASSPORT-E2E-20260508040123",
  "bmsBindingCode32": 748293644,
  "bmsBindingCodeHex": "0x2c9a0e0c",
  "bmsIdentifierMatched": true
}
```

## 최신 검증 evidence

2026-05-08 13:33 KST 확인:

- `/api/status`: Fabric connected
- `bmu-agent`: PID `64934`, 2026-05-08 13:28 KST 시작
- 실시간 로그에서 `RecordBMUDataWithPayload` 지속 기록
- FC 증가 예시: `8014 → 8316 → 8394`
- CouchDB 최신 BMU record:
  - `status = VALID`
  - `bmsBindingCode32 = 748293644`
  - `rawPayloadHashVerified = true`
  - latest observed `fc = 8394`

## 실패 패턴 해석

- `ENDORSEMENT_POLICY_FAILURE`
  - sequence 5 시점의 채널 `MAJORITY` endorsement 정책과 Manufacturer 단일 peer submit 불일치가 원인.
  - sequence 6에서 OR peer policy로 정상화됨.
- `fc ... must be greater than last valid fc ...`
  - stale bridge spool 또는 재시작 전/중 지연 payload 가능성이 높다.
  - 반복 지속 시 `firmware/tools/spool.db` pending 확인이 필요하다.
- `BMS binding code mismatch`
  - 현재 발생하지 않음.
  - 발생 시 임베디드 raw payload bytes `44..47` 보존 문제를 우선 확인한다.

## 세션 경계

- 블록체인 담당: `chaincode/passport-contract/`, `passport-network/`, lifecycle policy, ledger 검증.
- Passport/API 담당: `bmu-agent/` 재시작, API route/runtime 반영.
- Embedded 담당: raw 48B payload 생성, bytes `44..47` 보존, bridge spool 관리.
