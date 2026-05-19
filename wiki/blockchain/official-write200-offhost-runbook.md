---
title: "Official write200 off-host rerun runbook"
date: 2026-05-14
tags: [blockchain, benchmark, caliper, runbook]
doc_type: runbook
status: current
---
# Official write200 off-host rerun runbook

## Purpose

Run the remaining official write hard gate on a host that satisfies [[decisions/007-blockchain-benchmark-host-readiness|ADR-007]] without mutating live `passportchannel`.

The local audit has already established:

- Node cloud read2000 PASS: `4039.0 TPS`, errors `0`.
- JMeter read-only actual PASS: `10000` samples, `0%` error, p95 `3 ms`.
- Local 8-CPU official-like write run FAIL: Caliper `99892/100000`, p50 `180.6`.
- Ledger/world-state for that local run matched `100000/100000`, but this cannot replace Caliper `Succ==expected`.

## Host requirements

Default wrapper floor:

- Docker CPUs: `>= 12`
- Docker memory: `>= 24 GiB`
- Preferred: `16+ vCPU / 32+ GiB / NVMe`

The wrapper exits before channel creation with `blocked_underpowered_host` if the floor is not met.

## Publish latest handoff to Desktop

After regenerating a handoff bundle, publish the bundle, sidecars, latest pointer, and concise RUN-ME card with:

```bash
scripts/publish-offhost-write200-handoff-to-desktop.sh \
  --status .omx/evidence/blockchain/full-rerun-audit-20260512T114300Z/offhost-handoff-bundle-<timestamp>/bundle-status.env
```

Or create and publish in one step:

```bash
scripts/publish-offhost-write200-handoff-to-desktop.sh --create
```

This writes:

- `${WINDOWS_HOME}/Desktop/OMX_WRITE200_WORKSPACE/offhost-write200-handoff-LATEST.txt`
- `${WINDOWS_HOME}/Desktop/OMX_WRITE200_WORKSPACE/offhost-write200-RUN-ME-latest.txt`
- `${WINDOWS_HOME}/Desktop/OMX_WRITE200_WORKSPACE/offhost-write200-RETURN-NEEDED-latest.txt`

The current workspace also carries the live blocker/status cards used for
handoff and external advice. Keep these files **inside**
`OMX_WRITE200_WORKSPACE`; do not recreate `offhost-write200-handoff-*` folders
on the Desktop root:

- `${WINDOWS_HOME}/Desktop/OMX_WRITE200_WORKSPACE/current-status-latest.txt`
- `${WINDOWS_HOME}/Desktop/OMX_WRITE200_WORKSPACE/current-blocker-dossier-latest.md`
- `${WINDOWS_HOME}/Desktop/OMX_WRITE200_WORKSPACE/current-blocker-dossier-latest.json`

The RUN-ME and RETURN-NEEDED cards intentionally tell the stronger-host operator
to overlay the tarball into an existing checkout, not to run it as a standalone
extracted directory. The RETURN-NEEDED card also names the expected
`RETURN_BUNDLE`/`DIAGNOSTIC_BUNDLE` artifacts and the multi-root import command
for Desktop, Downloads, and Documents.

Before handing the Desktop files to the stronger host, verify the Desktop
publication is internally consistent:

```bash
scripts/verify-offhost-write200-desktop-handoff.sh --desktop-dir ${WINDOWS_HOME}/Desktop/OMX_WRITE200_WORKSPACE
```

## External advisor review incorporated

The reviewed advice in `<WINDOWS_DESKTOP>\cl.txt` matched the current blocker split: ledger/world-state evidence can prove whether `Succ<expected` is a Caliper event/callback artifact, but it must not replace the Caliper `Succ==expected` official gate.

Historical advisor/smoke lanes used a smoother `workers=50`, `fixed-rate=230` profile rather than the prior bursty `4s/2000` profile. The **current blocked next action is different**: use the latest Desktop handoff and `scripts/run-stronger-host-direct-official.sh`, which pins production-safe AutoID writes with `CALIPER_RECORD_AUTO_ID=true`, `CALIPER_WRITE_TX_NUMBER=10000`, `CALIPER_WORKERS=4`, and `CALIPER_WRITE_TARGET_TPS=400`.

Shared safety and evidence rules for both lanes:

- keep live `passportchannel` read-only;
- run only disposable benchmark channels for writes;
- use `BatchTimeout=1s`, `MaxMessageCount=250`, `PreferredMaxBytes=2 MB`;
- keep `invokeorquery=180` and `eventstrategy=msp_any`; the current direct-official handoff pins `workers=4`, `fixed-rate=400`, while historical smoke/sweep diagnostics may still explore other disposable-channel candidates;
- set `CALIPER_VERIFY_PREPARED_EACH_REPEAT=false` so initial prepared-key verification stays on, but repeat-time `verify-passports` read noise is not run immediately before each write round;
- set `CALIPER_FABRIC_TIMEOUT_INVOKEORQUERY=180` and `CALIPER_OBSERVER_INTERNAL_INTERVAL=10000`;
- collect `docker-stats-repeat-<n>.log` during write repeats with `COLLECT_DOCKER_STATS=true`;
- collect optional host resource evidence (`iostat-repeat-<n>.log`, `pidstat-repeat-<n>.log`) with `COLLECT_HOST_RESOURCE_STATS=true` when `sysstat` tools are present; missing tools are recorded as skipped, not treated as benchmark failure;
- write `txmap-repeat-summary*.json` with `basis=caliper_sendRequests_txmap_callback`; this is callback/corroborating evidence, not a ledger-only PASS substitute;
- start a fresh benchmark network with `BENCHMARK_PEER_CONCURRENCY=true`, which applies `CORE_PEER_LIMITS_CONCURRENCY_ENDORSERSERVICE=5000`, `CORE_PEER_LIMITS_CONCURRENCY_DELIVERSERVICE=5000`, and `CORE_PEER_LIMITS_CONCURRENCY_GATEWAYSERVICE=2000`;
- keep txmap plus CouchDB/peer-height reconciliation as diagnostic evidence;
- run `scripts/identify-benchmark-ledger-validity.sh` as an additional read-only `ledgerutil identifytxs` diagnostic when available, writing `ledger-validity/summary.json`; the temporary blockstore copy is removed by default to keep return bundles small;
- wait for equal peer channel heights with `scripts/wait-peer-heights-equal.sh` between repeat rounds so the next repeat does not start while a peer is still catching up;
- if Caliper `Succ` still misses while ledger/world-state is complete, fix event/listener settings and rerun rather than treating ledger count as PASS.

## Current next action: direct official, non-zero-safe bundle pickup

As of the 2026-05-14 external advice refresh, the next stronger-host attempt is
**not** another smoke/sweep loop. Run one direct official 10-repeat attempt on a
host that passes the readiness floor, then bring back evidence even when the
official verifier exits non-zero.

Run the attempt inside `tmux` so an SSH/VS Code/Codex disconnect cannot prevent
the final `OMX_WRITE200_OUT_*.tar.gz` pickup:

```bash
tmux new -s write200
```

Then paste the command below in that tmux session.

```bash
cd /path/to/bms-blockchain

sha256sum -c manifest.sha256
scripts/apply-offhost-write200-overlay.sh
scripts/validate-offhost-write200-handoff.sh
scripts/check-benchmark-host-readiness.sh

# Preferred one-command path. It runs direct official with no smoke/sweep flags
# and always leaves ~/OMX_WRITE200_OUT_*.tar.gz as fallback evidence.
scripts/run-stronger-host-direct-official.sh
```

Manual fallback if you need to inspect each step:

```bash
cd /path/to/bms-blockchain

mkdir -p "$HOME/OMX_WRITE200_OUT"
RUN_MARKER="$HOME/OMX_WRITE200_OUT/run-start.marker"
: > "$RUN_MARKER"

export CALIPER_EXEC_MODE=docker
export CALIPER_ENDPOINT_MODE=docker
export CALIPER_DOCKER_NETWORK=passport_net
export CALIPER_VERIFY_PREPARED_EACH_REPEAT=false
export CALIPER_FABRIC_TIMEOUT_INVOKEORQUERY=180
export CALIPER_OBSERVER_INTERNAL_INTERVAL=10000
export COLLECT_HOST_RESOURCE_STATS=true
export CALIPER_RECORD_AUTO_ID=true
export CALIPER_WRITE_TX_NUMBER=10000
export FINAL_OUT_DIR="$HOME/OMX_WRITE200_OUT"
export FINAL_OUT_SEARCH_ROOTS="$PWD $HOME /tmp"
export CALIPER_WORKERS=4
export CALIPER_WRITE_TARGET_TPS=400
export SMOKE_WORKERS=4
export SMOKE_TARGET_TPS=400
export OFFICIAL_WORKERS=4
export OFFICIAL_TARGET_TPS=400

set +e
scripts/run-offhost-write200-operator.sh 2>&1 | tee "$HOME/OMX_WRITE200_OUT/offhost-direct-official.log"
OPERATOR_RC=${PIPESTATUS[0]}
echo "$OPERATOR_RC" | tee "$HOME/OMX_WRITE200_OUT/operator.rc"
set -e

find "$PWD" "$HOME" /tmp \
  -maxdepth 8 \
  -type f -newer "$RUN_MARKER" \
  ! -path "$PWD/.omx/evidence/blockchain/full-rerun-audit-*" \
  \( -name 'offhost-write200-return-*.tar.gz' -o -name 'offhost-write200-operator-diagnostics-*.tar.gz' \) \
  -printf '%TY-%Tm-%Td %TH:%TM:%TS %p\n' \
  | sort \
  | tee "$HOME/OMX_WRITE200_OUT/found-bundles.txt"

while read -r _ _ path; do
  [ -f "$path" ] && cp -v "$path" "$HOME/OMX_WRITE200_OUT/"
done < "$HOME/OMX_WRITE200_OUT/found-bundles.txt"

find "$PWD" "$HOME" /tmp \
  -maxdepth 8 \
  -type f -newer "$RUN_MARKER" \
  ! -path "$PWD/.omx/evidence/blockchain/full-rerun-audit-*" \
  \( -name 'operator-status.env' -o -name 'summary.env' -o -name 'official-write-verify.env' \) \
  -printf '%TY-%Tm-%Td %TH:%TM:%TS %p\n' \
  | sort \
  | tee "$HOME/OMX_WRITE200_OUT/found-status-files.txt"

tar -czf "$HOME/OMX_WRITE200_OUT_$(date -u +%Y%m%dT%H%M%SZ).tar.gz" \
  -C "$HOME" OMX_WRITE200_OUT

ls -lh "$HOME"/OMX_WRITE200_OUT*.tar.gz
exit "$OPERATOR_RC"
```

Bring back `offhost-write200-return-*.tar.gz` if present. If not, bring back
`offhost-write200-operator-diagnostics-*.tar.gz`. If neither is visible, bring
back `OMX_WRITE200_OUT_*.tar.gz`. This bundle is not PASS evidence by itself;
it prevents loss of the logs/status needed to classify the blocker.

## Optional smoke before official — diagnostic only, not current next action

On the stronger host, a 3-repeat smoke run may be used before the 10-repeat official run only when explicitly investigating a new candidate. For the current blocked state, prefer the direct-official section above. Do not ingest smoke as PASS evidence:

```bash
SMOKE_ROOT=.omx/evidence/blockchain/write200-smoke-$(date +%Y%m%dT%H%M%S%Z)
EVIDENCE_ROOT="$SMOKE_ROOT" \
  RUN_ID=smoke-w4-t400-$(date +%Y%m%dT%H%M%S%Z) \
  CHANNEL_NAME=passportsmoke$(date +%m%d%H%M%S) \
  BENCHMARK_CHANNEL_PROFILE=PassportBenchmarkChannel \
  BENCHMARK_CHANNEL_ORGS=1,2,3,4 \
  BENCHMARK_CC_INSTALL_ORGS=1,2,3,4 \
  BENCHMARK_PEER_CONCURRENCY=true \
  BENCHMARK_PEER_ENDORSER_CONCURRENCY=5000 \
  BENCHMARK_PEER_DELIVER_CONCURRENCY=5000 \
  BENCHMARK_PEER_GATEWAY_CONCURRENCY=2000 \
  ORG=evmanufacturer \
  PREPARE_ORG=manufacturer \
  REPEAT_COUNT=3 \
  CALIPER_WRITE_TX_NUMBER=10000 \
  CALIPER_WRITE_TARGET_TPS=400 \
  CALIPER_WORKERS=4 \
  CALIPER_FABRIC_GATEWAY_EVENTSTRATEGY=msp_any \
  CALIPER_FABRIC_TIMEOUT_INVOKEORQUERY=180 \
  CALIPER_OBSERVER_INTERNAL_INTERVAL=10000 \
  CALIPER_VERIFY_PREPARED_EACH_REPEAT=false \
  COLLECT_DOCKER_STATS=true \
  COLLECT_HOST_RESOURCE_STATS=true \
  CALIPER_SKIP_READ_ROUND=true \
  CALIPER_TXMAP_DIR="$SMOKE_ROOT/txmap" \
  RECONCILE_AFTER_RUNS=true \
  RECONCILE_REQUIRED=true \
  IDENTIFY_LEDGER_VALIDITY_AFTER_RUNS=true \
  WAIT_FOR_PEER_HEIGHTS_EQUAL=true \
  WAIT_FOR_PEER_HEIGHTS_REQUIRED=true \
  WAIT_FOR_DOCKER_IDLE=true \
  WAIT_FOR_COUCHDB_ACTIVE_TASKS=true \
  scripts/blockchain-tps-reproducibility.sh
```

