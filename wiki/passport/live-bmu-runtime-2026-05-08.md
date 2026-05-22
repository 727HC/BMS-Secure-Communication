---
title: "2026-05-08 MATLAB/BMU live runtime 기준"
date: 2026-05-08
tags: [passport, bmu, matlab, realtime, fabric, sequence5]
doc_type: reference
status: superseded
---
# 2026-05-08 MATLAB/BMU live runtime 기준

> 2026-05-22 현재 live target은 `MATLAB-BMU-002` / `HgBpAxtHJ4qRwsNiroaqvC`다. 최신 기준은 [[passport/live-bmu-runtime-2026-05-22|2026-05-22 MATLAB/BMU live runtime 기준]]을 본다.

## 현재 기준
- `bmu-agent`는 `localhost:3001`에서 Fabric `passport-contract`를 호출한다.
- `cloud-agent`/read model `localhost:3002`는 선택 경로다. 꺼져 있어도 Passport UI는 Fabric + runtime BMU snapshot fallback으로 최신값을 표시한다.
- live Fabric 기준은 `passport-contract` Version `1.4`, Sequence `5`다.
- Agent/UI는 chaincode name `passport-contract`만 호출하며 sequence를 직접 지정하지 않는다.

## 현재 MATLAB/BMU 대상
- Passport ID: `PASSPORT-E2E-20260508040123`
- DID: `4d5CE8NZbkAVJxcypzaVhw`
- BMS management ID: `BMS-MGMT-001`
- BMS binding ID: `did:battery:001#BMS-MGMT-001`
- BMS binding code: `748293644` / `0x2c9a0e0c`
- rawPayload bytes `44..47`: `0c 0e 9a 2c` little-endian → `0x2c9a0e0c`

## 데이터 흐름
1. MATLAB/BMU가 `POST /api/bmu/data`로 rawPayload + DID + signature를 전송한다.
2. `bmu-agent/routes/bmu.routes.js`가 DID로 passport를 찾고 BMS binding이 있으면 `RecordBMUDataWithPayload`를 호출한다.
3. 성공한 BMU record는 원장에 기록되고, 동시에 `runtimeBmuSnapshot.service.js`에 최신 runtime snapshot으로 보관된다.
4. UI 조회 경로는 다음 순서로 최신값을 보강한다.
   - `/api/realtime/passports/:id`
   - `/api/realtime/bmu/:passportId`
   - `/api/passports/:id`
   - `/api/passports`
   - `/api/realtime/passports`
5. cloud-agent가 unavailable이면 Fabric `QueryPassport`, `QueryBMURecordsByPassport`로 fallback한다.
6. Fabric 첫 페이지에 live passport가 없으면 runtime snapshot의 passport를 목록 선두에 보강한다.

## UI 표시 기준
- Dashboard 개요는 `/api/realtime/passports` 목록에서 live passport를 선두로 받아 기본 선택한다.
- Passport detail은 `/api/realtime/passports/:id`와 `/api/realtime/bmu/:id`를 3초 주기 silent refresh한다.
- MATLAB/BMU가 제공하지 않는 `SOCE=0`은 `0%`가 아니라 `미수집`으로 표시한다.
- `누적 방전=0 사이클`은 현재 rawPayload의 실제 `dischargeCycles=0`이며 UI 오류가 아니다.

## 2026-05-08 13:53 KST 확인값
`localhost:3001` 기준:

- `/api/status` → `fabric=connected`, `contract=passport-contract`, `org=ManufacturerMSP`
- `/api/realtime/passports?pageSize=10` → 첫 record가 `PASSPORT-E2E-20260508040123`
  - `currentSoc=22937`
  - `temperature=35965`
  - `lastBMUDataID=BMU-7210e52e-eddc-4cd1-811d-4fa5b76c250e`
  - `bmsBindingCode32=748293644`
- `/api/passports/PASSPORT-E2E-20260508040123`도 같은 BMU overlay 값을 반환했다.
- Headless UI 확인:
  - Dashboard `SOC (선택)=35 %`, `SOH (선택)=100 %`, `Temperature (BMU)=27.4 ℃`
  - Passport detail 개요 `SOC=35%`, `SOH=100%`, `SOCE=미수집`, `누적 방전=0 사이클`

## 정상 로그 패턴
```text
"action":"RecordBMUDataWithPayload"
"bmsBindingCode32":748293644
"bmsBindingCodeHex":"0x2c9a0e0c"
"bmsIdentifierMatched":true
```

## 알려진 리스크
- runtime snapshot은 프로세스 메모리이므로 `bmu-agent` 재시작 직후 첫 MATLAB packet이 들어오기 전까지 목록 보강이 비어 있을 수 있다.
- cloud-agent read model은 아직 꺼져 있다. 현재 demo 기준은 Fabric fallback + runtime snapshot이다.
- `fc ... must be greater than last valid fc ...`는 중복/지연 payload로 발생할 수 있으며 BMS binding mismatch와 다르다.
- live passport를 목록 선두에 보강하므로 dashboard 총량 count가 base Fabric page count보다 1 증가할 수 있다.

## 관련 변경 파일
- `bmu-agent/routes/bmu.routes.js`
- `bmu-agent/routes/passport.routes.js`
- `bmu-agent/routes/realtime.routes.js`
- `bmu-agent/services/runtimeBmuSnapshot.service.js`
- `bmu-agent/services/passportSnapshotOverlay.service.js`
- `webapp/frontend-react/src/components/passport-detail/usePassportDetailData.ts`
- `webapp/frontend-react/src/components/passport-detail/IdentityTab.tsx`
