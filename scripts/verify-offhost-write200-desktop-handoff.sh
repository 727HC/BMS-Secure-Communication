#!/usr/bin/env bash
set -euo pipefail

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
DESKTOP_DIR="${DESKTOP_DIR:-${WINDOWS_HOME}/Desktop/OMX_WRITE200_WORKSPACE}"
SLUG="${PERFORMANCE_GOAL_SLUG:-chaincode-hotpath-write200}"
POINTER=""
RUNME=""
OUT=""

usage() {
  cat <<'USAGE'
Usage:
  scripts/verify-offhost-write200-desktop-handoff.sh [--desktop-dir <dir>] [--out <summary.env>]

Verifies the Desktop workspace off-host write200 handoff publication is
internally consistent:
  - latest pointer exists
  - pointed handoff tar.gz exists
  - pointer SHA matches actual bundle SHA
  - RUN-ME exists and references the same bundle/SHA
  - return-needed card exists and references the same bundle/SHA
  - STRONGER_HOST_NEXT_ACTION.txt exists and references the same bundle/SHA
    with either the smoke/sweep guarded command or an explicit direct-official
    command for one stronger-host 10-repeat attempt
  - CURRENT_WRITE200_STATUS_AND_NEXT_STEP.txt exists and references the same
    bundle/SHA, one-line command card, return archive names, and hard gates
  - published sidecars exist next to the bundle
  - bundle tar.gz contains required smoke-gate/operator files
  - bundle tar.gz contains the current chaincode hot-path patch markers

This script is read-only. It never runs benchmarks, never touches live
passportchannel, and never calls Codex update_goal.
USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --desktop-dir)
      DESKTOP_DIR="${2:-}"
      shift 2
      ;;
    --out)
      OUT="${2:-}"
      shift 2
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

POINTER="${DESKTOP_DIR}/offhost-write200-handoff-LATEST.txt"
RUNME="${DESKTOP_DIR}/offhost-write200-RUN-ME-latest.txt"
RETURN_CARD="${DESKTOP_DIR}/offhost-write200-RETURN-NEEDED-latest.txt"
NEXT_ACTION_CARD="${DESKTOP_DIR}/STRONGER_HOST_NEXT_ACTION.txt"
ONE_LINE_CARD="${DESKTOP_DIR}/RUN_THIS_ON_STRONGER_HOST_ONE_LINE.txt"
CURRENT_STATUS_CARD="${DESKTOP_DIR}/CURRENT_WRITE200_STATUS_AND_NEXT_STEP.txt"
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
if [[ -z "${OUT}" ]]; then
  OUT=".omx/evidence/blockchain/${SLUG}/desktop-handoff-verify-$(date +%Y%m%dT%H%M%S%Z).env"
fi
mkdir -p "$(dirname "${OUT}")"

failures=()
add_failure() {
  failures+=("$1")
}

BUNDLE=""
EXPECTED_SHA=""
if [[ ! -f "${POINTER}" ]]; then
  add_failure "latest pointer missing: ${POINTER}"
else
  mapfile -t parsed < <(python3 - "${POINTER}" <<'PY'
from pathlib import Path
import sys
lines = [line.strip() for line in Path(sys.argv[1]).read_text(errors='replace').splitlines()]
bundle = ''
sha = ''
for i, line in enumerate(lines):
    if line.endswith('.tar.gz') and ('offhost-write200-handoff-' in line):
        bundle = line
    if line == 'SHA256:':
        for next_line in lines[i+1:]:
            if next_line:
                sha = next_line
                break
print(bundle)
print(sha)
PY
)
  BUNDLE="${parsed[0]:-}"
  EXPECTED_SHA="${parsed[1]:-}"
fi

if [[ -z "${BUNDLE}" ]]; then
  add_failure "bundle path missing from latest pointer"
elif [[ ! -f "${BUNDLE}" ]]; then
  add_failure "bundle file missing: ${BUNDLE}"
