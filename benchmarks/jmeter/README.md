# JMeter Read-only Benchmark

이 디렉터리는 평가/보고서 제출용 HTTP/API read-only 보조 증거를 만든다.

## 역할 분리

- Fabric write 성능: Hyperledger Caliper 기준을 유지한다.
- JMeter 결과: `cloud-agent` HTTP read 안정성 보조 증거다.
- JMeter TPS는 blockchain write TPS가 아니다.

## 대상 API

| Label | Endpoint |
|---|---|
| `GET cloud passport detail` | `GET /api/passports/${PASSPORT_ID}` |
| `GET cloud BMU records` | `GET /api/bmu/${BMU_ID_OR_DID}` |

기본 target은 `http://localhost:3002`다.

## 실행

```bash
PASSPORT_ID=PASSPORT-BMU-DEVICE \
BMU_ID_OR_DID=PASSPORT-BMU-DEVICE \
THREADS=100 LOOP_COUNT=50 RAMP_SECONDS=10 \
  scripts/run-jmeter-readonly-benchmark.sh
```

주요 환경변수:

| Env | Default | 설명 |
|---|---|---|
| `CLOUD_PROTOCOL` | `http` | cloud-agent protocol |
| `CLOUD_HOST` | `localhost` | cloud-agent host |
| `CLOUD_PORT` | `3002` | cloud-agent port |
| `PASSPORT_ID` | `PASSPORT-BMU-DEVICE` | passport detail 조회 대상 |
| `BMU_ID_OR_DID` | `$PASSPORT_ID` | BMU record 조회 대상 |
| `THREADS` | `100` | JMeter thread 수 |
| `LOOP_COUNT` | `50` | thread별 반복 수 |
| `RAMP_SECONDS` | `10` | ramp-up seconds |
| `OUT_DIR` | `/tmp/bms-jmeter-readonly-<run-id>` | JTL/evidence 출력 위치 |
| `SUCCESS_RATE_MIN` | `99` | 전체 2xx 성공률 기준 |
| `ERROR_RATE_MAX` | `1` | 전체 error rate 기준 |

## 산출물

runner는 기본적으로 `/tmp` 아래에 생성한다.

- `results.jtl` — JMeter CSV result log
- `summary.json` — parser summary
- `evidence.md` — 보고서 첨부용 요약
- `html/` — `GENERATE_HTML=true`일 때만 생성

생성된 CSV/HTML/report 산출물은 커밋하지 않는다.

## JMeter 설치

로컬에 `jmeter`가 PATH에 있어야 한다. 없으면 runner가 명확히 실패한다.

예시:

```bash
# Ubuntu 계열 예시
sudo apt-get install jmeter

# 또는 Apache JMeter binary를 설치한 뒤 PATH에 bin/ 추가
export PATH=/opt/apache-jmeter/bin:$PATH
```

Docker로 실행하려면 runner에 `JMETER_CMD`를 명시할 수 있다.

```bash
JMETER_CMD='docker run --rm -v "$PWD":"/work" -w /work justb4/jmeter:5.5 jmeter' \
  scripts/run-jmeter-readonly-benchmark.sh
```

Docker 이미지/버전은 환경별로 고정해서 사용한다.
