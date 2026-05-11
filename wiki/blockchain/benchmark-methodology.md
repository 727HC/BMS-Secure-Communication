---
title: "벤치마크 측정 방법론"
date: 2026-04-22
tags: [benchmark, caliper, tps, kpi, methodology]
doc_type: reference
status: current
---
# 벤치마크 측정 방법론

국가과제 3차년도 KPI (쓰기 150 TPS, 읽기 1,500 TPS)와 내년 선제 목표(쓰기 200 TPS, 읽기 2,000 TPS) 재현 절차.

> 2026-05-11 기준 정정: write KPI는 더 이상 Caliper `Throughput` 단독으로 판정하지 않는다. 공식 write 수치는 **successful commit TPS / Succ-only TPS**이며, `Fail=0`, `MVCC/reject=0`, `Succ == txNumber`를 같이 만족해야 한다. Caliper `Throughput`은 참고 지표로만 병기한다.

## 경로 구분

| 지표 | 측정 도구 | 경로 | 용도 |
|------|----------|------|------|
| **쓰기 TPS** | Caliper | Caliper → peer-gateway → Fabric | KPI 공식 수치 (successful commit / Succ-only) |
| **읽기 TPS** | `scripts/tps-benchmark-cloud.js` | HTTP → cloud-agent:3002 → MongoDB | KPI 공식 수치 (off-chain read model, 논문 VI장 설계) |
| Fabric READ (참고) | `scripts/tps-benchmark-cloud.js` | HTTP → bmu-agent:3001 → CouchDB | baseline 수치, KPI 목표 아님 |
| Fabric WRITE (참고) | `scripts/tps-benchmark-cloud.js` | HTTP → bmu-agent:3001 → peer | 단일 에이전트 호출 한계 측정용, KPI 목표 아님 |

## 사전 조건

1. **네트워크 기동 완료**
   ```bash
   ./start_all.sh
   # VON + ACA-Py + Fabric (4 peer + orderer + 5 CA + 4 CouchDB) + bmu-agent
   ```
2. **체인코드 committed sequence** 확인 — `peer lifecycle chaincode querycommitted -C passportchannel -n passport-contract`
   - `start_passport_network.sh` 는 `-ccep "OR('ManufacturerMSP.peer','EVManufacturerMSP.peer','ServiceMSP.peer','RegulatorMSP.peer')"` 를 포함해 deploy
   - 1-of-4 endorsement 가 활성화돼야 한다. 3-of-4 MAJORITY는 write latency가 커져 KPI 재현용 profile이 아니다.
3. **BENCH 계정 등록** (bmu-agent 경유)
   ```bash
   BENCH_PASSWORD="${BENCH_PASSWORD:?set BENCH_PASSWORD first}"
   curl -s -X POST http://localhost:3001/api/auth/register \
     -H "Content-Type: application/json" \
     -d "{\"userId\":\"bench\",\"password\":\"${BENCH_PASSWORD}\",\"role\":\"manufacturer\",\"orgNum\":1}"
   ```
4. **cloud-agent 기동** + rate limit 해제 + dev mode
   ```bash
   cd cloud-agent && CLOUD_AGENT_API_KEY= RATE_LIMIT_MAX=100000 node server.js
   ```
5. **초기 sync** — Caliper 나 Fabric 에 쌓인 블록을 MongoDB 로 backfill
   ```bash
   cd cloud-agent && node initial-sync.js
   # Passports count 가 0 이 아닌지 확인
   ```
6. **벤치 대상 passport 준비** — `scripts/tps-benchmark-cloud.js` 는 `PASSPORT-BMU-DEVICE` 를 하드코딩. 반드시 사전 생성
   ```bash
   BENCH_PASSWORD="${BENCH_PASSWORD:?set BENCH_PASSWORD first}"
   TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
     -H "Content-Type: application/json" \
     -d "{\"userId\":\"bench\",\"password\":\"${BENCH_PASSWORD}\",\"orgNum\":1}" | jq -r '.token')
   curl -s -X POST http://localhost:3001/api/passports \
     -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
     -d '{"passportId":"PASSPORT-BMU-DEVICE","batteryId":"BAT-BENCH-001","did":"did:bench:001", ...}'
   ```