fi
if [[ -z "${EXPECTED_SHA}" ]]; then
  add_failure "SHA256 missing from latest pointer"
fi

ACTUAL_SHA=""
if [[ -n "${BUNDLE}" && -f "${BUNDLE}" ]]; then
  ACTUAL_SHA="$(sha256sum "${BUNDLE}" | awk '{print $1}')"
  if [[ -n "${EXPECTED_SHA}" && "${ACTUAL_SHA}" != "${EXPECTED_SHA}" ]]; then
    add_failure "bundle sha mismatch: expected ${EXPECTED_SHA}, got ${ACTUAL_SHA}"
  fi
fi

PUBLISH_DIR=""
if [[ -n "${BUNDLE}" ]]; then
  PUBLISH_DIR="$(dirname "${BUNDLE}")"
  for sidecar in manifest.sha256 files.txt manifest-check.log README-offhost-handoff.md bundle-status.env bundle.sha256; do
    if [[ ! -f "${PUBLISH_DIR}/${sidecar}" ]]; then
      add_failure "published sidecar missing: ${PUBLISH_DIR}/${sidecar}"
    fi
  done
fi

if [[ -n "${BUNDLE}" && -f "${BUNDLE}" ]]; then
  bundle_listing="$(mktemp)"
  if tar -tzf "${BUNDLE}" > "${bundle_listing}" 2>/dev/null; then
    for required_member in \
      "scripts/check-benchmark-host-readiness.sh" \
      "scripts/evaluate-write200-smoke-quality-gate.py" \
      "scripts/recommend-write200-sweep-candidate.py" \
      "scripts/run-offhost-write200-operator.sh" \
      "scripts/run-stronger-host-direct-official.sh" \
      "scripts/test-official-write200-verifier-gates.sh" \
      "scripts/validate-offhost-write200-handoff.sh" \
      "scripts/verify-offhost-write200-desktop-handoff.sh" \
	      "caliper-workspace/caliperIds.js" \
	      "chaincode/passport-contract/META-INF/statedb/couchdb/indexes/indexBMUByDIDStatus.json" \
	      "chaincode/passport-contract/META-INF/statedb/couchdb/indexes/indexBMUByPassportTimestamp.json" \
	      "wiki/blockchain/official-write200-offhost-runbook.md"; do
      if ! grep -Fxq "${required_member}" "${bundle_listing}"; then
        add_failure "bundle missing required member: ${required_member}"
      fi
    done

    bundle_extract_dir="$(mktemp -d)"
    if tar -xzf "${BUNDLE}" -C "${bundle_extract_dir}" \
      chaincode/passport-contract/bmu_tx.go \
      caliper-workspace/caliperIds.js \
	      chaincode/passport-contract/helpers.go \
	      chaincode/passport-contract/helpers_test.go \
	      chaincode/passport-contract/META-INF/statedb/couchdb/indexes/indexBMUByDIDStatus.json \
	      chaincode/passport-contract/META-INF/statedb/couchdb/indexes/indexBMUByPassportTimestamp.json \
	      scripts/run-official-write200-audit.sh \
      scripts/run-offhost-write200-operator.sh \
      scripts/run-stronger-host-direct-official.sh \
      scripts/test-official-write200-verifier-gates.sh \
	      2>/dev/null; then
	      for marker in \
	        "chaincode/passport-contract/helpers.go:appendUTCSecondRFC3339" \
	        "chaincode/passport-contract/helpers.go:maxLastFCKeyCacheEntries" \
	        "chaincode/passport-contract/helpers.go:lastFCKeyCacheEntries" \
	        "chaincode/passport-contract/helpers_test.go:TestRecordBMUDataAutoIDUsesGenericMarshalWithoutDuplicateRecordRead" \
	        "caliper-workspace/caliperIds.js:passportIdForIndex" \
	        "caliper-workspace/caliperIds.js:didForIndex" \
	        "chaincode/passport-contract/META-INF/statedb/couchdb/indexes/indexBMUByDIDStatus.json:indexBMUByDIDStatus" \
	        "chaincode/passport-contract/META-INF/statedb/couchdb/indexes/indexBMUByDIDStatus.json:\"fields\": [\"docType\", \"did\", \"status\"]" \
	        "chaincode/passport-contract/META-INF/statedb/couchdb/indexes/indexBMUByPassportTimestamp.json:indexBMUByPassportTimestamp" \
	        "chaincode/passport-contract/META-INF/statedb/couchdb/indexes/indexBMUByPassportTimestamp.json:\"fields\": [\"docType\", \"passportId\", \"timestamp\"]" \
        "scripts/run-official-write200-audit.sh:CALIPER_RECORD_AUTO_ID:-true" \
        "scripts/run-official-write200-audit.sh:CALIPER_WRITE_TX_NUMBER:-10000" \
        "scripts/run-offhost-write200-operator.sh:CALIPER_RECORD_AUTO_ID:-true" \
        "scripts/run-offhost-write200-operator.sh:CALIPER_WRITE_TX_NUMBER=10000" \
        "scripts/run-stronger-host-direct-official.sh:write_portable_operator_status" \
        "scripts/run-stronger-host-direct-official.sh:direct_official_wrapper_fallback" \
        "scripts/run-stronger-host-direct-official.sh:verifier gate selftest failed" \
        "scripts/test-official-write200-verifier-gates.sh:OFFICIAL_WRITE200_VERIFIER_GATES_SELFTEST_STATUS=pass" \
        "scripts/test-official-write200-verifier-gates.sh:bad-ledger"; do
        marker_file="${marker%%:*}"
        marker_phrase="${marker#*:}"
        if ! grep -Fq "${marker_phrase}" "${bundle_extract_dir}/${marker_file}"; then
          add_failure "bundle missing hot-path marker: ${marker}"
        fi
      done
    else
      add_failure "bundle source marker extraction failed: ${BUNDLE}"
    fi
    rm -rf "${bundle_extract_dir}"
  else
    add_failure "bundle tar listing failed: ${BUNDLE}"
  fi
  rm -f "${bundle_listing}"
