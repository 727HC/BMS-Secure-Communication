---
title: "BMS management identifier binding handoff"
date: 2026-05-08
tags: [embedded, bmu, bms-identifier, handoff, passport]
doc_type: handoff
status: current
---
# BMS management identifier binding handoff

## 배경

Passport 세션의 `wiki/passport/cross-session-handoff-2026-05-08.md`가 임베디드 세션에 넘긴 쟁점은 다음이다.

- 48-byte BMU payload 호환성을 깨지 말 것.
- DID + 실물 배터리 + BMS management identifier binding 근거를 정리할 것.
- 장비 없이 검증 가능한 parser/protocol 샘플을 제공할 것.

## 현재 근거

| 항목 | 현재 상태 | 근거 |
|---|---|---|
| payload 크기 | 48B 고정 | `BatteryData_t` |
| bytes 40..43 | `freshness_counter` | CMU가 송신 직전 overwrite |
| bytes 44..47 | 기존 `reserved[4]` | parser는 무시, BMU 서명에는 포함 |
| signature target | 전체 48B raw payload | BMU `[SIGN] ... DATA=<96hex>` |
| Agent chaincode 입력 | `dataHash`, `timestamp`는 Agent가 생성 | `/api/bmu/data` route |

강화된 `RecordBMUData` 조건에 대한 임베디드 영향:

- `signature`는 비어 있으면 안 된다. BMU는 `[SIGN]`을 출력하고 `serial_to_agent.py`는 128 lowercase hex로 전송한다.
- `dataHash`는 48B `rawPayload`의 SHA-256으로 Agent가 생성한다. 펌웨어/bridge가 직접 넘기지 않는다.
- `timestamp`는 Agent가 `new Date().toISOString()`으로 생성한다. 펌웨어/bridge가 직접 넘기지 않는다.
- current/voltage는 음수/양수 모두 가능하지만 NaN/Inf는 chaincode에서 reject된다.
- DID/passport match와 FC 단조 증가는 기존과 동일하다.

## 결정: v1.1 bmsBindingCode32

기존 payload를 깨지 않기 위해 bytes `44..47`의 `reserved[4]`를 다음처럼 재해석한다.

```text
reserved[4] / bmsBindingCode32
  offset: 44
  size:   4 bytes
  type:   uint32 little-endian
  value:  first 32 bits of SHA-256(canonical BMS management identifier)
  zero:   legacy / binding not supplied
```

예시 canonical ID:

```text
BMS-MGMT-001
```

이 방식의 장점:

- 48-byte payload와 CAN-FD 64B frame을 유지한다.
- 기존 `bmu-agent/services/bmu-parser.service.js`는 reserved bytes를 무시하므로 즉시 깨지지 않는다.
- BMU Ed25519 signature와 Agent `dataHash`가 전체 48B를 대상으로 하므로 `bmsBindingCode32`도 서명/해시에 포함된다.

제약:

- 32-bit hint는 full identifier가 아니므로 충돌 리스크가 있다.
- full `bmsManagementId`는 Passport/Chaincode binding record에 저장해야 한다.
- production v2에서는 더 큰 signed metadata 또는 payload 확장이 필요하다.

## 배터리여권 전달 답변

1. BMU/CMU payload timestamp
   - 48B payload에는 RFC3339 timestamp를 싣지 않는다.
   - 현재 bytes `36..37`은 `timestamp_ms` uint16이다.
   - chaincode용 RFC3339 `timestamp`는 Agent가 `/api/bmu/data`에서 `new Date().toISOString()`으로 생성한다.
2. signature 형식
   - BMU는 `[SIGN] FC=... R=<64hex> S=<64hex> DATA=<96hex>`를 출력한다.
   - `serial_to_agent.py`는 `R || S`를 `signature`로 묶어 128-char lowercase hex로 전송한다.
   - Agent는 empty/`none`, 비-hex, 길이 128이 아닌 값을 reject한다.
3. dataHash 원천
   - firmware/bridge는 `dataHash`를 만들지 않는다.
   - Agent가 48B `rawPayload` bytes에 대해 `SHA-256`을 계산해 64-char lowercase hex로 chaincode에 넘긴다.
4. BMS management identifier 위치
   - v1.1은 bytes `44..47` 기존 `reserved[4]`를 `bmsBindingCode32` little-endian으로 재사용한다.
   - 값은 canonical BMS management identifier의 SHA-256 앞 4 bytes이다.
   - `0x00000000`은 legacy/binding 미제공이다.