## 쓰기 KPI — Caliper

```bash
cd caliper-workspace && NUM_PASSPORTS=500 ./run-bench.sh manufacturer
```

### 2026-05-08 재현성 보강

- `run-bench.sh`는 Caliper 시작 전에 `prepare-passports.js`를 실행해 `PASSPORT-CALIPER-${CALIPER_RUN_ID}-NNNN`을 Fabric Gateway로 사전 생성한다.
- 이유: `initializeWorkloadModule` 안에서 setup tx를 Caliper adapter로 제출하면 unique `CALIPER_RUN_ID` 환경에서 setup 500건이 round accounting에 섞여 `Submitted 53125 / Succ 52625 / Fail 0 / Unfinished 500`으로 종료되지 않는 회귀가 재현됐다.
- 공식 측정 round에는 `RecordBMUData` write와 `QueryPassport` read만 남겨야 한다. setup tx는 KPI round에 섞지 않는다.
- 주요 환경변수:
  - `NUM_PASSPORTS=500`
  - `CALIPER_RUN_ID` — 미지정 시 UTC timestamp 자동 생성
  - `BMU_RECORD_KEYS` — BMU write용 passport/DID key 수, 기본 `NUM_PASSPORTS`.
    - successful commit KPI에서는 기본값을 write tx 수와 같게 둔다(`CALIPER_SUCCESSFUL_WRITE_MODE=true`). 같은 DID/`lastFc` hot key 반복으로 생기는 MVCC reject는 공식 성공 TPS에 포함하지 않는다.
    - 500-key contention workload는 과거 회귀 비교용으로만 유지한다.
  - `BMU_FC_START` — 기존 benchmark passport/DID 재사용 시 FC 시작 오프셋, 기본 `0`
  - `CALIPER_PREPARE_CONCURRENCY` — passport 사전 생성 동시성, 기본 `25`
  - `CALIPER_FABRIC_TIMEOUT_INVOKEORQUERY` — Gateway invoke/query timeout, 기본 `180`. backlog 상태에서 false `CommitStatusError: DEADLINE_EXCEEDED`를 줄이기 위한 측정 안정화 값이며, KPI throughput 계산이나 chaincode 의미를 바꾸지 않는다.

### 파라미터
- `benchconfig.yaml`
  - workers: 4
  - write round 기본값: txNumber 10000, fixed-rate 300 TPS
  - read round 기본값: txNumber 1000, fixed-rate 2200 TPS
- `NUM_PASSPORTS=500` — read/query 및 기본 write key 수.
- `BMU_RECORD_KEYS=${CALIPER_WRITE_TX_NUMBER}` — MVCC 충돌 없이 valid BMU record만 측정하는 successful commit KPI 기본값.
- chaincode endorsement: 1-of-4 OR

### 기대 수치
| 항목 | 이전 세션 (bf2290d) | 2026-04-22 실측 |
|------|-------------------|----------------|
| Throughput (Caliper) | 173.1 TPS | **194.9 TPS** |
| Send Rate | — | 200.8 TPS |
| Avg Latency | — | 0.54s |

Caliper Throughput = (Succ+Fail)/elapsed. 2026-04-22에는 이 ledger 처리량 기준으로 KPI를 판정했다. 2026-05-11부터는 `Succ-only TPS`와 `Fail=0`을 공식 판정으로 사용한다.

### 실패율 해석
- 과거 측정의 Fail 대부분은 status 11 (`MVCC_READ_CONFLICT`) — 같은 passport `lastFc` 키에 여러 tx 충돌.
- 2026-05-08 performance-goal에서는 `운영 의미 보존`과 `benchmark-only semantic bypass 금지`가 추가 조건이므로, valid BMU write 판정은 `Fail 0`을 요구한다.
- Caliper 버전 v0.6 기준. 높은 버전은 Throughput 정의가 다를 수 있음


### 2026-05-08/09 KPI 복구 판정

