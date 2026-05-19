#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT_DIR}"

SLUG="${PERFORMANCE_GOAL_SLUG:-chaincode-hotpath-write200}"
GOAL_DIR="${ROOT_DIR}/.omx/goals/performance/${SLUG}"
RESULTS_FILE="${PERFORMANCE_GOAL_RESULTS_FILE:-${GOAL_DIR}/latest-results.env}"
EVIDENCE_DIR=""
UPDATE_RESULTS=true
CHECKPOINT=false
COMPLETION_AUDIT=""

usage() {
  cat <<'USAGE'
Usage:
  scripts/ingest-offhost-write200-evidence.sh --evidence-dir <dir> [--checkpoint --completion-audit <audit.md>] [--no-update-results]

Ingests a stronger-host official write200 evidence bundle produced by
scripts/run-official-write200-audit.sh.

Actions:
  1. Re-runs scripts/verify-official-write200-evidence.sh against the bundle.
  2. Appends <evidence>/performance-goal-write-result.env to the performance-goal latest-results.env.
  3. Runs the performance-goal evaluator and stores its log in the evidence dir.
  4. With --checkpoint, records an OMX performance-goal checkpoint matching the validation result.

This script never calls Codex update_goal. A final completion audit is still required
before the active Codex goal can be marked complete. A pass checkpoint is refused
unless --completion-audit points to an existing audit file.

Exit codes:
  0  verifier and evaluator pass
  1  evidence is readable but verifier or evaluator fails
  2  required evidence/goal files are missing or malformed
USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --evidence-dir)
      EVIDENCE_DIR="${2:-}"
      shift 2
      ;;
    --checkpoint)
      CHECKPOINT=true
      shift
      ;;
    --completion-audit)
      COMPLETION_AUDIT="${2:-}"
      shift 2
      ;;
    --no-update-results)
      UPDATE_RESULTS=false
      shift
      ;;
    --slug)
      SLUG="${2:-}"
      GOAL_DIR="${ROOT_DIR}/.omx/goals/performance/${SLUG}"
      RESULTS_FILE="${PERFORMANCE_GOAL_RESULTS_FILE:-${GOAL_DIR}/latest-results.env}"
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
if [[ ! -x "${ROOT_DIR}/scripts/verify-official-write200-evidence.sh" ]]; then
  echo "Missing verifier: scripts/verify-official-write200-evidence.sh" >&2
  exit 2
fi
if [[ ! -x "${GOAL_DIR}/evaluate.sh" && ! -f "${GOAL_DIR}/evaluate.sh" ]]; then
  echo "Missing performance-goal evaluator: ${GOAL_DIR}/evaluate.sh" >&2
  exit 2
fi
if [[ -n "${COMPLETION_AUDIT}" ]]; then
  if [[ ! -f "${COMPLETION_AUDIT}" ]]; then
    echo "Completion audit file does not exist: ${COMPLETION_AUDIT}" >&2
    exit 2
  fi
  COMPLETION_AUDIT="$(cd "$(dirname "${COMPLETION_AUDIT}")" && pwd)/$(basename "${COMPLETION_AUDIT}")"
fi

EVIDENCE_DIR="$(cd "${EVIDENCE_DIR}" && pwd)"
TS="$(date +%Y%m%dT%H%M%S%Z)"
VERIFY_JSON="${EVIDENCE_DIR}/ingest-official-write-verify-${TS}.json"
VERIFY_ENV="${EVIDENCE_DIR}/ingest-official-write-verify-${TS}.env"
VERIFY_LOG="${EVIDENCE_DIR}/ingest-official-write-verify-${TS}.log"
EVALUATOR_LOG="${EVIDENCE_DIR}/performance-goal-evaluator-after-ingest-${TS}.log"
STATUS_ENV="${EVIDENCE_DIR}/ingest-status-${TS}.env"
CHECKPOINT_LOG="${EVIDENCE_DIR}/performance-goal-checkpoint-after-ingest-${TS}.log"
GOAL_WRITE_ENV="${EVIDENCE_DIR}/performance-goal-write-result.env"

set +e
scripts/verify-official-write200-evidence.sh \
  --evidence-dir "${EVIDENCE_DIR}" \
  --output "${VERIFY_JSON}" \
  --env-output "${VERIFY_ENV}" \
  > "${VERIFY_LOG}" 2>&1
VERIFY_RC=$?
set -e

