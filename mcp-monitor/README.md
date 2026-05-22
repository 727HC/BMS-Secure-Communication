# BMS Blockchain MCP Monitor

> **Model Context Protocol 기반 BMS 블록체인 모니터링 서버**
> Fabric 트랜잭션 · BMU 이상 탐지 · VC 이벤트 · 시스템 상태 — 전부 읽기 전용

MCP 호환 클라이언트가 stdio로 연결해, 체인코드를 직접 쿼리하거나 구조화 JSON 로그를 읽어 BMS 블록체인 플랫폼의 운영 상태를 관찰한다. 블록체인 쓰기/변경은 하지 않는다 (ADR-003).

---

## 특징

- **읽기 전용**: `evaluateTransaction`만 사용, `submitTransaction`·fabric-ca-client 없음
- **하이브리드 데이터 소스**: Fabric 쿼리 + `logs/agent.log` 구조화 JSON 로그 (이중 소스로 정확도 보강)
- **5개 MCP Tool**: `monitor_transactions`, `monitor_bmu`, `monitor_vc`, `system_status`, `monitor_passport`
- **1개 MCP Resource**: `agent-logs` (최근 100줄 스트림)
- **입력 검증**: zod 스키마 (int/min/max + cross-validation)
- **Query error 노출**: rich-query/typed state decode 실패(`docType` mismatch 등)를 조용히 skip하지 않고 `fabricQuery` 또는 MCP `isError`로 반환

---

## 아키텍처

```
┌────────────────────┐  stdio (JSON-RPC)   ┌──────────────────────────┐
│  MCP Client        │ ──────────────────▶ │  src/index.js            │
│  (MCP client)     │ ◀────────────────── │  (McpServer)             │
└────────────────────┘                     └────────────┬─────────────┘
                                                        │
                         ┌──────────────────────────────┼──────────────────────────┐
                         ▼                              ▼                          ▼
                  ┌──────────────┐              ┌──────────────┐           ┌──────────────┐
                  │ tools/       │              │ utils/       │           │ system-status│
                  │  tx-monitor  │◀────────────▶│ fabric-client│           │  docker/proc │
                  │  bmu-monitor │              │  log-reader  │           │  / http probe│
                  │  vc-monitor  │              └──────┬───────┘           └──────┬───────┘
                  │ passport-mon │                     │                          │
                  └──────┬───────┘                     │                          │
                         │                             ▼                          ▼
                         ▼                   ┌──────────────────┐      ┌──────────────────┐
                ┌──────────────────┐          │ logs/agent.log   │      │ docker ps / curl │
                │ Fabric Gateway   │          │ (구조화 JSON)    │      │ VON · ACA-Py     │
                │ evaluateTx only  │          └──────────────────┘      └──────────────────┘
                └──────────────────┘
```

---

## 설치 및 실행

### 사전 준비

- Node.js 18+ (권장 20 LTS)
- `bmu-agent/` wallet에 Fabric identity 사전 등록 (MCP는 자동 enrollment 하지 않음)
- `logs/agent.log` 존재 (bmu-agent 실행 시 자동 생성)
- 4-org Fabric 네트워크 기동 (`./start_passport_network.sh up`)

### 설치

```bash
cd mcp-monitor
cp .env.example .env        # 필요 시 편집 (기본값으로 로컬 동작)
npm install
```

### 실행 (stdio 서버)

```bash
node src/index.js
# 또는 npm start
```

> MCP 서버는 stdio 전송을 사용한다. 직접 실행보다는 MCP 클라이언트 설정에 등록해서 쓴다.

### MCP 클라이언트 등록 예시

```json
{
  "mcpServers": {
    "bms-blockchain-monitor": {
      "command": "node",
      "args": ["/absolute/path/to/mcp-monitor/src/index.js"]
    }
  }
}
```

---

## Tool Reference

### 1. `monitor_transactions` — Fabric 트랜잭션

| action | 설명 | 주요 파라미터 |
|--------|------|---------------|
| `recent` | 최근 트랜잭션 (로그 기반) | `limit`, `passport_id` |
| `stats` | 성공/실패 통계 + 처리율 | `hours` (0.1~720) |
| `search` | 함수명 검색 | `function_name` (필수), `limit` |

