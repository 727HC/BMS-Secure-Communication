#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT_DIR}"

resolve_default_windows_home() {
  if [[ -n "${WINDOWS_HOME:-}" ]]; then
    printf '%s\n' "${WINDOWS_HOME}"
  elif [[ -n "${USERPROFILE:-}" ]] && command -v wslpath >/dev/null 2>&1; then
    wslpath -u "${USERPROFILE}"
  elif [[ -n "${WINDOWS_USER:-}" ]]; then
    printf '/mnt/c/Users/%s\n' "${WINDOWS_USER}"
  elif [[ -n "${USER:-}" ]]; then
    printf '/mnt/c/Users/%s\n' "${USER}"
  else
    printf ''
  fi
}

WINDOWS_HOME="${WINDOWS_HOME:-$(resolve_default_windows_home)}"
STATUS_ENV=""
DESKTOP_DIR="${DESKTOP_DIR:-${WINDOWS_HOME}/Desktop/OMX_WRITE200_WORKSPACE}"
RUNME_NAME="${RUNME_NAME:-offhost-write200-RUN-ME-latest.txt}"
CREATE_IF_MISSING=false
NEXT_ACTION_MODE="${OFFHOST_WRITE200_NEXT_ACTION_MODE:-direct-official}"

usage() {
  cat <<'USAGE'
Usage:
  scripts/publish-offhost-write200-handoff-to-desktop.sh --status <bundle-status.env> [--desktop-dir <dir>]
  scripts/publish-offhost-write200-handoff-to-desktop.sh --create [--desktop-dir <dir>]

Publishes the latest off-host write200 handoff bundle sidecars to a single
Desktop workspace directory and
writes:
  - offhost-write200-handoff-LATEST.txt
  - offhost-write200-RUN-ME-latest.txt
  - CURRENT_WRITE200_STATUS_AND_NEXT_STEP.txt

This script only publishes handoff artifacts. It never runs benchmarks, never
touches live passportchannel, and never calls Codex update_goal.
USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --status)
      STATUS_ENV="${2:-}"
      shift 2
      ;;
    --desktop-dir)
      DESKTOP_DIR="${2:-}"
      shift 2
      ;;
    --runme-name)
      RUNME_NAME="${2:-}"
      shift 2
      ;;
    --create)
      CREATE_IF_MISSING=true
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

resolve_windows_home() {
  local dir="$1"
  local parent
  parent="$(dirname "${dir}")"

  if [[ "$(basename "${dir}")" == "Desktop" ]]; then
    printf '%s\n' "${parent}"
    return
  fi
  if [[ "$(basename "${parent}")" == "Desktop" ]]; then
    printf '%s\n' "$(dirname "${parent}")"
    return
  fi
  printf '%s\n' "${parent}"
}

WINDOWS_HOME="$(resolve_windows_home "${DESKTOP_DIR}")"

if [[ "${CREATE_IF_MISSING}" == "true" ]]; then
  create_log="$(mktemp)"
  scripts/create-offhost-write200-handoff-bundle.sh > "${create_log}" 2>&1
  STATUS_ENV="$(grep -E '^OUT_DIR=' "${create_log}" | tail -1 | cut -d= -f2-)/bundle-status.env"
fi

if [[ -z "${STATUS_ENV}" ]]; then
  echo "--status or --create is required" >&2
  usage >&2
  exit 2
fi
if [[ ! -f "${STATUS_ENV}" ]]; then
  echo "bundle status file not found: ${STATUS_ENV}" >&2
  exit 2
fi

# shellcheck disable=SC1090
source "${STATUS_ENV}"
: "${BUNDLE:?BUNDLE missing from status}"
: "${BUNDLE_SHA256:?BUNDLE_SHA256 missing from status}"
: "${MANIFEST:?MANIFEST missing from status}"
: "${FILES_LIST:?FILES_LIST missing from status}"
: "${MANIFEST_CHECK_LOG:?MANIFEST_CHECK_LOG missing from status}"
: "${README:?README missing from status}"

if [[ ! -f "${BUNDLE}" ]]; then
  echo "bundle file missing: ${BUNDLE}" >&2
  exit 2
fi
actual_sha="$(sha256sum "${BUNDLE}" | awk '{print $1}')"
if [[ "${actual_sha}" != "${BUNDLE_SHA256}" ]]; then
  echo "bundle sha mismatch: expected ${BUNDLE_SHA256}, got ${actual_sha}" >&2
  exit 2
