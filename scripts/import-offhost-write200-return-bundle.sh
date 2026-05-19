#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT_DIR}"

BUNDLE=""
OUT_DIR=""
RUN_INGEST=true
CHECKPOINT=false
COMPLETION_AUDIT=""
AUTO_AUDIT=false
UPDATE_RESULTS=true
SLUG="${PERFORMANCE_GOAL_SLUG:-chaincode-hotpath-write200}"

usage() {
  cat <<'USAGE'
Usage:
  scripts/import-offhost-write200-return-bundle.sh --bundle <return.tar.gz> [--out-dir <dir>] [--no-ingest]
  scripts/import-offhost-write200-return-bundle.sh --bundle <return.tar.gz> --checkpoint --auto-audit
  scripts/import-offhost-write200-return-bundle.sh --bundle <return.tar.gz> --checkpoint --completion-audit <audit.md>

Safely imports a stronger-host official write200 return bundle into the active
performance-goal worktree.

Actions:
  1. Extracts the return bundle into an isolated import directory.
  2. Verifies manifest.sha256 from inside that import directory.
  3. Checks required-file-check.json and locates the evidence directory.
  4. Runs scripts/ingest-offhost-write200-evidence.sh unless --no-ingest is set.

This script never calls Codex update_goal. A pass checkpoint is still guarded by
scripts/ingest-offhost-write200-evidence.sh and requires --completion-audit.
Use --auto-audit to generate that completion audit against the imported evidence
after the first ingest/update-results pass and before checkpointing.
USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --bundle)
      BUNDLE="${2:-}"
      shift 2
      ;;
    --out-dir)
      OUT_DIR="${2:-}"
      shift 2
      ;;
    --no-ingest)
      RUN_INGEST=false
      shift
      ;;
    --checkpoint)
      CHECKPOINT=true
      shift
      ;;
    --completion-audit)
      COMPLETION_AUDIT="${2:-}"
      shift 2
      ;;
    --auto-audit)
      AUTO_AUDIT=true
      shift
      ;;
    --no-update-results)
      UPDATE_RESULTS=false
      shift
      ;;
    --slug)
      SLUG="${2:-}"
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

if [[ -z "${BUNDLE}" ]]; then
  echo "--bundle is required" >&2
  usage >&2
  exit 2
fi
if [[ ! -f "${BUNDLE}" ]]; then
  echo "Return bundle does not exist: ${BUNDLE}" >&2
  exit 2
fi
if [[ "${CHECKPOINT}" == "true" && -z "${COMPLETION_AUDIT}" && "${AUTO_AUDIT}" != "true" ]]; then
  echo "--checkpoint requires --completion-audit <audit.md> or --auto-audit" >&2
  exit 2
fi
if [[ -n "${COMPLETION_AUDIT}" && ! -f "${COMPLETION_AUDIT}" ]]; then
  echo "Completion audit file does not exist: ${COMPLETION_AUDIT}" >&2
  exit 2
fi
if [[ "${AUTO_AUDIT}" == "true" && "${RUN_INGEST}" != "true" ]]; then
  echo "--auto-audit requires ingest; remove --no-ingest" >&2
  exit 2
fi
if [[ "${AUTO_AUDIT}" == "true" && "${UPDATE_RESULTS}" != "true" ]]; then
  echo "--auto-audit requires updating latest-results.env; remove --no-update-results" >&2
  exit 2
fi

BUNDLE="$(cd "$(dirname "${BUNDLE}")" && pwd)/$(basename "${BUNDLE}")"
TS="$(date +%Y%m%dT%H%M%S%Z)"
BUNDLE_STEM="$(basename "${BUNDLE}" .tar.gz)"
if [[ -z "${OUT_DIR}" ]]; then
  OUT_DIR=".omx/evidence/blockchain/${SLUG}/imported-${BUNDLE_STEM}-${TS}"
fi
mkdir -p "${OUT_DIR}"
OUT_DIR="$(cd "${OUT_DIR}" && pwd)"
STATUS_ENV="${OUT_DIR}/import-status.env"
EXTRACT_LOG="${OUT_DIR}/extract.log"
MANIFEST_CHECK_LOG="${OUT_DIR}/manifest-check.log"
PEER_HEIGHT_CHECK_JSON="${OUT_DIR}/peer-height-evidence-check.json"
INGEST_STATUS_ENV=""
INGEST_RC="not_run"
AUTO_AUDIT_DIR=""
AUTO_AUDIT_RC="not_run"
CHECKPOINT_INGEST_LOG=""
CHECKPOINT_INGEST_RC="not_run"

