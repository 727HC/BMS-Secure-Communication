# BMU Agent

배터리 여권 플랫폼(BATP)의 백엔드 API 서버. React 프론트(`webapp/frontend-react`)와 Hyperledger Fabric 체인코드(`chaincode/passport-contract`) 사이를 잇는다. BMU 하드웨어가 올려 보내는 서명된 센서 데이터를 검증·기록하고, 여권 CRUD·VC 발급·정비·재활용 lifecycle API를 조직 권한(MSP) 기반으로 제공한다.

## 스택

- **Node.js (Express)**
- **fabric-network** — Hyperledger Fabric 2.5 Gateway SDK
- **ACA-Py (Aries)** — DID/VC 발급·검증 (선택)
- **JWT** — 조직별 사용자 인증
- **CouchDB** — chaincode world state (rich query)
- **서명 검증**: Ed25519 (BMU → Agent), SHA-256 (dataHash)

## 실행

```bash
npm install
FABRIC_ORG=1 node server.js                 # 기본 3001 포트
# 환경변수
PORT=3001                                   # 서버 포트
FABRIC_ORG=1|2|3|4                          # 소속 조직 (1=Manufacturer, 4=Regulator)
ALLOW_OPEN_REGISTRATION=false               # true면 /auth/register 공개 (개발용)
BMU_RATE_LIMIT=200                          # /api/bmu/data IP당 1분 한도
BMU_BINDING_REQUIRED=false                  # true면 rawPayload bytes 44..47 bmsBindingCode32=0 거부
BMS_MANAGEMENT_ID=BMS-MGMT-001              # 초기 BMS binding 기본 canonical ID
BMS_BINDING_ID=did:battery:001#BMS-MGMT-001 # 초기 BMS binding 기본 DID fragment
BMS_BINDING_CODE32=0x2c9a0e0c               # SHA-256(BMS_MANAGEMENT_ID) first32LE
BMS_EVIDENCE_HASH=b3c37ed2cdd2831cc0c212445905ced4a20ea51e129bff2e7418deddf7223178 # canonical binding evidence SHA-256
DID_CACHE_MAX=500                           # DID→passportId 캐시 크기
PASSPORT_LIVE_OVERLAY_LIMIT=100             # 목록 조회 시 최신 BMU overlay 대상 수
PASSPORT_LIVE_OVERLAY_CONCURRENCY=8         # BMU overlay Fabric query 동시성
RUNTIME_BMU_SNAPSHOT_MAX=50                 # 프로세스 메모리 최신 BMU snapshot 보관 수
JWT_SECRET=...                              # 토큰 서명 비밀
```

React 빌드(`webapp/frontend-react/dist/`)가 있으면 `/`에서 자동 서빙, 없으면 API만 동작.

## 인증 · 권한

- `POST /api/auth/login` → JWT 발급 (userId · MSP · token)
- 이후 모든 요청은 `Authorization: Bearer <token>`
- `middleware/auth.js` → JWT 검증 → `req.user = { userId, orgMsp, ... }`
- `middleware/rbac.js` → `requireMSP('ManufacturerMSP', ...)` 체인
- `middleware/audit.js` → 모든 `/api/**` 요청을 NDJSON 로그 + 메모리 버퍼 1000건 기록

### 조직(MSP)별 주요 권한

| 조직 | 가능 작업 |
|------|-----------|
| **ManufacturerMSP** | 여권 발급 · 원자재 등록 · 데이터 정정 · BMU 기록 · VC 폐기 목록 조회 |
| **EVManufacturerMSP** | VIN 바인딩 · 정비/분석 요청 · 사고 기록 · 차량 이미지 업로드 |
| **ServiceMSP** | 정비 완료 · 분석 결과 제출 · VC 발급 |
| **RegulatorMSP** | 규제 검증 · 소재 추출 · 폐기 승인 · VC 발급 · 감사 로그 조회 |

## 라우트 그룹

```
/api/auth              POST  /login, /register
/api/passports         GET|POST /, GET /:id, GET /:id/history, GET /:id/corrections
                       PUT  /:id/bind, /:id/regulatory-verification, /:id/physical-verification
                       POST /:id/extended-attributes, /:id/bms-binding, /:id/source-verification
                       POST /:id/correct, /:id/materials, /:id/vehicle-image
                       GET  /:id/vehicle-image
/api/materials         GET, POST /
/api/bmu               POST /data (rate-limited), GET /records/:passportId,
                       POST /invalidate/:recordId
/api/realtime          GET  /passports, /passports/:id, /bmu/:passportId, /stats
/api/maintenance       POST /:id/request, /:id/log, /:id/accident
/api/analysis          POST /:id/request, /:id/result
/api/recycling         PUT  /:id/availability, POST /:id/extract, /:id/dispose
/api/did               POST /register, /verify, GET /verkey/:did
/api/vc                POST /schemas, /credential-definitions, /schemas/init, /issue, /revoke,
                       /request, /request/:requestId/approve|reject, /verify-log
                       GET  /issuers, /issuers/:msp/types, /verify/:credentialId, /:credentialId,
                       /passport/:passportId, /holder/:holderDid, /type/:credType,
                       /revoked/list, /:credentialId/history, /verify-log/:credentialId,
                       /verifier/:verifierDid/history
/api/audit             GET  /?action=&limit=&page= (ManufacturerMSP · RegulatorMSP)
```

