#!/usr/bin/env bash
# Dry-run/guard regression tests for blockchain reproducibility hardening.

set -euo pipefail
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT_DIR}"

node -c scripts/collect-blockchain-evidence.js
node -c caliper-workspace/verify-passports.js
node -c scripts/tps-benchmark-cloud.js
node -c cloud-agent/server.js
node -c cloud-agent/initial-sync.js
node -c cloud-agent/services/fabric-listener.js
bash -n \
  caliper-workspace/run-bench.sh \
  passport-network/scripts/evaluation-dday-reset.sh \
  passport-network/scripts/benchmark-safe.sh \
  scripts/blockchain-benchmark-safe.sh \
  scripts/blockchain-evaluation-dday.sh
grep -q 'FABRIC_BIN' scripts/collect-blockchain-evidence.js
grep -q 'channel config invariant violation' scripts/collect-blockchain-evidence.js

passport-network/scripts/evaluation-dday-reset.sh --dry-run > /tmp/eval-dday-dryrun.log
grep -q "DRY-RUN" /tmp/eval-dday-dryrun.log
grep -q "passportchannel" /tmp/eval-dday-dryrun.log
grep -q "PassportBenchmarkChannel" /tmp/eval-dday-dryrun.log
grep -q "RESET passportchannel for evaluation-dday" /tmp/eval-dday-dryrun.log

TMP=$(mktemp -d)
mkdir -p "${TMP}/passport-network/scripts"
cp passport-network/scripts/evaluation-dday-reset.sh "${TMP}/passport-network/scripts/"
cat > "${TMP}/passport-network/network.sh" <<'SH'
#!/usr/bin/env bash
echo NETWORK_SH_CALLED >> calls.log
exit 99
SH
chmod +x "${TMP}/passport-network/network.sh"
(
  cd "${TMP}"
  set +e
  passport-network/scripts/evaluation-dday-reset.sh --execute >out.log 2>&1
  code=$?
  set -e
  test "${code}" -ne 0
  test ! -s calls.log 2>/dev/null
  grep -Eq "CONFIRM_DESTRUCTIVE_RESET|refusing destructive reset" out.log
)

TMP=$(mktemp -d)
mkdir -p "${TMP}/passport-network/scripts"
cp passport-network/scripts/evaluation-dday-reset.sh "${TMP}/passport-network/scripts/"
cat > "${TMP}/passport-network/network.sh" <<'SH'
#!/usr/bin/env bash
echo NETWORK_SH_CALLED >> calls.log
exit 99
SH
chmod +x "${TMP}/passport-network/network.sh"
(
  cd "${TMP}"
  set +e
  CONFIRM_DESTRUCTIVE_RESET=true DESTRUCTIVE_RESET_PHRASE="WRONG" passport-network/scripts/evaluation-dday-reset.sh --execute >out.log 2>&1
  code=$?
  set -e
  test "${code}" -ne 0
  test ! -s calls.log 2>/dev/null
  grep -Eq "DESTRUCTIVE_RESET_PHRASE|phrase|RESET passportchannel" out.log
)

set +e
CHANNEL_NAME=passportchannel passport-network/scripts/benchmark-safe.sh --dry-run > /tmp/benchmark-safe-refusal.log 2>&1
code=$?
set -e
test "${code}" -ne 0
grep -Ei "passportchannel|benchmark-safe|evaluation-dday|refuses" /tmp/benchmark-safe-refusal.log >/dev/null

scripts/blockchain-benchmark-safe.sh --dry-run --channel passportbench-dryrun --run-id dryrun-test > /tmp/benchmark-safe-dryrun.log
grep -q "DRY-RUN" /tmp/benchmark-safe-dryrun.log
grep -q "PassportBenchmarkChannel" /tmp/benchmark-safe-dryrun.log

(
  cd caliper-workspace
  set +e
  CALIPER_SKIP_PREPARE=true ./run-bench.sh manufacturer > /tmp/run-bench-skip-guard.log 2>&1
  code=$?
  set -e
  test "${code}" -ne 0
  grep -q "CALIPER_RUN_ID" /tmp/run-bench-skip-guard.log
)

