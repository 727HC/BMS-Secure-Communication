---
title: "Full Benchmark Rerun Audit — BLOCKED Handoff"
tags: [blockchain, benchmark, caliper, jmeter, handoff, blocked]
doc_type: handoff
status: blocked
---
# Full Benchmark Rerun Audit — BLOCKED Handoff

## Objective

전체 블록체인/Passport 벤치마크를 `audit-all-tracks` 기준으로 재측정한다.

Hard gates:

| Gate | Requirement | Current result |
|---|---|---|
| Fabric write | 4-org `PassportBenchmarkChannel`, Caliper 10-repeat, successful commit basis, `p50>=200`, `p10>=150`, `min>=150`, every run `Succ==expected`, `Fail=0`, `Reject=0` | **FAIL** — `p50=184.9`, `Succ==expected=false` |
| Cloud read | Node script `>=2000 TPS`, `Errors=0` | **PASS** — `4039.0 TPS`, `Errors=0` |
| JMeter read-only | actual JMeter run, HTTP 2xx success `>=99%`, error `<1%`, p95 recorded | **BLOCKED** — `jmeter` command not found, exit `127` |
| Diagnostics | 1-org/2-org/live diagnostic evidence separated from official KPI | **DONE** |
| Safety | no live `passportchannel` reset/redeploy/sequence bump; cleanup benchmark channels | **DONE** |

Overall result: **BLOCKED / not PASS**.

## Evidence manifest

| Requirement | Evidence |
|---|---|
| Performance-goal state | `.omx/goals/performance/full-benchmark-rerun-audit-all-tracks/state.json` |
| Latest machine-readable result | `.omx/goals/performance/full-benchmark-rerun-audit-all-tracks/latest-results.env` |
| Completion audit | `.omx/evidence/blockchain/full-rerun-audit-20260512T114300Z/completion-audit-20260512T143403Z.log` |
| Evaluator output | `.omx/evidence/blockchain/full-rerun-audit-20260512T114300Z/evaluator-final-after-target220.log` |
| Official 4-org write 10-repeat CSV | `.omx/evidence/blockchain/full-rerun-audit-20260512T114300Z/official-write200-10/repeat-results.csv` |
| Official 4-org write summary | `.omx/evidence/blockchain/full-rerun-audit-20260512T114300Z/official-write200-10/summary.env` |
| Cloud read result | `.omx/evidence/blockchain/full-rerun-audit-20260512T114300Z/cloud-read-node-foreground.log` |
| JMeter failure evidence | `.omx/evidence/blockchain/full-rerun-audit-20260512T114300Z/jmeter-recheck-after-fcstride.log` |
| Live read-only diagnostic | `.omx/evidence/blockchain/full-rerun-audit-20260512T114300Z/official-write200-10/live-passportchannel-diagnostic.log` |
| 2-writer diagnostic | `.omx/evidence/blockchain/full-rerun-audit-20260512T114300Z/diagnostic-two-writer-4org/summary.env` |
| target220 2-writer negative diagnostic | `.omx/evidence/blockchain/full-rerun-audit-20260512T114300Z/diagnostic-4org-2writer-target220-3-20260512T142205Z/repeat-results.csv` |
| Cleanup verification | `.omx/evidence/blockchain/full-rerun-audit-20260512T114300Z/cleanup-after-target220-attempt/verify/final-cleanup-verify-v2.log` |
| Static checks | `.omx/evidence/blockchain/full-rerun-audit-20260512T114300Z/static-checks-post-completion-audit.log` |

## Official write findings

The hard-gate 10-repeat run did not pass:

```text
TPS: 167.1 / 182.8 / 192.4 / 187.0 / 176.8 / 192.8 / 173.2 / 194.0 / 191.2 / 179.7
summary: p50=184.9, p10=167.1, min=167.1, mean=183.7
integrity: Fail=0, Reject=0, but several runs Succ=9996~9997/10000
```

Do not report this as write200 success.

The later target220 2-writer diagnostic improved integrity but not throughput:

```text
Succ=10000/10000, Fail=0, Reject=0, successful TPS=155.9
```

This is diagnostic evidence only.

## JMeter blocker

JMeter is a hard gate for this audit. The runner is present, but the executable is not:

```bash
PASSPORT_ID=PASSPORT-BMU-DEVICE \
BMU_ID_OR_DID=PASSPORT-BMU-DEVICE \
scripts/run-jmeter-readonly-benchmark.sh
```

Observed result:

```text
ERROR: jmeter is not installed or not on PATH.
jmeter_script_exit=127
```

Do not vendor JMeter binaries or generated JTL/HTML outputs into the repository. Use a site-approved Apache JMeter installation, Docker image, or wrapper and expose it through `PATH` or `JMETER_CMD`.


### Docker hostname wrapper diagnostic

A private namespace wrapper exists for host-side Docker endpoint diagnostics:

```bash
scripts/with-fabric-docker-hosts.sh getent hosts peer0.manufacturer.battery.com orderer.battery.com
```

It does not edit the real `/etc/hosts`; it bind-mounts a temporary hosts file inside `unshare -Ur -m`.

Latest diagnostic: `.omx/evidence/blockchain/full-rerun-audit-20260512T114300Z/official-write200-10-dockerhosts-20260512T144523Z`. Docker hostname resolution worked, but prepare failed with `GatewayError: 4 DEADLINE_EXCEEDED`, so this path is not official PASS evidence.


Async prepare was also tested on this wrapper path:

- evidence: `.omx/evidence/blockchain/full-rerun-audit-20260512T114300Z/diagnostic-dockerhosts-async-1-20260512T145631Z`
- settings: `CALIPER_PREPARE_ASYNC=true`, `CALIPER_PREPARE_CONCURRENCY=200`, `CALIPER_WRITER_ORGS=manufacturer`
- result: prepare still failed with `GatewayError: 4 DEADLINE_EXCEEDED`

Do not treat docker-hosts+async as a recovered official path.


Native gRPC resolver was tested as a small diagnostic:

- evidence: `.omx/evidence/blockchain/full-rerun-audit-20260512T114300Z/diagnostic-dockerhosts-native-small-20260512T150606Z`
- settings: `GRPC_DNS_RESOLVER=native`, `CALIPER_WRITE_TX_NUMBER=20`, `BMU_RECORD_KEYS=20`
- result: prepare still failed with `GatewayError: 4 DEADLINE_EXCEEDED`

Therefore Docker endpoint recovery is not just a DNS resolver flag issue.

## Safe rerun sequence

Use this order after JMeter runtime is available and Fabric is healthy.

1. Confirm live read-only state only:

```bash
docker exec peer0.manufacturer.battery.com peer channel getinfo -c passportchannel
```

2. Run official Fabric write on a fresh benchmark channel only. Do not reset live `passportchannel`.

```bash
BENCHMARK_CHANNEL_PROFILE=PassportBenchmarkChannel \
BENCHMARK_CHANNEL_ORGS=1,2,3,4 \
BENCHMARK_CC_INSTALL_ORGS=1 \
BENCHMARK_CC_END_POLICY="OR('ManufacturerMSP.peer','EVManufacturerMSP.peer','ServiceMSP.peer','RegulatorMSP.peer')" \
CALIPER_ENDPOINT_MODE=docker \
CALIPER_DISCOVER=false \
CALIPER_WORKERS=1 \
CALIPER_WRITE_TX_NUMBER=10000 \
CALIPER_WRITE_TARGET_TPS=250 \
CALIPER_SKIP_READ_ROUND=true \
BMU_RECORD_KEYS=5000 \
REPEAT_COUNT=10 \
scripts/blockchain-tps-reproducibility.sh
```

If host-side Docker DNS is unavailable, do not silently switch the official result to an unproven endpoint mode. Record the failure and fix the endpoint/runtime path first.

3. Run cloud read:

```bash
BENCH_USER=bench BENCH_PASSWORD=<redacted> BENCH_ORG=1 \
node scripts/tps-benchmark-cloud.js
```

4. Run JMeter read-only:

```bash
PASSPORT_ID=PASSPORT-BMU-DEVICE \
BMU_ID_OR_DID=PASSPORT-BMU-DEVICE \
THREADS=100 LOOP_COUNT=50 RAMP_SECONDS=10 \
scripts/run-jmeter-readonly-benchmark.sh
```

5. Cleanup benchmark-only channels/artifacts and verify orderer/peers are `passportchannel` only.

6. Update `.omx/goals/performance/full-benchmark-rerun-audit-all-tracks/latest-results.env` and run:

```bash
bash .omx/goals/performance/full-benchmark-rerun-audit-all-tracks/evaluate.sh
```

Only mark the goal complete after evaluator PASS and a completion audit shows every hard gate is satisfied.

## Non-negotiables

- JMeter TPS is HTTP/API read-only evidence, not Fabric write TPS.
- Failed or unfinished Caliper transactions do not count toward successful commit TPS.
- Diagnostic 1-org/2-org results do not count as 4-org official write KPI.
- Do not perform live `passportchannel` reset/redeploy/sequence bump for this audit.
- Do not weaken DID/passport/FC/hash/signature validation for benchmark speed.

## 2026-05-13 follow-up diagnostics

Additional recovery candidates were tested and rejected:

| Candidate | Evidence | Result | Decision |
|---|---|---|---|
| 4-org 2-writer target `320 TPS` | `.omx/evidence/blockchain/full-rerun-audit-20260512T114300Z/diagnostic-4org-target320-1-20260512T153539Z` | `Succ=6535`, `Fail=3461`, `Reject=3461`, successful TPS `137.2` | reject; overload/failures do not count |
| benchmark batch `0.5s/250` | `.omx/evidence/blockchain/full-rerun-audit-20260512T114300Z/diagnostic-4org-batch05-target250-1-20260512T155736Z` | successful TPS `120.8`, fail/reject errors | reject; temporary config reverted |
| 1-writer target `270 TPS` | `.omx/evidence/blockchain/full-rerun-audit-20260512T114300Z/diagnostic-4org-1writer-target270-1-20260512T160538Z` | `Succ=9996/10000`, successful TPS `168.4` | reject; worse than target250 |
| Docker hosts + `CALIPER_DISCOVER=false` small check | `.omx/evidence/blockchain/full-rerun-audit-20260512T114300Z/diagnostic-dockerhosts-discoverfalse-small-20260512T162019Z` | deploy OK, prepare `GatewayError: 4 DEADLINE_EXCEEDED` | reject; discovery is not the only blocker |

Cleanup evidence confirms the benchmark channels were removed and peers/orderer returned to `passportchannel` only:

- `.omx/evidence/blockchain/full-rerun-audit-20260512T114300Z/cleanup-after-target320-diagnostic-20260512T155528Z/verify.log`
- `.omx/evidence/blockchain/full-rerun-audit-20260512T114300Z/cleanup-after-batch05-target250-diagnostic-20260512T160320Z/verify.log`
- `.omx/evidence/blockchain/full-rerun-audit-20260512T114300Z/cleanup-after-1writer-target270-diagnostic-20260512T161816Z/verify.log`
- `.omx/evidence/blockchain/full-rerun-audit-20260512T114300Z/cleanup-after-dockerhosts-discoverfalse-small-20260512T162511Z/verify.log`

Current state remains **BLOCKED**, not complete:

- write hard gate: `p50=184.9 < 200`, `Succ==expected=false`.
- cloud read hard gate: pass at `4039.0 TPS`, `Errors=0`.
- JMeter hard gate: blocked because `jmeter` is unavailable.