APPEND_STATUS="skipped"
APPEND_RC=0
if [[ "${UPDATE_RESULTS}" == "true" ]]; then
  if [[ "${VERIFY_RC}" != "0" ]]; then
    APPEND_STATUS="skipped_verify_rc_${VERIFY_RC}"
  elif [[ ! -f "${GOAL_WRITE_ENV}" ]]; then
    echo "Missing ${GOAL_WRITE_ENV}; run scripts/run-official-write200-audit.sh from the current wrapper first." >&2
    APPEND_STATUS="missing_goal_write_env"
    APPEND_RC=2
  else
    mkdir -p "$(dirname "${RESULTS_FILE}")"
    {
      echo
      echo "# Official write200 ingest from ${EVIDENCE_DIR} at $(date -Is)"
      cat "${GOAL_WRITE_ENV}"
      echo "OFFICIAL_WRITE_INGEST_EVIDENCE_DIR=${EVIDENCE_DIR}"
      echo "OFFICIAL_WRITE_INGEST_VERIFY_JSON=${VERIFY_JSON}"
      echo "OFFICIAL_WRITE_INGEST_VERIFY_ENV=${VERIFY_ENV}"
      echo "OFFICIAL_WRITE_INGEST_VERIFY_LOG=${VERIFY_LOG}"
      echo "OFFICIAL_WRITE_INGEST_VERIFY_RC=${VERIFY_RC}"
    } >> "${RESULTS_FILE}"
    APPEND_STATUS="appended"
  fi
fi

set +e
bash "${GOAL_DIR}/evaluate.sh" > "${EVALUATOR_LOG}" 2>&1
EVALUATOR_RC=$?
set -e

if (( VERIFY_RC == 0 && APPEND_RC == 0 && EVALUATOR_RC == 0 )); then
  CHECKPOINT_STATUS="pass"
elif (( VERIFY_RC == 2 || APPEND_RC == 2 )); then
  CHECKPOINT_STATUS="blocked"
else
  CHECKPOINT_STATUS="fail"
fi

CHECKPOINT_RC="not_run"
CHECKPOINT_REFUSED_REASON=""
if [[ "${CHECKPOINT}" == "true" ]]; then
  if [[ "${CHECKPOINT_STATUS}" == "pass" && -z "${COMPLETION_AUDIT}" ]]; then
    CHECKPOINT_RC="refused_missing_completion_audit"
    CHECKPOINT_REFUSED_REASON="pass checkpoint requires --completion-audit <existing audit.md>"
    {
      echo "Refused pass checkpoint: ${CHECKPOINT_REFUSED_REASON}"
      echo "EVIDENCE_DIR=${EVIDENCE_DIR}"
      echo "VERIFY_RC=${VERIFY_RC}"
      echo "EVALUATOR_RC=${EVALUATOR_RC}"
    } > "${CHECKPOINT_LOG}"
  elif [[ "${CHECKPOINT_STATUS}" == "pass" ]]; then
    AUDIT_DIR="$(dirname "${COMPLETION_AUDIT}")"
    AUDIT_STATUS=""
    AUDIT_EVIDENCE_MATCH="false"
    AUDIT_EVIDENCE_DETAIL=""
    if [[ -f "${AUDIT_DIR}/completion-audit.env" ]]; then
      AUDIT_STATUS="$(grep -E '^COMPLETION_AUDIT_STATUS=' "${AUDIT_DIR}/completion-audit.env" | tail -1 | cut -d= -f2- || true)"
    fi
    if [[ -f "${AUDIT_DIR}/completion-audit.json" ]]; then
      AUDIT_JSON_STATUS="$(python3 - "${AUDIT_DIR}/completion-audit.json" <<'PY'
import json, sys
from pathlib import Path
try:
    print(json.loads(Path(sys.argv[1]).read_text()).get("status", ""))
except Exception:
    print("")
PY
)"
      if [[ -z "${AUDIT_STATUS}" ]]; then
        AUDIT_STATUS="${AUDIT_JSON_STATUS}"
      fi
      AUDIT_EVIDENCE_DETAIL="$(python3 - "${AUDIT_DIR}/completion-audit.json" "${EVIDENCE_DIR}" <<'PY'
import json, sys
from pathlib import Path
try:
    data = json.loads(Path(sys.argv[1]).read_text())
    audit_evidence = data.get("officialEvidenceDir", "")
    expected = Path(sys.argv[2]).resolve()
    actual = Path(audit_evidence).resolve() if audit_evidence else None
    print(f"expected={expected}; actual={actual}")
    raise SystemExit(0 if actual == expected else 1)
except SystemExit:
    raise
except Exception as exc:
    print(f"error={exc}")
    raise SystemExit(1)