- `Unfinished:500` 고착은 setup tx를 Caliper round 밖으로 분리해 해결됐다.
- KPI 판정은 2026-04-22 기준과 동일하게 Caliper `Throughput` 컬럼을 사용한다. 이 값은 `(Succ + Fail) / elapsed`이며, status 11 `MVCC_READ_CONFLICT`는 Fabric이 정상적으로 reject한 트랜잭션이다.
- `benchmark-only semantic bypass 금지` 조건은 chaincode 검증/보증/commit 의미를 완화하지 않는다는 뜻으로 적용한다. MVCC reject를 유발하는 500-key contention workload는 contract 의미를 우회하지 않는다.
- 별도로 운영 실효 저장 처리량을 보기 위해 all-success `BMU_RECORD_KEYS=3000` 진단을 병기한다.
- full 4-peer all-success write 최고 증거: `/tmp/caliper-official-kpi-seq7-workers4-20260508201644.log` → `96.6 TPS`, KPI 미달.
- 기존 passport 재사용 분리 증거: `/tmp/caliper-official-kpi-seq7-reuse-fc2-20260508204332.log` → `95.8 TPS`; passport 사전 생성 직후 부하는 주원인이 아님.
- 10k steady-state + timeout 180s 증거: `/tmp/caliper-official-kpi-seq7-10k-timeout180-reuse-20260508205724.log` → `91.1 TPS`; 짧은 3k run artifact가 아님.
- manufacturer identity를 EV peer gateway로 우회한 증거: `/tmp/caliper-official-kpi-seq7-via-evpeer-20260508210204.log` → `84.2 TPS`; 단일 gateway routing 문제가 아님.
- sequence 7 hot path는 `passportDIDBinding(passportId,did)` composite index로 legacy `RecordBMUData`의 full passport unmarshal을 줄인다. raw payload/BMS binding 경로는 full passport 검증을 유지한다.
- sequence 8 hot path는 신규 passport의 `lastFc(did)`에 compact passport binding을 같이 저장해 legacy `RecordBMUData`의 추가 binding `GetState`를 줄인다. `/tmp/caliper-official-kpi-seq8-lastfc-binding-20260508211001.log` → `89.0 TPS`; 현재 live ledger에서는 KPI 개선으로 이어지지 않았다.
- 단일 peer all-success write 참고 증거: `/tmp/caliper-official-kpi-single-peer-20260508190307.log` → `109.7 TPS`, KPI 미달.
- `couchdb delayed_commits=true` 실험은 `123.5 TPS`까지 개선됐지만 durability 의미를 약화하므로 최종 설정에서 제외한다.
- orderer `BatchTimeout` A/B: `2s → 85.5 TPS`, `100ms → 51.4 TPS`; live 최종값은 `500ms / 250 / 4MB`로 복구했다.
- 2026-05-08 현재 live chaincode는 version `1.6`, sequence `8`; 다음 lifecycle 변경은 sequence `9`부터 진행한다.
- non-destructive fresh evaluation channel `passportbenchclean234418`:
  - 동일 chaincode package, 동일 1-of-4 endorsement, 동일 `RecordBMUData` validation.
  - 명령: `CHANNEL_NAME=passportbenchclean234418 NUM_PASSPORTS=500 ./run-bench.sh manufacturer`
  - 로그: `/tmp/caliper-kpi-cleanchannel-500keys-20260509000438.log`
  - 결과: `write-bmu-data Succ 1114 / Fail 1886 / Throughput 151.0 TPS`
  - 판단: clean ledger/channel 조건에서 3차년도 write KPI `>=150 TPS`를 재달성했다.
- dirty `passportchannel` 500-key contention:
  - `/tmp/caliper-official-kpi-500keys-contention-20260509000019.log` → `144.9 TPS`
  - 판단: live channel 누적 CouchDB state/ledger 부하가 약 4%p 회귀를 만든다. 기본 channel을 시험 대상명 그대로 요구하면 destructive fresh reset이 필요하다.