- **정확도**: 비트랜잭션 lifecycle 로그(연결·게이트웨이 등) 제외, `function \|\| action` 있는 로그만 카운트
- **Sequence 3 tx 인식**: `SetPassportExtendedAttributes`, `BindBMSIdentifier`, `RecordSourceVerification`, `RecordBMUDataWithPayload`, 기존 `RecordBMUData`를 모두 tx 이벤트로 표시
- **Sequence 3 field 표시**: 해당 tx 로그에 값이 있으면 `sequence3.bmsManagementId`, `bmsBindingId`, `bmsBindingCode32`, `rawPayloadHashVerified`, `bmsIdentifierMatched`, `evidenceHash`를 함께 표시
- **중복제거**: `timestamp\|category\|message` 키로 Set 기반 중복제거 (tee+logger 이중 기록 대응)
- **query error**: Fabric enrich/count 실패 시 `fabricQuery.errors[]`에 function/target/type/message 노출

### 2. `monitor_bmu` — BMU 이상 탐지

| action | 설명 | 주요 파라미터 |
|--------|------|---------------|
| `anomalies` | 임계값 초과 레코드 | `passport_id`, `limit`, `hours` |
| `latest` | 최신 BMU 데이터 | `passport_id`, `limit` |
| `frequency` | 수신 빈도 분석 | `hours` |
| `thresholds` | 임계값 조회/변경 | `set_thresholds` (soc/voltage/temp) |
| `hse` | BMU HSE/boot UART 이벤트 분류 + epoch_nn 임계 | `hours` |

- **INVALIDATED 필터링**: `status !== 'INVALIDATED'` 레코드만 분석에 포함 (`invalidatedFiltered` 카운트 응답 포함)
- **Cross-validation**: threshold 변경 시 `*_min < *_max` 검증
- **query error**: 전체 passport scan 또는 passport별 BMU query 실패를 `fabricQuery.errors[]`에 노출
- **HSE 이벤트 분류 (`action: 'hse'`)**: `category=hse` 로그를 eventType prefix 기반으로 info(`BOOT_FC`) / warn(`*_WARN`) / critical(`*_FAIL`, `FATAL_*`) 분류. 알 수 없는 eventType은 `unknown` severity로 보존(silent drop 금지). epoch_nn은 `data.epoch_nn` → `fcHex` top byte → `fc` top byte 순으로 추출. DID별 latest epoch에 임계 적용 — `>= 0xF8` yellow, `>= 0xFE` red. 응답 필드: `counts`, `currentEpochByDid`, `recentFatal[]`, `alerts[]`. 평상시 `counts.FATAL` baseline 0 기대.

### 3. `monitor_vc` — VC 이벤트

| action | 설명 | 주요 파라미터 |
|--------|------|---------------|
| `events` | 최근 VC 이벤트 | `passport_id`, `cred_type`, `limit` |
| `expiring` | 만료 임박 VC | `days_until_expiry` (1~365) |
| `stats` | 상태 통계 | — |
| `revoked` | 폐기된 VC | `limit` |

- **dataScope**: 현재 org MSP(예: `ManufacturerMSP`) 기준 자기 조직 VC만 가시 → 응답에 `dataScope` 필드 포함
- **typeStats**: `active + revoked + expired` 합산 방식으로 total 계산 (루프 후)
- **query error**: credential type/passport query 실패를 `fabricQuery.errors[]`와 type별 `error`에 원문 메시지로 노출

### 4. `system_status` — 시스템 상태

| action | 설명 |
|--------|------|
| `overview` | 전체 요약 (fabric·von·acapy·agent·docker) |
| `fabric` | peer/orderer/CA 상세 |
| `von` | VON Network 상태 |
| `acapy` | ACA-Py 상태 |
| `agent` | Agent 프로세스 상태 |
| `docker` | 컨테이너 목록 |

- `verbose: true` 로 컨테이너 상세 포함
- Fabric connectivity probe 실패는 `fabricQuery.errors[]`에 포함된다.

### 5. `monitor_passport` — Passport 관찰 표면

| action | 설명 | 주요 파라미터 |
|--------|------|---------------|
| `status` | Passport `/api/status` GET probe | — |
| `audit` | `/api/audit` 또는 `logs/audit.log` 읽기 | `source`, `hours`, `limit` |
| `trends` | BMU/VC/error trend 집계 | `source`, `hours`, `limit` |
| `observation_plan` | 기능시험 관찰 항목·alert payload·검증 기준 | `include_examples` |

