#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT_DIR}"

PERFORMANCE_GOAL_SLUG="${PERFORMANCE_GOAL_SLUG:-chaincode-hotpath-write200}"
EVIDENCE_BASE="${EVIDENCE_BASE:-.omx/evidence/blockchain/${PERFORMANCE_GOAL_SLUG}}"
TS="${RUN_TS:-$(date +%Y%m%dT%H%M%S%Z)}"
OUT_DIR="${OUT_DIR:-${EVIDENCE_BASE}/offhost-handoff-bundle-${TS}}"
RUN_VALIDATION="${RUN_VALIDATION:-true}"
WRITE_LATEST_POINTER="${WRITE_LATEST_POINTER:-true}"
mkdir -p "${OUT_DIR}"

usage() {
  cat <<'USAGE'
Usage:
  scripts/create-offhost-write200-handoff-bundle.sh [--no-validate]

Creates a portable overlay bundle for the stronger-host official write200 rerun.
The bundle is intended to be extracted over an existing checkout of this repo.
It includes the benchmark wrapper/verifier/ingest/handoff scripts, modified
Caliper/Fabric/chaincode files, runbook docs, ADR, and active performance-goal
evaluator files. It does not include runtime logs, wallets, node_modules, or
large evidence directories.
USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --no-validate)
      RUN_VALIDATION=false
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage >&2
      exit 2
      ;;
  esac
done

if [[ "${RUN_VALIDATION}" == "true" ]]; then
  scripts/validate-offhost-write200-handoff.sh "${OUT_DIR}/handoff-readiness.json" >/dev/null
fi

paths=(
  scripts/apply-offhost-write200-overlay.sh
  scripts/audit-performance-goal-completion.sh
  scripts/blockchain-tps-reproducibility.sh
  scripts/check-benchmark-host-readiness.sh
  scripts/cleanup-benchmark-fabric-artifacts.sh
  scripts/create-offhost-write200-handoff-bundle.sh
  scripts/create-offhost-write200-return-bundle.sh
  scripts/ingest-offhost-write200-evidence.sh
  scripts/evaluate-write200-smoke-quality-gate.py
  scripts/import-offhost-write200-bundle.sh
  scripts/import-latest-offhost-write200-bundle.sh
  scripts/import-offhost-write200-diagnostic-bundle.sh
  scripts/import-offhost-write200-return-bundle.sh
  scripts/identify-benchmark-ledger-validity.sh
  scripts/publish-offhost-write200-handoff-to-desktop.sh
  scripts/recommend-write200-sweep-candidate.py
  scripts/safe-tar-extract.py
  scripts/wait-peer-heights-equal.sh
  scripts/reconcile-benchmark-state.js
  scripts/run-offhost-write200-operator.sh
  scripts/run-official-write200-audit.sh
  scripts/run-stronger-host-direct-official.sh
  scripts/seed-chaincode-image.sh
  scripts/test-caliper-bmu-workload-sequence.js
  scripts/test-official-write200-verifier-gates.sh
  scripts/test-offhost-return-bundle-required-context.sh
  scripts/test-portable-fallback-import-route.sh
  scripts/validate-offhost-write200-handoff.sh
  scripts/verify-offhost-write200-desktop-handoff.sh
  scripts/verify-official-write200-evidence.sh
  scripts/watch-offhost-write200-bundle.sh
  scripts/with-fabric-docker-hosts.sh
  caliper-workspace/benchconfig.yaml
  caliper-workspace/caliperIds.js
  caliper-workspace/prepare-passports.js
  caliper-workspace/run-bench.sh
  caliper-workspace/verify-passports.js
  caliper-workspace/workloads/recordBMUData.js
  chaincode/passport-contract/META-INF/statedb/couchdb/indexes/indexBMUByDIDStatus.json
  chaincode/passport-contract/META-INF/statedb/couchdb/indexes/indexBMUByDidFC.json
  chaincode/passport-contract/META-INF/statedb/couchdb/indexes/indexBMUByPassportFC.json
  chaincode/passport-contract/META-INF/statedb/couchdb/indexes/indexBMUByPassportTimestamp.json
  chaincode/passport-contract/bmu_tx.go
  chaincode/passport-contract/go.mod
  chaincode/passport-contract/go.sum
  chaincode/passport-contract/helpers.go
  chaincode/passport-contract/helpers_test.go
  chaincode/passport-contract/query.go
  chaincode/passport-contract/types.go
  passport-network/network.sh
  passport-network/compose/compose-benchmark-concurrency.yaml
  passport-network/configtx/configtx.yaml
  passport-network/scripts/configUpdate.sh
  passport-network/scripts/createChannel.sh
  passport-network/scripts/deployCC.sh
  passport-network/scripts/envVar.sh
  passport-network/scripts/setAnchorPeer.sh
  wiki/blockchain/README.md
  wiki/blockchain/activity-log.md
  wiki/blockchain/bmu-hot-path-map.md
  wiki/blockchain/benchmark-methodology.md
  wiki/blockchain/full-benchmark-rerun-audit-2026-05-12.md
  wiki/blockchain/official-write200-offhost-runbook.md
  wiki/decisions/007-blockchain-benchmark-host-readiness.md
  wiki/decisions/README.md
  .omx/plans/evaluate-chaincode-hotpath-write200.sh
  .omx/plans/prd-chaincode-hotpath-write200.md
  .omx/plans/test-spec-chaincode-hotpath-write200.md
  .omx/goals/performance/${PERFORMANCE_GOAL_SLUG}/evaluate.sh
  .omx/goals/performance/${PERFORMANCE_GOAL_SLUG}/evaluator.md
  .omx/goals/performance/${PERFORMANCE_GOAL_SLUG}/latest-results.env
  .omx/goals/performance/${PERFORMANCE_GOAL_SLUG}/state.json
)