## 2026-05-13 추가 follow-up — batch 1s/500 loopback diagnostic

| Candidate | Evidence | Result | Decision |
|---|---|---|---|
| loopback 4-org 2-writer batch `1s/500`, target `250 TPS` | `.omx/evidence/blockchain/full-rerun-audit-20260512T114300Z/diagnostic-loopback-4org-2writer-batch1s500-target250-1-diagloop2w-batch1s500-20260512T175833Z/repeat-results.csv` | `Succ=10000/10000`, `Fail=0`, `Reject=0`, successful TPS `187.1` | reject; all-success but below write200 |
| loopback 4-org 2-writer batch `1s/500`, target `280 TPS` | `.omx/evidence/blockchain/full-rerun-audit-20260512T114300Z/diagnostic-loopback-4org-2writer-batch1s500-target280-1-diagloop2w-batch1s500-t280-20260512T180652Z/repeat-results.csv` | `Succ=10000/10000`, `Fail=0`, `Reject=0`, successful TPS `181.3` | reject; higher target worsens latency/TPS |

Cleanup evidence: `.omx/evidence/blockchain/full-rerun-audit-20260512T114300Z/cleanup-after-loopback-batch1s500-target280-20260512T181703Z/verify.log`; peers/orderer are back to `passportchannel` only.

Current result remains **BLOCKED**, not complete:

- write hard gate: official 10-repeat `p50=184.9 < 200`, `Succ==expected=false`.
- cloud read hard gate: pass at `4039.0 TPS`, `Errors=0`.
- JMeter hard gate: blocked because `jmeter` is unavailable.

## 2026-05-13 추가 follow-up — additional batch candidates

| Candidate | Evidence | Result | Decision |
|---|---|---|---|
| loopback 4-org 2-writer batch `2s/1000`, target `250 TPS` | `.omx/evidence/blockchain/full-rerun-audit-20260512T114300Z/diagnostic-loopback-4org-2writer-batch2s1000-target250-1-diagloop2w-batch2s1000-t250-20260512T182824Z/repeat-results.csv` | `Succ=9998/10000`, `Fail=0`, `Reject=0`, successful TPS `175.0` | reject; worse than `1s/500` |
| loopback 4-org 2-writer batch `1s/1000`, target `250 TPS` | `.omx/evidence/blockchain/full-rerun-audit-20260512T114300Z/diagnostic-loopback-4org-2writer-batch1s1000-target250-1-diagloop2w-batch1s1000-t250-20260512T183821Z/repeat-results.csv` | `Succ=10000/10000`, `Fail=0`, `Reject=0`, successful TPS `170.4` | reject; worse than `1s/500` |

Cleanup evidence:

- `.omx/evidence/blockchain/full-rerun-audit-20260512T114300Z/cleanup-after-loopback-batch2s1000-target250-20260512T183707Z/verify.log`
- `.omx/evidence/blockchain/full-rerun-audit-20260512T114300Z/cleanup-after-loopback-batch1s1000-target250-20260512T184542Z/verify.log`

Current state remains **BLOCKED**, not complete.

## 2026-05-13 추가 follow-up — BMU hot-path MSP lookup simplification

| Candidate | Evidence | Result | Decision |
|---|---|---|---|
| reuse RBAC MSP value in `RecordBMUData`; byte-loop SHA256 hex validation | `.omx/evidence/blockchain/full-rerun-audit-20260512T114300Z/diagnostic-loopback-4org-2writer-hotpath-msp-target250-1-diagloop2w-hotpathmsp-t250-20260512T185100Z/repeat-results.csv` | `Succ=10000/10000`, `Fail=0`, `Reject=0`, successful TPS `176.7` | keep as simplification, but not write200 recovery evidence |

Cleanup evidence: `.omx/evidence/blockchain/full-rerun-audit-20260512T114300Z/cleanup-after-loopback-hotpath-msp-target250-20260512T185835Z/verify.log`.

## 2026-05-13 추가 follow-up — official loopback 2-writer 10-repeat

| Candidate | Evidence | Result | Decision |
|---|---|---|---|
| loopback 4-org 2-writer batch `1s/500`, 10 repeats, target `250 TPS` | `.omx/evidence/blockchain/full-rerun-audit-20260512T114300Z/official-write200-10-loopback-2writer-batch1s500-20260512T190251Z/repeat-results.csv` | `p50=175.9`, `p10=168.7`, `min=168.7`, `mean=178.9`, `ALL_RUNS_SUCC_EXPECTED=false`, `Fail=0`, `Reject=0` | official FAIL; not write200 |

Cleanup evidence: `.omx/evidence/blockchain/full-rerun-audit-20260512T114300Z/cleanup-after-official-loopback-2writer-batch1s500-10-20260512T192927Z/verify.log`.

## 2026-05-13 추가 follow-up — clean 4s/1000 and warm-up diagnostics

| Candidate | Evidence | Result | Decision |
|---|---|---|---|
| clean `4s/1000`, host, 4-org 2-writer, target `300 TPS`, 3000 tx | `.omx/evidence/blockchain/full-rerun-audit-20260512T114300Z/official-write200-10-clean-4s1000-host-2writer-3000-20260513T071631Z/repeat-results.csv` | run1 `Succ=2997/3000`, `113.4 TPS`; run2 `Succ=3000/3000`, `216.9 TPS` | reject; run1 already violates `Succ==expected` and `min>=150` |
| `3s/1000` batch candidate | `.omx/evidence/blockchain/full-rerun-audit-20260512T114300Z/diagnostic-clean-3s1000-host-2writer-3000-20260513T072858Z/repeat-results.csv` | `Succ=2997/3000`, `109.3 TPS` | reject; worse than `4s/1000`; config reverted to `4s/1000` |
| non-counted warm-up then counted repeats | `.omx/evidence/blockchain/full-rerun-audit-20260512T114300Z/diagnostic-counted-after-warmup-4s1000-host-2writer-3000-20260513T073826Z/repeat-results.csv` | counted run1 `Succ=2996/3000`, `106.9 TPS` | reject; warm-up does not recover the hard gate |

Cleanup evidence:

- `.omx/evidence/blockchain/full-rerun-audit-20260512T114300Z/cleanup-before-next-write200-real-20260513T071315Z/cleanup.log`
- `.omx/evidence/blockchain/full-rerun-audit-20260512T114300Z/cleanup-after-aborted-clean-4s1000-20260513T072754Z/cleanup.log`
- `.omx/evidence/blockchain/full-rerun-audit-20260512T114300Z/cleanup-after-3s1000-diagnostic-20260513T073620Z/cleanup.log`
- `.omx/evidence/blockchain/full-rerun-audit-20260512T114300Z/cleanup-after-warmup-diagnostic-20260513T074821Z/cleanup.log`

Final status remains **BLOCKED**, not PASS:

- latest completed official 10-repeat remains `p50=175.9`, `p10=168.7`, `min=168.7`, `ALL_RUNS_SUCC_EXPECTED=false`.
- cloud read remains PASS at `4039.0 TPS`, `Errors=0`.
- JMeter remains missing: `.omx/evidence/blockchain/full-rerun-audit-20260512T114300Z/jmeter-recheck-after-20260513-followup-20260513T075128Z.log`.
- evaluator remains failing/blocked: `.omx/evidence/blockchain/full-rerun-audit-20260512T114300Z/evaluator-after-20260513-followup-20260513T075128Z.log`.


## 2026-05-13 추가 follow-up — JMeter actual PASS, disjoint-key write diagnostic FAIL

- 외부 의견(`${WINDOWS_HOME}/Desktop/cl.txt`)의 핵심 판단을 반영했다: JMeter는 대체 evidence 없이 실제 CLI 실행으로만 gate를 만족시키고, live `passportchannel`은 read-only로 유지한다.
- JMeter actual run:
  - evidence: `.omx/evidence/blockchain/full-rerun-audit-20260512T114300Z/jmeter-readonly-actual-20260513T104209Z/evidence.md`
  - JTL: `.omx/evidence/blockchain/full-rerun-audit-20260512T114300Z/jmeter-readonly-actual-20260513T104209Z/results.jtl`
  - summary: `10000 samples`, success `100.00%`, error `0.00%`, p95 `3 ms`, throughput `880.20 samples/sec`.
  - tool: `/tmp/bms-jmeter-runtime/apache-jmeter-5.6.3/bin/jmeter` (repo outside runtime install).
- Disjoint-key diagnostic:
  - evidence: `.omx/evidence/blockchain/full-rerun-audit-20260512T114300Z/diag-disjoint-4w-5k-t300-2x-20260513T195252KST/repeat-results.csv`
  - channel: `passportdj0513195252`, profile `PassportBenchmarkChannel`, channel orgs `1,2,3,4`, install orgs `1,2`, workers `4`, tx per repeat `5000`, target `300 TPS`, `DISJOINT_KEYS_PER_REPEAT=true`.
  - result: run1 `5000/5000`, `177.6 TPS`; run2 `4997/5000`, `130.3 TPS`; p50 `153.9`; `ALL_RUNS_SUCC_EXPECTED=false`.
  - decision: reject; it does not justify a 10-repeat official rerun.
- Cleanup evidence:
  - `.omx/evidence/blockchain/full-rerun-audit-20260512T114300Z/cleanup-after-disjoint-diag-20260513T195910KST/cleanup.log`
  - `.omx/evidence/blockchain/full-rerun-audit-20260512T114300Z/post-disjoint-cleanup-state-20260513T200000KST.log`
- Latest evaluator evidence:
  - `.omx/evidence/blockchain/full-rerun-audit-20260512T114300Z/evaluator-after-disjoint-diag-20260513T200010KST.log`
  - verdict: FAIL because official write remains `WRITE200_P50_TPS=175.9 < 200` and `ALL_RUNS_SUCC_EXPECTED=false`.

Current audit status: JMeter gate is satisfied by actual run evidence, Node cloud read remains PASS, but the official 4-org Caliper write gate remains FAIL. Do not mark this audit PASS.

## 2026-05-13 추가 follow-up — cl.txt 반영 후 write200 복구 시도 결과

External opinion file `${WINDOWS_HOME}/Desktop/cl.txt` was reviewed and applied where safe. The live `passportchannel` remained read-only; all writes used disposable benchmark channels.

| Candidate | Evidence | Result | Decision |
|---|---|---|---|
| install1/w1 Docker, `PassportBenchmarkChannel` restored to `4s/2000` | `.omx/evidence/blockchain/full-rerun-audit-20260512T114300Z/official-write200-10-install1-w1-docker-4s2000-20260513T202022KST/repeat-results.csv` | run1 `9999/10000`, successful TPS `154.5` | abort; hard gate impossible |
| benchmark-only chaincode staging with CouchDB indexes stripped | `.omx/evidence/blockchain/full-rerun-audit-20260512T114300Z/diag-write200-noindexes-install1-w1-1x-20260513T203735KST/summary.json` | `9999/10000`, successful TPS `157.4` | reject; no recovery |
| workers20 + 10000 active keys + target 250 | `.omx/evidence/blockchain/full-rerun-audit-20260512T114300Z/diag-write200-workers20-keys10000-t250-1x-20260513T205038KST/summary.json` | `9986/10000`, successful TPS `185.5` | reject; below 200 and succ mismatch |
| same channel extra workers40 + target 250 | `.omx/evidence/blockchain/full-rerun-audit-20260512T114300Z/diag-write200-workers20-keys10000-t250-1x-20260513T205038KST/caliper-extra-w40-t250.env` | `10000/10000`, successful TPS `199.2` | reject; nearest result but still below 200 and not 10-repeat official |
| extra worker/target grid | `.omx/evidence/blockchain/full-rerun-audit-20260512T114300Z/diag-write200-workers20-keys10000-t250-1x-20260513T205038KST/extra-grid-results.csv` | `145.5~161.0 TPS`, mostly succ mismatch | reject |