fi

if [[ ! -f "${RUNME}" ]]; then
  add_failure "RUN-ME missing: ${RUNME}"
else
  if [[ -n "${BUNDLE}" ]] && ! grep -Fq "${BUNDLE}" "${RUNME}"; then
    add_failure "RUN-ME does not reference latest bundle"
  fi
  if [[ -n "${EXPECTED_SHA}" ]] && ! grep -Fq "${EXPECTED_SHA}" "${RUNME}"; then
    add_failure "RUN-ME does not reference latest SHA"
  fi
  if ! grep -Fq "existing checkout" "${RUNME}"; then
    add_failure "RUN-ME missing existing checkout overlay instruction"
  fi
fi

if [[ ! -f "${RETURN_CARD}" ]]; then
  add_failure "return-needed card missing: ${RETURN_CARD}"
else
  if [[ -n "${BUNDLE}" ]] && ! grep -Fq "${BUNDLE}" "${RETURN_CARD}"; then
    add_failure "return-needed card does not reference latest bundle"
  fi
  if [[ -n "${EXPECTED_SHA}" ]] && ! grep -Fq "${EXPECTED_SHA}" "${RETURN_CARD}"; then
    add_failure "return-needed card does not reference latest SHA"
  fi
  for phrase in \
    "RETURN_BUNDLE" \
    "DIAGNOSTIC_BUNDLE" \
    "${DESKTOP_DIR}" \
    "${WINDOWS_HOME}/Downloads" \
    "${WINDOWS_HOME}/Documents" \
    "scripts/import-latest-offhost-write200-bundle.sh" \
    "Do not run write benchmarks on live passportchannel"; do
    if ! grep -Fq "${phrase}" "${RETURN_CARD}"; then
      add_failure "return-needed card missing phrase: ${phrase}"
    fi
  done