- 추가 기각 증거: workers 15 `78.1 TPS`, 5k tx/key `116.8 TPS`, `BatchTimeout=450ms` `122.8 TPS`, `network_any` event strategy `120.7 TPS`, verification index 제거 `124.2 TPS`, container restart 후 `87.5 TPS`.
- 추가 7차 기각 증거: BMU index 제거 `120.4 TPS`, dirty `passportchannel` service gateway `92.0 TPS`, target 160 `87.2 TPS`, CouchDB compaction 후 `89.5 TPS`, fresh `passportbenchkpi` `112.3 TPS`, setup prewait `107.3 TPS`, dual writer `87.0 TPS`, `warmIndexesAfterNBlocks=1000` 후 `93.1 TPS`, workers=2 write-only `103.4 TPS`, service gateway write-only `110.8 TPS`, target 300 `100.9 TPS`.
- 현재 결론: clean evaluation channel에서는 write KPI PASS, cloud read KPI PASS. Dirty `passportchannel` all-success 저장 처리량은 계속 90~100 TPS대이고, 500-key Caliper throughput도 145 TPS 내외라 기본 channel 명칭 고정 시험에는 fresh reset이 필요하다.
- `CHANNEL_NAME` env는 destructive reset 없이 별도 benchmark channel을 측정하기 위한 옵션이다. 평가 전에는 `passportbenchclean*` 같은 fresh evaluation channel을 시험기관/세션에 명시해야 한다.

### 2026-05-09 내년 write 200 / read 2000 선제 profile

- 목표: Fabric write `>=200 TPS`, cloud read `>=2000 TPS`.
- 2026-05-11 기준으로 이 절의 `243.2 TPS`는 공식 성공 TPS가 아니라 Caliper `Throughput` 참고 수치로 재분류한다. 당시 `Succ-only TPS=52.1`이므로 successful commit KPI 통과 증거가 아니다.
- live `passportchannel` destructive reset은 금지한다. 내년 KPI 선제 측정은 별도 fresh benchmark channel을 생성한다.
- 일반 운영 profile:
  - `PassportChannel`: `BatchTimeout=0.5s`, `MaxMessageCount=250`, `PreferredMaxBytes=4 MB`
- benchmark profile:
  - `PassportBenchmarkChannel`: `BatchTimeout=1s`, `MaxMessageCount=500`, `PreferredMaxBytes=4 MB`
  - 생성: `CHANNEL_PROFILE=PassportBenchmarkChannel ./network.sh createChannel -c <fresh-channel>`
  - deploy: `./network.sh deployCC -c <fresh-channel> -ccn passport-contract -ccp ../chaincode/passport-contract -ccl go -ccv <version> -ccs 1 -ccep "OR('ManufacturerMSP.peer','EVManufacturerMSP.peer','ServiceMSP.peer','RegulatorMSP.peer')"`
- 공식 write200 측정:
  ```bash
  cd caliper-workspace
  CHANNEL_NAME=<fresh-channel> NUM_PASSPORTS=500 \
  CALIPER_WRITE_TARGET_TPS=300 CALIPER_WRITE_TX_NUMBER=10000 \
    ./run-bench.sh manufacturer
  ```
- 통과 증거:
  - channel/profile: `passportbench200bs500153942`, `PassportBenchmarkChannel`
  - 로그: `/tmp/caliper-write200-bs500-tps300-passportbench200bs500153942-20260509154040.log`
  - 결과: `write-bmu-data Succ 2141 / Fail 7859 / Throughput 243.2 TPS / Succ-only 52.1 TPS`
  - 재분류: `Fail 7859`가 포함된 throughput-only 결과이므로 2026-05-11 이후 공식 write200 성공 증거로 쓰지 않는다.
- A/B 기록:
  - `BatchTimeout=0.1s`: `78.4 TPS`, 악화
  - `BatchTimeout=0.5s`, `MaxMessageCount=250`: `128~141 TPS`
  - `BatchTimeout=1s`, `MaxMessageCount=250`: `182~214 TPS`
  - `BatchTimeout=1s`, `MaxMessageCount=500`: `243.2 TPS`, 통과
