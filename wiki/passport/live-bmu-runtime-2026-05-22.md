---
title: "2026-05-22 MATLAB/BMU live runtime 기준"
date: 2026-05-22
tags: [passport, bmu, matlab, realtime, fabric, aca-py, sequence5]
doc_type: reference
status: current
---
# 2026-05-22 MATLAB/BMU live runtime 기준

## 현재 기준
- `bmu-agent`는 `localhost:3001`에서 Fabric `passport-contract`를 호출한다.
- live Fabric 기준 chaincode는 `passport-contract` Version `1.4`, Sequence `5`다.
- Agent/UI는 sequence를 직접 지정하지 않고 chaincode name `passport-contract`로 호출한다.
- DID 서명 검증은 ACA-Py ledger verkey 조회에 의존하므로 `localhost:8031`이 내려가 있으면 BMU POST가 chain 기록까지 가지 못한다.
- `cloud-agent`/read model `localhost:3002`는 선택 경로다. 꺼져 있어도 Passport UI는 Fabric + runtime BMU snapshot overlay로 최신값을 표시한다.
- 임베디드 Option B(HSE NVM-backed FC persistence) 적용 후 BMU는 부팅마다 `0xNN000000` FC jump-start를 사용한다. CMU의 `1,2,3...` 카운터는 BMU에서 재작성되므로 chain에는 도달하지 않는다.

## 현재 MATLAB/BMU 대상
- Passport ID: `MATLAB-BMU-002`
- Battery ID: `BMU-LIVE-20260522`
- DID: `HgBpAxtHJ4qRwsNiroaqvC`
- BMS management ID: `BMS-MGMT-001`
- BMS binding ID: `did:battery:001#BMS-MGMT-001`
- BMS binding code: `748293644` / `0x2c9a0e0c`
- rawPayload bytes `44..47`: `0c 0e 9a 2c` little-endian → `0x2c9a0e0c`

## 필수 런타임
| 항목 | 기준 |
|------|------|
| bmu-agent | `localhost:3001` |
| ACA-Py inbound | `localhost:8030` |
| ACA-Py admin | `localhost:8031` |
| VON webserver | `localhost:9000` |
| Fabric channel | `passportchannel` |
| Fabric contract | `passport-contract` |

## Option B 이후 운영 기준
- `POST /api/bmu/reset-fc`는 유지하되 평상시 호출 `0회/일`이 정상이다.
- reset-fc 성공 호출은 `RESET_FC_CALLED` red alert로 간주한다.
  - 의미: DID 회전, counter 손상, embedded fail-safe halt, manufacturing 단계 새 보드 onboard, 또는 256-boot wrap 근접 가능성
- `GET /api/bmu/operations/status`가 최근 24h process-local max FC를 반환한다.
- max FC가 `0xf8000000` 이상이면 `FC_WRAP_NEAR` yellow alert를 반환한다.
- ingest decoded log는 다음 FC 필드를 남긴다.

```text
"action":"BMUIngestDecoded"
"fc":587202560
"fcHex":"0x23000000"
"fcBootSlot":35
"fcBootOffset":0
"fcJumpStartPattern":true
```
- BMU UART `[HSE]`, `[FATAL]` 라인은 sample ingest와 분리해서 `POST /api/bmu/event`로 올린다. 이 endpoint는 JWT + Manufacturer 권한으로 인증한 뒤 `logs/agent.log`에 `category="hse"` 이벤트 한 줄을 남긴다.

```json
{
  "level": "fatal",
  "eventType": "HSE_NVM_READ_FAIL",
  "source": "bmu-uart",
  "message": "[FATAL] HSE NVM counter read failed",
  "fcHex": "0xf8000001",
  "data": {
    "status": "NVM_READ_FAIL"
  }
}
```

## 데이터 흐름
1. MATLAB/BMU가 bridge를 통해 `POST /api/bmu/data`로 rawPayload + DID + signature를 전송한다.
2. `bmu-agent/routes/bmu.routes.js`가 ACA-Py로 DID verkey를 조회하고 Ed25519 signature를 검증한다.
3. DID로 `QueryBatteryByDID`를 호출해 `MATLAB-BMU-002`를 찾는다.
4. 여권의 `bmsManagementId=BMS-MGMT-001` 기준으로 rawPayload의 `bmsBindingCode32=0x2c9a0e0c`를 비교한다.
5. binding이 맞으면 `RecordBMUDataWithPayload`를 호출한다.
6. 성공 record는 원장에 남고, 동시에 `runtimeBmuSnapshot.service.js`에 최신 snapshot으로 저장된다.
7. 여권 API는 최신 BMU record를 `currentSoc`, `currentTemperature`, `currentStatusFlags`, `totalDischargeCycles`, `latestDataHash`, `latestRawPayloadHashVerified`에 overlay한다.

## 2026-05-22 확인값
`localhost:3001` 기준:

- `/api/status` → `fabric=connected`, `channel=passportchannel`, `contract=passport-contract`, `org=ManufacturerMSP`
- `/api/passports/MATLAB-BMU-002`
  - `currentSoc=56609`
  - `currentTemperature=38583`
  - `temperature=38583`
  - `latestRawPayloadHashVerified=true`
  - `bmsBindingCode32=748293644`
  - `bmsBindingCodeHex=0x2c9a0e0c`
- `/api/bmu/records/MATLAB-BMU-002?pageSize=3`
  - latest `fc=1269810`
  - latest `rawPayloadHashVerified=true`

## 정상 로그 패턴
```text
"action":"RecordBMUDataWithPayload"
"passportId":"MATLAB-BMU-002"
"did":"HgBpAxtHJ4qRwsNiroaqvC"
"bmsBindingCode32":748293644
"bmsBindingCodeHex":"0x2c9a0e0c"
"bmsIdentifierMatched":true
```

## 문제 구분
- `no passport found for DID ...`
  - DID→passport seed/index 또는 조회 컨텍스트 문제다.
  - 2026-05-22 fresh seed 후 `HgBpAxtHJ4qRwsNiroaqvC → MATLAB-BMU-002`로 정상 확인됐다.
- ACA-Py `:8031` down
  - 서명 검증 전 단계에서 막힌다.
  - VON/ACA-Py는 블록체인/인프라 세션 담당으로 넘긴다.
- `BMS binding code mismatch`
  - rawPayload bytes `44..47`이 `0c 0e 9a 2c`로 보존되지 않은 경우를 우선 의심한다.
- UI 개요 일부가 0으로 남음
  - 2026-05-22에 `currentTemperature/currentStatusFlags/latestRawPayloadHashVerified` overlay를 보정했다.
- reset-fc 호출 발생
  - Option B 이후에는 일반 복구 루틴이 아니라 alert다. `BMU 운영` 화면과 `RESET_FC` audit/action log를 확인한다.

## 관련 문서
- [[passport/activity-log/2026-05-22-matlab-live-stream-recovery|2026-05-22 MATLAB live stream E2E 복구]]
- [[passport/live-bmu-runtime-2026-05-08|2026-05-08 MATLAB/BMU live runtime 기준]]
