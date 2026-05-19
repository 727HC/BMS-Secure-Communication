#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT_DIR}"

EVIDENCE_DIR=""
OUT_DIR=""
OPERATOR_DIR=""

usage() {
  cat <<'USAGE'
Usage:
  scripts/create-offhost-write200-return-bundle.sh --evidence-dir <dir> [--out-dir <dir>] [--operator-dir <dir>]

Packages a completed stronger-host official write200 evidence directory for
transfer back to the active performance-goal worktree.

The return bundle includes the full evidence directory, optional operator
context sidecars, a required-file check, sha256 manifest, and a README with the
ingest command. It does not call Codex update_goal and does not record OMX
checkpoints.
USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --evidence-dir)
      EVIDENCE_DIR="${2:-}"
      shift 2
      ;;
    --out-dir)
      OUT_DIR="${2:-}"
      shift 2
      ;;
    --operator-dir)
      OPERATOR_DIR="${2:-}"
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

if [[ -z "${EVIDENCE_DIR}" ]]; then
  echo "--evidence-dir is required" >&2
  usage >&2
  exit 2
fi
if [[ ! -d "${EVIDENCE_DIR}" ]]; then
  echo "Evidence directory does not exist: ${EVIDENCE_DIR}" >&2
  exit 2
fi

EVIDENCE_DIR="$(cd "${EVIDENCE_DIR}" && pwd)"
if [[ -n "${OPERATOR_DIR}" ]]; then
  if [[ ! -d "${OPERATOR_DIR}" ]]; then
    echo "Operator context directory does not exist: ${OPERATOR_DIR}" >&2
    exit 2
  fi
  OPERATOR_DIR="$(cd "${OPERATOR_DIR}" && pwd)"
fi
EVIDENCE_NAME="$(basename "${EVIDENCE_DIR}")"
TS="$(date +%Y%m%dT%H%M%S%Z)"
if [[ -z "${OUT_DIR}" ]]; then
  OUT_DIR="$(dirname "${EVIDENCE_DIR}")/return-bundle-${EVIDENCE_NAME}-${TS}"
fi
mkdir -p "${OUT_DIR}"
OUT_DIR="$(cd "${OUT_DIR}" && pwd)"
MANIFEST="${OUT_DIR}/manifest.sha256"
README="${OUT_DIR}/README-return-bundle.md"
BUNDLE="${OUT_DIR}/offhost-write200-return-${EVIDENCE_NAME}-${TS}.tar.gz"
STATUS_ENV="${OUT_DIR}/return-bundle-status.env"

REQUIRED=(
  launch.env
  effective-config.env
  host-readiness.json
  host-readiness.log
  final-status.env
  summary.env
  summary.json
  repeat-results.csv
  ledger-reconciliation.json
  official-write-verify.json
  official-write-verify.env
  official-write-verify.log
  performance-goal-write-result.env
  static-checks.log
  peer-heights.log
)
REQUIRED_GLOBS=(
  "docker-stats-repeat-*.log"
  "iostat-repeat-*.log"
  "pidstat-repeat-*.log"
  "txmap-repeat-summary*.json"
  "ledger-validity*/summary.json"
)
OPERATOR_REQUIRED=()
if [[ -n "${OPERATOR_DIR}" ]]; then
  OPERATOR_REQUIRED=(
	    operator-status.env
	    workload-sequence-selftest.log
	    handoff-readiness.json
	    handoff-readiness.log
    host-readiness.json
    host-readiness.log
  )
fi

MISSING=()
for rel in "${REQUIRED[@]}"; do
  if [[ ! -f "${EVIDENCE_DIR}/${rel}" ]]; then
    MISSING+=("${rel}")
  fi