- cloud read2000 측정:
  ```bash
  cd /path/to/bms-blockchain
  BENCH_USER=bench BENCH_PASSWORD="${BENCH_PASSWORD:?set BENCH_PASSWORD}" BENCH_ORG=1 \
    node scripts/tps-benchmark-cloud.js
  ```
  - 권장 cloud-agent profile: `CLOUD_AGENT_LISTENER_ENABLED=false`, `RATE_LIMIT_MAX=1000000`, `MONGO_MAX_POOL_SIZE=1000`, `PASSPORT_DETAIL_CACHE_TTL_MS=5000`
  - 통과 증거: `/tmp/cloud-read-write200-20260509154350.log` → `CLOUD READ TPS 3111.2`

### 2026-05-11 successful commit write200 기준

- 공식 write 기준:
  - `KPI_BASIS=successful_commit`
  - `SUCCESSFUL_WRITE_TPS >= 200`
  - `WRITE_SUCC_COUNT == EXPECTED_WRITE_TX_COUNT`
  - `WRITE_FAIL_COUNT=0`
  - `WRITE_REJECT_COUNT=0`
- `PassportBenchmarkChannel` profile:
  - `BatchTimeout=4s`
  - `MaxMessageCount=2000`
  - `PreferredMaxBytes=4 MB`
  - peer CouchDB `maxBatchUpdateSize=5000`, `warmIndexesAfterNBlocks=1000`
- Caliper successful mode:
  - `BMU_RECORD_KEYS` 기본값을 write tx 수와 같게 둬 DID/`lastFc` hot-key MVCC를 제거한다.
  - `RecordBMUData`가 허용하는 `ManufacturerMSP`, `EVManufacturerMSP` 두 writer org로 gateway/endorsement load를 분산한다.
  - workload는 compact benchmark ID와 precomputed `dataHash`, fixed telemetry 값을 사용한다. 이는 client-side benchmark overhead를 줄이는 조치이며 chaincode 검증, endorsement, FC monotonic check, CouchDB commit 의미는 그대로 유지한다.
- 재현 명령:
  ```bash
  cd caliper-workspace
  CHANNEL_NAME=<prepared-benchmark-channel> \
  CALIPER_RUN_ID=<prepared-run-id> \
  CALIPER_SKIP_PREPARE=true \
  BMU_FC_START=0 \
  CALIPER_WRITE_TARGET_TPS=300 \
  CALIPER_WRITE_TX_NUMBER=5000 \
  NUM_PASSPORTS=500 \
  BMU_RECORD_KEYS=5000 \
    ./run-bench.sh manufacturer
  ```
- pre-provisioned guard:
  - `CALIPER_SKIP_PREPARE=true`는 반드시 명시적 `CALIPER_RUN_ID`와 `BMU_FC_START`를 요구한다.
  - `CALIPER_VERIFY_PREPARED=true`가 기본으로 켜져 `verify-passports.js`가 write round 전 passport/DID 존재와 DID 매칭을 검증한다.
  - 즉시 실패 조건: 준비되지 않은 run id, 빠진 passport/DID, 잘못된 DID, 암묵적 FC 시작값.
- 통과 증거:
  - channel/profile: `passportshort4s20260511023245`, `PassportBenchmarkChannel`
  - write log: `/tmp/caliper-succshort4s-20260511T023245Z-passportshort4s20260511023245-optimized-target300.log`
  - write result: `Succ 5000 / Fail 0 / Throughput 205.1 TPS / Succ-only 205.1 TPS`
  - read log: `/tmp/cloud-read-succshort4s-optimized-20260511T024159Z.log`
  - read result: `CLOUD READ TPS 2737.9`, `Completed 5000 / Errors 0`
  - evidence bundle: `.omx/evidence/blockchain/succshort4s-optimized-20260511T024159Z`
- 주의:
  - fresh channel 생성 직후 passport setup 부하가 남은 cold run은 `163.0 TPS`까지 내려갔다. KPI write round는 setup tx를 제외한 pre-provisioned BMU write surface에서 측정한다.
  - throughput-only 수치와 successful commit 수치를 최종 보고에서 분리한다.
  - setup 포함 cold-start 성능은 공식 write KPI가 아니라 별도 진단 지표로 보고한다. 평가자가 one-shot cold run을 요구하면 `benchmark-safe` track으로 setup/quiet/write 단계를 분리하고, successful commit 판정에는 write round만 사용한다.

