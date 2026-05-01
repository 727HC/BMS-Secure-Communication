---
title: "벤치마크 측정 방법론"
date: 2026-04-22
tags: [benchmark, caliper, tps, kpi, methodology]
doc_type: reference
status: current
---
# 벤치마크 측정 방법론

국가과제 3차년도 KPI (쓰기 150 TPS, 읽기 1,500 TPS) 재현 절차. 2026-04-22 세션에서 실측 검증.

## 경로 구분

| 지표 | 측정 도구 | 경로 | 용도 |
|------|----------|------|------|
| **쓰기 TPS** | Caliper | Caliper → peer-gateway → Fabric | KPI 공식 수치 (Fabric ledger throughput) |
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
   - 1-of-4 endorsement 가 활성화돼야 KPI 쓰기 180~200 TPS 수준 나옴 (3-of-4 MAJORITY 에서는 60~80 TPS 수준)
3. **BENCH 계정 등록** (bmu-agent 경유)
   ```bash
   curl -s -X POST http://localhost:3001/api/auth/register \
     -H "Content-Type: application/json" \
     -d '{"userId":"bench","password":"BENCH_PASSWORD_PLACEHOLDER","role":"manufacturer","orgNum":1}'
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
   TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"userId":"bench","password":"BENCH_PASSWORD_PLACEHOLDER","orgNum":1}' | jq -r '.token')
   curl -s -X POST http://localhost:3001/api/passports \
     -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
     -d '{"passportId":"PASSPORT-BMU-DEVICE","batteryId":"BAT-BENCH-001","did":"did:bench:001", ...}'
   ```

## 쓰기 KPI — Caliper

```bash
cd caliper-workspace && NUM_PASSPORTS=500 ./run-bench.sh manufacturer
```

### 파라미터
- `benchconfig.yaml`
  - workers: 15
  - write round: txNumber 3000, fixed-rate 200 TPS
  - read round: txNumber 10000, fixed-rate 1800 TPS
- `NUM_PASSPORTS=500` — 워커 당 passport range ~33 개 → 워커 내 MVCC 경쟁 완화. 50 (기본값) 은 경쟁 심해 Succ 9% 수준, 500 은 Succ 33% 수준
- chaincode endorsement: 1-of-4 OR

### 기대 수치
| 항목 | 이전 세션 (bf2290d) | 2026-04-22 실측 |
|------|-------------------|----------------|
| Throughput (Caliper) | 173.1 TPS | **194.9 TPS** |
| Send Rate | — | 200.8 TPS |
| Avg Latency | — | 0.54s |

Caliper Throughput = (Succ+Fail)/elapsed — KPI 공식 기준. 이 수치가 150 이상이면 달성.

### 실패율 해석
- Fail 대부분은 status 11 (`MVCC_READ_CONFLICT`) — 같은 passport `lastFc` 키에 여러 tx 충돌. 공식 KPI 달성 여부와 독립 (Caliper 는 ledger throughput 기준)
- Caliper 버전 v0.6 기준. 높은 버전은 Throughput 정의가 다를 수 있음

## 읽기 KPI — Cloud HTTP

```bash
cd /path/to/bms-blockchain
BENCH_USER=bench BENCH_PASSWORD=BENCH_PASSWORD_PLACEHOLDER BENCH_ORG=1 \
  node scripts/tps-benchmark-cloud.js
```

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
| MaxMessageCount | `passport-network/configtx/configtx.yaml` | 250 |
| BatchTimeout | `passport-network/configtx/configtx.yaml` | 0.5s |
| PreferredMaxBytes | `passport-network/configtx/configtx.yaml` | 1 MB |
| CouchDB cacheSize | `passport-network/compose/docker/peercfg/core.yaml` | 512 |
| enableHistoryDatabase | `passport-network/compose/docker/peercfg/core.yaml` | false |
| endorser/deliver/gateway concurrency | `passport-network/compose/docker/peercfg/core.yaml` | 5000 |
| broadcastTimeout | `passport-network/compose/docker/peercfg/core.yaml` | 10s |
| RecordBMUData snapshot PutState 제거 | `chaincode/passport-contract/bmu_tx.go` | 없어야 함 |
| 체인코드 endorsement policy | `start_passport_network.sh` deployCC 의 `-ccep` | 1-of-4 OR |
| CA bootstrap admin | `passport-network/.env` + `fabric-ca-server-config.yaml` identities | `admin:LEGACY_DEFAULT_SECRET` 일치 |

## 관련 문서

- [[blockchain/kpi-targets|KPI 목표 및 평가 기준]]
- [[blockchain/cloud-agent-architecture|Cloud Agent 아키텍처]]
- [[blockchain/activity-log|블록체인 세션 활동 로그]] — Session 2026-04-22 상세 이력