done
for pattern in "${REQUIRED_GLOBS[@]}"; do
  shopt -s nullglob
  matches=("${EVIDENCE_DIR}"/${pattern})
  shopt -u nullglob
  if (( ${#matches[@]} == 0 )); then
    MISSING+=("${pattern}")
  fi
done
for rel in "${OPERATOR_REQUIRED[@]}"; do
  if [[ ! -f "${OPERATOR_DIR}/${rel}" ]]; then
    MISSING+=("operator-context/${rel}")
  fi
done

copy_operator_status_for_bundle() {
  local src=$1
  local dst=$2
  grep -Ev '^(PACKAGE_RC|RETURN_STATUS|RETURN_BUNDLE|RETURN_BUNDLE_SHA256|STATUS)=' "${src}" > "${dst}" || true
  {
    echo "PACKAGE_RC=0"
    echo "RETURN_STATUS=${STATUS_ENV}"
    echo "RETURN_BUNDLE=${BUNDLE}"
    echo "RETURN_BUNDLE_SHA256=external_status_file_after_archive_creation"
    echo "STATUS=return_bundle_ready"
    echo "OPERATOR_STATUS_CONTEXT=bundle_packaged_status_snapshot"
    echo "NOTE=This operator-status.env is normalized during return-bundle packaging; use return-bundle-status.env adjacent to the archive for the final BUNDLE_SHA256."
  } >> "${dst}"
}

OPERATOR_CONTEXT_DIR=""
if [[ -n "${OPERATOR_DIR}" && ${#MISSING[@]} -eq 0 ]]; then
  OPERATOR_CONTEXT_DIR="${OUT_DIR}/operator-context"
  mkdir -p "${OPERATOR_CONTEXT_DIR}"
  for rel in "${OPERATOR_REQUIRED[@]}"; do
    if [[ "${rel}" == "operator-status.env" ]]; then
      copy_operator_status_for_bundle "${OPERATOR_DIR}/${rel}" "${OPERATOR_CONTEXT_DIR}/${rel}"
    else
      cp "${OPERATOR_DIR}/${rel}" "${OPERATOR_CONTEXT_DIR}/${rel}"
    fi
  done
  shopt -s nullglob
  for optional in \
    official.log \
    smoke.log \
    smoke-quality-gate.log \
    preofficial.log \
    preofficial-quality-gate.log \
    preofficial-cleanup.log \
    return-bundle.log; do
    if [[ -f "${OPERATOR_DIR}/${optional}" ]]; then
      cp "${OPERATOR_DIR}/${optional}" "${OPERATOR_CONTEXT_DIR}/${optional}"
    fi
  done
  if [[ -d "${OPERATOR_DIR}/sweep" ]]; then
    mkdir -p "${OPERATOR_CONTEXT_DIR}/sweep"
    for optional in sweep-results.csv sweep-recommendation.env sweep-recommendation.json sweep-recommendation.log; do
      if [[ -f "${OPERATOR_DIR}/sweep/${optional}" ]]; then
        cp "${OPERATOR_DIR}/sweep/${optional}" "${OPERATOR_CONTEXT_DIR}/sweep/${optional}"
      fi
    done
  fi
  shopt -u nullglob
fi

shopt -s nullglob
PEER_HEIGHT_JSONS=("${EVIDENCE_DIR}"/peer-heights-*.json)
shopt -u nullglob
if (( ${#PEER_HEIGHT_JSONS[@]} == 0 )); then
  MISSING+=("peer-heights-*.json")
fi

REQUIRED_JSON="${OUT_DIR}/required-file-check.json"
python3 - "${REQUIRED_JSON}" "${EVIDENCE_DIR}" "${#PEER_HEIGHT_JSONS[@]}" "${MISSING[@]}" <<'PY'
import json
import sys
from pathlib import Path
out = Path(sys.argv[1])
evidence = Path(sys.argv[2])
peer_height_json_count = int(sys.argv[3])
missing = sys.argv[4:]
out.write_text(json.dumps({
    "evidenceDir": str(evidence),
    "ok": not missing,
    "missing": missing,
    "peerHeightJsonCount": peer_height_json_count,
    "operatorContextMissing": [item for item in missing if item.startswith("operator-context/")],
}, indent=2))
PY

if (( ${#MISSING[@]} > 0 )); then
  printf 'Missing required evidence file(s):\n' >&2
  printf ' - %s\n' "${MISSING[@]}" >&2
  echo "Required-file check: ${REQUIRED_JSON}" >&2
  exit 2
fi

(
  cd "$(dirname "${EVIDENCE_DIR}")"
  find "${EVIDENCE_NAME}" -type f -print0 | sort -z | xargs -0 sha256sum > "${MANIFEST}"
)
if [[ -n "${OPERATOR_CONTEXT_DIR}" ]]; then
  (
    cd "${OUT_DIR}"
    find operator-context -type f -print0 | sort -z | xargs -0 sha256sum
  ) >> "${MANIFEST}"
fi

CREATED_AT="$(date -Is)"
cat > "${README}" <<'README'
# Off-host write200 return bundle

Created: __CREATED_AT__

## Purpose

Transfer this archive back to the active performance-goal worktree after a stronger-host official write200 run.

## Import on active worktree

From the repo root on the active worktree, prefer the guarded import helper:

```bash
scripts/import-offhost-write200-return-bundle.sh --bundle /path/to/<return-bundle>.tar.gz
```

The helper extracts into an isolated directory, verifies `manifest.sha256`, checks `required-file-check.json`, locates the evidence directory, then runs the ingest verifier/evaluator.
When created by `scripts/run-offhost-write200-operator.sh`, the archive also
	contains `operator-context/` with `operator-status.env`,
	`workload-sequence-selftest.log`, `handoff-readiness.json`,
	`handoff-readiness.log`, `host-readiness.json`, and `host-readiness.log`.
	Those sidecars are audit context only; official PASS still comes from the
	verified evidence directory and evaluator.
The archive also carries `return-bundle-status.env`; its in-archive
`BUNDLE_SHA256` is intentionally a placeholder because the final archive hash is
written to the adjacent external status file after tar creation.

If verifier/evaluator pass, prefer the guarded auto-audit checkpoint path:

```bash
scripts/import-offhost-write200-return-bundle.sh \
  --bundle /path/to/<return-bundle>.tar.gz \
  --auto-audit \
  --checkpoint
```

Or write a completion audit manually first, then:

```bash
scripts/import-offhost-write200-return-bundle.sh \
  --bundle /path/to/<return-bundle>.tar.gz \
  --completion-audit <audit.md> \
  --checkpoint
```

Do not call Codex `update_goal` until the final completion audit covers every hard gate.
README
python3 - "${README}" "${CREATED_AT}" <<'PY'
from pathlib import Path
import sys
p = Path(sys.argv[1])
p.write_text(p.read_text().replace('__CREATED_AT__', sys.argv[2]))
PY

{
  echo "EVIDENCE_DIR=${EVIDENCE_DIR}"
  echo "OUT_DIR=${OUT_DIR}"
  echo "BUNDLE=${BUNDLE}"
  echo "BUNDLE_SHA256=external_status_file_after_archive_creation"
  echo "MANIFEST=${MANIFEST}"
  echo "REQUIRED_FILE_CHECK=${REQUIRED_JSON}"
  echo "README=${README}"
  echo "OPERATOR_DIR=${OPERATOR_DIR}"
  echo "OPERATOR_CONTEXT_DIR=${OPERATOR_CONTEXT_DIR}"
  echo "STATUS=ready_for_return_transfer"
  echo "NOTE=This in-archive status file is written before final archive hashing; use the adjacent external return-bundle-status.env for the final BUNDLE_SHA256."
} > "${STATUS_ENV}"

(
  cd "$(dirname "${EVIDENCE_DIR}")"
  tar_args=("${EVIDENCE_NAME}" -C "${OUT_DIR}" "$(basename "${MANIFEST}")" "$(basename "${README}")" "$(basename "${REQUIRED_JSON}")" "$(basename "${STATUS_ENV}")")
  if [[ -n "${OPERATOR_CONTEXT_DIR}" ]]; then
    tar_args+=("operator-context")
  fi
  tar -czf "${BUNDLE}" "${tar_args[@]}"
)
BUNDLE_SHA256="$(sha256sum "${BUNDLE}" | awk '{print $1}')"

{
  echo "EVIDENCE_DIR=${EVIDENCE_DIR}"
  echo "OUT_DIR=${OUT_DIR}"
  echo "BUNDLE=${BUNDLE}"
  echo "BUNDLE_SHA256=${BUNDLE_SHA256}"
  echo "MANIFEST=${MANIFEST}"
  echo "REQUIRED_FILE_CHECK=${REQUIRED_JSON}"
  echo "README=${README}"
  echo "OPERATOR_DIR=${OPERATOR_DIR}"
  echo "OPERATOR_CONTEXT_DIR=${OPERATOR_CONTEXT_DIR}"
  echo "STATUS=ready_for_return_transfer"
} > "${STATUS_ENV}"

cat "${STATUS_ENV}"
