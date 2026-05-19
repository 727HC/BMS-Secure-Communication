#!/usr/bin/env bash
# Watch for an off-host write200 return/diagnostic bundle and route it safely.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT_DIR}"

INTERVAL="${OFFHOST_BUNDLE_WATCH_INTERVAL:-30}"
TIMEOUT="${OFFHOST_BUNDLE_WATCH_TIMEOUT:-0}"
MAX_DEPTH="${OFFHOST_BUNDLE_SEARCH_MAX_DEPTH:-3}"
CHECKPOINT=true
AUTO_AUDIT=true
DRY_RUN=false
DETACH=false
OUT_DIR=""
SLUG="${PERFORMANCE_GOAL_SLUG:-chaincode-hotpath-write200}"
SEARCH_ROOTS=()

resolve_windows_home() {
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

usage() {
  cat <<'USAGE'
Usage:
  scripts/watch-offhost-write200-bundle.sh [options]

Watches for an off-host write200 RETURN_BUNDLE or DIAGNOSTIC_BUNDLE, then
routes it through scripts/import-latest-offhost-write200-bundle.sh.

Options:
  --search-root <dir>     can be repeated; defaults to Desktop root,
                          Desktop workspace, Downloads, and Documents
                          when present
  --interval <seconds>    default 30
  --timeout <seconds>     default 0 (wait forever)
  --max-depth <n>         default 3
  --no-checkpoint         do not pass --checkpoint to importer
  --no-auto-audit         do not pass --auto-audit to importer
  --out-dir <dir>         pass through to importer
  --slug <slug>           performance-goal slug
  --dry-run               print selected bundle/import command if found
  --detach                run watcher in a detached session and print status

Behavior:
  - official return bundles are preferred over diagnostics by import-latest
  - diagnostics ignore official-only options such as --auto-audit
  - successful diagnostics are recorded, then the watcher keeps waiting for an
    official return bundle because diagnostics are not PASS evidence
  - in status-card language: diagnostics are blocked evidence; watcher keeps
    waiting for an official RETURN_BUNDLE
  - exact guardrail: keeps waiting for an official RETURN_BUNDLE
  - failed imports stay visible but do not terminate the watcher; the same
    selected bundle is retried only after its size/mtime changes
  - set OFFHOST_BUNDLE_EXHAUSTIVE_SCAN=true to scan all Desktop subdirectories
    within --max-depth instead of only targeted offhost/write200 dirs
  - set OFFHOST_BUNDLE_CONTENT_SCAN=true to detect renamed official return
    bundles by archive contents; renamed diagnostics are not auto-imported
  - this script never calls Codex update_goal
  - detached mode writes watch-status.env under the watch evidence directory
USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --search-root) SEARCH_ROOTS+=("${2:-}"); shift 2 ;;
    --interval) INTERVAL="${2:-}"; shift 2 ;;
    --timeout) TIMEOUT="${2:-}"; shift 2 ;;
    --max-depth) MAX_DEPTH="${2:-}"; shift 2 ;;
    --no-checkpoint) CHECKPOINT=false; shift ;;
    --no-auto-audit) AUTO_AUDIT=false; shift ;;
    --out-dir) OUT_DIR="${2:-}"; shift 2 ;;
    --slug) SLUG="${2:-}"; shift 2 ;;
    --dry-run) DRY_RUN=true; shift ;;
    --detach) DETACH=true; shift ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown argument: $1" >&2; usage >&2; exit 2 ;;
  esac
done