Cleanup evidence:

- `.omx/evidence/blockchain/full-rerun-audit-20260512T114300Z/cleanup-after-install1-w1-docker-4s2000-abort-20260513T203250KST/cleanup.log`
- `.omx/evidence/blockchain/full-rerun-audit-20260512T114300Z/cleanup-after-noindexes-diag-20260513T204927KST/cleanup.log`
- `.omx/evidence/blockchain/full-rerun-audit-20260512T114300Z/cleanup-after-workers-grid-diag-20260513T211554KST/orderer-list-after-cleanup.log`

Static validation evidence:

- `.omx/evidence/blockchain/full-rerun-audit-20260512T114300Z/static-final-*/static.log` (`bash -n`, `node -c`, `go test ./...`, `git diff --check` all passed).

Current audit status: JMeter actual evidence is available and Node cloud read remains passing, but the official 4-org Caliper write hard gate remains unmet. The nearest safe diagnostic reached `199.2 TPS` for one run, below the threshold and not a 10-repeat official result. Do not treat this audit as PASS.

## 2026-05-13 추가 follow-up — official w40/keys10000/t250 rerun FAIL

The nearest safe diagnostic (`workers40`, `target 250`, `BMU_RECORD_KEYS=10000`) was promoted to an official 10-repeat candidate on a disposable 4-org benchmark channel. The live `passportchannel` remained read-only.

| Candidate | Evidence | Result | Decision |
|---|---|---|---|
| Docker-network 4-org, install org 1, `PassportBenchmarkChannel` `4s/2000`, workers40, keys10000, target 250, 10 repeats planned | `.omx/evidence/blockchain/full-rerun-audit-20260512T114300Z/official-write200-10-w40-keys10000-t250-docker-4s2000-20260513T212013KST/repeat-results.csv` | run1 `9962/10000` @ `179.0 TPS`; run2 `10000/10000` @ `171.4 TPS`; run3 `9969/10000` @ `173.5 TPS` | abort; hard gate impossible (`Succ==expected` already false, p50 below 200) |

Cleanup evidence:

- `.omx/evidence/blockchain/full-rerun-audit-20260512T114300Z/cleanup-after-w40-official-fail-20260513T213817KST/cleanup.log`
- `.omx/evidence/blockchain/full-rerun-audit-20260512T114300Z/cleanup-after-w40-official-fail-20260513T213817KST/orderer-channels.after.json` (`passportchannel` only)

Evaluator evidence:

- `.omx/evidence/blockchain/full-rerun-audit-20260512T114300Z/evaluator-after-w40-official-fail-20260513T214000KST.log`
- verdict: FAIL because `REPEAT_RUN_COUNT=3 < 10`, `WRITE200_P50_TPS=173.5 < 200`, and row 1/3 successful commits did not equal expected.

Current audit status remains **NOT PASS / validation_failed**. JMeter actual and Node cloud read pass evidence exist, but the official 4-org Caliper write200 10-repeat successful-commit gate remains unmet.

## 2026-05-13 추가 follow-up — cl.txt ledger reconciliation evidence

`${WINDOWS_HOME}/Desktop/cl.txt` was reviewed. Its main recommendation was to separate actual ledger commit failure from Caliper commit-event/accounting loss. The live `passportchannel` remained read-only; all writes used disposable benchmark channels.

| Candidate | Evidence | Result | Decision |
|---|---|---|---|
| ledger reconcile baseline, `4s/2000`, workers40, target250 | `.omx/evidence/blockchain/full-rerun-audit-20260512T114300Z/diag-ledger-reconcile-w40-10k-t250-20260513T214514KST/ledger-reconciliation.json` | Caliper `10000/10000`; CouchDB counts all `10000`; `ledger_matches_caliper_success` | diagnostic only |
| `1s/250`, workers50, target230, `msp_any`, 3-run smoke | `.omx/evidence/blockchain/full-rerun-audit-20260512T114300Z/smoke-cltxt-w50-t230-batch1s250-mspany-20260513T220410KST/ledger-reconciliation.json` | Caliper `29888/30000`; CouchDB counts all `30000`; p50 `136.1`, min `111.2`; `caliper_event_or_accounting_artifact` | reject; Succ and TPS gate fail |
| reverted `4s/2000`, workers40, target250, `msp_any`, 3-run smoke | `.omx/evidence/blockchain/full-rerun-audit-20260512T114300Z/smoke-w40-t250-4s2000-mspany-20260513T221907KST/ledger-reconciliation.json` | Caliper `29907/30000`; CouchDB counts all `30000`; p50 `148.8`, min `148.7`; one run `207.4`; `caliper_event_or_accounting_artifact` | reject; Succ and p50 gate fail |

Cleanup evidence:

- `.omx/evidence/blockchain/full-rerun-audit-20260512T114300Z/cleanup-after-ledger-reconcile-success-20260513T220048KST/cleanup.log`
- `.omx/evidence/blockchain/full-rerun-audit-20260512T114300Z/cleanup-after-smoke-cltxt-w50-fail-20260513T221720KST/cleanup.log`
- `.omx/evidence/blockchain/full-rerun-audit-20260512T114300Z/cleanup-after-smoke-w40-mspany-fail-20260513T223834KST/cleanup.log`

Current audit status remains **NOT PASS / validation_failed**. Ledger reconciliation supports the event/accounting artifact diagnosis for missing Caliper Succ, but the official gate still requires Caliper `Succ==expected` and p50 `>=200` across 10 repeats.

## cl.txt 반영 및 observer interval 검증 — 2026-05-14 KST

외부 의견 `${WINDOWS_HOME}/Desktop/cl.txt`의 권고대로 Caliper `Succ<expected`를 ledger/world state와 분리했다. 공식 판정은 계속 Caliper successful commit 기준이다.

Evidence:

- `diag-txmap-w40-t250-mspany-20260513T230948KST/txmap-summary.json`
  - workload lines 10000, status success 10000, verified true 10000
  - CouchDB count 10000/10000 on all four peers
  - Caliper report 9968/10000
  - classification: `caliper_reporter_aggregation_artifact`
- `smoke-observer5000-w40-t250-mspany-20260513T232705KST/summary.json`
  - `CALIPER_OBSERVER_INTERNAL_INTERVAL=5000`
  - 10000/10000, Fail 0, Reject 0, 174.6 TPS
  - `ledger-reconciliation.json`: all CouchDB counts 10000, `ledger_matches_caliper_success`
- `smoke-observer5000-w40-t250-3run-mspany-20260513T234327KST/summary.json`
  - runs: 7190/10000, 10000/10000, 8588/10000
  - min 121.9, p50 126.0, allRunsSuccExpected false
  - `ledger-reconciliation.json`: CouchDB 25858/30000, Caliper succ 25778/30000, classification `mixed_or_lagging_peer_state`
  - peer evidence: `peer0.manufacturer.battery.com.errors-tail.log` contains CouchDB `i/o timeout`; `peer0.evmanufacturer.battery.com.errors-tail.log` contains gateway endorsement cancellation.

Decision: do not run official 10-repeat from this config. The blocker has moved from pure Caliper reporter aggregation to mixed resource/CouchDB/gateway instability under repeated write load.

## 2026-05-14 추가 follow-up — 2-worker/2-writer observer5000 smoke FAIL

`${WINDOWS_HOME}/Desktop/cl.txt`의 분산 writer/Caliper 관측 안정화 권고를 좁혀 확인했다. live `passportchannel`은 read-only로 유지했고, write는 disposable benchmark channel `passport220514002534`에서만 수행했다.

| Candidate | Evidence | Result | Decision |
|---|---|---|---|
| 4-org channel, install orgs 1,2, workers2, 2 writer orgs, target300, `CALIPER_OBSERVER_INTERNAL_INTERVAL=5000` | `.omx/evidence/blockchain/full-rerun-audit-20260512T114300Z/smoke-2worker-2writer-observer5000-10k-t300-20260514T002534KST/summary.json` | Caliper `9998/10000`, Fail 0, Reject 0, `121.3 TPS` | reject; Succ and TPS gate fail |

Ledger/world-state reconciliation:

- `.omx/evidence/blockchain/full-rerun-audit-20260512T114300Z/smoke-2worker-2writer-observer5000-10k-t300-20260514T002534KST/ledger-reconciliation.json`
- CouchDB count: `10000/10000` on all four peers.
- peer heights: all four peers height `128` with same current block hash.
- classification: `caliper_event_or_accounting_artifact`.

Cleanup evidence:

- `.omx/evidence/blockchain/full-rerun-audit-20260512T114300Z/cleanup-after-smoke-2worker-2writer-observer5000-10k-20260514T003838KST/cleanup.log`
- `orderer-channels.after.json`: `passportchannel` only.

Decision: do not run official 10-repeat. This confirms ledger commit can reach expected count while Caliper reports two missing successful commits, but throughput is far below the write gate (`121.3 TPS`). Current local 8-vCPU environment remains insufficient for stable 4-org 10k write200 PASS.

## 2026-05-14 추가 follow-up — fixed-feedback-rate smoke FAIL

`cl.txt`의 backlog 제어 제안 중 아직 미검증이던 `fixed-feedback-rate`를 runner 옵션으로 추가하고 disposable channel에서 1회 smoke를 수행했다. 기본값은 기존 `fixed-rate`라 기존 benchmark 동작은 유지된다.

| Candidate | Evidence | Result | Decision |
|---|---|---|---|
| 4-org channel, install org 1, workers50, target230, `fixed-feedback-rate`, `transactionLoad=800`, `msp_any`, observer interval 5000 | `.omx/evidence/blockchain/full-rerun-audit-20260512T114300Z/smoke-fixedfeedback-w50-t230-load800-10k-20260514T004330KST/summary.json` | Caliper `5750/10000`, Fail `4250`, Reject `4250`, `86.2 TPS` | reject; worse than fixed-rate |

Reconciliation:

- `.omx/evidence/blockchain/full-rerun-audit-20260512T114300Z/smoke-fixedfeedback-w50-t230-load800-10k-20260514T004330KST/ledger-reconciliation.json`
- CouchDB count: `5750/10000` on all four peers.
- peer heights: all four peers height `223` with same current block hash.
- classification: `ledger_matches_caliper_success` — this was actual submission/endorsement failure, not reporter-only loss.
- Caliper errors show gateway endorsement cancellation: `rpc error: code = Canceled desc = grpc: the client connection is closing`.

Cleanup evidence:

- `.omx/evidence/blockchain/full-rerun-audit-20260512T114300Z/cleanup-after-smoke-fixedfeedback-fail-20260514T010425KST/cleanup.log`
- `orderer-channels.after.json`: `passportchannel` only.

Decision: `fixed-feedback-rate` is not a viable recovery path in the current local environment. Do not run official 10-repeat from this candidate.

## 2026-05-14 추가 follow-up — docker-ip endpoint diagnostic prepare FAIL

Host Caliper가 peer published `localhost` endpoint 대신 Docker bridge IP로 직접 접속하는 경로를 확인했다. live `passportchannel`은 건드리지 않았고 disposable channel `passportdi0514010800`만 사용했다.