# Reject path traversal, symlink/hardlink, and special-file members before
# writing only regular files/directories under OUT_DIR.
python3 scripts/safe-tar-extract.py --bundle "${BUNDLE}" --dest "${OUT_DIR}" > "${EXTRACT_LOG}" 2>&1

if [[ ! -f "${OUT_DIR}/manifest.sha256" ]]; then
  echo "manifest.sha256 missing after extraction: ${OUT_DIR}" >&2
  exit 2
fi
(
  cd "${OUT_DIR}"
  sha256sum -c manifest.sha256
) > "${MANIFEST_CHECK_LOG}" 2>&1

if [[ ! -f "${OUT_DIR}/required-file-check.json" ]]; then
  echo "required-file-check.json missing after extraction: ${OUT_DIR}" >&2
  exit 2
fi

EVIDENCE_NAME="$(python3 - "${OUT_DIR}/manifest.sha256" "${OUT_DIR}/required-file-check.json" <<'PY'
import json
import sys
from pathlib import Path
manifest = Path(sys.argv[1])
required = Path(sys.argv[2])
roots = []
for raw in manifest.read_text(errors='replace').splitlines():
    parts = raw.split(None, 1)
    if len(parts) == 2 and '/' in parts[1]:
        roots.append(parts[1].split('/', 1)[0])
roots = sorted(set(roots))
if len(roots) == 1:
    print(roots[0])
    raise SystemExit(0)
data = json.loads(required.read_text())
evidence = Path(data.get('evidenceDir', ''))
if evidence.name:
    print(evidence.name)
    raise SystemExit(0)
raise SystemExit('cannot locate evidence directory from manifest/required-file-check')
PY
)"
EVIDENCE_DIR="${OUT_DIR}/${EVIDENCE_NAME}"
if [[ ! -d "${EVIDENCE_DIR}" ]]; then
  echo "Evidence directory not found after extraction: ${EVIDENCE_DIR}" >&2
  exit 2
fi

REQUIRED_OK="$(python3 - "${OUT_DIR}/required-file-check.json" <<'PY'
import json, sys
from pathlib import Path
data=json.loads(Path(sys.argv[1]).read_text())
print('true' if data.get('ok') is True and not data.get('missing') else 'false')
PY
)"
if [[ "${REQUIRED_OK}" != "true" ]]; then
  echo "required-file-check.json is not ok: ${OUT_DIR}/required-file-check.json" >&2
  exit 2
fi

python3 - "${OUT_DIR}/required-file-check.json" "${EVIDENCE_DIR}" "${PEER_HEIGHT_CHECK_JSON}" <<'PY'
import glob
import json
import sys
from pathlib import Path

required_path = Path(sys.argv[1])
evidence = Path(sys.argv[2])
out = Path(sys.argv[3])
required = json.loads(required_path.read_text())
log = evidence / "peer-heights.log"
jsons = sorted(glob.glob(str(evidence / "peer-heights-*.json")))
declared_count = required.get("peerHeightJsonCount")
failures = []
if not log.is_file():
    failures.append("peer-heights.log missing")
if len(jsons) < 1:
    failures.append("peer-heights-*.json missing")
if declared_count is not None:
    try:
        if int(declared_count) < 1:
            failures.append(f"required-file-check peerHeightJsonCount {declared_count} < 1")
    except Exception:
        failures.append(f"required-file-check peerHeightJsonCount is not numeric: {declared_count!r}")

payload = {
    "evidenceDir": str(evidence),
    "ok": not failures,
    "peerHeightsLog": str(log),
    "peerHeightJsonCount": len(jsons),
    "declaredPeerHeightJsonCount": declared_count,
    "peerHeightJsons": jsons,
    "failures": failures,
}
out.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n")
if failures:
    print("; ".join(failures), file=sys.stderr)
    raise SystemExit(2)
PY

if [[ "${RUN_INGEST}" == "true" ]]; then
  ingest_args=(--evidence-dir "${EVIDENCE_DIR}" --slug "${SLUG}")
  if [[ "${UPDATE_RESULTS}" != "true" ]]; then
    ingest_args+=(--no-update-results)
  fi
  if [[ "${CHECKPOINT}" == "true" && "${AUTO_AUDIT}" != "true" ]]; then
    ingest_args+=(--checkpoint --completion-audit "${COMPLETION_AUDIT}")
  fi
  set +e
  scripts/ingest-offhost-write200-evidence.sh "${ingest_args[@]}" > "${OUT_DIR}/ingest.log" 2>&1
  INGEST_RC=$?
  set -e
  INGEST_STATUS_ENV="$(grep -E '^EVIDENCE_DIR=' "${OUT_DIR}/ingest.log" >/dev/null 2>&1 && awk -F= '/^EVIDENCE_DIR=/{print FILENAME}' "${OUT_DIR}/ingest.log" || true)"
