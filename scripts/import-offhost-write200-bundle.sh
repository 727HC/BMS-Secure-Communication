#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT_DIR}"

BUNDLE=""
OUT_DIR=""
CHECKPOINT=false
COMPLETION_AUDIT=""
AUTO_AUDIT=false
RUN_INGEST=true
UPDATE_RESULTS=true
SLUG="${PERFORMANCE_GOAL_SLUG:-chaincode-hotpath-write200}"

usage() {
  cat <<'USAGE'
Usage:
  scripts/import-offhost-write200-bundle.sh --bundle <bundle.tar.gz> [options]

Routes an off-host bundle to the correct guarded importer:
- official RETURN_BUNDLE -> scripts/import-offhost-write200-return-bundle.sh
- diagnostic DIAGNOSTIC_BUNDLE -> scripts/import-offhost-write200-diagnostic-bundle.sh
- portable OMX_WRITE200_OUT fallback -> diagnostic importer (blocked evidence only)
- portable OMX_WRITE200_OUT fallback with a nested return/diagnostic tar ->
  extracts the fallback first, then routes the nested canonical bundle

Options:
  --out-dir <dir>
  --checkpoint
  --completion-audit <audit.md>   official return bundle only
  --auto-audit                   official return bundle only; generate completion audit after extraction
  --no-ingest                    official return bundle only
  --no-update-results            official return bundle only
  --slug <slug>

This script never calls Codex update_goal.
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
    --completion-audit)
      COMPLETION_AUDIT="${2:-}"
      shift 2
      ;;
    --auto-audit)
      AUTO_AUDIT=true
      shift
      ;;
    --no-ingest)
      RUN_INGEST=false
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
  echo "Bundle does not exist: ${BUNDLE}" >&2
  exit 2
fi

BUNDLE="$(cd "$(dirname "${BUNDLE}")" && pwd)/$(basename "${BUNDLE}")"

python3 scripts/safe-tar-extract.py --bundle "${BUNDLE}" --check-only >/dev/null

mapfile -t MEMBERS < <(tar -tzf "${BUNDLE}")
HAS_MANIFEST=false
HAS_REQUIRED=false
HAS_RETURN_README=false
HAS_OPERATOR_STATUS=false
for member in "${MEMBERS[@]}"; do
  normalized="${member#./}"
  case "${normalized}" in
    manifest.sha256) HAS_MANIFEST=true ;;
    required-file-check.json) HAS_REQUIRED=true ;;
    README-return-bundle.md) HAS_RETURN_README=true ;;
    */operator-status.env|operator-status.env) HAS_OPERATOR_STATUS=true ;;
  esac
done