| Candidate | Evidence | Result | Decision |
|---|---|---|---|
| 4-org channel, install org 1, workers40, target250, `CALIPER_ENDPOINT_MODE=docker-ip`, `msp_any`, observer interval 5000 | `.omx/evidence/blockchain/full-rerun-audit-20260512T114300Z/smoke-dockerip-w40-t250-observer5000-10k-20260514T010800KST/prepare-only.log` | prepare failed: `GatewayError: 4 DEADLINE_EXCEEDED` | reject; endpoint mode not viable |

Cleanup evidence:

- `.omx/evidence/blockchain/full-rerun-audit-20260512T114300Z/cleanup-after-smoke-dockerip-prepare-fail-20260514T011019KST/cleanup.log`
- `orderer-channels.after.json`: `passportchannel` only.

Decision: `docker-ip` endpoint mode does not recover the write gate and does not reach the Caliper write round. Do not run official 10-repeat from this candidate.

## 2026-05-14 추가 follow-up — writer round-robin observer5000 smoke TPS FAIL

`cl.txt`의 writer 분산/관측 안정화 제안 중 `manufacturer,evmanufacturer` round-robin writer 경로를 disposable channel에서 확인했다. live `passportchannel`은 read-only로 유지했다.

| Candidate | Evidence | Result | Decision |
|---|---|---|---|
| 4-org channel, install orgs 1,2, workers40, target250, `CALIPER_WRITER_ORGS=manufacturer,evmanufacturer`, `CALIPER_WRITER_SELECTION=round-robin`, `msp_any`, observer interval 5000 | `.omx/evidence/blockchain/full-rerun-audit-20260512T114300Z/smoke-writer-roundrobin-w40-t250-observer5000-10k-20260514T011300KST/summary.json` | Caliper `10000/10000`, Fail 0, Reject 0, `156.7 TPS` | reject; TPS < 200 and only 1 repeat |

Ledger/world-state reconciliation:

- `.omx/evidence/blockchain/full-rerun-audit-20260512T114300Z/smoke-writer-roundrobin-w40-t250-observer5000-10k-20260514T011300KST/ledger-reconciliation.json`
- CouchDB count: `10000/10000` on all four peers.
- peer heights: all four peers height `227` with same current block hash.
- classification: `ledger_matches_caliper_success`.

Cleanup evidence:

- `.omx/evidence/blockchain/full-rerun-audit-20260512T114300Z/cleanup-after-smoke-writer-roundrobin-20260514T013556KST/cleanup.log`
- `orderer-channels.after.json`: `passportchannel` only.

Decision: do not run official 10-repeat. This candidate finally satisfies the single-run successful commit count, but throughput is still below the hard write gate and does not justify a 10-repeat official run on the current 8-vCPU host.

## 2026-05-14 추가 follow-up — writer round-robin target350 smoke FAIL

직전 `target250` round-robin smoke가 commit count는 맞았지만 `156.7 TPS`에 머물렀기 때문에, 동일한 disposable topology에서 offered load만 `target350`으로 올려 확인했다. live `passportchannel`은 read-only로 유지했다.

| Candidate | Evidence | Result | Decision |
|---|---|---|---|
| 4-org channel, install orgs 1,2, workers40, target350, `CALIPER_WRITER_ORGS=manufacturer,evmanufacturer`, `CALIPER_WRITER_SELECTION=round-robin`, `msp_any`, observer interval 5000 | `.omx/evidence/blockchain/full-rerun-audit-20260512T114300Z/smoke-writer-roundrobin-w40-t350-observer5000-10k-20260514T014100KST/summary.json` | Caliper `9962/10000`, Fail 0, Reject 0, `116.4 TPS`, send rate `349.6 TPS`, avg latency `42.42s` | reject; higher offered load worsened TPS and Caliper accounting |

Ledger/world-state reconciliation:

- `.omx/evidence/blockchain/full-rerun-audit-20260512T114300Z/smoke-writer-roundrobin-w40-t350-observer5000-10k-20260514T014100KST/ledger-reconciliation.json`
- CouchDB count: `10000/10000` on all four peers.
- peer heights: all four peers height `226` with same current block hash.
- classification: `caliper_event_or_accounting_artifact`.

Cleanup evidence:

- `.omx/evidence/blockchain/full-rerun-audit-20260512T114300Z/cleanup-after-smoke-writer-roundrobin-t350-20260514T020149KST/cleanup.log`
- `orderer-channels.after.json`: `passportchannel` only.

Decision: do not run official 10-repeat. Raising offered load above the last clean-count smoke causes backlog/latency inflation and reduces successful commit TPS in the current 8-vCPU environment.

## 2026-05-14 추가 follow-up — batch1s500 + round-robin observer5000 smoke FAIL

과거 단일 진단에서 가장 높았던 `1s/500` batch profile 계열을 현재 조합(`round-robin`, `msp_any`, observer interval 5000)에 다시 적용해 확인했다. 이 변경은 disposable benchmark channel 생성에만 사용했고, smoke 후 `PassportBenchmarkChannel` 설정은 다시 `4s/2000`으로 복구했다. live `passportchannel`은 read-only로 유지했다.

| Candidate | Evidence | Result | Decision |
|---|---|---|---|
| 4-org channel, `PassportBenchmarkChannel` temporary `BatchTimeout=1s`, `MaxMessageCount=500`, install orgs 1,2, workers40, target250, round-robin writers, `msp_any`, observer interval 5000 | `.omx/evidence/blockchain/full-rerun-audit-20260512T114300Z/smoke-batch1s500-roundrobin-w40-t250-observer5000-10k-20260514T020801KST/summary.json` | Caliper `9964/10000`, Fail 0, Reject 0, `114.7 TPS`, send rate `196.6 TPS`, avg latency `33.54s` | reject; worse than current 4s/2000 round-robin baseline |

Ledger/world-state reconciliation:

- `.omx/evidence/blockchain/full-rerun-audit-20260512T114300Z/smoke-batch1s500-roundrobin-w40-t250-observer5000-10k-20260514T020801KST/ledger-reconciliation.json`
- CouchDB count: `10000/10000` on all four peers.
- peer heights: all four peers height `258` with same current block hash.
- classification: `caliper_event_or_accounting_artifact`.

Cleanup/config evidence:

- `.omx/evidence/blockchain/full-rerun-audit-20260512T114300Z/cleanup-after-smoke-batch1s500-roundrobin-20260514T021810KST/cleanup.log`
- `orderer-channels.after.json`: `passportchannel` only.
- `passport-network/configtx/configtx.yaml` restored to `PassportBenchmarkChannel` `BatchTimeout=4s`, `MaxMessageCount=2000`; config generation check: `/tmp/passport-benchmark-restored-4s2000-configtxgen.log`.

Decision: do not run official 10-repeat. The old `1s/500` profile is not a recovery path in the current observer/round-robin setup.

## 2026-05-14 추가 follow-up — 4-writer org expansion invalid

`cl.txt`의 gateway/분산 가설을 더 밀어보기 위해 writer org를 4개(`manufacturer,evmanufacturer,service,regulator`)로 확장하는 후보를 disposable channel에서만 시도했다. 이 후보는 write round 진입 전 workload authorization guard에서 중단됐으므로 성능 datapoint로 취급하지 않는다. live `passportchannel`은 read-only로 유지했다.

| Candidate | Evidence | Result | Decision |
|---|---|---|---|
| 4-org channel, install orgs 1,2,3,4, workers40, target250, `CALIPER_WRITER_ORGS=manufacturer,evmanufacturer,service,regulator`, `round-robin`, `msp_any`, observer interval 5000 | `.omx/evidence/blockchain/full-rerun-audit-20260512T114300Z/smoke-4writer-roundrobin-w40-t250-observer5000-10k-20260514T022227KST/prepare-only.log` | prepare failed: `RecordBMUData writer org 'service' is not authorized. Use manufacturer and/or evmanufacturer.` | reject; product authorization semantics상 service/regulator writer는 허용하지 않음 |

Cleanup evidence:

- `.omx/evidence/blockchain/full-rerun-audit-20260512T114300Z/cleanup-after-smoke-4writer-invalid-20260514T022654KST/cleanup.log`
- `.omx/evidence/blockchain/full-rerun-audit-20260512T114300Z/cleanup-after-smoke-4writer-invalid-20260514T022654KST/orderer-channels.after.json`: `passportchannel` only.

Decision: 4-writer 확장은 benchmark 회복 경로가 아니다. `RecordBMUData` writer authorization을 약화해 PASS를 만드는 것은 제품 semantics 변경이므로 수행하지 않는다. 현재 safe writer 분산 범위는 `manufacturer,evmanufacturer`까지이며, 그 best observed result는 `10000/10000` but `156.7 TPS`로 hard gate 미달이다.

## 2026-05-14 추가 follow-up — actual writer-selection pass-through + batch1s250 smoke FAIL

`cl.txt` 의견을 다시 읽고 현재 harness를 대조한 결과, 기존 `round-robin` smoke 라벨 중 `scripts/blockchain-tps-reproducibility.sh` 경유 실행은 `CALIPER_WRITER_SELECTION`을 pass-through하지 않아 실제로는 workload 기본값(`worker` selection)으로 실행됐음을 확인했다. 이를 재현성 버그로 분류하고 runner evidence에 writer selection을 명시하도록 수정했다.

Changes:

- `scripts/blockchain-tps-reproducibility.sh`: `CALIPER_WRITER_SELECTION` env whitelist 추가.
- `caliper-workspace/run-bench.sh`: writer selection logging 추가.

Actual per-tx round-robin smoke:

| Candidate | Evidence | Result | Decision |
|---|---|---|---|
| 4-org channel, temporary `PassportBenchmarkChannel` `BatchTimeout=1s`, `MaxMessageCount=250`, `PreferredMaxBytes=2 MB`, install orgs 1,2, workers50, target230, `CALIPER_WRITER_ORGS=manufacturer,evmanufacturer`, `CALIPER_WRITER_SELECTION=round-robin`, `msp_any`, observer interval 5000 | `.omx/evidence/blockchain/full-rerun-audit-20260512T114300Z/smoke-actual-roundrobin-batch1s250-w50-t230-observer5000-3run-20260514T023416KST/ledger-reconciliation.json` | run1 Caliper `9950/10000`, Fail 0, Reject 0, `101.9 TPS`, send rate `180.6`, avg latency `41.82s` | reject; first run fails `Succ==expected` and TPS gate, remaining repeats aborted intentionally |

Ledger/world-state reconciliation:

- txmap copied into evidence dir: 64 files, 10000 lines, `10000 success true`.
- CouchDB count: `10000/10000` on all four peers for prefix `B-CAL-2d5dddc3-`.
- classification: `caliper_event_or_accounting_artifact_but_tps_gate_failed`.
- Interpretation: `cl.txt`의 “ledger 기준과 Caliper callback을 분리”하라는 조언은 맞았다. 이번 run도 ledger/world-state는 expected count를 보였지만, Caliper official gate와 TPS gate는 실패했다.

Cleanup/config/static evidence:

- `.omx/evidence/blockchain/full-rerun-audit-20260512T114300Z/cleanup-after-smoke-actual-roundrobin-1s250-fail-20260514T024906KST/cleanup.log`
- `orderer-channels.after.json`: `passportchannel` only.
- `PassportBenchmarkChannel` config restored to canonical `4s/2000`; static/config check: `.omx/evidence/blockchain/full-rerun-audit-20260512T114300Z/static-after-actual-roundrobin-1s250-fail-20260514T025001KST.log`.