fi

if [[ "${AUTO_AUDIT}" == "true" ]]; then
  AUTO_AUDIT_DIR="${OUT_DIR}/completion-audit"
  set +e
  scripts/audit-performance-goal-completion.sh \
    --official-evidence-dir "${EVIDENCE_DIR}" \
    --out-dir "${AUTO_AUDIT_DIR}" \
    --slug "${SLUG}" \
    > "${OUT_DIR}/completion-audit.log" 2>&1
  AUTO_AUDIT_RC=$?
  set -e
  if [[ -f "${AUTO_AUDIT_DIR}/completion-audit.md" ]]; then
    COMPLETION_AUDIT="${AUTO_AUDIT_DIR}/completion-audit.md"
  fi
fi

if [[ "${CHECKPOINT}" == "true" && "${AUTO_AUDIT}" == "true" ]]; then
  CHECKPOINT_INGEST_LOG="${OUT_DIR}/ingest-checkpoint.log"
  checkpoint_ingest_args=(--evidence-dir "${EVIDENCE_DIR}" --slug "${SLUG}" --no-update-results --checkpoint --completion-audit "${COMPLETION_AUDIT}")
  set +e
  scripts/ingest-offhost-write200-evidence.sh "${checkpoint_ingest_args[@]}" > "${CHECKPOINT_INGEST_LOG}" 2>&1
  CHECKPOINT_INGEST_RC=$?
  set -e
fi

{
  echo "BUNDLE=${BUNDLE}"
  echo "OUT_DIR=${OUT_DIR}"
  echo "EVIDENCE_DIR=${EVIDENCE_DIR}"
  echo "EXTRACT_LOG=${EXTRACT_LOG}"
  echo "MANIFEST_CHECK_LOG=${MANIFEST_CHECK_LOG}"
  echo "REQUIRED_FILE_CHECK=${OUT_DIR}/required-file-check.json"
  echo "PEER_HEIGHT_CHECK_JSON=${PEER_HEIGHT_CHECK_JSON}"
  echo "RUN_INGEST=${RUN_INGEST}"
  echo "INGEST_LOG=${OUT_DIR}/ingest.log"
  echo "INGEST_RC=${INGEST_RC}"
  echo "CHECKPOINT_REQUESTED=${CHECKPOINT}"
  echo "CHECKPOINT_INGEST_LOG=${CHECKPOINT_INGEST_LOG}"
  echo "CHECKPOINT_INGEST_RC=${CHECKPOINT_INGEST_RC}"
  echo "AUTO_AUDIT=${AUTO_AUDIT}"
  echo "AUTO_AUDIT_DIR=${AUTO_AUDIT_DIR}"
  echo "AUTO_AUDIT_RC=${AUTO_AUDIT_RC}"
  echo "COMPLETION_AUDIT=${COMPLETION_AUDIT}"
  if [[ "${RUN_INGEST}" == "true" ]]; then
    if [[ "${INGEST_RC}" != "0" ]]; then
      echo "STATUS=imported_ingest_not_pass"
    elif [[ "${AUTO_AUDIT}" == "true" && "${AUTO_AUDIT_RC}" != "0" ]]; then
      echo "STATUS=imported_ingested_audit_not_pass"
    elif [[ "${CHECKPOINT}" == "true" && "${AUTO_AUDIT}" == "true" && "${CHECKPOINT_INGEST_RC}" != "0" ]]; then
      echo "STATUS=imported_ingested_checkpoint_not_pass"
    else
      echo "STATUS=imported_and_ingested_pass"
    fi
  else
    echo "STATUS=imported_verified_no_ingest"
  fi
} > "${STATUS_ENV}"

cat "${STATUS_ENV}"

if [[ "${RUN_INGEST}" == "true" ]]; then
  if [[ "${INGEST_RC}" != "0" ]]; then
    exit "${INGEST_RC}"
  fi
  if [[ "${AUTO_AUDIT}" == "true" && "${AUTO_AUDIT_RC}" != "0" ]]; then
    exit "${AUTO_AUDIT_RC}"
  fi
  if [[ "${CHECKPOINT}" == "true" && "${AUTO_AUDIT}" == "true" && "${CHECKPOINT_INGEST_RC}" != "0" ]]; then
    exit "${CHECKPOINT_INGEST_RC}"
  fi
  exit 0
fi