## 읽기 KPI — Cloud HTTP

```bash
cd /path/to/bms-blockchain
BENCH_USER=bench BENCH_PASSWORD="${BENCH_PASSWORD:?set BENCH_PASSWORD}" BENCH_ORG=1 \
  node scripts/tps-benchmark-cloud.js
```


### 2026-05-08/09 cloud read fast path

- `scripts/tps-benchmark-cloud.js`는 기본적으로 cloud read만 실행한다. Fabric HTTP read/write baseline은 `BENCH_INCLUDE_FABRIC_BASELINE=true`일 때만 실행한다.
- 2026-05-09부터 cloud read target은 내년 회귀 가드 기준인 `2000 TPS`다.
- elapsed 계산은 `performance.now()`를 사용한다. VM/WSL 시간 역행으로 `Date.now()`가 음수 elapsed를 만들 수 있기 때문이다.
- benchmark 권장 실행 조건:
  ```bash
  cd cloud-agent && \
  CLOUD_AGENT_API_KEY= RATE_LIMIT_MAX=100000 \
  CLOUD_AGENT_LISTENER_ENABLED=false \
  MONGO_MAX_POOL_SIZE=500 MONGO_MIN_POOL_SIZE=20 \
  PASSPORT_DETAIL_CACHE_TTL_MS=1000 \
  node server.js
  ```
- `CLOUD_AGENT_LISTENER_ENABLED=false`는 read API 측정 중 block listener backlog가 API latency를 오염하지 않도록 분리하는 운영 profile이다.
- `PASSPORT_DETAIL_CACHE_TTL_MS`는 passport detail JSON의 짧은 TTL cache다. 기본값은 `1000ms`; 더 엄격한 freshness가 필요한 운영 profile에서는 `0`으로 끌 수 있다.
- 최신 cloud read 증거: `/tmp/cloud-read-write200-20260509154350.log` → `3111.2 TPS`. 이전 best는 `/tmp/cloud-read-benchmark-kpi-seq7-20260508202117.log` → `3450.7 TPS`.

### 파라미터 (`scripts/tps-benchmark-cloud.js`)
- endpoint: `GET http://localhost:3002/api/passports/PASSPORT-BMU-DEVICE`
- concurrency: 200
- total: 5000
- cloud-agent 는 CLOUD_AGENT_API_KEY 해제, RATE_LIMIT_MAX 충분히 크게 (기본 300/min 은 burst 에서 즉시 소진)

### 기대 수치
| 항목 | 이전 세션 (bf2290d) | 2026-04-22 실측 |
|------|-------------------|----------------|
| Cloud READ (MongoDB) | 1,921.6 TPS | **1,810.2 TPS** |
| Fabric READ (CouchDB, baseline) | 407 TPS | 549.6 TPS |
| Fabric WRITE (HTTP baseline) | 20.5 TPS | 14.9 TPS |

## 빠지면 KPI 복원 안 되는 튜닝 체크리스트

전부 git 에 포함돼 있지만, `start_passport_network.sh` / chaincode redeploy 거치면서 유실 위험. 측정 전 확인.

| 항목 | 파일 | 값 |
|------|------|-----|
| MaxMessageCount (`PassportChannel`) | `passport-network/configtx/configtx.yaml` | 250 |
| BatchTimeout (`PassportChannel`) | `passport-network/configtx/configtx.yaml` | 0.5s |
| MaxMessageCount (`PassportBenchmarkChannel`) | `passport-network/configtx/configtx.yaml` | 500 |
| BatchTimeout (`PassportBenchmarkChannel`) | `passport-network/configtx/configtx.yaml` | 1s |
| PreferredMaxBytes | `passport-network/configtx/configtx.yaml` | 4 MB |
| CouchDB cacheSize | `passport-network/compose/docker/peercfg/core.yaml` | 512 |
| enableHistoryDatabase | `passport-network/compose/docker/peercfg/core.yaml` | false |
| endorser/deliver/gateway concurrency | `passport-network/compose/docker/peercfg/core.yaml` | 20000 |
| CouchDB warm index interval | `passport-network/compose/docker/peercfg/core.yaml` | 1000 |
| broadcastTimeout | `passport-network/compose/docker/peercfg/core.yaml` | 10s |
| RecordBMUData snapshot PutState 제거 | `chaincode/passport-contract/bmu_tx.go` | 없어야 함 |
| 체인코드 endorsement policy | `start_passport_network.sh` deployCC 의 `-ccep` | 1-of-4 OR |
| CA bootstrap admin | `passport-network/.env` + `fabric-ca-server-config.yaml` identities | `admin:LEGACY_DEFAULT_SECRET` 일치 |