fi

bundle_name="$(basename "${BUNDLE}")"
ts_part="${bundle_name#offhost-write200-handoff-}"
ts_part="${ts_part%.tar.gz}"
publish_dir="${DESKTOP_DIR}/offhost-write200-handoff-${ts_part}"
mkdir -p "${publish_dir}"

cp "${BUNDLE}" "${MANIFEST}" "${FILES_LIST}" "${MANIFEST_CHECK_LOG}" "${README}" "${STATUS_ENV}" "${publish_dir}/"
if [[ -n "${READINESS_JSON:-}" && -f "${READINESS_JSON}" ]]; then
  cp "${READINESS_JSON}" "${publish_dir}/"
fi

desktop_bundle="${publish_dir}/${bundle_name}"
sha256sum "${desktop_bundle}" > "${publish_dir}/bundle.sha256"

latest_pointer="${DESKTOP_DIR}/offhost-write200-handoff-LATEST.txt"
cat > "${latest_pointer}" <<EOF2
# Latest off-host write200 handoff

Created: $(date -Is)

Use this bundle, not older Desktop copies:

${desktop_bundle}

SHA256:

${BUNDLE_SHA256}

Verify this Desktop publication from the active worktree before transfer:

scripts/verify-offhost-write200-desktop-handoff.sh --desktop-dir ${DESKTOP_DIR}

Verify after transfer/extract:

sha256sum -c manifest.sha256
scripts/apply-offhost-write200-overlay.sh
# Ensure configtxgen exists at fabric-samples/bin/configtxgen or on PATH before this validation step.
scripts/validate-offhost-write200-handoff.sh
scripts/check-benchmark-host-readiness.sh

Fabric binary prerequisite:
- configtxgen must be available at fabric-samples/bin/configtxgen or on PATH.
- If validation reports configtxgen missing, install/copy Fabric binaries first, then rerun validation/operator.
- If the operator still emits handoff_readiness_failed, bring back the DIAGNOSTIC_BUNDLE; it is blocked evidence, not PASS.
- scripts/check-benchmark-host-readiness.sh is non-writing; if it reports blocked_underpowered_host, do not use ALLOW_UNDERPOWERED=true for official PASS evidence.

Preferred stronger-host command:

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

Docker-network runner is already the preferred default above; keep CALIPER_EXEC_MODE=docker, CALIPER_ENDPOINT_MODE=docker, and CALIPER_DOCKER_NETWORK=passport_net unless you have a host-mode-specific reason.

If the operator prints RETURN_BUNDLE, copy that archive back and run:

scripts/import-offhost-write200-bundle.sh --bundle /path/to/<return-bundle>.tar.gz --auto-audit --checkpoint

The RETURN_BUNDLE includes the official 10-repeat evidence directory plus
operator-context sidecars (operator-status.env, handoff-readiness.json,
handoff-readiness.log, host-readiness.json, host-readiness.log) for audit.
Those sidecars do not replace the Caliper/evaluator hard gates.

If it prints DIAGNOSTIC_BUNDLE, including handoff_readiness_failed diagnostics, copy it back too; route diagnostics without
--auto-audit:

scripts/import-offhost-write200-bundle.sh --bundle /path/to/<diagnostic-bundle>.tar.gz --checkpoint

If operator-status.env contains SWEEP_RECOMMENDATION_ENV=<path>, that sweep recommendation is not PASS evidence. On the stronger host, convert it into official evidence by running:

source <operator-evidence-base>/sweep/sweep-recommendation.env
export SMOKE_WORKERS="\${CALIPER_WORKERS}"
export SMOKE_TARGET_TPS="\${CALIPER_WRITE_TARGET_TPS}"
export OFFICIAL_WORKERS="\${CALIPER_WORKERS}"
export OFFICIAL_TARGET_TPS="\${CALIPER_WRITE_TARGET_TPS}"
scripts/run-offhost-write200-operator.sh --smoke --sweep-on-smoke-fail

If the returned archive may have been copied to Desktop, Downloads, or Documents, scan all common locations by canonical bundle filename:

scripts/import-latest-offhost-write200-bundle.sh --search-root ${WINDOWS_HOME}/Desktop --search-root ${DESKTOP_DIR} --search-root ${WINDOWS_HOME}/Downloads --search-root ${WINDOWS_HOME}/Documents --max-depth 6 --auto-audit --checkpoint