Proceed to official 10-repeat only if the smoke quality gate passes: 3 rows, `Succ==expected`, `Fail=0`, `Reject=0`, every `successful_tps >= 205`, `txmap` callback `successVerified == 30000`, CouchDB counts all expected, and peer heights equal. The operator writes `smoke-quality-gate.json` and will stop before official with `smoke_quality_gate_failed_official_skipped` (or `smoke_quality_gate_failed_sweep_requested_official_skipped` when `--sweep-on-smoke-fail` is set) unless `--force-official-after-smoke` is explicitly supplied. If the smoke passes but is marginal (`WRITE200_MIN_TPS < 210` by default), the operator now inserts a 5-repeat disposable pre-official guard before the 10-repeat gate. That guard must also satisfy `Succ==expected`, `Fail=0`, `Reject=0`, `successful_tps >= 205`, txmap callback, CouchDB, and peer-height checks. If it fails, the operator stops before official or runs the disposable sweep when `--sweep-on-smoke-fail` is set. If smoke/pre-official fails, sweep only disposable channels around the evidence-aligned candidate: `workers=4,tps=400`, `workers=4,tps=380/420`, `workers=3,tps=400`, and `workers=5,tps=400`.

The operator can run that diagnostic sweep automatically after a smoke failure:

```bash
scripts/run-offhost-write200-operator.sh --smoke --sweep-on-smoke-fail
```

Recommended stronger-host defaults:

```bash
export CALIPER_EXEC_MODE=docker
export CALIPER_ENDPOINT_MODE=docker
export CALIPER_DOCKER_NETWORK=passport_net
export CALIPER_VERIFY_PREPARED_EACH_REPEAT=false
export CALIPER_FABRIC_TIMEOUT_INVOKEORQUERY=180
export CALIPER_OBSERVER_INTERNAL_INTERVAL=10000
export COLLECT_HOST_RESOURCE_STATS=true
export PRE_OFFICIAL_ON_MARGINAL_SMOKE=true
export PRE_OFFICIAL_REPEAT_COUNT=5
export PRE_OFFICIAL_MIN_SUCCESSFUL_TPS=205
export PRE_OFFICIAL_MARGIN_UPPER_TPS=210
export SWEEP_MATRIX="4:400 4:380 4:420 3:400 5:400"
export SMOKE_MIN_SUCCESSFUL_TPS=205
scripts/run-offhost-write200-operator.sh --smoke --sweep-on-smoke-fail
```

Docker-network runner default: run Caliper inside the Fabric Docker network on the stronger host so peer DNS/gateway behavior matches container topology. This is still not PASS by itself; it only fixes the Caliper runner network surface before producing the same official 10-repeat return bundle.

```bash
export CALIPER_EXEC_MODE=docker
export CALIPER_ENDPOINT_MODE=docker
export CALIPER_DOCKER_NETWORK=passport_net
export CALIPER_VERIFY_PREPARED_EACH_REPEAT=false
export CALIPER_FABRIC_TIMEOUT_INVOKEORQUERY=180
export CALIPER_OBSERVER_INTERNAL_INTERVAL=10000
export COLLECT_HOST_RESOURCE_STATS=true
export PRE_OFFICIAL_ON_MARGINAL_SMOKE=true
export PRE_OFFICIAL_REPEAT_COUNT=5
export PRE_OFFICIAL_MIN_SUCCESSFUL_TPS=205
export PRE_OFFICIAL_MARGIN_UPPER_TPS=210
export SWEEP_MATRIX="4:400 4:380 4:420 3:400 5:400"
export SMOKE_MIN_SUCCESSFUL_TPS=205
scripts/run-offhost-write200-operator.sh --smoke --sweep-on-smoke-fail
```

