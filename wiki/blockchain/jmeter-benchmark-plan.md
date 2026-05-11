---
title: "JMeter Read-only Benchmark Plan"
tags: [blockchain, benchmark, jmeter, read-only, evidence]
doc_type: reference
status: current
---
# JMeter Read-only Benchmark Plan

## 목적

JMeter는 평가/보고서 제출용 HTTP/API read-only 보조 증거를 만든다. Fabric write 성능의 공식 근거는 Hyperledger Caliper successful commit TPS이며, JMeter TPS를 blockchain write TPS로 해석하지 않는다.

## 역할 분리

| 계층 | 도구 | 해석 |
|---|---|---|
| Fabric write / chaincode commit | Hyperledger Caliper | 공식 blockchain write 성능 |
| Cloud/API read | JMeter | HTTP read 안정성 보조 증거 |
| BMU ingest write | 별도 후속 시나리오 | 첫 JMeter 버전 범위 밖 |

## 첫 버전 범위

Read-only endpoint만 측정한다.

| Label | Endpoint | 의미 |
|---|---|---|
| `GET cloud passport detail` | `GET /api/passports/:id` | cloud-agent passport detail read |
| `GET cloud BMU records` | `GET /api/bmu/:idOrDid` | cloud-agent BMU records read |

`POST /api/bmu/data`는 Fabric commit, signature, DID, FC high-water가 섞이므로 첫 버전에서 제외한다.

## 합격 기준

| 항목 | 기준 |
|---|---:|
| HTTP 2xx success rate | `>= 99%` |
| Error rate | `< 1%` |
| p95 latency | 기록 필수 |
| TPS/throughput | 참고값 |

## 실행

```bash
PASSPORT_ID=PASSPORT-BMU-DEVICE \
BMU_ID_OR_DID=PASSPORT-BMU-DEVICE \
THREADS=100 LOOP_COUNT=50 RAMP_SECONDS=10 \
  scripts/run-jmeter-readonly-benchmark.sh
```

기본 출력 위치는 `/tmp/bms-jmeter-readonly-<run-id>`다.

생성 산출물:

- `results.jtl` — JMeter CSV result log
- `summary.json` — machine-readable summary
- `evidence.md` — 보고서 첨부용 요약
- `html/` — `GENERATE_HTML=true`일 때만 생성

생성된 CSV/HTML/evidence output은 커밋하지 않는다.

## Parser

```bash
node scripts/parse-jmeter-summary.js \
  --jtl /tmp/bms-jmeter-readonly-<run-id>/results.jtl \
  --out-json /tmp/bms-jmeter-readonly-<run-id>/summary.json \
  --out-md /tmp/bms-jmeter-readonly-<run-id>/evidence.md
```

parser는 다음을 산출한다.

- total samples
- 2xx success count/rate
- non-2xx/error count/rate
- average latency
- p95 latency
- p99 latency
- throughput as reference only
- sampler별 breakdown

## Non-goals

- JMeter로 Fabric write KPI를 대체하지 않는다.
- JMeter 첫 버전에 BMU ingest POST를 포함하지 않는다.
- JMeter TPS를 blockchain write TPS로 쓰지 않는다.
- JMeter 설치 파일/바이너리를 저장소에 넣지 않는다.
- generated JTL/HTML report를 커밋하지 않는다.
