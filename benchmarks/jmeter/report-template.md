# JMeter Read-only Benchmark Evidence

## Evidence Boundary

- JMeter is HTTP/API read-only evidence.
- Fabric write KPI remains Caliper successful commit TPS.
- JMeter TPS is not blockchain write TPS.

## Run Metadata

| Field | Value |
|---|---|
| Run ID | `<run-id>` |
| JMX | `benchmarks/jmeter/cloud-read.jmx` |
| Target | `cloud-agent` read API |
| Endpoints | `GET /api/passports/:id`, `GET /api/bmu/:idOrDid` |
| Output directory | `<out-dir>` |

## Acceptance Criteria

| Criterion | Required |
|---|---:|
| HTTP 2xx success rate | `>= 99%` |
| Error rate | `< 1%` |
| p95 latency | recorded |
| Throughput | reference only |

## Result Summary

The generated evidence markdown from `scripts/parse-jmeter-summary.js` should be attached here.