관찰 항목:
- `/api/status`: Fabric 연결, channel, contract, org
- `/api/audit`: 감사 total/write/failure/action/statusCode trend (`PASSPORT_AUDIT_TOKEN` 필요)
- BMU: record count, invalidation count, ingestion failure trend, ingestion error rate, stale/freshness counter anomaly
- BMU monitoring events: `missingSignature`, `invalidRawPayload`, `staleFC`, `didMismatch`, `bindingCode`를 `trends.bmu.monitoringEvents.*`에서 분리 표시
- E2E 관찰 경로: 각 BMU monitoring event는 `evidencePath.route = ["BMU","Agent","Fabric","Passport/MCP"]`를 포함
- Sequence 3 BMS binding: `trends.sequence3BmsBinding`에 확정값과 관찰값을 비교 표시
  - `bmsManagementId`: `BMS-MGMT-001`
  - `bmsBindingId`: `did:battery:001#BMS-MGMT-001`
  - `bmsBindingCode32`: `0x2c9a0e0c`
  - `evidenceHash`: `b3c37ed2cdd2831cc0c212445905ced4a20ea51e129bff2e7418deddf7223178`
  - `rawPayloadHashVerified`, `physicalVerification.signals.bmsIdentifierMatched`, source verification latest/records
- VC: issue failure trend와 verification success/failure trend 분리
- validation category: holder DID mismatch, malformed `expiresAt`, malformed timestamp, invalid rawPayload, invalid `dataHash`, missing signature, stale FC, DID mismatch, binding code zero/mismatch, VC issue 400/VAL
- 오류: validation error category count, chaincode `INTERNAL` error trend
- 규제/물리 검증: recycling/compliance/VC verify와 maintenance/analysis/BMU signature 관련 상태

읽기 전용 보장:
- HTTP는 `GET /api/status`, `GET /api/audit`만 사용한다.
- MCP가 Passport login/POST/PUT/PATCH/DELETE를 수행하지 않는다.
- `/api/audit` 토큰은 외부에서 사전 주입된 `PASSPORT_AUDIT_TOKEN`만 사용한다.
- 토큰이 없으면 API 호출 대신 `logs/audit.log` 로컬 읽기 fallback을 사용한다.
- API/로컬 감사 로그 응답 모두 MCP 출력 단계에서 `password/token/secret/signature/rawPayload/privateKey/authorization` 필드를 추가 redaction한다.
- Passport audit middleware 특성상 GET probe도 감사 로그 1건을 남길 수 있지만, 원장/업무 데이터 mutation은 없다.

Alert/escalation payload 예시는 `monitor_passport`의 `observation_plan` 또는 `trends` 응답에 포함된다. 주요 escalation 대상:
- ingestion error rate / BMU validation spike / stale FC / freshness counter anomaly → 배터리여권 + 임베디드
- binding code zero/mismatch → 배터리여권 + 블록체인 + 임베디드
- Sequence 3 binding drift → 배터리여권 + 블록체인 + 임베디드
- chaincode `INTERNAL` error trend → 블록체인 + 배터리여권
- VC issue validation spike / VC verification drift → 배터리여권 + 블록체인
- regulatory/physical verification status drift → 배터리여권

### Resource: `agent-logs`

- URI: `file:///logs/agent.log`
- 최근 100줄 JSON 배열
- 에러 시 `{error: "..."}` 형태 반환 (graceful degradation)

---

## 환경 변수

| 카테고리 | 변수 | 기본값 | 설명 |
|----------|------|--------|------|
| Agent | `AGENT_URL` | `http://localhost:3001` | bmu-agent HTTP endpoint |
| Agent | `PASSPORT_AUDIT_TOKEN` | — | `/api/audit` 읽기용 사전 발급 JWT (ManufacturerMSP 또는 RegulatorMSP) |
| Fabric | `FABRIC_CHANNEL` | `passportchannel` | 채널 이름 |
| Fabric | `FABRIC_CONTRACT` | `passport-contract` | 체인코드 이름 |
| Fabric | `FABRIC_IDENTITY` | `admin` | wallet identity label |
| Fabric | `FABRIC_ORG` | `1` | 1~4 (Manufacturer/EV/Service/Regulator) |
| Fabric | `FABRIC_DISCOVERY_AS_LOCALHOST` | `true` | 로컬 개발용 |
| Fabric | `FABRIC_CA_TLS_VERIFY` | `true` | production 필수 |
| Fabric (조직) | `FABRIC_ORG{1..4}_MSP/DOMAIN/CA_NAME/CA_PORT/PEER_ENDPOINT` | — | 4조직 엔드포인트 |
| VON | `VON_URL` | `http://localhost:9000` | VON Network |
| ACA-Py | `ACAPY_ADMIN_URL` | `http://localhost:8031` | ACA-Py admin API |
| BMU | `BMU_SOC_MIN/MAX` | `10 / 95` | SOC 임계값 (%) |
| BMU | `BMU_VOLTAGE_MIN/MAX` | `27.5 / 47.85` | 11S 팩 전압 (cell_min/max × 11) |
| BMU | `BMU_TEMP_MIN/MAX` | `0 / 60` | 온도 (℃) |
| BMU | `BMU_FRESHNESS_GAP_WARN` | `1000` | freshness counter jump 경고 임계값 |
| 로그 | `LOG_FILE_PATH` | `../logs/agent.log` | bmu-agent 구조화 로그 경로 |
| 로그 | `PASSPORT_AUDIT_LOG_PATH` | `../logs/audit.log` | `/api/audit` 토큰이 없을 때 읽는 감사 NDJSON 경로 |