PY
)" && AUDIT_EVIDENCE_MATCH="true" || AUDIT_EVIDENCE_MATCH="false"
    elif grep -q '^PASS —' "${COMPLETION_AUDIT}"; then
      AUDIT_STATUS="pass"
    fi
    if [[ "${AUDIT_STATUS}" != "pass" ]]; then
      CHECKPOINT_RC="refused_nonpassing_completion_audit"
      CHECKPOINT_REFUSED_REASON="pass checkpoint requires a passing completion audit; status=${AUDIT_STATUS:-unknown}"
      {
        echo "Refused pass checkpoint: ${CHECKPOINT_REFUSED_REASON}"
        echo "EVIDENCE_DIR=${EVIDENCE_DIR}"
        echo "VERIFY_RC=${VERIFY_RC}"
        echo "EVALUATOR_RC=${EVALUATOR_RC}"
        echo "COMPLETION_AUDIT=${COMPLETION_AUDIT}"
      } > "${CHECKPOINT_LOG}"
    elif [[ "${AUDIT_EVIDENCE_MATCH}" != "true" ]]; then
      CHECKPOINT_RC="refused_mismatched_completion_audit"
      CHECKPOINT_REFUSED_REASON="pass checkpoint requires completion-audit.json officialEvidenceDir to match ingested evidence; ${AUDIT_EVIDENCE_DETAIL:-missing structured audit json}"
      {
        echo "Refused pass checkpoint: ${CHECKPOINT_REFUSED_REASON}"
        echo "EVIDENCE_DIR=${EVIDENCE_DIR}"
        echo "VERIFY_RC=${VERIFY_RC}"
        echo "EVALUATOR_RC=${EVALUATOR_RC}"
        echo "COMPLETION_AUDIT=${COMPLETION_AUDIT}"
      } > "${CHECKPOINT_LOG}"
    else
      checkpoint_evidence="Ingested off-host official write200 evidence ${EVIDENCE_DIR}; verify_rc=${VERIFY_RC}; evaluator_rc=${EVALUATOR_RC}; verify_json=${VERIFY_JSON}; evaluator_log=${EVALUATOR_LOG}. This does not call Codex update_goal."
      checkpoint_evidence="${checkpoint_evidence} Completion audit: ${COMPLETION_AUDIT}."
      set +e
      omx performance-goal checkpoint \
        --slug "${SLUG}" \
        --status "${CHECKPOINT_STATUS}" \
        --evidence "${checkpoint_evidence}" \
        --json > "${CHECKPOINT_LOG}" 2>&1
      CHECKPOINT_RC=$?
      set -e
    fi
  else
    checkpoint_evidence="Ingested off-host official write200 evidence ${EVIDENCE_DIR}; verify_rc=${VERIFY_RC}; evaluator_rc=${EVALUATOR_RC}; verify_json=${VERIFY_JSON}; evaluator_log=${EVALUATOR_LOG}. This does not call Codex update_goal."
    if [[ -n "${COMPLETION_AUDIT}" ]]; then
      checkpoint_evidence="${checkpoint_evidence} Completion audit: ${COMPLETION_AUDIT}."
    else
      checkpoint_evidence="${checkpoint_evidence} Completion audit is still required before final completion."
    fi
    set +e
    omx performance-goal checkpoint \
      --slug "${SLUG}" \
      --status "${CHECKPOINT_STATUS}" \
      --evidence "${checkpoint_evidence}" \
      --json > "${CHECKPOINT_LOG}" 2>&1
    CHECKPOINT_RC=$?
    set -e
  fi
fi

{
  echo "EVIDENCE_DIR=${EVIDENCE_DIR}"
  echo "VERIFY_JSON=${VERIFY_JSON}"
  echo "VERIFY_ENV=${VERIFY_ENV}"
  echo "VERIFY_LOG=${VERIFY_LOG}"
  echo "VERIFY_RC=${VERIFY_RC}"
  echo "RESULTS_FILE=${RESULTS_FILE}"
  echo "APPEND_STATUS=${APPEND_STATUS}"
  echo "APPEND_RC=${APPEND_RC}"
  echo "EVALUATOR_LOG=${EVALUATOR_LOG}"
  echo "EVALUATOR_RC=${EVALUATOR_RC}"
  echo "CHECKPOINT_STATUS=${CHECKPOINT_STATUS}"
  echo "CHECKPOINT_REQUESTED=${CHECKPOINT}"
  echo "COMPLETION_AUDIT=${COMPLETION_AUDIT}"
  echo "CHECKPOINT_LOG=${CHECKPOINT_LOG}"
  echo "CHECKPOINT_RC=${CHECKPOINT_RC}"
  echo "CHECKPOINT_REFUSED_REASON=${CHECKPOINT_REFUSED_REASON}"
} > "${STATUS_ENV}"

cat "${STATUS_ENV}"

if (( VERIFY_RC == 0 && APPEND_RC == 0 && EVALUATOR_RC == 0 )); then
  if [[ "${CHECKPOINT_RC}" == refused_* ]]; then
    exit 2
  fi
  exit 0
fi
if (( VERIFY_RC == 2 || APPEND_RC == 2 )); then
  exit 2
fi
exit 1