Decision: actual per-tx round-robin and `1s/250` block smoothing are not viable recovery paths on the current local 8-vCPU environment. The write hard gate remains `validation_failed`; do not run official 10-repeat from this candidate.

## 2026-05-14 추가 follow-up — resource-sampled 4s/2000 smoke TPS FAIL

CouchDB/peer resource ceiling 가설을 확인하기 위해 disposable channel에서 Docker stats sampler를 병행한 10k write smoke를 수행했다. live `passportchannel`은 read-only로 유지했다.

| Candidate | Evidence | Result | Decision |
|---|---|---|---|
| 4-org channel, canonical `PassportBenchmarkChannel` `4s/2000`, install org 1, workers40, target250, `msp_any`, observer interval 5000, timeout 180s | `.omx/evidence/blockchain/full-rerun-audit-20260512T114300Z/resource-sampled-w40-t250-4s2000-20260514T025939KST/summary.json` | Caliper `10000/10000`, Fail 0, Reject 0, `173.3 TPS`, send rate `226.1`, avg latency `15.53s` | reject; count integrity OK but p50/min < 200 and only 1 repeat |

Resource evidence:

- Full sampler: `docker-stats.jsonl`, `couchdb-active-tasks.jsonl`, `resource-summary.json`.
- Write-phase summary: `resource-summary-write-phase.json`.
- Write phase hot spots:
  - `couchdb0` avg `57.61%`, max `139.29%` CPU.
  - `peer0.manufacturer.battery.com` avg `44.98%`, max `83.26%` CPU.
  - other CouchDB peers are much lower on average (`17~19%`).

Cleanup evidence:

- `.omx/evidence/blockchain/full-rerun-audit-20260512T114300Z/cleanup-after-resource-sampled-w40-t250-4s2000-20260514T025939KST-20260514T031920KST/cleanup.log`
- `orderer-channels.after.json`: `passportchannel` only.

Decision: do not run official 10-repeat from this candidate. The data supports a gateway/writer/CouchDB0 hot-spot rather than a missing timeout/concurrency knob. Current write hard gate remains `validation_failed`.

## 2026-05-14 추가 follow-up — EV gateway resource-sampled smoke TPS FAIL

`cl.txt`의 gateway/resource 분산 가설을 single write gateway 전환으로 좁혀 확인했다. `CreateBatteryPassport` 준비 단계는 `ManufacturerMSP`가 필요하므로 `PREPARE_ORG=manufacturer`로 유지했고, write run만 `ORG=evmanufacturer` gateway로 실행했다. live `passportchannel`은 read-only로 유지했다.

| Candidate | Evidence | Result | Decision |
|---|---|---|---|
| 4-org channel, canonical `PassportBenchmarkChannel` `4s/2000`, install orgs `1,2`, prepare org `manufacturer`, run org `evmanufacturer`, workers40, target250, `msp_any`, observer interval 5000, timeout 180s | `.omx/evidence/blockchain/full-rerun-audit-20260512T114300Z/resource-sampled-evgw-w40-t250-4s2000-20260514T032424KST/summary.json` | Caliper `10000/10000`, Fail 0, Reject 0, `178.3 TPS`, send rate `227.3`, avg latency `14.51s` | reject; count integrity OK but p50/min < 200 and only 1 repeat |

Resource evidence:

- Full sampler: `docker-stats.jsonl`, `couchdb-active-tasks.jsonl`, `resource-summary.json`.
- Write-phase summary: `resource-summary-write-phase.json`.
- Write phase distribution:
  - `couchdb0` avg `51.10%`, max `112.95%` CPU.
  - `couchdb1` avg `49.14%`, max `109.70%` CPU.
  - `peer0.manufacturer.battery.com` avg `34.35%`, max `67.90%` CPU.
  - `peer0.evmanufacturer.battery.com` avg `31.68%`, max `63.98%` CPU.

Cleanup evidence:

- `.omx/evidence/blockchain/full-rerun-audit-20260512T114300Z/cleanup-after-resource-sampled-evgw-w40-t250-4s2000-20260514T032424KST-20260514T034520KST/cleanup.log`
- `orderer-channels.after.json`: `passportchannel` only.

Decision: do not run official 10-repeat from this candidate. EV gateway shifts part of the write path but still leaves successful commit TPS around `178 TPS`; the current local environment/write path remains below the official `p50>=200` gate.

## 2026-05-14 추가 follow-up — reconciliation harness validated

To make `cl.txt`'s ledger/world-state split reproducible, the benchmark harness now has an optional pre-cleanup reconciliation step.

Changes:

- `scripts/reconcile-benchmark-state.js`: summarizes Caliper CSV/summary, workload txmap JSONL, CouchDB record-prefix counts, and peer heights into `ledger-reconciliation.json`.
- `scripts/blockchain-tps-reproducibility.sh`: supports `RECONCILE_AFTER_RUNS=true` and `RECONCILE_REQUIRED=true`; when enabled it writes reconciliation evidence before external cleanup can remove the disposable channel.

Validation smoke:

| Candidate | Evidence | Result | Decision |
|---|---|---|---|
| disposable `passportrc0514035527`, 4-org channel, install orgs `1,2`, 1000 write tx, target200, txmap enabled, reconciliation required | `.omx/evidence/blockchain/full-rerun-audit-20260512T114300Z/reconcile-harness-smoke-20260514T035527KST/ledger-reconciliation.json` | Caliper `980/1000`, Fail 0, Reject 0, `46.6 TPS`; txmap `1000` success+verified; CouchDB `1000/1000` on all four peers; peer heights all `32`; classification `caliper_reporter_aggregation_artifact` | accept harness, reject as performance candidate |

Cleanup evidence:

- `.omx/evidence/blockchain/full-rerun-audit-20260512T114300Z/cleanup-after-reconcile-harness-smoke-20260514T040111KST/cleanup.log`
- `orderer-channels.after.json`: `passportchannel` only.

Decision: this does not change the official gate. It strengthens future failure analysis by proving whether missing `Succ` is Caliper accounting/event loss or actual world-state absence before cleanup.

## 2026-05-14 추가 follow-up — host capacity diagnostic

A host/resource diagnostic was collected to compare the current environment with the resource floor proposed in `cl.txt`.

Evidence:

- `.omx/evidence/blockchain/full-rerun-audit-20260512T114300Z/host-capacity-diagnostic-20260514T040613KST/host-capacity.txt`
- `.omx/evidence/blockchain/full-rerun-audit-20260512T114300Z/host-capacity-diagnostic-20260514T040613KST/host-capacity-summary.json`

Findings:

- Docker engine exposes `8` CPUs and `54.92GiB` memory.
- Docker root is `/var/lib/docker`.
- Peer/orderer/CouchDB containers have no explicit Docker CPU/memory caps.
- Cleanup state is clean: orderer has `passportchannel` only and `couchdb0..3` benchmark DB count is `0`.
- `cl.txt` suggests at least `12 vCPU / 24GB`, recommended `16 vCPU / 32GB / NVMe`.

Decision: the current host is below the suggested CPU floor. This does not by itself prove impossibility, but combined with repeated 4-org CouchDB write smoke results around `170~180 TPS`, it makes further local 10-repeat official attempts low-value unless a new storage/topology decision is approved. The next defensible PASS attempt should use the same disposable-channel harness on a 12~16+ vCPU host with reconciliation enabled.


## 2026-05-14 추가 follow-up — EV gateway official-like 10-repeat FAIL with ledger reconciliation

`cl.txt`의 핵심 조언인 “Caliper Succ/accounting과 ledger/world-state를 분리하되 PASS 기준은 Caliper gate로 유지”를 그대로 적용해, disposable 4-org channel에서 10-repeat를 끝까지 수행했다. live `passportchannel`은 read-only로 유지했다.

| Candidate | Evidence | Result | Decision |
|---|---|---|---|
| 4-org channel, canonical `PassportBenchmarkChannel` `4s/2000`, install orgs `1,2`, prepare org `manufacturer`, run org `evmanufacturer`, workers40, target250, timeout 180s, `msp_any`, `RECONCILE_AFTER_RUNS=true` | `.omx/evidence/blockchain/full-rerun-audit-20260512T114300Z/official-evgw-reconcile-10-20260514T040937KST/summary.json` and `.omx/evidence/blockchain/full-rerun-audit-20260512T114300Z/official-evgw-reconcile-10-20260514T040937KST/ledger-reconciliation.json` | Caliper aggregate Succ `99892/100000`, Fail `0`, Reject `0`; TPS min `115.6`, p10 `115.6`, p50 `180.6`, mean `174.1`, max `190.0`; txmap/CouchDB/peer heights all confirm `100000/100000` committed/verified | reject; official Caliper Succ/TPS gates fail despite ledger/world-state success |

Reconciliation detail:

- txmap: `100000` lines, `100000` unique record IDs, `100000` unique tx IDs, `100000` status `success`, `100000` verified `true`, error `0`.
- CouchDB: `couchdb0..3` all `100000` records for `passportor0514040937_passport-contract`.
- peer heights: all four peers height `372` with matching hashes.
- classification: `caliper_reporter_aggregation_artifact`.

Cleanup/static evidence:

- `.omx/evidence/blockchain/full-rerun-audit-20260512T114300Z/cleanup-after-official-evgw-reconcile-10-20260514T040937KST-20260514T045330KST/cleanup.log`
- `.omx/evidence/blockchain/full-rerun-audit-20260512T114300Z/cleanup-after-official-evgw-reconcile-10-20260514T040937KST-20260514T045330KST/orderer-channels.after.json`: `passportchannel` only.
- `.omx/evidence/blockchain/full-rerun-audit-20260512T114300Z/static-after-official-evgw-reconcile-10-20260514T045505KST.log`
- `.omx/evidence/blockchain/full-rerun-audit-20260512T114300Z/evaluator-after-official-evgw-reconcile-10-20260514T045600KST.log` — expected FAIL.
- `.omx/evidence/blockchain/full-rerun-audit-20260512T114300Z/checkpoint-fail-after-official-evgw-reconcile-10-20260514T045612KST.log`

Decision: ledger/world-state evidence proves the missing Caliper Succ rows are accounting/event aggregation artifacts, but the official gate remains failed because it explicitly requires every Caliper repeat `Succ==expected` and p50 >= 200. The strongest remaining blocker is throughput/resource ceiling on the current 8-CPU local host; next defensible PASS attempt should move this same harness to a 12~16+ vCPU host or require an explicit gate change.


## 2026-05-14 추가 follow-up — batch8s4000 smoke aborted before write

A larger block-cutting candidate (`BatchTimeout=8s`, `MaxMessageCount=4000`, `PreferredMaxBytes=8 MB`) was tested only on a disposable channel to see whether bigger CouchDB bulk commits could overcome the local p50 ~180 TPS ceiling. The temporary `PassportBenchmarkChannel` patch was restored immediately after the attempt.

| Candidate | Evidence | Result | Decision |
|---|---|---|---|
| temporary `8s/4000/8 MB`, 4-org channel, install orgs `1,2`, prepare org `manufacturer`, run org `evmanufacturer`, workers40, target250 | `.omx/evidence/blockchain/full-rerun-audit-20260512T114300Z/smoke-batch8s4000-evgw-w40-t250-10k-20260514T045921KST` | aborted before write; `prepare-passports.js` had no progress/log growth for >10 minutes, process terminated, `RUN_RC=143` | reject/inconclusive; not an official evaluator basis |