To run the sweep directly without smoke or official:

```bash
scripts/run-offhost-write200-operator.sh --sweep-only
```

Sweep output is diagnostic only. `scripts/recommend-write200-sweep-candidate.py` writes `sweep/sweep-results.csv` plus `sweep/sweep-recommendation.env`/`.json` under the operator evidence base and cleans each disposable sweep channel before the next candidate. The recommendation is explicitly marked `disposable_sweep_candidate_not_official_pass_substitute`; use it only to parameterize a subsequent 10-repeat official gate:

```bash
source <operator-evidence-base>/sweep/sweep-recommendation.env
export SMOKE_WORKERS="${CALIPER_WORKERS}"
export SMOKE_TARGET_TPS="${CALIPER_WRITE_TARGET_TPS}"
export OFFICIAL_WORKERS="${CALIPER_WORKERS}"
export OFFICIAL_TARGET_TPS="${CALIPER_WRITE_TARGET_TPS}"
scripts/run-offhost-write200-operator.sh --smoke --sweep-on-smoke-fail
```

This second command re-validates the recommended `CALIPER_WORKERS` and `CALIPER_WRITE_TARGET_TPS` through smoke/pre-official/official on the same stronger host. Keep `SMOKE_*` and `OFFICIAL_*` aligned so the recommendation cannot drift back to the default 4:400 path. Do not treat the sweep itself as PASS evidence.


## Handoff readiness check

Before moving the repo/worktree to a stronger host, or immediately after checkout on that host, run:

```bash
scripts/validate-offhost-write200-handoff.sh
scripts/check-benchmark-host-readiness.sh
```

This validates required scripts, executable bits, syntax checks, `PassportBenchmarkChannel` config generation, runbook safety phrases, and the active performance-goal evaluator files. It writes a JSON readiness report under `.omx/evidence/blockchain/full-rerun-audit-20260512T114300Z/` by default. `configtxgen` may be supplied by `fabric-samples/bin/configtxgen` or by `PATH`; on a fresh checkout the validator accepts the expected “bootstrap crypto material missing” condition because the operator/network bootstrap creates `passport-network/organizations` before channel creation.
`scripts/check-benchmark-host-readiness.sh` is non-writing; `blocked_underpowered_host` means use a stronger host, not `ALLOW_UNDERPOWERED=true` for official PASS evidence.

## One-command stronger-host operator

After extracting the current handoff bundle and passing readiness validation,
the preferred stronger-host path is the non-zero-safe direct official wrapper:

```bash
scripts/run-stronger-host-direct-official.sh
```

This wrapper runs the official 10-repeat operator with no smoke/sweep flags and always leaves `~/OMX_WRITE200_OUT_*.tar.gz` as fallback evidence even when the operator exits non-zero. It defaults to `CALIPER_RECORD_AUTO_ID=true`, `CALIPER_WRITE_TX_NUMBER=10000`, `CALIPER_WORKERS=4`, and `CALIPER_WRITE_TARGET_TPS=400`.

The lower-level operator still supports smoke/sweep diagnostics:

```bash
scripts/run-offhost-write200-operator.sh --smoke --sweep-on-smoke-fail
```

Smoke, pre-official, and sweep runs collect diagnostic sidecars such as `ledger-validity/summary.json` when available, but remain non-PASS evidence. If handoff validation fails it records `handoff_readiness_failed` and packages diagnostics before any write path; if the host is underpowered it records `blocked_underpowered_host` before channel creation. If smoke fails or misses the smoke quality gate, the operator stops before official unless `--force-official-after-smoke` is explicitly supplied; with `--sweep-on-smoke-fail` it instead runs the disposable `workers=4,tps=400`, `workers=4,tps=380/420`, `workers=3,tps=400`, and `workers=5,tps=400` sweep, writes `SWEEP_RECOMMENDATION_ENV=<path>` into `operator-status.env`, then stops before official. If the marginal-smoke pre-official guard fails, the operator records `preofficial_quality_gate_failed_official_skipped` or `preofficial_quality_gate_failed_sweep_requested_official_skipped`. If smoke cleanup fails it records `smoke_cleanup_failed_official_skipped`; if pre-official cleanup fails it records `preofficial_cleanup_failed_official_skipped`. Both stop before official.