5. Backward-compatible sample/failure conditions
   - 샘플은 `firmware/tools/test_bms_identifier_payload.py`가 생성한다.
   - 실패 조건: invalid 48B/96-hex `rawPayload`, missing/non-lowercase/길이 불일치 `signature`, DID/passport mismatch, stale FC, binding-required인데 `bmsBindingCode32 == 0`, stored binding과 code mismatch, NaN/Inf current/voltage.
   - chaincode를 Agent 우회로 직접 호출하면 invalid `dataHash` 또는 non-RFC3339 `timestamp`도 실패한다.

## BMS PDF 1~3차년도 대조

Source:
- `wiki/Object/BMS__.pdf`
- `wiki/passport/bms-1-3-year-mapping-2026-05-08.md`

2026년은 3차년도 기준이다. 임베디드 범위의 현재 반영 상태는 다음이다.

| 연차 요구 | 임베디드 반영 상태 | 근거/갭 |
|---|---|---|
| 1차년도 BMU/CMU 보안 요구사항 분석, protocol/payload/security service 설계 | partially-implemented | `firmware/README.md`, `firmware/common/bms_protocol.h`에 CAN-FD 48B payload, AES-CMAC, AES-CBC, FC, resync, Ed25519 흐름 명시 |
| 2차년도 BMU/CMU 시스템 보안 요소기술 개발 | partially-implemented | AES/CMAC/CBC/Ed25519 protocol test와 producer tools 있음. 실제 보드 반영/계측은 E2E 필요 |
| 3차년도 BMU-CMU 보안 연동 및 상위 플랫폼 연동, 기능/성능 평가 | partially-implemented | BMU signed 48B rawPayload -> Agent/Fabric 경로와 `bmsBindingCode32` hint 마련. hardware E2E, 성능평가, full BMS ID 저장/검증은 남음 |
| 3차년도 DID + 실물 배터리 + BMS 관리 식별자 바인딩 | partially-implemented | bytes `44..47` `reserved[4]`를 `bmsBindingCode32`로 재사용해 48B 호환 유지. full ID binding record는 Passport/Chaincode 필요 |

임베디드 세션 결론:
- 1~3차년도 요구 중 BMU/CMU 보안 통신과 상위 플랫폼 연결 표면은 존재한다.
- 이번 조치는 3차년도의 `BMS 관리 식별자` 바인딩 근거를 48B payload 안에서 backward-compatible하게 마련한 것이다.
- 완전 충족 판정에는 실제 보드 E2E, 성능/부하 수치, Passport/Chaincode full identifier 계약, MCP 모니터링 증적이 필요하다.

## 타 세션 전달 메모

Passport 세션:
- 반영 완료: `rawPayload` bytes `44..47`을 `readUInt32LE(44)`로 `bmsBindingCode32` 노출.
- 반영 완료: Agent timestamp는 계속 `new Date().toISOString()` RFC3339를 사용.
- 반영 완료: `BMU_BINDING_REQUIRED=true`이면 `bmsBindingCode32 == 0` reject.

Blockchain 세션:
- chaincode `BindBMSIdentifier`에는 `BMS-MGMT-001`, `did:battery:001#BMS-MGMT-001`, `b3c37ed2cdd2831cc0c212445905ced4a20ea51e129bff2e7418deddf7223178`를 lab 기준값으로 넣으면 된다.
- canonical `bmsManagementId`의 `SHA-256` 앞 4 bytes little-endian uint32가 payload의 `bmsBindingCode32`와 일치하는지 비교해야 한다.
- `dataHash`는 48B rawPayload 전체 해시이므로 bytes `44..47` hint도 자동 포함된다.

MCP 세션:
- 모니터링 이벤트에 missing signature, invalid rawPayload, stale FC, DID mismatch, binding code zero/mismatch를 분리해서 표시하면 좋다.
- 성능/상호연동 증적은 `BMU -> Agent -> Fabric -> Passport/MCP` 경로 기준으로 남겨야 3차년도 검증표에 연결된다.

## 최종 확정 payload 규칙

- full `bmsManagementId` / `bmsBindingId` 문자열은 48B payload에 싣지 않는다.
- bytes `44..47` 기존 reserved 영역에 32-bit little-endian hint만 싣는다.
- `bmsBindingCode32 = first32LE(SHA-256("BMS-MGMT-001"))`
- 확정값은 `0x2c9a0e0c`이다.
- `dataHash`는 반드시 raw 48B payload 전체의 SHA-256이어야 한다.
- `bmsBindingCode32 == 0`은 binding-required 상황에서 Passport Agent가 reject한다.
- payload layout 변경이 필요하면 Passport/Blockchain 세션에 먼저 알린다.
- 현재 physical binding은 32-bit hint 기반이라 collision 리스크는 후속 평가가 필요하다.

