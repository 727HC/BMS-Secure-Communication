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
                       POST /event, POST /invalidate/:recordId,
                       GET  /operations/status,
                       POST /reset-fc (Manufacturer · Regulator, 5건/시간/사용자)
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

## 확장 속성 / BMS binding

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

## FC 재동기화 / Option B 모니터링 (운영자 전용)

임베디드 Option B(HSE NVM-backed FC persistence) 적용 후 BMU는 부팅마다 `0xNN000000` 형태로 FC를 jump-start하고 CMU의 `1,2,3...` 카운터를 chain 도달 전에 재작성한다. 따라서 평상시 `POST /api/bmu/reset-fc` 호출은 `0회/일`이 정상이다.

`reset-fc`는 삭제하지 않고 DID 회전, counter 손상, manufacturing 단계 새 보드 onboard, embedded fail-safe halt, 256-boot wrap 근접 같은 비상 상황용 fail-safe로 유지한다.

- **권한**: `ManufacturerMSP` 또는 `RegulatorMSP`만 허용 (서버 + 체인코드 이중 RBAC)
- **rate limit**: 사용자당 5건 / 시간
- **자동 호출 금지**: agent 내부 어떤 path에서도 자동 호출하지 않음. 운영자 form submit만 가능
- **body**:
  - `did` (필수)
  - `reason` (필수, 50자 이상 — 1-eye 모드 보강 조건)
  - `confirm: true` (필수, 파괴적 작업 명시 확인)
  - `expected_next_fc?` (선택, 감사 기록 전용, 체인코드 enforcement 없음)
- **flag**: `RESET_FC_REQUIRE_DUAL_APPROVAL=true` 환경변수일 때 501 반환 (2-eye 승인 워크플로우 future toggle)
- **alert**: 성공 호출 시 `RESET_FC_CALLED` red alert + `log.warn('BMU reset-fc alert', ...)`
- **감사 다층화**: `audit.log` (`RESET_FC`) + agent `log.info('FC reset performed', ...)` + chaincode `FCRESET-{did}-{txid}`
- **부수효과**: 성공 시 DID→passport 캐시 즉시 무효화

운영 상태 조회:

- `GET /api/bmu/operations/status` — Manufacturer/Regulator 전용
- 최근 24h max FC를 process-local로 추적하고 `0xf8000000` 이상이면 `FC_WRAP_NEAR` yellow alert 반환
- BMU ingest decoded log는 `fc`, `fcHex`, `fcBootSlot`, `fcBootOffset`, `fcJumpStartPattern`을 남긴다.

webapp 프론트엔드는 `/bmu-operations` 별도 "운영" 섹션에서 Option B 상태, reset-fc 24h count, FC wrap alert, fail-safe form을 제공한다 (Manufacturer/Regulator만 사이드바 노출).

## BMU HSE/FATAL UART event relay

임베디드 bridge가 BMU UART의 `[HSE]`, `[FATAL]` 라인을 별도 운영 이벤트로 올릴 수 있도록 `POST /api/bmu/event`를 제공한다. 이 경로는 CMU↔BMU sample ingest(`/api/bmu/data`)와 독립이며, chaincode에 쓰지 않고 `logs/agent.log`에 `category="hse"` 한 줄을 남긴다.

- **권한**: `ManufacturerMSP`
- **rate limit**: IP당 120건 / 분 (`BMU_EVENT_RATE_LIMIT`, `BMU_EVENT_RATE_WINDOW_MS`)
- **body 예시**:

```json
{
  "level": "fatal",
  "eventType": "HSE_NVM_READ_FAIL",
  "source": "bmu-uart",
  "message": "[FATAL] HSE NVM counter read failed",
  "did": "HgBpAxtHJ4qRwsNiroaqvC",
  "fc": 4160749569,
  "fcHex": "0xf8000001",
  "data": {
    "status": "NVM_READ_FAIL"
  }
}
```