Optional watcher on the active worktree:

scripts/watch-offhost-write200-bundle.sh --detach --search-root ${WINDOWS_HOME}/Desktop --search-root ${DESKTOP_DIR} --search-root ${WINDOWS_HOME}/Downloads --search-root ${WINDOWS_HOME}/Documents --max-depth 6

The watcher imports DIAGNOSTIC_BUNDLE archives as blocked evidence but keeps
waiting for an official RETURN_BUNDLE. Do not treat a diagnostic import as PASS.
Only use OFFHOST_BUNDLE_CONTENT_SCAN=true as a one-shot fallback if the archive
was renamed and canonical filename search cannot find it.
EOF2

runme="${DESKTOP_DIR}/${RUNME_NAME}"
return_card="${DESKTOP_DIR}/offhost-write200-RETURN-NEEDED-latest.txt"
next_action_card="${DESKTOP_DIR}/STRONGER_HOST_NEXT_ACTION.txt"
one_line_card="${DESKTOP_DIR}/RUN_THIS_ON_STRONGER_HOST_ONE_LINE.txt"
current_status_card="${DESKTOP_DIR}/CURRENT_WRITE200_STATUS_AND_NEXT_STEP.txt"
cat > "${runme}" <<EOF2
# Off-host write200 RUN-ME (latest)

Created: $(date -Is)

Use this latest handoff bundle:

${desktop_bundle}

SHA256:

${BUNDLE_SHA256}

Do not use older offhost-write200-handoff-* folders unless this pointer changes.

## Before transfer

From <REPO_ROOT> on this machine, verify the Desktop files are internally consistent:

scripts/verify-offhost-write200-desktop-handoff.sh --desktop-dir ${DESKTOP_DIR}

## On the stronger host

You need an existing checkout of this repo. Copy the tar.gz into that repo root, then run:

cd /path/to/bms-blockchain

sha256sum "${bundle_name}"
# Expected:
# ${BUNDLE_SHA256}  ${bundle_name}

# Overlay the handoff files into the checkout.
tar -xzf "${bundle_name}" -C .

sha256sum -c manifest.sha256
scripts/apply-offhost-write200-overlay.sh
# Ensure configtxgen exists at fabric-samples/bin/configtxgen or on PATH before this validation step.
scripts/validate-offhost-write200-handoff.sh
scripts/check-benchmark-host-readiness.sh

# Preferred path: smoke first, sweep if smoke fails, official only if safe.
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

Docker-network runner is already the preferred default above; keep CALIPER_EXEC_MODE=docker, CALIPER_ENDPOINT_MODE=docker, and CALIPER_DOCKER_NETWORK=passport_net unless you have a host-mode-specific reason.

## Bring result back

If the operator prints RETURN_BUNDLE=<path>, copy that tar.gz back to this Desktop and run in the active repo:

scripts/import-offhost-write200-bundle.sh --bundle /path/to/<return-bundle>.tar.gz --auto-audit --checkpoint

The RETURN_BUNDLE includes the official 10-repeat evidence directory plus
operator-context sidecars (operator-status.env, handoff-readiness.json,
handoff-readiness.log, host-readiness.json, host-readiness.log) for audit.
Those sidecars do not replace the Caliper/evaluator hard gates.

If it prints DIAGNOSTIC_BUNDLE=<path>, copy that too and run:

scripts/import-offhost-write200-bundle.sh --bundle /path/to/<diagnostic-bundle>.tar.gz --checkpoint

If operator-status.env contains SWEEP_RECOMMENDATION_ENV=<path>, the sweep recommendation is diagnostic only. To convert it into official evidence on the stronger host:

source <operator-evidence-base>/sweep/sweep-recommendation.env
export SMOKE_WORKERS="\${CALIPER_WORKERS}"
export SMOKE_TARGET_TPS="\${CALIPER_WRITE_TARGET_TPS}"
export OFFICIAL_WORKERS="\${CALIPER_WORKERS}"
export OFFICIAL_TARGET_TPS="\${CALIPER_WRITE_TARGET_TPS}"
scripts/run-offhost-write200-operator.sh --smoke --sweep-on-smoke-fail

If you copied the returned archive to Desktop, Downloads, or Documents and are not sure where it landed, scan all common locations by canonical bundle filename:

scripts/import-latest-offhost-write200-bundle.sh --search-root ${WINDOWS_HOME}/Desktop --search-root ${DESKTOP_DIR} --search-root ${WINDOWS_HOME}/Downloads --search-root ${WINDOWS_HOME}/Documents --max-depth 6 --auto-audit --checkpoint

## Active worktree watcher

From <REPO_ROOT>, this can wait for a copied result:

scripts/watch-offhost-write200-bundle.sh --detach --search-root ${WINDOWS_HOME}/Desktop --search-root ${DESKTOP_DIR} --search-root ${WINDOWS_HOME}/Downloads --search-root ${WINDOWS_HOME}/Documents --max-depth 6

The watcher imports DIAGNOSTIC_BUNDLE archives as blocked evidence but keeps
waiting for an official RETURN_BUNDLE. Do not treat a diagnostic import as PASS.
Only use OFFHOST_BUNDLE_CONTENT_SCAN=true as a one-shot fallback if the archive
was renamed and canonical filename search cannot find it.

## Safety

- live passportchannel is read-only only.
- Do not reset/redeploy/sequence live passportchannel.
- Ledger/world-state evidence is diagnostic only; official PASS requires Caliper Succ==expected and TPS gates.
EOF2

cat > "${return_card}" <<EOF2
# Off-host write200 return needed
Generated: $(date -Is)

Current local status: BLOCKED
Reason: local Docker host has 8 CPUs; official write200 requires >=12 CPUs and >=24 GiB. No RETURN_BUNDLE/DIAGNOSTIC_BUNDLE has been found locally yet.

Latest handoff to run on stronger host:
BUNDLE=${desktop_bundle}
BUNDLE_SHA256=${BUNDLE_SHA256}
RUN_ME=${runme}

On the stronger host, use an existing checkout and run:
  cd /path/to/bms-blockchain
  tar -xzf "${bundle_name}" -C .
  sha256sum -c manifest.sha256
  # Ensure configtxgen exists at fabric-samples/bin/configtxgen or on PATH before validation.
  scripts/validate-offhost-write200-handoff.sh
  scripts/check-benchmark-host-readiness.sh
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

Docker-network runner is the preferred default on the stronger host; keep CALIPER_EXEC_MODE=docker, CALIPER_ENDPOINT_MODE=docker, and CALIPER_DOCKER_NETWORK=passport_net unless explicitly testing host mode.

Bring back exactly one of these files:
  1. RETURN_BUNDLE tar.gz   (preferred; official PASS/FAIL evidence)
  2. DIAGNOSTIC_BUNDLE tar.gz (if official did not run/pass)

If DIAGNOSTIC_BUNDLE contains a sweep recommendation, it is not PASS. On the same stronger host, source <operator-evidence-base>/sweep/sweep-recommendation.env, export SMOKE_WORKERS="\${CALIPER_WORKERS}", SMOKE_TARGET_TPS="\${CALIPER_WRITE_TARGET_TPS}", OFFICIAL_WORKERS="\${CALIPER_WORKERS}", and OFFICIAL_TARGET_TPS="\${CALIPER_WRITE_TARGET_TPS}", then rerun scripts/run-offhost-write200-operator.sh --smoke --sweep-on-smoke-fail to produce a RETURN_BUNDLE.

Place the returned tar.gz on this Windows machine under one of:
  ${WINDOWS_HOME}/Desktop
  ${DESKTOP_DIR}
  ${WINDOWS_HOME}/Downloads
  ${WINDOWS_HOME}/Documents

Then in this repo scan all common locations and import by canonical bundle filename:
  scripts/import-latest-offhost-write200-bundle.sh --search-root ${WINDOWS_HOME}/Desktop --search-root ${DESKTOP_DIR} --search-root ${WINDOWS_HOME}/Downloads --search-root ${WINDOWS_HOME}/Documents --max-depth 6 --auto-audit --checkpoint

Notes:
- Only use OFFHOST_BUNDLE_CONTENT_SCAN=true as a one-shot fallback if the archive was renamed and canonical filename search cannot find it.
- configtxgen must exist before operator write paths can run; handoff_readiness_failed diagnostics are blocked evidence only.
- scripts/check-benchmark-host-readiness.sh is non-writing; blocked_underpowered_host means use a stronger host, not ALLOW_UNDERPOWERED=true for official PASS.
- Do not run write benchmarks on live passportchannel.
- Official/smoke/sweep/pre-official runs emit effective-config.env, docker-stats-repeat-<n>.log, txmap-repeat-summary*.json, and quality-gate sidecars where applicable.
- Ledger/CouchDB reconciliation is diagnostic only; official PASS still requires Caliper Succ==expected, Fail=0, Reject=0, and TPS gates.
EOF2