(
  cd caliper-workspace
  set +e
  CALIPER_SKIP_PREPARE=true CALIPER_RUN_ID=guard-test ./run-bench.sh manufacturer > /tmp/run-bench-fc-guard.log 2>&1
  code=$?
  set -e
  test "${code}" -ne 0
  grep -q "BMU_FC_START" /tmp/run-bench-fc-guard.log
)

set +e
READ_MODEL_PROVENANCE=channel-bound FABRIC_CHANNEL=passportchannel \
  scripts/blockchain-benchmark-safe.sh --dry-run --channel passportbench-dryrun > /tmp/benchmark-safe-channel-bound-mismatch.log 2>&1
code=$?
set -e
test "${code}" -ne 0
grep -Ei "channel-bound|FABRIC_CHANNEL|passportbench-dryrun" /tmp/benchmark-safe-channel-bound-mismatch.log >/dev/null

scripts/blockchain-evaluation-dday.sh --dry-run --run-id dday-dryrun-test > /tmp/evaluation-dday-dryrun.log
grep -q "DRY-RUN" /tmp/evaluation-dday-dryrun.log
grep -q "passportchannel" /tmp/evaluation-dday-dryrun.log
grep -q "PassportBenchmarkChannel" /tmp/evaluation-dday-dryrun.log

set +e
FABRIC_CHANNEL=passportbench-wrong scripts/blockchain-evaluation-dday.sh --execute --run-id dday-wrong-channel > /tmp/evaluation-dday-wrong-channel.log 2>&1
code=$?
set -e
test "${code}" -ne 0
grep -Ei "evaluation-dday|FABRIC_CHANNEL|passportchannel" /tmp/evaluation-dday-wrong-channel.log >/dev/null

OUT=$(mktemp -d)
node scripts/collect-blockchain-evidence.js \
  --mode benchmark-safe \
  --channel passportbench-test \
  --profile PassportBenchmarkChannel \
  --dry-run \
  --out "${OUT}" \
  --read-provenance independent-service-benchmark >/tmp/evidence-benchmark.log
node - "${OUT}/evidence.json" <<'NODE'
const fs = require('fs');
const e = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
if (e.mode !== 'benchmark-safe') throw new Error('mode must be benchmark-safe');
if (e.channel.name === 'passportchannel') throw new Error('benchmark-safe must not use passportchannel');
if (e.channel.profile !== 'PassportBenchmarkChannel') throw new Error('profile mismatch');
if (!['channel-bound', 'independent-service-benchmark'].includes(e.cloud?.readModelProvenance)) throw new Error('invalid readModelProvenance');
NODE
test -f "${OUT}/evidence.md"

OUT=$(mktemp -d)
node scripts/collect-blockchain-evidence.js \
  --mode evaluation-dday \
  --channel passportchannel \
  --profile PassportBenchmarkChannel \
  --dry-run \
  --out "${OUT}" \
  --read-provenance channel-bound \
  --fabric-channel passportchannel >/tmp/evidence-dday.log
node - "${OUT}/evidence.json" <<'NODE'
const fs = require('fs');
const e = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
if (e.mode !== 'evaluation-dday') throw new Error('mode must be evaluation-dday');
if (e.channel.name !== 'passportchannel') throw new Error('evaluation-dday must use passportchannel');
if (e.channel.profile !== 'PassportBenchmarkChannel') throw new Error('evaluation-dday profile must be PassportBenchmarkChannel');
if (!e.repo?.commit) throw new Error('repo.commit missing');
if (!e.versions) throw new Error('versions missing');
if (!e.commands?.length) throw new Error('commands missing');
if (e.cloud.fabricChannel !== 'passportchannel') throw new Error('fabricChannel mismatch');
NODE

set +e
node scripts/collect-blockchain-evidence.js --mode benchmark-safe --channel passportchannel --profile PassportBenchmarkChannel --dry-run --out "$(mktemp -d)" > /tmp/evidence-wrong-benchmark.log 2>&1
code=$?
set -e
test "${code}" -ne 0
grep -Ei "benchmark-safe|passportchannel|invariant" /tmp/evidence-wrong-benchmark.log >/dev/null