> 전체 샘플은 [`.env.example`](.env.example) 참고. `.env`는 gitignored.

---

## 검증 (Verification Protocol)

변경 후 수동/자동 검증 순서:

```bash
# 1. 구문 검증 (PostToolUse hook 자동 실행 + 수동)
node -c src/index.js && \
node -c src/utils/fabric-client.js && \
node -c src/utils/log-reader.js && \
node -c src/utils/query-errors.js && \
node -c src/tools/tx-monitor.js && \
node -c src/tools/bmu-monitor.js && \
node -c src/tools/vc-monitor.js && \
node -c src/tools/system-status.js && \
node -c src/tools/passport-monitor.js

# 2. 의존성 확인
npm ls --depth=0

# 3. MCP 도구 등록 확인 (JSON-RPC tools/list)
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | node src/index.js | head -c 600

# 4. Passport 관찰 도구 등록 확인
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | node src/index.js | grep -q monitor_passport

# 5. Passport observation plan 확인 (라이브 인프라 불필요)
printf '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"monitor_passport","arguments":{"action":"observation_plan","include_examples":true}}}\n' | node src/index.js

# 6. Adversarial read-only boundary 확인
! grep -R -E "submitTransaction[[:space:]]*\(|axios\.(post|put|patch|delete)[[:space:]]*\(" -n src

# 7. 라이브 동작 확인 (Fabric/Passport UP 상태 전제)
#    MCP 클라이언트에서 system_status.overview 호출 → 25/25 컨테이너, fabric: healthy 기대
#    monitor_passport.status 호출 → /api/status HTTP 200, method=GET 기대
#    PASSPORT_AUDIT_TOKEN 설정 후 monitor_passport.audit(source=api) 호출 → /api/audit HTTP 200 기대

# 8. Query error 노출 회귀 확인
#    fabricClient.evaluate를 monkey patch해 "state type mismatch"를 던지고
#    tx/bmu/vc/system 응답의 fabricQuery.errors[].type=DOC_TYPE_MISMATCH 확인

# 9. Passport validation category 회귀 확인
#    passport-monitor._private.buildTrendSummary에 holder DID mismatch, malformed expiresAt,
#    malformed timestamp, invalid dataHash, missing signature 샘플을 넣고
#    validationErrorCategoryCount, vc.issueFailureTrend, bmu.ingestionFailureTrend 분리 확인
```

규칙:
- PASS 선언 전 최소 1개 adversarial probe (경계값·잘못된 입력 등)
- "코드 읽어보니 맞다" → 검증 아님. 반드시 실행해서 확인.

---

## 주요 기술 결정 (요약)

- **fabric-ca-client 제거** (ADR-003) — 자동 enrollment 보안 리스크 제거, wallet identity는 bmu-agent가 사전 등록
- **로그 기반 `recent`** — 스냅샷 pseudo-event 제거, 실제 이벤트 로그만 사용
- **INVALIDATED 필터링** — BMU 쿼리 4지점 모두에서 일관 적용
- **에러 시그널링 `throw` 통일** — 도구 레이어에서 throw → `index.js` catch가 `isError: true` 설정 → MCP 클라이언트가 정상 인식
- **VC dataScope 필드** — 요청 org MSP에 따라 가시 범위 다름을 응답에 명시
- **npm `overrides`로 jsrsasign 강제 업그레이드** — fabric-common 2.2.20이 명세하는 jsrsasign 10.x는 critical/high 7건(Marvin Attack 외) 잔존. `package.json`에 `"overrides": { "jsrsasign": "^11.1.3" }`로 11.x 강제. mcp-monitor는 **read-only `evaluateTransaction`만** 사용해 jsrsasign이 x509 파싱/ECDSA 검증 경로에만 닿으므로 11.x 호환. `monitor_bmu.latest` 라이브 호출로 회귀 검증 완료. (`npm audit fix --force`는 fabric-network 2.2.20 → 1.4.20 다운그레이드 시도 — **절대 금지**.)
- **CA root 재발급 시 wallet 공유 정리 의존** — mcp-monitor는 자체 enrollment 없이 `bmu-agent/wallet`을 `FABRIC_WALLET_PATH` 기본값으로 공유. bmu-agent 측에서 wallet을 비우고 재기동하면 mcp-monitor도 자동 해소 (별도 작업 불필요).