if [[ ${#SEARCH_ROOTS[@]} -eq 0 ]]; then
  if [[ -n "${OFFHOST_BUNDLE_SEARCH_ROOTS:-}" ]]; then
    # shellcheck disable=SC2206
    SEARCH_ROOTS=(${OFFHOST_BUNDLE_SEARCH_ROOTS})
  elif [[ -n "${OFFHOST_BUNDLE_SEARCH_ROOT:-}" ]]; then
    SEARCH_ROOTS=("${OFFHOST_BUNDLE_SEARCH_ROOT}")
  else
    windows_home="$(resolve_windows_home)"
    default_roots=()
    if [[ -n "${windows_home}" ]]; then
      default_roots=(
        "${windows_home}/Desktop"
        "${windows_home}/Desktop/OMX_WRITE200_WORKSPACE"
        "${windows_home}/Downloads"
        "${windows_home}/Documents"
      )
    fi
    for default_root in "${default_roots[@]}"; do
      if [[ -d "${default_root}" ]]; then
        SEARCH_ROOTS+=("${default_root}")
      fi
    done
    if [[ ${#SEARCH_ROOTS[@]} -eq 0 ]]; then
      SEARCH_ROOTS=("${ROOT_DIR}")
    fi
  fi
fi

if ! [[ "${INTERVAL}" =~ ^[0-9]+$ ]] || (( INTERVAL < 1 )); then
  echo "ERROR: --interval must be a positive integer" >&2
  exit 2
fi
if ! [[ "${TIMEOUT}" =~ ^[0-9]+$ ]]; then
  echo "ERROR: --timeout must be a non-negative integer" >&2
  exit 2
fi

TS="$(date +%Y%m%dT%H%M%S%Z)"
WATCH_DIR="${OFFHOST_BUNDLE_WATCH_DIR_OVERRIDE:-.omx/evidence/blockchain/${SLUG}/offhost-bundle-watch-${TS}-$$}"
mkdir -p "${WATCH_DIR}"
STATUS_ENV="${WATCH_DIR}/watch-status.env"
WATCH_LOG="${WATCH_DIR}/watch.log"

write_status() {
  local status=$1
  shift || true
  {
    echo "STATUS=${status}"
    echo "PID=$$"
    echo "WATCH_DIR=${WATCH_DIR}"
    echo "ATTEMPTS=${attempt:-0}"
    echo "SEARCH_ROOTS=${SEARCH_ROOTS[*]}"
    echo "INTERVAL=${INTERVAL}"
    echo "TIMEOUT=${TIMEOUT}"
    echo "MAX_DEPTH=${MAX_DEPTH}"
    echo "EXHAUSTIVE_SCAN=$([[ "${OFFHOST_BUNDLE_EXHAUSTIVE_SCAN:-}" =~ ^(1|true|TRUE|yes|YES|on|ON)$ ]] && echo true || echo false)"
    echo "CONTENT_SCAN=$([[ "${OFFHOST_BUNDLE_CONTENT_SCAN:-}" =~ ^(1|true|TRUE|yes|YES|on|ON)$ ]] && echo true || echo false)"
    echo "LOG=${WATCH_LOG}"
    echo "UPDATED_AT=$(date -Is)"
    for line in "$@"; do
      echo "${line}"
    done
  } > "${STATUS_ENV}"
}

if [[ "${DETACH}" == "true" ]]; then
  child_args=(--interval "${INTERVAL}" --timeout "${TIMEOUT}" --max-depth "${MAX_DEPTH}" --slug "${SLUG}")
  for search_root in "${SEARCH_ROOTS[@]}"; do
    child_args+=(--search-root "${search_root}")
  done
  [[ "${CHECKPOINT}" != "true" ]] && child_args+=(--no-checkpoint)
  [[ "${AUTO_AUDIT}" != "true" ]] && child_args+=(--no-auto-audit)
  [[ -n "${OUT_DIR}" ]] && child_args+=(--out-dir "${OUT_DIR}")
  [[ "${DRY_RUN}" == "true" ]] && child_args+=(--dry-run)

  DETACH_LOG="${WATCH_DIR}/detached-launch.log"
  OFFHOST_BUNDLE_WATCH_DIR_OVERRIDE="${WATCH_DIR}" \
    setsid "$0" "${child_args[@]}" > "${DETACH_LOG}" 2>&1 &
  child_pid=$!
  {
    echo "STATUS=detached"
    echo "PID=${child_pid}"
    echo "WATCH_DIR=${WATCH_DIR}"
    echo "SEARCH_ROOTS=${SEARCH_ROOTS[*]}"
    echo "INTERVAL=${INTERVAL}"
    echo "TIMEOUT=${TIMEOUT}"
    echo "MAX_DEPTH=${MAX_DEPTH}"
    echo "EXHAUSTIVE_SCAN=$([[ "${OFFHOST_BUNDLE_EXHAUSTIVE_SCAN:-}" =~ ^(1|true|TRUE|yes|YES|on|ON)$ ]] && echo true || echo false)"
    echo "CONTENT_SCAN=$([[ "${OFFHOST_BUNDLE_CONTENT_SCAN:-}" =~ ^(1|true|TRUE|yes|YES|on|ON)$ ]] && echo true || echo false)"
    echo "DETACH_LOG=${DETACH_LOG}"
    echo "UPDATED_AT=$(date -Is)"
  } > "${STATUS_ENV}"
  cat "${STATUS_ENV}"
  exit 0
fi

on_exit() {
  local rc=$?
  local current=""
  if [[ -f "${STATUS_ENV}" ]]; then
    current="$(grep -E '^STATUS=' "${STATUS_ENV}" | tail -1 | cut -d= -f2- || true)"
  fi
  if [[ "${rc}" != "0" ]]; then
    case "${current}" in
      timeout_no_bundle|import_failed)
        ;;
      *)
        write_status "exited_unexpected" "RC=${rc}"
        ;;
    esac
  fi
}
trap on_exit EXIT

started_epoch="$(date +%s)"
attempt=0
last_status=""
last_failed_selection_sig=""
imported_diagnostic_sigs="${WATCH_DIR}/imported-diagnostic-signatures.txt"
echo "[watch] started $(date -Is) pid=$$" >> "${WATCH_LOG}"
write_status "running" "ELAPSED_SECONDS=0" "LAST_STATUS="
touch "${imported_diagnostic_sigs}"

selection_signature() {
  local selected=$1
  if [[ -n "${selected}" && -f "${selected}" ]]; then
    stat -c '%n|%s|%Y' "${selected}" 2>/dev/null || printf '%s|missing\n' "${selected}"
  else
    printf '%s|missing\n' "${selected}"
  fi
}

while true; do
  attempt=$((attempt + 1))
  attempt_log="${WATCH_DIR}/attempt-${attempt}.log"
  now="$(date +%s)"
  elapsed=$(( now - started_epoch ))
  write_status "running" "ELAPSED_SECONDS=${elapsed}" "LAST_STATUS=${last_status}" "LAST_ATTEMPT_LOG=${attempt_log}"
  args=(--max-depth "${MAX_DEPTH}" --dry-run --slug "${SLUG}")
  for search_root in "${SEARCH_ROOTS[@]}"; do
    args+=(--search-root "${search_root}")
  done
  [[ "${CHECKPOINT}" == "true" ]] && args+=(--checkpoint)
  [[ "${AUTO_AUDIT}" == "true" ]] && args+=(--auto-audit)
  [[ -n "${OUT_DIR}" ]] && args+=(--out-dir "${OUT_DIR}")

  set +e
  scripts/import-latest-offhost-write200-bundle.sh "${args[@]}" > "${attempt_log}" 2>&1
  rc=$?
  set -e
  last_status="$(grep -E '^STATUS=' "${attempt_log}" | tail -1 | cut -d= -f2- || true)"

  if [[ "${rc}" == "0" ]]; then
    selected="$(grep -E '^SELECTED_BUNDLE=' "${attempt_log}" | tail -1 | cut -d= -f2- || true)"
    kind="$(grep -E '^SELECTED_KIND=' "${attempt_log}" | tail -1 | cut -d= -f2- || true)"
    import_args=(--max-depth "${MAX_DEPTH}" --slug "${SLUG}")
    for search_root in "${SEARCH_ROOTS[@]}"; do
      import_args+=(--search-root "${search_root}")
    done
    [[ "${CHECKPOINT}" == "true" ]] && import_args+=(--checkpoint)
    [[ "${AUTO_AUDIT}" == "true" ]] && import_args+=(--auto-audit)
    [[ -n "${OUT_DIR}" ]] && import_args+=(--out-dir "${OUT_DIR}")
    if [[ "${DRY_RUN}" == "true" ]]; then
      write_status "dry_run_found" \
        "SELECTED_BUNDLE=${selected}" \
        "SELECTED_KIND=${kind}" \
        "IMPORT_COMMAND=scripts/import-latest-offhost-write200-bundle.sh ${import_args[*]}"
      cat "${STATUS_ENV}"
      exit 0
    fi

    import_log="${WATCH_DIR}/import.log"
    selected_sig="$(selection_signature "${selected}")"
    if [[ "${kind}" == "diagnostic" ]] && grep -Fxq "${selected_sig}" "${imported_diagnostic_sigs}"; then
      write_status "diagnostic_imported_waiting_for_official" \
        "SELECTED_BUNDLE=${selected}" \
        "SELECTED_KIND=${kind}" \
        "SELECTED_SIGNATURE=${selected_sig}" \
        "IMPORTED_DIAGNOSTIC_SIGNATURES=${imported_diagnostic_sigs}" \
        "DRY_RUN_LOG=${attempt_log}" \
        "IMPORT_LOG=${import_log}" \
        "ELAPSED_SECONDS=${elapsed}"
      sleep "${INTERVAL}"
      continue
    fi
    if [[ "${selected_sig}" == "${last_failed_selection_sig}" ]]; then
      write_status "import_failed_waiting_for_change" \
        "SELECTED_BUNDLE=${selected}" \
        "SELECTED_KIND=${kind}" \
        "SELECTED_SIGNATURE=${selected_sig}" \
        "DRY_RUN_LOG=${attempt_log}" \
        "IMPORT_LOG=${import_log}" \
        "LAST_STATUS=${last_status}" \
        "ELAPSED_SECONDS=${elapsed}"
      sleep "${INTERVAL}"
      continue
    fi
    set +e
    scripts/import-latest-offhost-write200-bundle.sh "${import_args[@]}" > "${import_log}" 2>&1
    import_rc=$?
    set -e
    if [[ "${import_rc}" == "0" ]]; then
      if [[ "${kind}" == "diagnostic" ]]; then
        grep -Fxq "${selected_sig}" "${imported_diagnostic_sigs}" || echo "${selected_sig}" >> "${imported_diagnostic_sigs}"
        write_status "diagnostic_imported_waiting_for_official" \
          "SELECTED_BUNDLE=${selected}" \
          "SELECTED_KIND=${kind}" \
          "SELECTED_SIGNATURE=${selected_sig}" \
          "IMPORTED_DIAGNOSTIC_SIGNATURES=${imported_diagnostic_sigs}" \
          "DRY_RUN_LOG=${attempt_log}" \
          "IMPORT_LOG=${import_log}" \
          "IMPORT_RC=${import_rc}" \
          "ELAPSED_SECONDS=${elapsed}"
        echo "[watch] diagnostic imported; continuing to wait for official return: sig=${selected_sig}" >> "${WATCH_LOG}"
        sleep "${INTERVAL}"
        continue
      fi
      write_status "imported" \
        "SELECTED_BUNDLE=${selected}" \
        "SELECTED_KIND=${kind}" \
        "SELECTED_SIGNATURE=${selected_sig}" \
        "DRY_RUN_LOG=${attempt_log}" \
        "IMPORT_LOG=${import_log}" \
        "IMPORT_RC=${import_rc}"
      cat "${STATUS_ENV}"
      exit 0
    fi
    last_failed_selection_sig="${selected_sig}"
    write_status "import_failed_waiting_for_change" \
      "SELECTED_BUNDLE=${selected}" \
      "SELECTED_KIND=${kind}" \
      "SELECTED_SIGNATURE=${selected_sig}" \
      "DRY_RUN_LOG=${attempt_log}" \
      "IMPORT_LOG=${import_log}" \
      "IMPORT_RC=${import_rc}" \
      "ELAPSED_SECONDS=${elapsed}"
    echo "[watch] import failed; waiting for selected bundle to change: rc=${import_rc} sig=${selected_sig}" >> "${WATCH_LOG}"
  else
    # Keep watch-status.env current immediately after every unsuccessful scan.
    # Without this, detached users only see LAST_STATUS from the next loop
    # iteration, which can look stale for up to --interval seconds.
    write_status "running" \
      "ELAPSED_SECONDS=${elapsed}" \
      "LAST_STATUS=${last_status:-import_scan_no_status}" \
      "LAST_ATTEMPT_LOG=${attempt_log}" \
      "IMPORT_SCAN_RC=${rc}"
  fi

  if (( TIMEOUT > 0 && elapsed >= TIMEOUT )); then
    write_status "timeout_no_bundle" \
      "ELAPSED_SECONDS=${elapsed}" \
      "LAST_STATUS=${last_status}" \
      "LAST_ATTEMPT_LOG=${attempt_log}"
    cat "${STATUS_ENV}"
    exit 1
  fi
  sleep "${INTERVAL}"
done