The operator writes `operator-status.env` under its evidence base and prints `RETURN_BUNDLE=<path>` plus `RETURN_BUNDLE_SHA256=<sha>` when official return packaging succeeds. The official return bundle includes the 10-repeat evidence directory plus an `operator-context/` sidecar with `operator-status.env`, `handoff-readiness.json`, `handoff-readiness.log`, `host-readiness.json`, and `host-readiness.log`; these sidecars are audit context and do not replace the official evaluator gates. Copy that return bundle back to the active worktree and import it with `scripts/import-offhost-write200-return-bundle.sh`.

If no official return bundle is produced because readiness, smoke, cleanup, or sweep blocked the official run, the operator instead writes `DIAGNOSTIC_BUNDLE=<path>` plus `DIAGNOSTIC_BUNDLE_SHA256=<sha>`. That bundle is transfer/debug evidence only; do not ingest it as official PASS evidence.

Back in the active worktree, import a diagnostic bundle with:

```bash
scripts/import-offhost-write200-diagnostic-bundle.sh --bundle /path/to/<diagnostic-bundle>.tar.gz --checkpoint
```

This records a blocked checkpoint only. It never updates official write results and never calls Codex `update_goal`.

## Command

From the repo root:

```bash
EVIDENCE_BASE=.omx/evidence/blockchain/full-rerun-audit-$(date +%Y%m%dT%H%M%S%Z) \
  UPDATE_PERFORMANCE_GOAL_RESULTS=true \
  scripts/run-official-write200-audit.sh
```

Raw `scripts/run-official-write200-audit.sh` default official write shape (the current Desktop direct wrapper overrides workers/target as noted above):

- 4-org `PassportBenchmarkChannel`
- `BENCHMARK_CC_INSTALL_ORGS=1,2,3,4`
- `PREPARE_ORG=manufacturer`
- `ORG=evmanufacturer`
- `REPEAT_COUNT=10`
- `CALIPER_WRITE_TX_NUMBER=10000`
- `CALIPER_WRITE_TARGET_TPS=400`
- `CALIPER_WORKERS=4`
- `CALIPER_FABRIC_GATEWAY_EVENTSTRATEGY=msp_any`
- `CALIPER_FABRIC_TIMEOUT_INVOKEORQUERY=180`
- `CALIPER_OBSERVER_INTERNAL_INTERVAL=10000`
- `CALIPER_VERIFY_PREPARED_EACH_REPEAT=false`
- `PassportBenchmarkChannel` block shape: `BatchTimeout=1s`, `MaxMessageCount=250`, `PreferredMaxBytes=2 MB`
- fresh-network peer concurrency override: `BENCHMARK_PEER_CONCURRENCY=true`, `CORE_PEER_LIMITS_CONCURRENCY_GATEWAYSERVICE=2000`
- txmap + CouchDB/peer-height reconciliation required
- optional read-only ledgerutil validation enabled by default: `IDENTIFY_LEDGER_VALIDITY_AFTER_RUNS=true`, `IDENTIFY_LEDGER_VALIDITY_REQUIRED=false`
- peer-height convergence wait enabled by default: `WAIT_FOR_PEER_HEIGHTS_EQUAL=true`, `WAIT_FOR_PEER_HEIGHTS_REQUIRED=true`

## Expected outputs

Inside the generated evidence directory:

- `summary.env`
- `summary.json`
- `repeat-results.csv`
- `ledger-reconciliation.json`
- `peer-heights.log` and `peer-heights-*.json`
- `ledger-validity/summary.json` when `ledgerutil identifytxs` is available
- `final-status.env`
- `official-write-verify.json`
- `official-write-verify.env`
- `official-write-verify.log`
- `performance-goal-write-result.env`
- `static-checks.log`

Cleanup evidence is referenced by `CLEAN_DIR` in `final-status.env`.


## Package evidence for return transfer

After the stronger-host wrapper finishes, package the generated evidence directory before copying it back:

```bash
scripts/create-offhost-write200-return-bundle.sh --evidence-dir <evidence-dir>
```

The return packager requires `peer-heights.log` plus at least one
`peer-heights-*.json`, matching the default official wrapper's peer-height
convergence guard. Missing peer-height evidence means the bundle is incomplete
and should not be imported as official return evidence.

Copy the generated return bundle to the active performance-goal worktree, then use the guarded import helper from the repo root:

```bash
scripts/import-offhost-write200-return-bundle.sh --bundle /path/to/<return-bundle>.tar.gz
```