`/api/realtime/*`는 cloud-agent read model을 우선 사용하고, unavailable이면 Fabric ledger로 fallback한다.

## BMU 데이터 흐름

```
BMU 하드웨어 (S32K344)
  ↓ rawPayload (48바이트) + Ed25519 서명 + DID
POST /api/bmu/data
  ↓ rate-limit (IP당 /min)
  ↓ 서명 필수 체크 → Ed25519 verifySignature
  ↓ dataHash = SHA-256(rawPayload)
  ↓ DID → passportId 캐시 조회 (Promise dedup, TTL)
  ↓ parseRawPayload — SOC/전압/전류/온도/셀 voltage·SOC[11]/플래그/bmsBindingCode32 디코드
  ↓ passport에 bmsManagementId가 있으면 bmsBindingCode32 비교
  ↓ Fabric submitTransaction('RecordBMUDataWithPayload', [..., rawPayload]) 또는 legacy 'RecordBMUData'
  ↓ 체인코드가 원장에 기록 + 성공 record를 runtime BMU snapshot에 보관
```

`parseRawPayload`는 raw soc_u16 그대로 반환 (보정 없음). bytes 44..47은 v1.1 `bmsBindingCode32`(little-endian uint32, `0=legacy`)로 노출한다. `dataHash`는 전체 48B `rawPayload` 기준이므로 `bmsBindingCode32`도 자동 포함된다.

## 3차년도 확장 속성 / BMS binding

초기 `CreateBatteryPassport` 인자 순서는 유지한다. 발급 직후 다음 Passport API가 live chaincode Version 1.4 / Sequence 5 트랜잭션을 호출한다. Fabric client는 chaincode name `passport-contract`로 호출하므로 Agent에서 sequence를 별도 지정하지 않는다.

- `POST /api/passports/:id/extended-attributes` → `SetPassportExtendedAttributes`
- `POST /api/passports/:id/bms-binding` → `BindBMSIdentifier`
- `POST /api/passports/:id/source-verification` → `RecordSourceVerification`

기본 BMS 값은 임베디드/BMU 세션 확정값을 따른다.

```text
bmsManagementId: BMS-MGMT-001
bmsBindingId: did:battery:001#BMS-MGMT-001
bmsBindingCode32: 0x2c9a0e0c
evidenceHash: b3c37ed2cdd2831cc0c212445905ced4a20ea51e129bff2e7418deddf7223178
```

## 실시간 Passport snapshot / fallback

조회 경로는 cloud-agent read model을 우선 사용한다. 단, `localhost:3002`가 내려가 있어도 Passport UI가 0 snapshot에 머물지 않도록 다음 fallback을 적용한다.

| 경로 | fallback |
|---|---|
| `GET /api/realtime/passports/:id` | `QueryPassport` + 최신 `QueryBMURecordsByPassport` 1건 overlay |
| `GET /api/realtime/bmu/:passportId` | Fabric `QueryBMURecordsByPassport` |
| `GET /api/passports/:id` | 최신 BMU record/runtime snapshot overlay |
| `GET /api/passports`, `GET /api/realtime/passports` | 목록 record별 최신 BMU overlay + runtime snapshot passport 선두 보강 |

Overlay 필드:

```text
currentSoc, temperature, statusFlags, totalDischargeCycles,
lastBmuDataId, lastBMUDataID, bmsBindingCode32,
latestRawPayloadHashVerified, latestDataHash, updatedAt
```

주의: runtime snapshot은 프로세스 메모리다. `bmu-agent` 재시작 직후 첫 BMU packet 전까지는 목록 선두 보강이 비어 있을 수 있다.

## 구조화 로깅

`services/logger.service.js`:
- NDJSON 형식 stdout + `logs/agent.log`
- 10MB rotation
- 카테고리: `fabric`, `bmu`, `vc`, `auth`, `passport`, `system` 등
- `log.info/warn/error(message, { action, error, ... })`

모든 500 응답은 내부 상세 대신 `{"error":"Internal server error"}`만 반환 (정보 유출 방지). 실제 원인은 서버 로그에만.

## 보안 고려사항

- BMU 데이터는 **서명 필수** (unsigned 거부). BMU 펌웨어는 100% 서명 포함
- 토큰은 stateless JWT; 토큰 폐기는 client-side (localStorage clear)
- 차량 이미지는 static tree 밖(`data/vehicle-images/`)에 저장 + 접근 시 passport 권한 재검증
- Rate limit 버킷은 5분 주기 cleanup, DID 캐시는 TTL + LRU eviction
- password-like 필드(password, token, secret, signature, rawPayload, privateKey, authorization)는 audit 로그에서 자동 제거

## 검증

```bash
npm test
# 40 tests pass
```

Passport/Web 통합 기준은 `webapp/frontend-react/README.md`를 참고한다. 최신 기준 커밋은 `8b5db6e`다.

## 관련 문서

- 프론트 가이드: `webapp/frontend-react/README.md`
- 활동 로그: `wiki/passport/activity-log/`
- API handoff: `wiki/handoffs/passport/`
- 체인코드: `chaincode/passport-contract/` (블록체인 세션 범위)