- `level`: `info | warn | error | fatal` (`fatal`은 agent.log level `error`로 기록)
- `data`는 object만 허용하며 `password/token/secret/signature/rawPayload/privateKey/authorization` 계열 key는 `[REDACTED]` 처리
- 응답: `{ "success": true, "status": "LOGGED", "eventType": "...", "level": "..." }`

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

### Source attribution — `action: BMUIngest`

매 `POST /api/bmu/data` 진입 시 항상 구조화 로그 1줄을 남긴다. 이번 운영에서 CANoe HTTP Binding rogue replay + BMU 재부팅 FC 충돌 둘 다 이 로그로 5분 안에 source 식별이 가능했다.

```json
{"level":"info","category":"bmu","message":"BMU ingest","action":"BMUIngest",
 "ip":"::1","rp":54800,"ua":"python-requests/2.31.0","fc":12770,
 "bind":"0C0E9A2C","rawLen":96,"sigLen":128,
 "rawHead":"2D886DC0A17F234251AF0500","isHex":true}
```

노출 필드는 incident 분리에 필요한 최소값만:
- `ip`, `rp` (remote port) — host/process 추적
- `ua` (user-agent) — 정상 stream과 sender library 구분
- `fc` — monotonic violation 추적 키
- `bind` (rawPayload offset 44~47, 8 hex chars) — BMS binding code
- `rawLen`, `sigLen` — 형식 검증 (정상은 96 / 128)
- `rawHead` (앞 24 hex chars = 12 byte) — 페이로드 fingerprint
- `isHex` — `[0-9a-fA-F]+` 매치 여부

전체 `rawPayload`, `signature` 본문, DID 외 어떤 secret도 로깅 안 됨.

## 보안 고려사항

- BMU 데이터는 **서명 필수** (unsigned 거부). BMU 펌웨어는 100% 서명 포함
- 토큰은 stateless JWT; 토큰 폐기는 client-side (localStorage clear)
- 차량 이미지는 static tree 밖(`data/vehicle-images/`)에 저장 + 접근 시 passport 권한 재검증
- Rate limit 버킷은 5분 주기 cleanup, DID 캐시는 TTL + LRU eviction
- password-like 필드(password, token, secret, signature, rawPayload, privateKey, authorization)는 audit 로그에서 자동 제거
- 운영자 명시 호출 (`/api/bmu/reset-fc`, `/api/bmu/invalidate/:recordId`)은 서버 + 체인코드 RBAC 이중화 + audit + rate limit

### 의존성 알림 대응

GitHub Dependabot 23건(bmu-agent path)에 대한 정리 결과:

- **axios**: `^1.16.1`로 bump (prototype pollution, SSRF, CRLF injection 등 13개 advisory 해결)
- **fabric SDK transitive overrides**: 보안 패치만 적용된 same-major 버전으로 핀
  - `path-to-regexp` (express ReDoS), `lodash` (template injection / prototype pollution), `bn.js` (infinite loop), `qs` (DoS), `@protobufjs/utf8` (overlong UTF-8)
- **`jsrsasign`**: fabric-ca-client의 crypto identity 의존성. 11.1.1로 override (현재 fabric SDK 2.2.x 호환 확인됨, Fabric attach + Ed25519 검증 통과)
- **미해결 fabric SDK crypto core** (`sjcl`, `elliptic`, `protobufjs`): 패치 버전이 없거나 override 시 서명 검증 깨질 위험. 진정한 해결은 `@hyperledger/fabric-gateway` 3.x로 SDK 마이그레이션 (별도 트랙)

증거는 로컬 Dependabot alert export로 확인했다.

## 검증

```bash
npm test
# 47 tests pass
```

Passport/Web 통합 기준은 `webapp/frontend-react/README.md`를 참고한다. 최신 기준 커밋은 `8b5db6e`다.

## 관련 문서

- 프론트 가이드: `webapp/frontend-react/README.md`
- 체인코드: `chaincode/passport-contract/` (블록체인 세션 범위)