if [[ "$(basename "${BUNDLE}")" == OMX_WRITE200_OUT_*.tar.gz ]]; then
  TS="$(date +%Y%m%dT%H%M%S%Z)"
  FALLBACK_OUT=".omx/evidence/blockchain/${SLUG}/imported-portable-fallback-$(basename "${BUNDLE}" .tar.gz)-${TS}"
  mkdir -p "${FALLBACK_OUT}"
  python3 scripts/safe-tar-extract.py --bundle "${BUNDLE}" --dest "${FALLBACK_OUT}" >/dev/null

  nested_return="$(find "${FALLBACK_OUT}" -type f -name 'offhost-write200-return-*.tar.gz' -printf '%T@ %p\n' | sort -nr | head -1 | cut -d' ' -f2- || true)"
  if [[ -n "${nested_return}" && -f "${nested_return}" ]]; then
    args=(--bundle "${nested_return}" --slug "${SLUG}")
    if [[ -n "${OUT_DIR}" ]]; then
      args+=(--out-dir "${OUT_DIR}")
    fi
    if [[ "${RUN_INGEST}" != "true" ]]; then
      args+=(--no-ingest)
    fi
    if [[ "${UPDATE_RESULTS}" != "true" ]]; then
      args+=(--no-update-results)
    fi
    if [[ "${CHECKPOINT}" == "true" ]]; then
      args+=(--checkpoint)
    fi
    if [[ -n "${COMPLETION_AUDIT}" ]]; then
      args+=(--completion-audit "${COMPLETION_AUDIT}")
    fi
    if [[ "${AUTO_AUDIT}" == "true" ]]; then
      args+=(--auto-audit)
    fi
    echo "BUNDLE_KIND=portable_fallback_nested_official_return"
    echo "PORTABLE_FALLBACK_OUT=${FALLBACK_OUT}"
    echo "NESTED_BUNDLE=${nested_return}"
    exec scripts/import-offhost-write200-return-bundle.sh "${args[@]}"
  fi

  nested_diagnostic="$(find "${FALLBACK_OUT}" -type f -name 'offhost-write200-operator-diagnostics-*.tar.gz' -printf '%T@ %p\n' | sort -nr | head -1 | cut -d' ' -f2- || true)"
  if [[ -n "${nested_diagnostic}" && -f "${nested_diagnostic}" ]]; then
    if [[ "${RUN_INGEST}" != "true" || "${UPDATE_RESULTS}" != "true" || -n "${COMPLETION_AUDIT}" || "${AUTO_AUDIT}" == "true" ]]; then
      echo "Diagnostic bundles do not support --no-ingest, --no-update-results, --completion-audit, or --auto-audit" >&2
      exit 2
    fi
    args=(--bundle "${nested_diagnostic}" --slug "${SLUG}")
    if [[ -n "${OUT_DIR}" ]]; then
      args+=(--out-dir "${OUT_DIR}")
    fi
    if [[ "${CHECKPOINT}" == "true" ]]; then
      args+=(--checkpoint)
    fi
    echo "BUNDLE_KIND=portable_fallback_nested_diagnostic"
    echo "PORTABLE_FALLBACK_OUT=${FALLBACK_OUT}"
    echo "NESTED_BUNDLE=${nested_diagnostic}"
    exec scripts/import-offhost-write200-diagnostic-bundle.sh "${args[@]}"
  fi
fi

if [[ "${HAS_MANIFEST}" == "true" && "${HAS_REQUIRED}" == "true" && "${HAS_RETURN_README}" == "true" ]]; then
  args=(--bundle "${BUNDLE}" --slug "${SLUG}")
  if [[ -n "${OUT_DIR}" ]]; then
    args+=(--out-dir "${OUT_DIR}")
  fi
  if [[ "${RUN_INGEST}" != "true" ]]; then
    args+=(--no-ingest)
  fi
  if [[ "${UPDATE_RESULTS}" != "true" ]]; then
    args+=(--no-update-results)
  fi
  if [[ "${CHECKPOINT}" == "true" ]]; then
    args+=(--checkpoint)
  fi
  if [[ -n "${COMPLETION_AUDIT}" ]]; then
    args+=(--completion-audit "${COMPLETION_AUDIT}")
  fi
  if [[ "${AUTO_AUDIT}" == "true" ]]; then
    args+=(--auto-audit)
  fi
  echo "BUNDLE_KIND=official_return"
  exec scripts/import-offhost-write200-return-bundle.sh "${args[@]}"
fi

if [[ "${HAS_OPERATOR_STATUS}" == "true" ]]; then
  if [[ "${RUN_INGEST}" != "true" || "${UPDATE_RESULTS}" != "true" || -n "${COMPLETION_AUDIT}" || "${AUTO_AUDIT}" == "true" ]]; then
    echo "Diagnostic bundles do not support --no-ingest, --no-update-results, --completion-audit, or --auto-audit" >&2
    exit 2
  fi
  args=(--bundle "${BUNDLE}" --slug "${SLUG}")
  if [[ -n "${OUT_DIR}" ]]; then
    args+=(--out-dir "${OUT_DIR}")
  fi
  if [[ "${CHECKPOINT}" == "true" ]]; then
    args+=(--checkpoint)
  fi
  echo "BUNDLE_KIND=diagnostic"
  exec scripts/import-offhost-write200-diagnostic-bundle.sh "${args[@]}"
fi

echo "Cannot identify off-host bundle kind: ${BUNDLE}" >&2
exit 2