LIST_FILE="${OUT_DIR}/files.txt"
MANIFEST="${OUT_DIR}/manifest.sha256"
README="${OUT_DIR}/README-offhost-handoff.md"
BUNDLE="${OUT_DIR}/offhost-write200-handoff-${TS}.tar.gz"
STATUS_ENV="${OUT_DIR}/bundle-status.env"
LATEST_POINTER="${LATEST_POINTER:-$(dirname "${OUT_DIR}")/offhost-write200-handoff-LATEST.txt}"
: > "${LIST_FILE}"
missing=()
for rel in "${paths[@]}"; do
  if [[ -e "${rel}" ]]; then
    printf '%s\n' "${rel}" >> "${LIST_FILE}"
  else
    missing+=("${rel}")
  fi
done

if (( ${#missing[@]} > 0 )); then
  printf 'Missing required handoff path(s):\n' >&2
  printf ' - %s\n' "${missing[@]}" >&2
  exit 2
fi

sha256sum $(cat "${LIST_FILE}") > "${MANIFEST}"

CREATED_AT="$(date -Is)"
cat > "${README}" <<'README'
# Off-host write200 handoff bundle

Created: __CREATED_AT__

## Purpose

Overlay this bundle onto an existing checkout of `<REPO_ROOT>` or the equivalent repo root on a stronger host before running the official write200 wrapper.

## Verify bundle

```bash
# from repo root after extracting the bundle sidecars
sha256sum -c manifest.sha256
scripts/apply-offhost-write200-overlay.sh
# External Fabric binary prerequisite before validation:
#   fabric-samples/bin/configtxgen must exist, or configtxgen must be on PATH.
scripts/validate-offhost-write200-handoff.sh
scripts/check-benchmark-host-readiness.sh
```

Fabric binary prerequisite: `configtxgen` must be available at `fabric-samples/bin/configtxgen` or on `PATH`. If validation reports `configtxgen` missing, install/copy Fabric binaries first. `handoff_readiness_failed` diagnostic bundles are blocked evidence only, not PASS.
`scripts/check-benchmark-host-readiness.sh` is a non-writing preflight; it reports `blocked_underpowered_host` without creating channels or running writes.

## Run direct official and always return an archive

Do **not** start with another smoke/sweep loop for the current blocked state.
Run one direct official 10-repeat attempt inside a durable terminal session and
bring back evidence even when the verifier exits non-zero.

```bash
tmux new -s write200
```

Inside that tmux session:

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
export FINAL_OUT_DIR="$HOME/OMX_WRITE200_OUT"
export FINAL_OUT_SEARCH_ROOTS="$PWD $HOME /tmp"
export CALIPER_RECORD_AUTO_ID=true
export CALIPER_WRITE_TX_NUMBER=10000
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
back `OMX_WRITE200_OUT_*.tar.gz`. The fallback archive is diagnostic evidence
only; it prevents losing the logs/status needed to classify the blocker.

## Ingest result back in the active performance-goal worktree

```bash
scripts/import-offhost-write200-return-bundle.sh --bundle /path/to/<return-bundle>.tar.gz
```

Or use the bundle router if you are not sure whether the returned archive is an
official return bundle or a diagnostics bundle:

```bash
scripts/import-offhost-write200-bundle.sh --bundle /path/to/<bundle>.tar.gz
```

If the bundle was copied to the Windows Desktop, Downloads, or Documents folder,
the active worktree can scan all common return locations and import the newest
return/diagnostic archive by canonical bundle filename:

```bash
scripts/import-latest-offhost-write200-bundle.sh \
  --search-root ${WINDOWS_HOME}/Desktop/OMX_WRITE200_WORKSPACE \
  --search-root ${WINDOWS_HOME}/Desktop \
  --search-root ${WINDOWS_HOME}/Downloads \
  --search-root ${WINDOWS_HOME}/Documents \
  --max-depth 6 \
  --auto-audit \
  --checkpoint
```

Or keep watching the Desktop until a return/diagnostic archive appears:

```bash
scripts/watch-offhost-write200-bundle.sh --detach --search-root ${WINDOWS_HOME}/Desktop/OMX_WRITE200_WORKSPACE --search-root ${WINDOWS_HOME}/Desktop --search-root ${WINDOWS_HOME}/Downloads --search-root ${WINDOWS_HOME}/Documents --max-depth 6
```

The watcher imports `DIAGNOSTIC_BUNDLE` archives as blocked evidence but keeps
waiting for an official `RETURN_BUNDLE`. Do not treat a diagnostic import as
PASS.
Only use `OFFHOST_BUNDLE_CONTENT_SCAN=true` as a one-shot fallback if the
archive was renamed and canonical filename search cannot find it.

If verifier/evaluator pass, prefer the guarded auto-audit checkpoint path:

```bash
scripts/import-offhost-write200-return-bundle.sh \
  --bundle /path/to/<return-bundle>.tar.gz \
  --auto-audit \
  --checkpoint
```

Or write a completion audit manually first, then use:

```bash
scripts/audit-performance-goal-completion.sh \
  --official-evidence-dir <evidence-dir> \
  --out-dir <audit-dir>

scripts/import-offhost-write200-return-bundle.sh \
  --bundle /path/to/<return-bundle>.tar.gz \
  --completion-audit <audit-dir>/completion-audit.md \
  --checkpoint
```

Do not call Codex `update_goal` until the final completion audit covers every hard gate.
README
python3 - "${README}" "${CREATED_AT}" <<'PYREPL'
from pathlib import Path
import sys
path = Path(sys.argv[1])
created = sys.argv[2]
path.write_text(path.read_text().replace('__CREATED_AT__', created))
PYREPL

MANIFEST_CHECK_LOG="${OUT_DIR}/manifest-check.log"
sha256sum -c "${MANIFEST}" > "${MANIFEST_CHECK_LOG}"

tar -czf "${BUNDLE}" \
  -T "${LIST_FILE}" \
  -C "${OUT_DIR}" "$(basename "${README}")" "$(basename "${MANIFEST}")" "$(basename "${LIST_FILE}")"
BUNDLE_SHA256="$(sha256sum "${BUNDLE}" | awk '{print $1}')"

if [[ "${WRITE_LATEST_POINTER}" == "true" ]]; then
  cat > "${LATEST_POINTER}" <<EOF
# Latest off-host write200 handoff

Created: ${CREATED_AT}

Use this bundle, not older Desktop copies:

${BUNDLE}

SHA256:

${BUNDLE_SHA256}

Verify this Desktop publication from the active worktree before transfer:

scripts/verify-offhost-write200-desktop-handoff.sh --desktop-dir ${WINDOWS_HOME}/Desktop/OMX_WRITE200_WORKSPACE

Verify after transfer/extract:

sha256sum -c manifest.sha256
# Ensure configtxgen exists at fabric-samples/bin/configtxgen or on PATH before this validation step.
scripts/validate-offhost-write200-handoff.sh
scripts/check-benchmark-host-readiness.sh

Preferred stronger-host command:

Run inside tmux so SSH/VS Code/Codex disconnects cannot lose final packaging:

\`\`\`bash
tmux new -s write200
\`\`\`

Then run the direct official wrapper:

\`\`\`bash
scripts/run-stronger-host-direct-official.sh
\`\`\`

Or run the direct official command from \`README-offhost-handoff.md\` or
\`wiki/blockchain/official-write200-offhost-runbook.md\`. Do not add \`--smoke\`,
\`--sweep-on-smoke-fail\`, \`--smoke-only\`, or \`--sweep-only\` for the current
blocked attempt. Always bring back at least one archive:

- \`offhost-write200-return-*.tar.gz\`
- \`offhost-write200-operator-diagnostics-*.tar.gz\`
- \`OMX_WRITE200_OUT_*.tar.gz\`

If the operator prints RETURN_BUNDLE, copy that archive back and run:

scripts/import-offhost-write200-bundle.sh --bundle /path/to/<return-bundle>.tar.gz --auto-audit --checkpoint

If it prints DIAGNOSTIC_BUNDLE, copy it back too; route diagnostics without
--auto-audit:

scripts/import-offhost-write200-bundle.sh --bundle /path/to/<diagnostic-bundle>.tar.gz --checkpoint

If the diagnostic bundle includes SWEEP_RECOMMENDATION_ENV, source it on the
stronger host and rerun scripts/run-offhost-write200-operator.sh to generate a
RETURN_BUNDLE. The sweep itself is not PASS evidence.

Optional watcher on the active worktree:

scripts/watch-offhost-write200-bundle.sh --detach --search-root ${WINDOWS_HOME}/Desktop/OMX_WRITE200_WORKSPACE --search-root ${WINDOWS_HOME}/Desktop --search-root ${WINDOWS_HOME}/Downloads --search-root ${WINDOWS_HOME}/Documents --max-depth 6

The watcher imports DIAGNOSTIC_BUNDLE archives as blocked evidence but keeps
waiting for an official RETURN_BUNDLE. Do not treat a diagnostic import as PASS.
Only use OFFHOST_BUNDLE_CONTENT_SCAN=true as a one-shot fallback if the archive
was renamed and canonical filename search cannot find it.
EOF
fi

{
  echo "OUT_DIR=${OUT_DIR}"
  echo "BUNDLE=${BUNDLE}"
  echo "BUNDLE_SHA256=${BUNDLE_SHA256}"
  echo "FILES_LIST=${LIST_FILE}"
  echo "MANIFEST=${MANIFEST}"
  echo "MANIFEST_CHECK_LOG=${MANIFEST_CHECK_LOG}"
  echo "README=${README}"
  echo "LATEST_POINTER=${LATEST_POINTER}"
  echo "WRITE_LATEST_POINTER=${WRITE_LATEST_POINTER}"
  echo "RUN_VALIDATION=${RUN_VALIDATION}"
  if [[ -f "${OUT_DIR}/handoff-readiness.json" ]]; then
    echo "READINESS_JSON=${OUT_DIR}/handoff-readiness.json"
  fi
} > "${STATUS_ENV}"

cat "${STATUS_ENV}"