Cleanup/restore evidence:

- `.omx/evidence/blockchain/full-rerun-audit-20260512T114300Z/cleanup-after-smoke-batch8s4000-evgw-w40-t250-10k-20260514T045921KST-20260514T051306KST/cleanup.log`
- `.omx/evidence/blockchain/full-rerun-audit-20260512T114300Z/cleanup-after-smoke-batch8s4000-evgw-w40-t250-10k-20260514T045921KST-20260514T051306KST/orderer-channels.after.json`: `passportchannel` only.
- `.omx/evidence/blockchain/full-rerun-audit-20260512T114300Z/static-after-batch8s4000-abort-20260514T051404KST.log` confirms `PassportBenchmarkChannel` restored to canonical `4s/2000`.

Decision: do not pursue larger block cutting on the current local host. The latest official basis remains the EV gateway 10-repeat failure with ledger reconciliation.

- evaluator after batch8s4000 abort: `.omx/evidence/blockchain/full-rerun-audit-20260512T114300Z/evaluator-after-batch8s4000-abort-20260514T051437KST.log` — expected FAIL, latest official basis unchanged.
- checkpoint: `.omx/evidence/blockchain/full-rerun-audit-20260512T114300Z/checkpoint-fail-after-batch8s4000-abort-20260514T051444KST.log`.

- completion audit: `.omx/evidence/blockchain/full-rerun-audit-20260512T114300Z/completion-audit-after-batch8s4000-20260514T051520KST.md` — status remains `validation_failed`; do not call `update_goal`.


## 2026-05-14 추가 follow-up — official write200 off-host wrapper/preflight

Added a wrapper for the next defensible official write attempt on a stronger host:

- `scripts/run-official-write200-audit.sh`
  - uses the latest official candidate shape: 4-org `PassportBenchmarkChannel`, install orgs `1,2`, `PREPARE_ORG=manufacturer`, `ORG=evmanufacturer`, `10000 x 10`, workers40, target250, timeout 180s, `msp_any`, txmap + required reconciliation.
  - enforces host readiness before creating any disposable channel: default `MIN_DOCKER_CPUS=12`, `MIN_DOCKER_MEMORY_GIB=24`.
  - supports explicit override with `ALLOW_UNDERPOWERED=true` for diagnostics, but default blocks the current local host.

Local preflight evidence:

- `.omx/evidence/blockchain/full-rerun-audit-20260512T114300Z/offhost-preflight-20260514T051741KST/host-readiness.json`: Docker CPUs `8`, memory `54.92GiB`, status `blocked_underpowered_host`.
- `.omx/evidence/blockchain/full-rerun-audit-20260512T114300Z/offhost-preflight-20260514T051741KST/final-status.env`: blocked before channel creation.
- `.omx/evidence/blockchain/full-rerun-audit-20260512T114300Z/static-after-official-wrapper-preflight-20260514T051748KST.log`: syntax/static check for the wrapper and dependent scripts.

Decision: do not repeat the official 10-run locally by default. The current official evaluator basis remains failed; the next valid PASS attempt should run this wrapper on a host meeting the readiness floor.

- evaluator after off-host wrapper preflight: `.omx/evidence/blockchain/full-rerun-audit-20260512T114300Z/evaluator-after-offhost-wrapper-preflight-20260514T051822KST.log` — official write gate still fails on latest local 10-repeat basis.
- checkpoint: `.omx/evidence/blockchain/full-rerun-audit-20260512T114300Z/checkpoint-blocked-after-offhost-wrapper-preflight-20260514T051830KST.log` — local continuation blocked by host readiness; run `scripts/run-official-write200-audit.sh` on a 12~16+ vCPU host.


## 2026-05-14 추가 follow-up — wrapper robustness and ADR-007

`run-official-write200-audit.sh` was hardened so that, on a capable host, the wrapper captures the harness `RUN_RC` and still runs cleanup through the exit trap. The underpowered-host preflight remains non-mutating and exits before channel creation.

Decision record:

- `wiki/decisions/007-blockchain-benchmark-host-readiness.md`
  - official write200 reruns require the host readiness floor by default: Docker CPUs `>=12`, memory `>=24GiB`.
  - ledger/CouchDB reconciliation cannot replace the official Caliper `Succ==expected` gate.

Verification evidence:

- `.omx/evidence/blockchain/full-rerun-audit-20260512T114300Z/offhost-wrapper-robust-preflight-20260514T052050KST/host-readiness.json`: current local host remains `blocked_underpowered_host` (`8` Docker CPUs).
- `.omx/evidence/blockchain/full-rerun-audit-20260512T114300Z/offhost-wrapper-robust-preflight-20260514T052050KST/final-status.env`: blocked before channel creation.
- `.omx/evidence/blockchain/full-rerun-audit-20260512T114300Z/static-after-wrapper-robustness-adr-20260514T052058KST.log`: wrapper/dependent syntax checks, workload syntax, Go tests, and canonical `PassportBenchmarkChannel` restore check.

- evaluator after wrapper robustness/ADR: `.omx/evidence/blockchain/full-rerun-audit-20260512T114300Z/evaluator-after-wrapper-robustness-adr-20260514T052127KST.log` — official local write basis still FAIL.
- checkpoint: `.omx/evidence/blockchain/full-rerun-audit-20260512T114300Z/checkpoint-blocked-after-wrapper-robustness-adr-20260514T052133KST.log` — local continuation remains blocked by host readiness.

- completion audit after wrapper robustness/ADR: `.omx/evidence/blockchain/full-rerun-audit-20260512T114300Z/completion-audit-after-wrapper-robustness-adr-20260514T052150KST.md` — objective not achieved; local continuation blocked by host readiness.


## 2026-05-14 추가 follow-up — official write evidence verifier

Added `scripts/verify-official-write200-evidence.sh` to make post-run official write validation deterministic before any future `update_goal` consideration.

Local validation against the latest official evidence:

- input: `.omx/evidence/blockchain/full-rerun-audit-20260512T114300Z/official-evgw-reconcile-10-20260514T040937KST`
- output: `.omx/evidence/blockchain/full-rerun-audit-20260512T114300Z/official-write-verify-after-script-20260514T052600KST.json`
- status: `fail`
- failure count: `7`
- ledger/world-state section confirms `100000/100000`, but Caliper official write gate still fails.

Static evidence:

- `.omx/evidence/blockchain/full-rerun-audit-20260512T114300Z/static-after-official-write-verifier-20260514T052428KST.log`

Decision: future stronger-host output must pass both this verifier and the performance-goal evaluator before goal completion is considered.

- evaluator after official write verifier: `.omx/evidence/blockchain/full-rerun-audit-20260512T114300Z/evaluator-after-official-write-verifier-20260514T052455KST.log` — official local write basis still FAIL.
- checkpoint: `.omx/evidence/blockchain/full-rerun-audit-20260512T114300Z/checkpoint-blocked-after-official-write-verifier-20260514T052501KST.log` — local continuation remains blocked; verifier is ready for stronger-host output.

- completion audit after official write verifier: `.omx/evidence/blockchain/full-rerun-audit-20260512T114300Z/completion-audit-after-official-write-verifier-20260514T052520KST.md` — objective remains incomplete; blocked pending stronger-host official write rerun.


## 2026-05-14 추가 follow-up — wrapper auto-verifier integration

`run-official-write200-audit.sh` now runs the official evidence verifier automatically after cleanup. This ensures the cleanup `orderer-channels.after.json` is available before the verifier checks the bundle.

Generated on a completed stronger-host run:

- `<evidence>/official-write-verify.json`
- `<evidence>/official-write-verify.env`
- `<evidence>/official-write-verify.log`
- `VERIFY_JSON`, `VERIFY_ENV`, `VERIFY_LOG`, `VERIFY_RC` in `<evidence>/final-status.env`

Local preflight evidence:

- `.omx/evidence/blockchain/full-rerun-audit-20260512T114300Z/offhost-wrapper-auto-verify-preflight-20260514T052656KST/host-readiness.json`: blocked before channel creation (`8` Docker CPUs).
- `.omx/evidence/blockchain/full-rerun-audit-20260512T114300Z/static-after-wrapper-auto-verify-20260514T052703KST.log`: static verification.

- evaluator after wrapper auto-verify integration: `.omx/evidence/blockchain/full-rerun-audit-20260512T114300Z/evaluator-after-wrapper-auto-verify-20260514T052728KST.log` — official local write basis still FAIL.
- checkpoint: `.omx/evidence/blockchain/full-rerun-audit-20260512T114300Z/checkpoint-blocked-after-wrapper-auto-verify-20260514T052734KST.log` — local continuation remains blocked; wrapper now auto-verifies stronger-host output after cleanup.

- completion audit after wrapper auto-verify: `.omx/evidence/blockchain/full-rerun-audit-20260512T114300Z/completion-audit-after-wrapper-auto-verify-20260514T052750KST.md` — goal incomplete; stronger-host official wrapper run required.


## 2026-05-14 추가 follow-up — wrapper goal-result env output

`run-official-write200-audit.sh` now writes `<evidence>/performance-goal-write-result.env` after cleanup/static/verifier. This file is intended to be appended to the performance-goal `latest-results.env` after a stronger-host run, preserving the official write evidence paths and verifier status.

- Optional auto-append: `UPDATE_PERFORMANCE_GOAL_RESULTS=true`
- Local preflight: `.omx/evidence/blockchain/full-rerun-audit-20260512T114300Z/offhost-wrapper-goalenv-preflight-20260514T052940KST/host-readiness.json` (`blocked_underpowered_host`)
- Static: `.omx/evidence/blockchain/full-rerun-audit-20260512T114300Z/static-after-wrapper-goalenv-20260514T052950KST.log`

- evaluator after wrapper goal-result env: `.omx/evidence/blockchain/full-rerun-audit-20260512T114300Z/evaluator-after-wrapper-goalenv-20260514T053013KST.log` — official local write basis still FAIL.
- checkpoint: `.omx/evidence/blockchain/full-rerun-audit-20260512T114300Z/checkpoint-blocked-after-wrapper-goalenv-20260514T053019KST.log` — local continuation remains blocked; wrapper now emits performance-goal write env for stronger-host run.

- completion audit after wrapper goal-result env: `.omx/evidence/blockchain/full-rerun-audit-20260512T114300Z/completion-audit-after-wrapper-goalenv-20260514T053030KST.md` — objective remains incomplete; local host blocked.

## 2026-05-14 추가 follow-up — official write200 off-host runbook finalized

Remaining blocker is the official 4-org Caliper write200 gate. The local host is below the benchmark readiness floor, so the next non-redundant action is an off-host rerun procedure rather than another local 10-repeat.

Added runbook:

- `wiki/blockchain/official-write200-offhost-runbook.md`

Runbook contract:

- use `scripts/run-official-write200-audit.sh` from repo root;
- wrapper blocks underpowered hosts before disposable channel creation;
- live `passportchannel` remains read-only;
- output must include `summary.env`, `summary.json`, `repeat-results.csv`, `ledger-reconciliation.json`, `final-status.env`, `official-write-verify.*`, `performance-goal-write-result.env`, and cleanup evidence;
- PASS requires both `scripts/verify-official-write200-evidence.sh --evidence-dir <dir>` and `.omx/goals/performance/full-benchmark-rerun-audit-all-tracks/evaluate.sh` to pass;
- if FAIL, record the Caliper failure as fail/blocked evidence and do not substitute ledger/world-state counts for Caliper `Succ==expected`.