If you are not sure whether the copied archive is an official return bundle or a diagnostic bundle, use the router:

```bash
scripts/import-offhost-write200-bundle.sh --bundle /path/to/<bundle>.tar.gz
```

If the bundle was copied to the Windows Desktop, Downloads, or Documents folder, the active worktree can also scan all common return locations and import the newest return/diagnostic archive:

```bash
scripts/import-latest-offhost-write200-bundle.sh \
  --search-root ${WINDOWS_HOME}/Desktop \
  --search-root ${WINDOWS_HOME}/Desktop/OMX_WRITE200_WORKSPACE \
  --search-root ${WINDOWS_HOME}/Downloads \
  --search-root ${WINDOWS_HOME}/Documents \
  --max-depth 6 \
  --auto-audit \
  --checkpoint
```

When both kinds are present, `import-latest` prefers official
`offhost-write200-return-*.tar.gz` archives over diagnostic archives even if a
diagnostic archive is newer. Use `--bundle` for an explicit diagnostic import.

To wait for a bundle to appear and import it automatically:

```bash
scripts/watch-offhost-write200-bundle.sh --detach --search-root ${WINDOWS_HOME}/Desktop --search-root ${WINDOWS_HOME}/Downloads --search-root ${WINDOWS_HOME}/Documents --max-depth 6
```

The active worktree currently uses the Desktop workspace, Downloads, and
Documents roots only. Avoid scanning the Desktop root unless explicitly needed;
that keeps old handoff folders and advice packets from becoming accidental
search noise.

The helper extracts into an isolated import directory, verifies `manifest.sha256`, checks `required-file-check.json`, locates the evidence directory, then calls `scripts/ingest-offhost-write200-evidence.sh` to re-run the official write verifier, append `performance-goal-write-result.env` into the performance-goal `latest-results.env`, and run the evaluator. It does **not** call Codex `update_goal`.
The importer also rejects official return bundles that do not contain
`peer-heights.log` plus at least one `peer-heights-*.json`; it writes
`peer-height-evidence-check.json` in the import directory for auditability.

Only after a completion audit confirms every hard gate should a pass checkpoint be recorded. The import/ingest path refuses a pass checkpoint without a passing structured audit whose `completion-audit.json` points to the same imported official evidence directory. Preferred one-command guarded checkpoint path:

```bash
scripts/import-offhost-write200-return-bundle.sh \
  --bundle /path/to/<return-bundle>.tar.gz \
  --auto-audit \
  --checkpoint
```

Manual equivalent:

```bash
scripts/audit-performance-goal-completion.sh \
  --official-evidence-dir <evidence-dir> \
  --out-dir <audit-dir>

scripts/import-offhost-write200-return-bundle.sh \
  --bundle /path/to/<return-bundle>.tar.gz \
  --completion-audit <audit-dir>/completion-audit.md \
  --checkpoint
```

## Pass criteria

Both must pass:

```bash
scripts/verify-official-write200-evidence.sh --evidence-dir <evidence-dir>
bash .omx/goals/performance/full-benchmark-rerun-audit-all-tracks/evaluate.sh
```

Official write PASS requires:

- 10 rows in `repeat-results.csv`
- every row `Succ==expected`
- every row `Fail=0`
- every row `Reject=0`
- `WRITE200_P50_TPS >= 200`
- `WRITE200_P10_TPS >= 150`
- `WRITE200_MIN_TPS >= 150`

## If PASS

1. Run a completion audit against all hard gates.
2. Record a `pass` checkpoint with the official evidence paths.
3. Only then may the active Codex thread call `update_goal`.

## If FAIL

Record a fail checkpoint with:

- `repeat-results.csv`
- `summary.json`
- `official-write-verify.json`
- `ledger-reconciliation.json`
- `ledger-validity/summary.json` if present
- cleanup `orderer-channels.after.json`

Do not substitute ledger/world-state counts for Caliper `Succ==expected`.
Do not substitute `ledger-validity/summary.json` for Caliper `Succ==expected` either; it is only a diagnostic split between real invalid commits and Caliper event/accounting artifacts.

## Safety rules

- Do not reset/redeploy/sequence live `passportchannel`.
- Do not use live `passportchannel` for write benchmark.
- Disposable benchmark channels must be removed by cleanup.
- Final orderer channel list must contain only `passportchannel`.