fi

if [[ ! -f "${NEXT_ACTION_CARD}" ]]; then
  add_failure "next-action card missing: ${NEXT_ACTION_CARD}"
else
  if [[ -n "${BUNDLE}" ]] && ! grep -Fq "${BUNDLE}" "${NEXT_ACTION_CARD}"; then
    add_failure "next-action card does not reference latest bundle"
  fi
  if [[ -n "${EXPECTED_SHA}" ]] && ! grep -Fq "${EXPECTED_SHA}" "${NEXT_ACTION_CARD}"; then
    add_failure "next-action card does not reference latest SHA"
  fi
  for phrase in \
    "RETURN_BUNDLE" \
    "DIAGNOSTIC_BUNDLE"; do
    if ! grep -Fq "${phrase}" "${NEXT_ACTION_CARD}"; then
      add_failure "next-action card missing phrase: ${phrase}"
    fi
  done
  if grep -Fq "scripts/run-offhost-write200-operator.sh --smoke --sweep-on-smoke-fail" "${NEXT_ACTION_CARD}"; then
    :
  elif { grep -Fxq "scripts/run-offhost-write200-operator.sh" "${NEXT_ACTION_CARD}" \
      || grep -Fq "scripts/run-offhost-write200-operator.sh 2>&1 | tee" "${NEXT_ACTION_CARD}"; } \
    && grep -Fq "direct official" "${NEXT_ACTION_CARD}" \
    && grep -Fq "CALIPER_WORKERS=4" "${NEXT_ACTION_CARD}" \
    && grep -Fq "CALIPER_WRITE_TARGET_TPS=400" "${NEXT_ACTION_CARD}" \
    && grep -Fq "CALIPER_WRITE_TX_NUMBER=10000" "${NEXT_ACTION_CARD}" \
    && grep -Fq "CALIPER_RECORD_AUTO_ID=true" "${NEXT_ACTION_CARD}" \
    && grep -Fq "ALLOW_UNDERPOWERED=false" "${NEXT_ACTION_CARD}" \
    && grep -Fq "BENCHMARK_CHANNEL_ORGS=1,2,3,4" "${NEXT_ACTION_CARD}" \
    && grep -Fq "BENCHMARK_CC_INSTALL_ORGS=1,2,3,4" "${NEXT_ACTION_CARD}" \
    && grep -Fq "OPERATOR_RC" "${NEXT_ACTION_CARD}" \
    && grep -Fq "OMX_WRITE200_OUT_*.tar.gz" "${NEXT_ACTION_CARD}" \
    && ! grep -Eq '^scripts/run-offhost-write200-operator\.sh .*(--smoke|--sweep-on-smoke-fail)' "${NEXT_ACTION_CARD}"; then
    :
  else
    add_failure "next-action card missing recognized smoke/sweep or direct-official operator command"
  fi
fi

if [[ ! -f "${ONE_LINE_CARD}" ]]; then
  add_failure "one-line stronger-host card missing: ${ONE_LINE_CARD}"
else
  if [[ -n "${BUNDLE}" ]] && ! grep -Fq "${BUNDLE}" "${ONE_LINE_CARD}"; then
    add_failure "one-line card does not reference latest bundle"
  fi
  if [[ -n "${EXPECTED_SHA}" ]] && ! grep -Fq "${EXPECTED_SHA}" "${ONE_LINE_CARD}"; then
    add_failure "one-line card does not reference latest SHA"
  fi
  for phrase in \
    "sha256sum -c -" \
    "scripts/apply-offhost-write200-overlay.sh" \
    "scripts/validate-offhost-write200-handoff.sh" \
    "scripts/check-benchmark-host-readiness.sh" \
    "scripts/run-stronger-host-direct-official.sh" \
    "ALLOW_UNDERPOWERED=false" \
    "BENCHMARK_CHANNEL_ORGS=1,2,3,4" \
    "BENCHMARK_CC_INSTALL_ORGS=1,2,3,4" \
    "offhost-write200-return-*.tar.gz" \
    "OMX_WRITE200_OUT_*.tar.gz"; do
    if ! grep -Fq "${phrase}" "${ONE_LINE_CARD}"; then
      add_failure "one-line card missing phrase: ${phrase}"
    fi
  done
