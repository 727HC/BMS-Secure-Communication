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
DID_CACHE_MAX=500                           # DID→passportId 캐시 크기
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

## 라우트 그룹 (9개, 41개 엔드포인트)

```
/api/auth              POST  /login, /register
/api/passports         GET|POST /, GET /:id, GET /:id/history, GET /:id/corrections
                       PUT  /:id/bind, /:id/regulatory-verification, /:id/physical-verification
                       POST /:id/correct, /:id/materials, /:id/vehicle-image
                       GET  /:id/vehicle-image
/api/materials         GET, POST /
/api/bmu               POST /data (rate-limited), GET /records/:passportId,
                       POST /invalidate/:recordId
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

## BMU 데이터 흐름

```
BMU 하드웨어 (S32K344)
  ↓ rawPayload (48바이트) + Ed25519 서명 + DID
POST /api/bmu/data
  ↓ rate-limit (IP당 /min)
  ↓ 서명 필수 체크 → Ed25519 verifySignature
  ↓ dataHash = SHA-256(rawPayload)
  ↓ DID → passportId 캐시 조회 (Promise dedup, TTL)
  ↓ parseRawPayload — SOC/전압/전류/온도/셀 voltage·SOC[11]/플래그 디코드
  ↓ Fabric submitTransaction('RecordBMUData', [...])
  ↓ 체인코드가 원장에 기록
```

`parseRawPayload`는 raw soc_u16 그대로 반환 (보정 없음). `dataHash` 무결성 유지 — 저장된 soc는 rawPayload 안의 값과 1:1 대응.

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
- password-like 필드(password, token, secret, signature)는 audit 로그에서 자동 제거

## 관련 문서

- 프론트 가이드: `webapp/frontend-react/README.md`
- 활동 로그: `wiki/passport/activity-log/`
- API handoff: `wiki/handoffs/passport/`
- 체인코드: `chaincode/passport-contract/` (블록체인 세션 범위)