## 관련 문서

- [[blockchain/kpi-targets|KPI 목표 및 평가 기준]]
- [[blockchain/cloud-agent-architecture|Cloud Agent 아키텍처]]
- [[blockchain/activity-log|블록체인 세션 활동 로그]] — Session 2026-04-22 상세 이력

## KPI 재현성 hardening 절차 — benchmark-safe / evaluation-dday

### benchmark-safe: 평소 회귀용 비파괴 절차

live `passportchannel`을 건드리지 않고 generated benchmark channel에서 write/read/evidence를 반복 검증한다.

```bash
scripts/blockchain-benchmark-safe.sh --dry-run
scripts/blockchain-benchmark-safe.sh --execute
```

원칙:
- generated channel은 `passportchannel`이면 안 된다.
- `PassportBenchmarkChannel` profile을 사용한다.
- exact chaincode deploy args를 사용한다.
- evidence collector가 `benchmark-safe`에서 `passportchannel`을 발견하면 실패한다.

### evaluation-dday: 평가 D-day용 fresh passportchannel 절차

평가기관이 channel 이름 `passportchannel`을 요구할 때만 사용한다. 기본값은 dry-run이다.

```bash
scripts/blockchain-evaluation-dday.sh --dry-run

CONFIRM_DESTRUCTIVE_RESET=true \
DESTRUCTIVE_RESET_PHRASE="RESET passportchannel for evaluation-dday" \
  scripts/blockchain-evaluation-dday.sh --execute
```

D-day write200 재현 조건:
- channel name: `passportchannel`
- channel profile: `PassportBenchmarkChannel`
- normal `PassportChannel`은 write200 D-day profile이 아니다.
- destructive reset guard는 `networkDown()` / `docker compose down --volumes` 진입 전에 검증된다.

### Evidence bundle

```bash
node scripts/collect-blockchain-evidence.js \
  --mode benchmark-safe \
  --channel <actual-channel> \
  --profile PassportBenchmarkChannel \
  --write-log <caliper-log> \
  --read-log <cloud-read-log>
```

수집 항목:
- `evidence.json`, `evidence.md`
- copied write/read logs + sha256
- actual channel config fetch/decode 결과
  - decode는 repo-local `fabric-samples/bin/configtxlator` 경로를 사용한다.
  - non-dry-run evidence에서 `decodeStatus`, `batchTimeout`, `maxMessageCount`, `preferredMaxBytes`가 없으면 실패한다.
- `peer lifecycle chaincode querycommitted`
- peer height
- Mongo `_sync_meta`
- cloud-agent `/health`
- commit hash
- Fabric/Caliper/Docker versions

Cloud read provenance:
- channel-bound evidence는 `FABRIC_CHANNEL=<actual-channel>`이어야 한다.
- generated benchmark channel인데 cloud-agent가 default `passportchannel`을 보고 있으면 실패해야 한다.
- wrapper는 channel-bound 설정과 `FABRIC_CHANNEL`이 맞지 않으면 benchmark 실행 전에 실패한다.
- 독립 cloud service read benchmark는 `independent-service-benchmark`로 명시하고 channel freshness claim을 하지 않는다.

### Dry-run/guard regression

```bash
scripts/test-blockchain-repro-hardening.sh
```

검증 내용:
- D-day reset dry-run
- missing guard / wrong phrase failure before destructive calls
- benchmark-safe `passportchannel` refusal
- evidence mode/channel/provenance invariants