Verification:

- static/doc check: `<REPO_ROOT>/.omx/evidence/blockchain/full-rerun-audit-20260512T114300Z/static-after-offhost-runbook-finalize-20260514T053651KST.log`

Current status remains **BLOCKED / not achieved**:

- Node cloud read2000: PASS retained.
- JMeter read-only actual: PASS retained.
- Official write200: latest local official-like evidence still FAIL (`99892/100000`, p50 `180.6`, min `115.6`).
- Local continuation: blocked by host readiness (`8` Docker CPUs < floor `12`).

- evaluator after off-host runbook finalize: `<REPO_ROOT>/.omx/evidence/blockchain/full-rerun-audit-20260512T114300Z/evaluator-after-offhost-runbook-finalize-20260514T053810KST.log` — official local write basis still FAIL.
- checkpoint: `<REPO_ROOT>/.omx/evidence/blockchain/full-rerun-audit-20260512T114300Z/checkpoint-blocked-after-offhost-runbook-finalize-20260514T053818KST.log` — local continuation remains blocked; next valid action is stronger-host wrapper output and evaluator PASS checkpoint.

- completion audit after off-host runbook finalize: `<REPO_ROOT>/.omx/evidence/blockchain/full-rerun-audit-20260512T114300Z/completion-audit-after-offhost-runbook-finalize-20260514T053931KST.md` — objective remains incomplete; official write hard gate still fails.

- checkpoint after completion audit: `<REPO_ROOT>/.omx/evidence/blockchain/full-rerun-audit-20260512T114300Z/checkpoint-blocked-after-offhost-runbook-audit-20260514T054005KST.log` — performance-goal state remains blocked, not complete.

## 2026-05-14 추가 follow-up — off-host write200 ingest helper

Added `scripts/ingest-offhost-write200-evidence.sh` to reduce error-prone manual steps after the stronger-host wrapper run.

Behavior:

- re-runs `scripts/verify-official-write200-evidence.sh --evidence-dir <dir>`;
- appends `<evidence>/performance-goal-write-result.env` into `.omx/goals/performance/full-benchmark-rerun-audit-all-tracks/latest-results.env` unless `--no-update-results` is used;
- runs `.omx/goals/performance/full-benchmark-rerun-audit-all-tracks/evaluate.sh` and stores the evaluator log in the evidence dir;
- optionally records an OMX checkpoint with `--checkpoint`;
- never calls Codex `update_goal`.

Validation:

- self-test against known failing local official evidence: `<REPO_ROOT>/.omx/evidence/blockchain/full-rerun-audit-20260512T114300Z/ingest-script-selftest-20260514T054250KST.log` (`VERIFY_RC=1`, `EVALUATOR_RC=1`, expected exit `1`).
- static verification: `<REPO_ROOT>/.omx/evidence/blockchain/full-rerun-audit-20260512T114300Z/static-after-ingest-script-20260514T054317KST.log`.

Current status remains **BLOCKED / not achieved** because the latest official write evidence still fails the Caliper Succ/TPS hard gate.

- evaluator after ingest helper: `<REPO_ROOT>/.omx/evidence/blockchain/full-rerun-audit-20260512T114300Z/evaluator-after-ingest-helper-20260514T054425KST.log` — official local write basis still FAIL.
- checkpoint: `<REPO_ROOT>/.omx/evidence/blockchain/full-rerun-audit-20260512T114300Z/checkpoint-blocked-after-ingest-helper-20260514T054432KST.log` — state remains blocked pending stronger-host official write output.

- completion audit after ingest helper: `<REPO_ROOT>/.omx/evidence/blockchain/full-rerun-audit-20260512T114300Z/completion-audit-after-ingest-helper-20260514T054506KST.md` — objective remains incomplete; official write hard gate still fails.

- checkpoint after ingest helper audit: `<REPO_ROOT>/.omx/evidence/blockchain/full-rerun-audit-20260512T114300Z/checkpoint-blocked-after-ingest-helper-audit-20260514T054514KST.log` — performance-goal state remains blocked, not complete.


## 2026-05-14 추가 follow-up — ingest helper pass-checkpoint audit guard

`scripts/ingest-offhost-write200-evidence.sh` now refuses a pass checkpoint unless `--completion-audit <audit.md>` points to an existing completion audit. This keeps the required audit-before-completion sequence explicit even when future stronger-host evidence passes verifier/evaluator.

Validation:

- self-test against known failing official evidence: `<REPO_ROOT>/.omx/evidence/blockchain/full-rerun-audit-20260512T114300Z/ingest-script-selftest-after-auditguard-20260514T054725KST.log` (`VERIFY_RC=1`, `EVALUATOR_RC=1`, expected exit `1`).
- static verification: `<REPO_ROOT>/.omx/evidence/blockchain/full-rerun-audit-20260512T114300Z/static-after-ingest-auditguard-20260514T054736KST.log`.

Current status remains **BLOCKED / not achieved**; this change only hardens the future pass path.

- evaluator after ingest audit guard: `<REPO_ROOT>/.omx/evidence/blockchain/full-rerun-audit-20260512T114300Z/evaluator-after-ingest-auditguard-20260514T054821KST.log` — official local write basis still FAIL.
- checkpoint: `<REPO_ROOT>/.omx/evidence/blockchain/full-rerun-audit-20260512T114300Z/checkpoint-blocked-after-ingest-auditguard-20260514T054821KST.log` — state remains blocked pending stronger-host official write output.

- completion audit after ingest audit guard: `<REPO_ROOT>/.omx/evidence/blockchain/full-rerun-audit-20260512T114300Z/completion-audit-after-ingest-auditguard-20260514T054905KST.md` — objective remains incomplete; official write hard gate still fails.

- checkpoint after ingest audit guard completion audit: `<REPO_ROOT>/.omx/evidence/blockchain/full-rerun-audit-20260512T114300Z/checkpoint-blocked-after-ingest-auditguard-audit-20260514T054914KST.log` — performance-goal state remains blocked, not complete.


## 2026-05-14 추가 follow-up — off-host handoff readiness validator

Added `scripts/validate-offhost-write200-handoff.sh` to verify that the repo/worktree has all required files and commands before the stronger-host official write run.

It checks:

- wrapper/verifier/ingest/reconcile/cleanup scripts exist and are executable;
- shell and Node syntax checks pass;
- `PassportBenchmarkChannel` can be generated with `configtxgen`;
- runbook contains the live-channel safety and Caliper-gate phrases;
- performance-goal evaluator and latest results files are present.

Evidence:

- readiness JSON: `<REPO_ROOT>/.omx/evidence/blockchain/full-rerun-audit-20260512T114300Z/offhost-handoff-readiness-20260514T055053KST.json` (`ok=true`, `status=ready`).
- static verification: `<REPO_ROOT>/.omx/evidence/blockchain/full-rerun-audit-20260512T114300Z/static-after-handoff-validator-20260514T055118KST.log`.

Current status remains **BLOCKED / not achieved** because no stronger-host official write PASS evidence has been ingested.

- evaluator after handoff validator: `<REPO_ROOT>/.omx/evidence/blockchain/full-rerun-audit-20260512T114300Z/evaluator-after-handoff-validator-20260514T055152KST.log` — official local write basis still FAIL.
- checkpoint: `<REPO_ROOT>/.omx/evidence/blockchain/full-rerun-audit-20260512T114300Z/checkpoint-blocked-after-handoff-validator-20260514T055152KST.log` — state remains blocked pending stronger-host official write output.

- completion audit after handoff validator: `<REPO_ROOT>/.omx/evidence/blockchain/full-rerun-audit-20260512T114300Z/completion-audit-after-handoff-validator-20260514T055222KST.md` — objective remains incomplete; official write hard gate still fails.

- checkpoint after handoff validator completion audit: `<REPO_ROOT>/.omx/evidence/blockchain/full-rerun-audit-20260512T114300Z/checkpoint-blocked-after-handoff-validator-audit-20260514T055230KST.log` — performance-goal state remains blocked, not complete.


## 2026-05-14 추가 follow-up — off-host handoff overlay bundle

Added `scripts/create-offhost-write200-handoff-bundle.sh` to package the current off-host write200 run surface into a portable overlay bundle for a stronger-host checkout.

Bundle output:

- bundle: `<REPO_ROOT>/.omx/evidence/blockchain/full-rerun-audit-20260512T114300Z/offhost-handoff-bundle-20260514T055608KST/offhost-write200-handoff-20260514T055608KST.tar.gz`
- sha256: `4363d1f25d3b1939d84ec2cfdee761951235ae8bf6821865647fbc0210f8efa5`
- manifest: `<REPO_ROOT>/.omx/evidence/blockchain/full-rerun-audit-20260512T114300Z/offhost-handoff-bundle-20260514T055608KST/manifest.sha256`
- manifest check: `<REPO_ROOT>/.omx/evidence/blockchain/full-rerun-audit-20260512T114300Z/offhost-handoff-bundle-20260514T055608KST/manifest-check.log`
- readiness JSON: `<REPO_ROOT>/.omx/evidence/blockchain/full-rerun-audit-20260512T114300Z/offhost-handoff-bundle-20260514T055608KST/handoff-readiness.json`

Verification:

- bundle includes sidecars `README-offhost-handoff.md`, `manifest.sha256`, `files.txt`.
- temporary extraction passed `sha256sum -c manifest.sha256`.
- static verification: `<REPO_ROOT>/.omx/evidence/blockchain/full-rerun-audit-20260512T114300Z/static-after-handoff-bundle-20260514T055620KST.log`.

Current status remains **BLOCKED / not achieved** because no stronger-host official write PASS evidence has been ingested.

- evaluator after handoff bundle: `<REPO_ROOT>/.omx/evidence/blockchain/full-rerun-audit-20260512T114300Z/evaluator-after-handoff-bundle-20260514T055659KST.log` — official local write basis still FAIL.
- checkpoint: `<REPO_ROOT>/.omx/evidence/blockchain/full-rerun-audit-20260512T114300Z/checkpoint-blocked-after-handoff-bundle-20260514T055659KST.log` — state remains blocked pending stronger-host official write output.

- completion audit after handoff bundle: `<REPO_ROOT>/.omx/evidence/blockchain/full-rerun-audit-20260512T114300Z/completion-audit-after-handoff-bundle-20260514T055732KST.md` — objective remains incomplete; official write hard gate still fails.

- checkpoint after handoff bundle completion audit: `<REPO_ROOT>/.omx/evidence/blockchain/full-rerun-audit-20260512T114300Z/checkpoint-blocked-after-handoff-bundle-audit-20260514T055740KST.log` — performance-goal state remains blocked, not complete.


## 2026-05-14 추가 follow-up — refreshed off-host handoff bundle

Regenerated the off-host handoff bundle after the latest local audit/checkpoint/latest-results updates so the stronger-host overlay includes the current runbook, helper scripts, goal evaluator files, and audit trail.