# Keep the user's short "next action" pointer in sync with the latest handoff.
# This file is intentionally a copy of the return-needed card so it cannot
# silently point at an older bundle/SHA after a republish.
cp "${return_card}" "${next_action_card}"

if [[ "${NEXT_ACTION_MODE}" == "direct-official" ]]; then
  direct_action_card="${DESKTOP_DIR}/DIRECT_OFFICIAL_NEXT_ACTION.txt"
  cat > "${direct_action_card}" <<EOF2
# DIRECT OFFICIAL NEXT ACTION — write200 return bundle required

Generated: $(date -Is)

Current state: BLOCKED
Reason: no stronger-host official RETURN_BUNDLE exists yet.

Use the existing latest handoff on an existing checkout. Do not generate another
handoff for this attempt.

Latest handoff tar.gz:
${desktop_bundle}

SHA256:
${BUNDLE_SHA256}

## Stronger-host command

Use an existing checkout of this repo on the stronger host. Run this inside a
durable terminal session so a disconnect cannot prevent final bundle pickup:

\`\`\`bash
tmux new -s write200
\`\`\`

Then paste the command below inside that tmux session. If tmux is unavailable,
use nohup bash -lc '<command body>' and still bring back
\${HOME}/OMX_WRITE200_OUT_*.tar.gz.

\`\`\`bash
cd /path/to/bms-blockchain

# Copy this tar.gz into the repo root first:
# ${desktop_bundle}

sha256sum "${bundle_name}"
# expected: ${BUNDLE_SHA256}  ${bundle_name}

tar -xzf "${bundle_name}" -C .
sha256sum -c manifest.sha256
scripts/apply-offhost-write200-overlay.sh
scripts/validate-offhost-write200-handoff.sh
export ALLOW_UNDERPOWERED=false
export BENCHMARK_CHANNEL_PROFILE=PassportBenchmarkChannel
export BENCHMARK_CHANNEL_ORGS=1,2,3,4
export BENCHMARK_CC_INSTALL_ORGS=1,2,3,4
scripts/check-benchmark-host-readiness.sh

# Preferred one-command path. It runs direct official with no smoke/sweep flags
# and always leaves \${HOME}/OMX_WRITE200_OUT_*.tar.gz as fallback evidence.
scripts/run-stronger-host-direct-official.sh

# Manual fallback if you need to inspect each step:
export CALIPER_EXEC_MODE=docker
export CALIPER_ENDPOINT_MODE=docker
export CALIPER_DOCKER_NETWORK=passport_net
export CALIPER_VERIFY_PREPARED_EACH_REPEAT=false
export CALIPER_FABRIC_TIMEOUT_INVOKEORQUERY=180
export CALIPER_OBSERVER_INTERNAL_INTERVAL=10000
export COLLECT_HOST_RESOURCE_STATS=true
export ALLOW_UNDERPOWERED=false
export BENCHMARK_CHANNEL_PROFILE=PassportBenchmarkChannel
export BENCHMARK_CHANNEL_ORGS=1,2,3,4
export BENCHMARK_CC_INSTALL_ORGS=1,2,3,4
export CALIPER_RECORD_AUTO_ID=true
export CALIPER_WRITE_TX_NUMBER=10000
export FINAL_OUT_DIR="\${HOME}/OMX_WRITE200_OUT"
export FINAL_OUT_SEARCH_ROOTS="\${PWD} \${HOME} /tmp"

export CALIPER_WORKERS=4
export CALIPER_WRITE_TARGET_TPS=400
export SMOKE_WORKERS=4
export SMOKE_TARGET_TPS=400
export OFFICIAL_WORKERS=4
export OFFICIAL_TARGET_TPS=400

# IMPORTANT: direct official 10-repeat. Do NOT add smoke/sweep flags for this attempt.
mkdir -p "\${HOME}/OMX_WRITE200_OUT"
RUN_MARKER="\${HOME}/OMX_WRITE200_OUT/run-start.marker"
: > "\${RUN_MARKER}"
set +e
scripts/run-offhost-write200-operator.sh 2>&1 | tee "\${HOME}/OMX_WRITE200_OUT/offhost-direct-official.log"
OPERATOR_RC=\${PIPESTATUS[0]}
echo "\${OPERATOR_RC}" | tee "\${HOME}/OMX_WRITE200_OUT/operator.rc"
set -e
echo "operator rc = \${OPERATOR_RC}"

# REQUIRED: collect bundle paths even when the official verifier exits non-zero.
find "\${PWD}" "\${HOME}" /tmp \
  -maxdepth 8 \
  -type f -newer "\${RUN_MARKER}" \
  ! -path "\${PWD}/.omx/evidence/blockchain/full-rerun-audit-*" \
  \( -name 'offhost-write200-return-*.tar.gz' -o -name 'offhost-write200-operator-diagnostics-*.tar.gz' \) \
  -printf '%TY-%Tm-%Td %TH:%TM:%TS %p\n' \
  | sort \
  | tee "\${HOME}/OMX_WRITE200_OUT/found-bundles.txt"

while read -r _ _ path; do
  [ -f "\${path}" ] && cp -v "\${path}" "\${HOME}/OMX_WRITE200_OUT/"
done < "\${HOME}/OMX_WRITE200_OUT/found-bundles.txt"

find "\${PWD}" "\${HOME}" /tmp \
  -maxdepth 8 \
  -type f -newer "\${RUN_MARKER}" \
  ! -path "\${PWD}/.omx/evidence/blockchain/full-rerun-audit-*" \
  \( -name 'operator-status.env' -o -name 'summary.env' -o -name 'official-write-verify.env' \) \
  -printf '%TY-%Tm-%Td %TH:%TM:%TS %p\n' \
  | sort \
  | tee "\${HOME}/OMX_WRITE200_OUT/found-status-files.txt"

tar -czf "\${HOME}/OMX_WRITE200_OUT_\$(date -u +%Y%m%dT%H%M%SZ).tar.gz" \
  -C "\${HOME}" OMX_WRITE200_OUT

ls -lh "\${HOME}"/OMX_WRITE200_OUT*.tar.gz
exit "\${OPERATOR_RC}"
\`\`\`

## Bring back result

Bring back at least one archive:

1. RETURN_BUNDLE tar.gz — preferred, even if the official verifier fails.
2. DIAGNOSTIC_BUNDLE tar.gz — only if no RETURN_BUNDLE was produced.
3. OMX_WRITE200_OUT_*.tar.gz — required fallback if neither bundle is visible.

Do not bring back only logs. Do not bring back another handoff.

## Active worktree import

\`\`\`bash
scripts/import-latest-offhost-write200-bundle.sh \
  --search-root ${WINDOWS_HOME}/Desktop \
  --search-root ${DESKTOP_DIR} \
  --search-root ${WINDOWS_HOME}/Downloads \
  --search-root ${WINDOWS_HOME}/Documents \
  --max-depth 6 --auto-audit --checkpoint
\`\`\`

Only use OFFHOST_BUNDLE_CONTENT_SCAN=true as a one-shot fallback if the archive
was renamed and canonical filename search cannot find it.

## Guardrails

- Do not run local official write200 on the 8 CPU host.
- Do not use ALLOW_UNDERPOWERED=true for official PASS.
- Do not write/reset/redeploy/sequence live passportchannel.
- Do not run write benchmarks on live passportchannel.
- Do not mark PASS from txmap/CouchDB/ledger-only evidence.
EOF2

  cat > "${latest_pointer}" <<EOF2
# Latest off-host write200 handoff

Created: $(date -Is)

Use this bundle, not older Desktop copies:

${desktop_bundle}

SHA256:

${BUNDLE_SHA256}

Next action:
Run direct official 10-repeat on a stronger host. Do not use smoke/sweep for
the next attempt. See:

${direct_action_card}

Verify this Desktop publication from the active worktree before transfer:

scripts/verify-offhost-write200-desktop-handoff.sh --desktop-dir ${DESKTOP_DIR}
EOF2

  cp "${direct_action_card}" "${runme}"
  cp "${direct_action_card}" "${return_card}"
  cp "${direct_action_card}" "${next_action_card}"
fi

cat > "${one_line_card}" <<EOF2
# Stronger-host one-line official write200 command
# Generated: $(date -Is)
#
# Copy this tar.gz into the stronger-host repo root first:
# ${desktop_bundle}
# SHA256: ${BUNDLE_SHA256}

cd /path/to/bms-blockchain && export ALLOW_UNDERPOWERED=false BENCHMARK_CHANNEL_PROFILE=PassportBenchmarkChannel BENCHMARK_CHANNEL_ORGS=1,2,3,4 BENCHMARK_CC_INSTALL_ORGS=1,2,3,4 && test -f "${bundle_name}" && printf '%s  %s\n' "${BUNDLE_SHA256}" "${bundle_name}" | sha256sum -c - && tar -xzf "${bundle_name}" -C . && sha256sum -c manifest.sha256 && scripts/apply-offhost-write200-overlay.sh && scripts/validate-offhost-write200-handoff.sh && scripts/check-benchmark-host-readiness.sh && scripts/run-stronger-host-direct-official.sh

# Bring back one archive, in priority order:
# 1. offhost-write200-return-*.tar.gz
# 2. offhost-write200-operator-diagnostics-*.tar.gz
# 3. OMX_WRITE200_OUT_*.tar.gz
EOF2

cat > "${current_status_card}" <<EOF2
# Current write200 status and next step
Generated: $(date -Is)

Status: BLOCKED, not complete.
Reason: the active worktree still lacks an official stronger-host 4-org write200 return bundle with CALIPER_RECORD_AUTO_ID=true, CALIPER_WRITE_TX_NUMBER>=10000, and evaluator PASS.

Evidence-aligned official attempt parameters:
- CALIPER_RECORD_AUTO_ID=true
- CALIPER_WRITE_TX_NUMBER=10000
- CALIPER_WORKERS=4
- CALIPER_WRITE_TARGET_TPS=400
- ALLOW_UNDERPOWERED=false
- BENCHMARK_CHANNEL_PROFILE=PassportBenchmarkChannel
- BENCHMARK_CHANNEL_ORGS=1,2,3,4
- BENCHMARK_CC_INSTALL_ORGS=1,2,3,4

Latest handoff bundle to copy to stronger host:
${desktop_bundle}

SHA256:
${BUNDLE_SHA256}

On the stronger host:
1. Copy the tar.gz above into the stronger-host repo root.
2. Open this file for the exact copy/paste command:
${one_line_card}
3. Run the one-line command from the stronger-host repo root.
4. Bring back exactly one archive, priority order:
   - offhost-write200-return-*.tar.gz
   - offhost-write200-operator-diagnostics-*.tar.gz
   - OMX_WRITE200_OUT_*.tar.gz
5. Put that archive into one of these folders on this machine:
   - ${WINDOWS_HOME}/Desktop
   - ${DESKTOP_DIR}
   - ${WINDOWS_HOME}/Downloads
   - ${WINDOWS_HOME}/Documents

Active-worktree import command:
scripts/import-latest-offhost-write200-bundle.sh --search-root ${WINDOWS_HOME}/Desktop --search-root ${DESKTOP_DIR} --search-root ${WINDOWS_HOME}/Downloads --search-root ${WINDOWS_HOME}/Documents --max-depth 6 --auto-audit --checkpoint

Do not call goal complete until the imported return bundle passes the evaluator.
EOF2

{
  echo "STATUS=published"
  echo "STATUS_ENV=${STATUS_ENV}"
  echo "DESKTOP_DIR=${DESKTOP_DIR}"
  echo "PUBLISH_DIR=${publish_dir}"
  echo "DESKTOP_BUNDLE=${desktop_bundle}"
  echo "DESKTOP_BUNDLE_SHA256=${BUNDLE_SHA256}"
  echo "LATEST_POINTER=${latest_pointer}"
  echo "RUNME=${runme}"
  echo "RETURN_NEEDED_CARD=${return_card}"
  echo "NEXT_ACTION_CARD=${next_action_card}"
  echo "ONE_LINE_CARD=${one_line_card}"
  echo "CURRENT_STATUS_CARD=${current_status_card}"
  if [[ "${NEXT_ACTION_MODE}" == "direct-official" ]]; then
    echo "DIRECT_OFFICIAL_NEXT_ACTION_CARD=${DESKTOP_DIR}/DIRECT_OFFICIAL_NEXT_ACTION.txt"
  fi
  echo "BUNDLE_SHA_FILE=${publish_dir}/bundle.sha256"
}