상세는 `wiki/decisions/003-*`, `wiki/mcp/overview.md` 참고.

---

## 디렉토리 구조

```
mcp-monitor/
├── src/
│   ├── index.js                # MCP 서버 진입점, 5 tool + 1 resource 등록
│   ├── tools/
│   │   ├── tx-monitor.js       # 트랜잭션 (recent/stats/search)
│   │   ├── bmu-monitor.js      # BMU (anomalies/latest/frequency/thresholds/hse)
│   │   ├── vc-monitor.js       # VC (events/expiring/stats/revoked)
│   │   ├── system-status.js    # 시스템 (overview/fabric/von/acapy/agent/docker)
│   │   └── passport-monitor.js # Passport API/audit/BMU/VC/error trend 관찰
│   └── utils/
│       ├── fabric-client.js    # Fabric Gateway 연결 (읽기 전용)
│       ├── log-reader.js       # 구조화 JSON 로그 파서 + 중복제거
│       └── query-errors.js     # Fabric query error 정규화/노출
├── .env.example                # 환경변수 샘플
├── package.json                # @modelcontextprotocol/sdk, fabric-network, axios, dotenv
└── README.md
```

---

## 의존성

| 패키지 | 용도 |
|--------|------|
| `@modelcontextprotocol/sdk` ^1.12 | MCP 서버 프레임워크 (stdio 전송, 도구/리소스 등록) |
| `fabric-network` ^2.2 | Fabric Gateway 클라이언트 (`evaluateTransaction` 전용) |
| `axios` ^1.16 | Agent / VON / ACA-Py HTTP 프로브 |
| `dotenv` ^17 | `.env` 로드 |
| `zod` (sdk 의존성 경유) | 입력 스키마 검증 |

### overrides

```json
"overrides": {
  "jsrsasign": "^11.1.3"
}
```

fabric-common 2.2.20이 transitive로 끌어오는 jsrsasign 10.x의 critical/high 취약점(Marvin Attack 외 6건)을 11.x로 강제 해소. read-only `evaluateTransaction` 경로만 사용해서 API 호환 검증됨. elliptic은 6.6.1이 latest라 override 불가 — upstream 패치 출시 시 추가 예정.

> `dockerode`, `fabric-ca-client`는 **의도적으로 제외** — docker는 `docker ps` 셸 호출로 대체, CA는 보안 이유로 제거.

---

## 운영 참고

- 로그 경로 기본값은 `../logs/agent.log` 기준 — bmu-agent가 로그를 기록 중이어야 의미 있는 데이터가 나옴
- `FABRIC_DISCOVERY_AS_LOCALHOST=true`는 로컬 전용. 원격/운영 배치 시 `false` 로 두고 DNS/host 설정
- **`npm audit` 운영**: jsrsasign override 적용 후 critical/high 0건 유지가 기본 상태. 새 advisory가 뜨면 override 버전을 latest 패치(11.1.x)로 bump 후 `monitor_bmu.latest` 카나리 회귀 필수. **`npm audit fix --force` 절대 금지** (fabric-network 다운그레이드 함정).
- **Fabric CA 재발급 SOP**: CA root가 재생성되면 `bmu-agent/wallet`을 비우고 bmu-agent 재기동 → mcp-monitor도 자동 해소 (자체 wallet 없음).
- filter-repo 등 history 재작성 작업 시 `.env.example` placeholder 점검 (실제 코드 참조 여부 grep으로 재검증)

---

## 관련 문서

- 프로젝트 전체 README: [`../README.md`](../README.md)
- 세션 개요/아키텍처: `wiki/mcp/overview.md`
- 배터리 여권 전체 구조: `wiki/common/architecture.md`
- 결정 기록: `wiki/decisions/003-*` (fabric-ca-client 제거, read-only 원칙)