- refreshed bundle: `<REPO_ROOT>/.omx/evidence/blockchain/full-rerun-audit-20260512T114300Z/offhost-handoff-bundle-20260514T055850KST/offhost-write200-handoff-20260514T055850KST.tar.gz`
- sha256: `deeea2593cec27691a792ffbf44acdfcbb8536d33ed7a33684c135322e308c6b`
- manifest: `<REPO_ROOT>/.omx/evidence/blockchain/full-rerun-audit-20260512T114300Z/offhost-handoff-bundle-20260514T055850KST/manifest.sha256`
- manifest check: `<REPO_ROOT>/.omx/evidence/blockchain/full-rerun-audit-20260512T114300Z/offhost-handoff-bundle-20260514T055850KST/manifest-check.log`
- readiness JSON: `<REPO_ROOT>/.omx/evidence/blockchain/full-rerun-audit-20260512T114300Z/offhost-handoff-bundle-20260514T055850KST/handoff-readiness.json`
- static verification: `<REPO_ROOT>/.omx/evidence/blockchain/full-rerun-audit-20260512T114300Z/static-after-refreshed-handoff-bundle-20260514T055903KST.log`

Temporary extraction passed `sha256sum -c manifest.sha256`.

Current status remains **BLOCKED / not achieved** because no stronger-host official write PASS evidence has been ingested.

- evaluator after refreshed handoff bundle: `<REPO_ROOT>/.omx/evidence/blockchain/full-rerun-audit-20260512T114300Z/evaluator-after-refreshed-handoff-bundle-20260514T055935KST.log` — official local write basis still FAIL.
- checkpoint: `<REPO_ROOT>/.omx/evidence/blockchain/full-rerun-audit-20260512T114300Z/checkpoint-blocked-after-refreshed-handoff-bundle-20260514T055935KST.log` — state remains blocked pending stronger-host official write output.

- completion audit after refreshed handoff bundle: `<REPO_ROOT>/.omx/evidence/blockchain/full-rerun-audit-20260512T114300Z/completion-audit-after-refreshed-handoff-bundle-20260514T060003KST.md` — objective remains incomplete; official write hard gate still fails.

- checkpoint after refreshed handoff bundle completion audit: `<REPO_ROOT>/.omx/evidence/blockchain/full-rerun-audit-20260512T114300Z/checkpoint-blocked-after-refreshed-handoff-bundle-audit-20260514T060012KST.log` — performance-goal state remains blocked, not complete.


## 2026-05-14 추가 follow-up — off-host bundle desktop export

Exported the refreshed off-host handoff bundle to a Windows-accessible transfer directory.

- export directory: `${WINDOWS_HOME}/Desktop/offhost-write200-handoff-20260514T055850KST`
- archive: `${WINDOWS_HOME}/Desktop/offhost-write200-handoff-20260514T055850KST/offhost-write200-handoff-20260514T055850KST.tar.gz`
- sha256 file: `${WINDOWS_HOME}/Desktop/offhost-write200-handoff-20260514T055850KST/offhost-write200-handoff-20260514T055850KST.tar.gz.sha256`
- export readme: `${WINDOWS_HOME}/Desktop/offhost-write200-handoff-20260514T055850KST/EXPORT-README.md`
- status file: `<REPO_ROOT>/.omx/evidence/blockchain/full-rerun-audit-20260512T114300Z/desktop-export-offhost-handoff-20260514T060154KST.env`

Verification: `sha256sum -c offhost-write200-handoff-20260514T055850KST.tar.gz.sha256` passed from the export directory.

Current status remains **BLOCKED / not achieved** because no stronger-host official write PASS evidence has been ingested.

- evaluator after desktop export: `<REPO_ROOT>/.omx/evidence/blockchain/full-rerun-audit-20260512T114300Z/evaluator-after-desktop-export-20260514T060157KST.log` — official local write basis still FAIL.
- checkpoint: `<REPO_ROOT>/.omx/evidence/blockchain/full-rerun-audit-20260512T114300Z/checkpoint-blocked-after-desktop-export-20260514T060157KST.log` — state remains blocked pending stronger-host official write output.

- completion audit after desktop export: `<REPO_ROOT>/.omx/evidence/blockchain/full-rerun-audit-20260512T114300Z/completion-audit-after-desktop-export-20260514T060221KST.md` — objective remains incomplete; official write hard gate still fails.

- checkpoint after desktop export completion audit: `<REPO_ROOT>/.omx/evidence/blockchain/full-rerun-audit-20260512T114300Z/checkpoint-blocked-after-desktop-export-audit-20260514T060230KST.log` — performance-goal state remains blocked, not complete.


## 2026-05-14 추가 follow-up — off-host return bundle helper and refreshed export

Added `scripts/create-offhost-write200-return-bundle.sh` so the stronger-host result can be packaged and transferred back without losing required official write evidence files.

Required return evidence files:

- `final-status.env`
- `summary.env`
- `summary.json`
- `repeat-results.csv`
- `ledger-reconciliation.json`
- `official-write-verify.json`
- `official-write-verify.env`
- `official-write-verify.log`
- `performance-goal-write-result.env`
- `static-checks.log`

Evidence:

- self-test: `<REPO_ROOT>/.omx/evidence/blockchain/full-rerun-audit-20260512T114300Z/return-bundle-selftest-20260514T060420KST.log` — synthetic fixture packaged, extracted, and manifest-verified.
- static verification: `<REPO_ROOT>/.omx/evidence/blockchain/full-rerun-audit-20260512T114300Z/static-after-return-bundle-helper-20260514T060527KST.log`.
- refreshed handoff bundle including return helper: `<REPO_ROOT>/.omx/evidence/blockchain/full-rerun-audit-20260512T114300Z/offhost-handoff-bundle-20260514T060535KST/offhost-write200-handoff-20260514T060535KST.tar.gz`.
- refreshed handoff sha256: `c93b54877e4b3c3a19ad4c5bda4672d2acb89d46ca521be7d394d5662408d678`.
- refreshed Desktop export: `${WINDOWS_HOME}/Desktop/offhost-write200-handoff-20260514T060535KST`.

Current status remains **BLOCKED / not achieved** because no stronger-host official write PASS evidence has been ingested.


## 2026-05-14 06:16:03 KST — external advisor tuning incorporated for off-host write200

- Read `<WINDOWS_DESKTOP>\cl.txt` and incorporated the safe parts into the disposable-channel write200 path.
- Tuned `PassportBenchmarkChannel` to `BatchTimeout=1s`, `MaxMessageCount=250`, `PreferredMaxBytes=2 MB` while keeping live `passportchannel` read-only.
- Changed `scripts/run-official-write200-audit.sh` defaults to `CALIPER_WORKERS=50`, `CALIPER_WRITE_TARGET_TPS=230`, `CALIPER_FABRIC_TIMEOUT_INVOKEORQUERY=120`, `msp_any`, with env overrides preserved.
- Added runbook smoke guidance and refreshed the off-host handoff bundle/export: `${WINDOWS_HOME}/Desktop/offhost-write200-handoff-20260514T061416KST`.
- Validation: `scripts/validate-offhost-write200-handoff.sh` passed; wrapper preflight still blocks local 8-CPU host before channel creation (`blocked_underpowered_host`); evaluator remains FAIL/BLOCKED on existing official write evidence.
- Completion audit: `.omx/evidence/blockchain/full-rerun-audit-20260512T114300Z/completion-audit-after-advisor-tuning-20260514T061541KST.md`.
- Remaining: run refreshed bundle on ADR-007 stronger host, return-package official evidence, ingest, then rerun evaluator and completion audit.


## 2026-05-14 06:21:22 KST — guarded return-bundle import helper

- Added `scripts/import-offhost-write200-return-bundle.sh` to safely extract a stronger-host return bundle, verify `manifest.sha256`, check `required-file-check.json`, locate the evidence directory, then call the existing ingest helper.
- Updated `scripts/create-offhost-write200-return-bundle.sh`, `scripts/create-offhost-write200-handoff-bundle.sh`, `scripts/validate-offhost-write200-handoff.sh`, and `wiki/blockchain/official-write200-offhost-runbook.md` to document and ship the import path.
- Self-test: `.omx/evidence/blockchain/full-rerun-audit-20260512T114300Z/import-helper-selftest-20260514T061915KST/import.log` imported a synthetic return bundle with manifest verification and no ingest.
- Validation: `.omx/evidence/blockchain/full-rerun-audit-20260512T114300Z/import-helper-validation-20260514T061953KST/handoff-readiness.json` passed.
- Refreshed Desktop handoff export: `${WINDOWS_HOME}/Desktop/offhost-write200-handoff-20260514T062017KST`, sha256 verified.
- Completion audit: `.omx/evidence/blockchain/full-rerun-audit-20260512T114300Z/completion-audit-after-import-helper-20260514T062109KST.md`.
- Remaining: stronger-host official 10-repeat write200 PASS evidence is still required; current evaluator remains blocked/failing.


## 2026-05-14 06:25:03 KST — stronger-host operator helper

- Added `scripts/run-offhost-write200-operator.sh` to run handoff readiness, optional 3-repeat smoke, official 10-repeat write200, and return-bundle packaging on the stronger host.
- Updated handoff bundle generator, validator, and `wiki/blockchain/official-write200-offhost-runbook.md` to ship/use the operator helper.
- Validation: `.omx/evidence/blockchain/full-rerun-audit-20260512T114300Z/operator-helper-validation-20260514T062343KST/handoff-readiness.json` passed; operator readiness-only dry run wrote `operator-status.env`.
- Refreshed Desktop handoff export: `${WINDOWS_HOME}/Desktop/offhost-write200-handoff-20260514T062402KST`, sha256 verified.
- Completion audit: `.omx/evidence/blockchain/full-rerun-audit-20260512T114300Z/completion-audit-after-operator-helper-20260514T062452KST.md`.
- Remaining: run the latest export on an ADR-007 stronger host and return/import official PASS evidence.


## 2026-05-14 06:28:26 KST — smoke-gated stronger-host operator

- Updated `scripts/run-offhost-write200-operator.sh` so `--smoke` stops before official if the smoke run fails, unless `--force-official-after-smoke` is explicitly supplied.
- Updated runbook, validator, and handoff README text to document the smoke gate.
- Validation: `.omx/evidence/blockchain/full-rerun-audit-20260512T114300Z/operator-smoke-gate-validation-20260514T062706KST/handoff-readiness.json` passed; readiness-only operator dry run passed.
- Refreshed Desktop handoff export: `${WINDOWS_HOME}/Desktop/offhost-write200-handoff-20260514T062726KST`, sha256 verified.
- Completion audit: `.omx/evidence/blockchain/full-rerun-audit-20260512T114300Z/completion-audit-after-smoke-gated-operator-20260514T062814KST.md`.
- Remaining: stronger-host official write200 PASS evidence is still required.


## 2026-05-14 06:31:51 KST — smoke cleanup before official

- Updated `scripts/run-offhost-write200-operator.sh` to run `scripts/cleanup-benchmark-fabric-artifacts.sh` after smoke and before any official run.
- If smoke cleanup fails, operator records `smoke_cleanup_failed_official_skipped` and skips official to avoid polluted benchmark channels.
- Updated runbook, validator, and handoff README text to document smoke cleanup.
- Validation: `.omx/evidence/blockchain/full-rerun-audit-20260512T114300Z/operator-smoke-cleanup-validation-20260514T063032KST/handoff-readiness.json` passed; readiness-only dry run passed.
- Refreshed Desktop handoff export: `${WINDOWS_HOME}/Desktop/offhost-write200-handoff-20260514T063053KST`, sha256 verified.
- Completion audit: `.omx/evidence/blockchain/full-rerun-audit-20260512T114300Z/completion-audit-after-smoke-cleanup-operator-20260514T063140KST.md`.
- Remaining: stronger-host official write200 PASS evidence is still required.