## 블록체인 저장/검증 계약 반영

블록체인 세션 계약에 맞춰 임베디드/BMU lab 기준값을 아래로 확정한다.

```text
bmsManagementId: BMS-MGMT-001
bmsBindingId: did:battery:001#BMS-MGMT-001
bmsBindingCode32: 0x2c9a0e0c
evidenceHash: b3c37ed2cdd2831cc0c212445905ced4a20ea51e129bff2e7418deddf7223178
```

Derivation:
- `bmsBindingCode32 = first32LE(SHA-256("BMS-MGMT-001"))`
- `evidenceHash = SHA-256(canonical JSON {bmsManagementId,bmsBindingId,bmsBindingCode32})`

Chaincode binding call shape:

```text
BindBMSIdentifier(
  passportId,
  "BMS-MGMT-001",
  "did:battery:001#BMS-MGMT-001",
  "b3c37ed2cdd2831cc0c212445905ced4a20ea51e129bff2e7418deddf7223178",
  "initial BMS management identifier binding"
)
```

Payload limitation:
- 48B BMU payload에는 full `bmsManagementId` 또는 `bmsBindingId` 문자열을 싣지 않는다.
- payload에는 bytes `44..47`의 32-bit hint만 들어간다.
- 따라서 현재 physical binding은 `partially-implemented`가 맞다. 완전 구현은 Passport/Chaincode가 저장한 full ID와 Agent/parser가 추출한 `bmsBindingCode32` 비교까지 연결되어야 한다.

## Producer contract

임베디드 producer는 둘 중 하나를 사용한다.

```bash
python firmware/tools/dataProcess.py --bms-management-id BMS-MGMT-001
python firmware/tools/dataProcess.py --bms-binding-code 0x12345678
```

`battery_simulator.py` direct UART dry-run도 같은 옵션을 지원한다. UDP mode는 Simulink-format doubles만 보내므로 실제 reserved injection은 `dataProcess.py`에서 수행한다.

## Passport/Agent 반영 계약

기존 POST body는 유지한다.

```json
{
  "did": "did:example:bmu-lab-001",
  "rawPayload": "<96 lowercase hex chars>",
  "signature": "<128 lowercase hex chars>"
}
```

Passport/Agent 반영 상태:
- `bmsBindingCode32` parser 노출 완료.
- Agent RFC3339 timestamp 유지 완료.
- `BMU_BINDING_REQUIRED=true` zero binding reject 완료.

추가 비교/표시 필드:

| 필드 | 타입 | 위치 | 실패 조건 |
|---|---|---|---|
| `bmsBindingCode32` | uint32 | `rawPayload` bytes 44..47 LE | binding-required인데 0이면 실패 |
| `bmsBindingCodeHex` | string | derived | passport binding hash와 불일치하면 실패 |
| `bindingSignals.didMatched` | boolean | DID/passport | false면 실패 |
| `bindingSignals.fcMatched` | boolean | chaincode lastFc | stale/replay면 실패 |
| `bindingSignals.bmsIdMatched` | boolean | bmsBindingCode32 vs stored full ID hash | false면 physical binding partial/fail |

## 장비 없이 검증

```bash
python firmware/tools/test_bms_identifier_payload.py
python firmware/tools/test_payload_encryption.py
python -m py_compile firmware/tools/battery_simulator.py firmware/tools/dataProcess.py firmware/tools/serial_monitor.py firmware/tools/serial_to_agent.py firmware/tools/test_bms_identifier_payload.py firmware/tools/test_payload_encryption.py
```

`test_bms_identifier_payload.py`는 다음을 검증한다.

- legacy reserved bytes는 `00000000`이다.
- `bmsManagementId`가 있으면 bytes 44..47에 `bmsBindingCode32`가 들어간다.
- raw payload는 계속 48B / 96 hex chars다.
- Agent가 생성할 `dataHash`는 64-char SHA-256 hex다.
- sample POST body는 기존 `/api/bmu/data` shape를 깨지 않는다.

## 남은 E2E 항목

- 실제 CMU/BMU 보드에서 non-zero bytes `44..47`이 CAN-FD, BMU 서명, `serial_to_agent.py`, Agent parser까지 보존되는지 확인.
- Chaincode 저장값 `BatteryPassport.bmsManagementId` / `bmsBindingId`와 Agent가 추출한 `bmsBindingCode32` 비교 결과가 `physicalHistoryVerification.signals.bmsIdentifierMatched`로 기록되는지 확인.
- 32-bit hint 충돌 리스크를 v2 signed metadata로 줄이는 설계.
