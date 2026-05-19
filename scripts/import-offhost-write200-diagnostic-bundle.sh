#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT_DIR}"

BUNDLE=""
OUT_DIR=""
CHECKPOINT=false
SLUG="${PERFORMANCE_GOAL_SLUG:-chaincode-hotpath-write200}"

usage() {
  cat <<'USAGE'
Usage:
  scripts/import-offhost-write200-diagnostic-bundle.sh --bundle <diagnostic.tar.gz> [--out-dir <dir>] [--checkpoint]

Safely imports an off-host operator diagnostic bundle. Diagnostic bundles are
produced when the stronger-host operator does not create an official
RETURN_BUNDLE, for example readiness, smoke, cleanup, or sweep blockers.

This script never ingests official write evidence and never calls Codex
update_goal. With --checkpoint it records a blocked performance-goal checkpoint
only.
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
    --checkpoint)
      CHECKPOINT=true
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
  echo "Diagnostic bundle does not exist: ${BUNDLE}" >&2
  exit 2
fi

BUNDLE="$(cd "$(dirname "${BUNDLE}")" && pwd)/$(basename "${BUNDLE}")"
TS="$(date +%Y%m%dT%H%M%S%Z)"
BUNDLE_STEM="$(basename "${BUNDLE}" .tar.gz)"
if [[ -z "${OUT_DIR}" ]]; then
  OUT_DIR=".omx/evidence/blockchain/${SLUG}/imported-diagnostic-${BUNDLE_STEM}-${TS}"
fi
mkdir -p "${OUT_DIR}"
OUT_DIR="$(cd "${OUT_DIR}" && pwd)"
STATUS_ENV="${OUT_DIR}/diagnostic-import-status.env"
EXTRACT_LOG="${OUT_DIR}/extract.log"
CHECKPOINT_LOG="${OUT_DIR}/checkpoint.log"
CHECKPOINT_RC="not_run"

# Reject path traversal, symlink/hardlink, and special-file members before
# writing only regular files/directories under OUT_DIR.
python3 scripts/safe-tar-extract.py --bundle "${BUNDLE}" --dest "${OUT_DIR}" > "${EXTRACT_LOG}" 2>&1

OPERATOR_STATUS="$(find "${OUT_DIR}" -type f -name operator-status.env | sort | head -1)"
if [[ -z "${OPERATOR_STATUS}" || ! -f "${OPERATOR_STATUS}" ]]; then
  echo "operator-status.env missing after extraction: ${OUT_DIR}" >&2
  exit 2
fi

value() {
  local key=$1
  grep -E "^${key}=" "${OPERATOR_STATUS}" | tail -1 | cut -d= -f2- || true
}

OPERATOR_BASE="$(value BASE)"
OPERATOR_STATUS_VALUE="$(value STATUS)"
HOST_READINESS_RC="$(value HOST_READINESS_RC)"
SMOKE_RC="$(value SMOKE_RC)"
SMOKE_CLEANUP_RC="$(value SMOKE_CLEANUP_RC)"
SWEEP_RC="$(value SWEEP_RC)"
OFFICIAL_RC="$(value OFFICIAL_RC)"
PACKAGE_RC="$(value PACKAGE_RC)"
RETURN_BUNDLE_VALUE="$(value RETURN_BUNDLE)"
DIAGNOSTIC_BUNDLE_VALUE="$(value DIAGNOSTIC_BUNDLE)"
SWEEP_RESULTS_VALUE="$(value SWEEP_RESULTS_CSV)"

if [[ -n "${RETURN_BUNDLE_VALUE}" ]]; then
  echo "This diagnostic bundle references a RETURN_BUNDLE. Import the official return bundle with scripts/import-offhost-write200-return-bundle.sh instead." >&2
  exit 2
fi

if [[ "${CHECKPOINT}" == "true" ]]; then
  set +e
  omx performance-goal checkpoint \
    --slug "${SLUG}" \
    --status blocked \
    --evidence "imported off-host diagnostic bundle ${BUNDLE}; status=${OPERATOR_STATUS_VALUE}; host_rc=${HOST_READINESS_RC}; smoke_rc=${SMOKE_RC}; smoke_cleanup_rc=${SMOKE_CLEANUP_RC}; sweep_rc=${SWEEP_RC}; official_rc=${OFFICIAL_RC}; package_rc=${PACKAGE_RC}; out=${OUT_DIR}" \
    --json > "${CHECKPOINT_LOG}" 2>&1
  CHECKPOINT_RC=$?
  set -e
fi

{
  echo "BUNDLE=${BUNDLE}"
  echo "OUT_DIR=${OUT_DIR}"
  echo "OPERATOR_STATUS=${OPERATOR_STATUS}"
  echo "OPERATOR_BASE=${OPERATOR_BASE}"
  echo "STATUS=${OPERATOR_STATUS_VALUE}"
  echo "HOST_READINESS_RC=${HOST_READINESS_RC}"
  echo "SMOKE_RC=${SMOKE_RC}"
  echo "SMOKE_CLEANUP_RC=${SMOKE_CLEANUP_RC}"
  echo "SWEEP_RC=${SWEEP_RC}"
  echo "OFFICIAL_RC=${OFFICIAL_RC}"
  echo "PACKAGE_RC=${PACKAGE_RC}"
  echo "DIAGNOSTIC_BUNDLE_RECORDED=${DIAGNOSTIC_BUNDLE_VALUE}"
  echo "SWEEP_RESULTS_CSV_RECORDED=${SWEEP_RESULTS_VALUE}"
  echo "EXTRACT_LOG=${EXTRACT_LOG}"
  echo "CHECKPOINT_REQUESTED=${CHECKPOINT}"
  echo "CHECKPOINT_LOG=${CHECKPOINT_LOG}"
  echo "CHECKPOINT_RC=${CHECKPOINT_RC}"
  echo "IMPORT_KIND=diagnostic_only_not_official_pass"
} > "${STATUS_ENV}"

cat "${STATUS_ENV}"

if [[ "${CHECKPOINT}" == "true" ]]; then
  exit "${CHECKPOINT_RC}"
fi