set +e
node scripts/collect-blockchain-evidence.js --mode evaluation-dday --channel passportbench-test --profile PassportBenchmarkChannel --dry-run --out "$(mktemp -d)" > /tmp/evidence-wrong-dday.log 2>&1
code=$?
set -e
test "${code}" -ne 0
grep -Ei "evaluation-dday|passportchannel|invariant" /tmp/evidence-wrong-dday.log >/dev/null

set +e
node scripts/collect-blockchain-evidence.js --mode benchmark-safe --channel passportbench-test --profile PassportBenchmarkChannel --dry-run --read-provenance channel-bound --fabric-channel passportchannel --out "$(mktemp -d)" > /tmp/evidence-wrong-provenance.log 2>&1
code=$?
set -e
test "${code}" -ne 0
grep -Ei "provenance|fabricChannel|channel" /tmp/evidence-wrong-provenance.log >/dev/null

HEALTH_DIR=$(mktemp -d)
cat > "${HEALTH_DIR}/server.js" <<'NODE'
const http = require('http');
const mode = process.argv[2];
const payload = mode === 'stale'
  ? { status: 'ok', db: 'connected', fabricChannel: 'passportchannel', readModelProvenance: 'channel-bound' }
  : { status: 'ok', db: 'connected', fabricChannel: 'passportbench-test', readModelProvenance: 'channel-bound' };
const server = http.createServer((req, res) => {
  if (req.url !== '/health') {
    res.writeHead(404);
    res.end();
    return;
  }
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(payload));
});
server.listen(0, '127.0.0.1', () => {
  console.log(server.address().port);
});
NODE
node "${HEALTH_DIR}/server.js" stale > "${HEALTH_DIR}/stale.port" &
HEALTH_PID=$!
sleep 1
STALE_PORT=$(cat "${HEALTH_DIR}/stale.port")
set +e
node scripts/collect-blockchain-evidence.js \
  --mode benchmark-safe \
  --channel passportbench-test \
  --profile PassportBenchmarkChannel \
  --read-provenance channel-bound \
  --fabric-channel passportbench-test \
  --cloud-health-url "http://127.0.0.1:${STALE_PORT}/health" \
  --out "$(mktemp -d)" > /tmp/evidence-stale-health.log 2>&1
code=$?
kill "${HEALTH_PID}" 2>/dev/null || true
set -e
test "${code}" -ne 0
grep -Ei "health|fabricChannel|passportchannel|provenance" /tmp/evidence-stale-health.log >/dev/null

node "${HEALTH_DIR}/server.js" ok > "${HEALTH_DIR}/ok.port" &
HEALTH_PID=$!
sleep 1
OK_PORT=$(cat "${HEALTH_DIR}/ok.port")
set +e
node scripts/collect-blockchain-evidence.js \
  --mode benchmark-safe \
  --channel passportbench-test \
  --profile PassportBenchmarkChannel \
  --read-provenance channel-bound \
  --fabric-channel passportbench-test \
  --cloud-health-url "http://127.0.0.1:${OK_PORT}/health" \
  --out "$(mktemp -d)" >/tmp/evidence-missing-config.log 2>&1
code=$?
set -e
test "${code}" -ne 0
grep -Ei "channel config invariant|decodeStatus|batchTimeout|maxMessageCount|preferredMaxBytes" /tmp/evidence-missing-config.log >/dev/null

OUT=$(mktemp -d)
node scripts/collect-blockchain-evidence.js \
  --mode benchmark-safe \
  --channel passportbench-test \
  --profile PassportBenchmarkChannel \
  --dry-run \
  --read-provenance channel-bound \
  --fabric-channel passportbench-test \
  --cloud-health-url "http://127.0.0.1:${OK_PORT}/health" \
  --out "${OUT}" >/tmp/evidence-ok-health.log
kill "${HEALTH_PID}" 2>/dev/null || true
node - "${OUT}/evidence.json" <<'NODE'
const fs = require('fs');
const e = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
if (e.cloud.healthFabricChannel !== 'passportbench-test') throw new Error('health fabricChannel not captured');
if (e.cloud.provenanceStatus !== 'verified') throw new Error('provenance not verified');
NODE

echo "blockchain reproducibility hardening dry-run tests passed"