fi

if [[ ! -f "${CURRENT_STATUS_CARD}" ]]; then
  add_failure "current status card missing: ${CURRENT_STATUS_CARD}"
else
  if [[ -n "${BUNDLE}" ]] && ! grep -Fq "${BUNDLE}" "${CURRENT_STATUS_CARD}"; then
    add_failure "current status card does not reference latest bundle"
  fi
  if [[ -n "${EXPECTED_SHA}" ]] && ! grep -Fq "${EXPECTED_SHA}" "${CURRENT_STATUS_CARD}"; then
    add_failure "current status card does not reference latest SHA"
  fi
  for phrase in \
    "Status: BLOCKED" \
    "CALIPER_RECORD_AUTO_ID=true" \
    "CALIPER_WRITE_TX_NUMBER>=10000" \
    "ALLOW_UNDERPOWERED=false" \
    "BENCHMARK_CHANNEL_ORGS=1,2,3,4" \
    "BENCHMARK_CC_INSTALL_ORGS=1,2,3,4" \
    "${ONE_LINE_CARD}" \
    "offhost-write200-return-*.tar.gz" \
    "offhost-write200-operator-diagnostics-*.tar.gz" \
    "OMX_WRITE200_OUT_*.tar.gz" \
    "${WINDOWS_HOME}/Downloads" \
    "${WINDOWS_HOME}/Documents" \
    "scripts/import-latest-offhost-write200-bundle.sh" \
    "Do not call goal complete"; do
    if ! grep -Fq "${phrase}" "${CURRENT_STATUS_CARD}"; then
      add_failure "current status card missing phrase: ${phrase}"
    fi
  done
fi

for card in "${POINTER}" "${RUNME}" "${RETURN_CARD}" "${NEXT_ACTION_CARD}" "${ONE_LINE_CARD}" "${CURRENT_STATUS_CARD}"; do
  if [[ -f "${card}" ]] && grep -Fq "OFFHOST_BUNDLE_EXHAUSTIVE_SCAN=true OFFHOST_BUNDLE_CONTENT_SCAN=true" "${card}"; then
    add_failure "card contains heavy default import/watch scan: ${card}"
  fi
done

STATUS="pass"
if (( ${#failures[@]} > 0 )); then
  STATUS="fail"
fi

{
  echo "STATUS=${STATUS}"
  echo "DESKTOP_DIR=${DESKTOP_DIR}"
  echo "POINTER=${POINTER}"
  echo "RUNME=${RUNME}"
  echo "RETURN_CARD=${RETURN_CARD}"
  echo "NEXT_ACTION_CARD=${NEXT_ACTION_CARD}"
  echo "ONE_LINE_CARD=${ONE_LINE_CARD}"
  echo "CURRENT_STATUS_CARD=${CURRENT_STATUS_CARD}"
  echo "BUNDLE=${BUNDLE}"
  echo "EXPECTED_SHA=${EXPECTED_SHA}"
  echo "ACTUAL_SHA=${ACTUAL_SHA}"
  echo "PUBLISH_DIR=${PUBLISH_DIR}"
  echo "FAILURE_COUNT=${#failures[@]}"
  if (( ${#failures[@]} > 0 )); then
    printf 'FAILURES=%s\n' "$(printf '%s | ' "${failures[@]}" | sed 's/ | $//')"
  fi
} > "${OUT}"

cat "${OUT}"
[[ "${STATUS}" == "pass" ]]
