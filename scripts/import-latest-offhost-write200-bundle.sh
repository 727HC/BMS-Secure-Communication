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
DRY_RUN=false
SLUG="${PERFORMANCE_GOAL_SLUG:-chaincode-hotpath-write200}"
MAX_DEPTH="${OFFHOST_BUNDLE_SEARCH_MAX_DEPTH:-3}"
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

scan_flag() {
  case "${1:-}" in
    1|true|TRUE|yes|YES|on|ON) echo "true" ;;
    *) echo "false" ;;
  esac
}

usage() {
  cat <<'USAGE'
Usage:
  scripts/import-latest-offhost-write200-bundle.sh [--search-root <dir> ...] [--bundle <bundle.tar.gz>] [options]

Finds the newest off-host official return or diagnostic bundle and routes it
through scripts/import-offhost-write200-bundle.sh. Official return bundles are
preferred over diagnostics when both are present; use --bundle to import a
specific diagnostic bundle.

Default search roots, when present:
  - ${WINDOWS_HOME}/Desktop
  - ${WINDOWS_HOME}/Desktop/OMX_WRITE200_WORKSPACE
  - ${WINDOWS_HOME}/Downloads
  - ${WINDOWS_HOME}/Documents
Otherwise the repo root is used.
Matched bundle names:
  - offhost-write200-return-*.tar.gz
  - offhost-write200-operator-diagnostics-*.tar.gz
  - OMX_WRITE200_OUT_*.tar.gz (portable operator fallback; diagnostic only)

Options are passed through to the bundle router when relevant:
  --out-dir <dir>
  --checkpoint
  --completion-audit <audit.md>
  --auto-audit
  --no-ingest
  --no-update-results
  --slug <slug>
  --dry-run
  --max-depth <n>              default 3

This script never calls Codex update_goal.
For Desktop roots, the default scan is targeted to root files and offhost/write200
subdirectories; set OFFHOST_BUNDLE_EXHAUSTIVE_SCAN=true for a full traversal.
Corrupt tar.gz files and tarballs whose contents do not match their filename
kind are ignored during automatic selection.
Bundles carrying `SELFTEST_ONLY=true` are also ignored/rejected so importer
selftests cannot be mistaken for stronger-host evidence.
By default candidate discovery is filename-based. Set
OFFHOST_BUNDLE_CONTENT_SCAN=true to also inspect renamed `*.tar.gz`/`*.tgz`
archives and accept them only when their contents prove they are an official
return bundle or the direct-official portable fallback
(`STATUS=direct_official_wrapper_fallback` plus official-shape markers).
Other diagnostic bundles require either the canonical
`offhost-write200-operator-diagnostics-*.tar.gz` filename or the explicit
portable fallback `OMX_WRITE200_OUT_*.tar.gz` filename to avoid importing
advisor/handoff archives that happen to contain an `operator-status.env`.
USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --bundle)
      BUNDLE="${2:-}"
      shift 2
      ;;
    --search-root)
      SEARCH_ROOTS+=("${2:-}")
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
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    --max-depth)
      MAX_DEPTH="${2:-}"
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

if [[ ${#SEARCH_ROOTS[@]} -eq 0 ]]; then
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

TS="$(date +%Y%m%dT%H%M%S%Z)"
STATUS_ROOT=".omx/evidence/blockchain/${SLUG}/latest-offhost-bundle-import-${TS}-$$"
mkdir -p "${STATUS_ROOT}"
STATUS_ENV="${STATUS_ROOT}/latest-bundle-import-status.env"
CANDIDATES_JSON="${STATUS_ROOT}/candidates.json"
ROUTER_LOG="${STATUS_ROOT}/router.log"
SELECTED_KIND="unknown"

if [[ -z "${BUNDLE}" ]]; then
  BUNDLE="$(python3 - "${CANDIDATES_JSON}" "${MAX_DEPTH}" "${SEARCH_ROOTS[@]}" <<'PY'
import fnmatch
import json
import os
import subprocess
import sys
import tarfile
from pathlib import Path
from pathlib import PurePosixPath

out = Path(sys.argv[1])
max_depth = int(sys.argv[2])
roots = [Path(p) for p in sys.argv[3:] if p]
patterns = (
    ("official_return", "offhost-write200-return-*.tar.gz"),
    ("diagnostic", "offhost-write200-operator-diagnostics-*.tar.gz"),
    ("diagnostic", "OMX_WRITE200_OUT_*.tar.gz"),
)
kind_rank = {"official_return": 1, "diagnostic": 0}
candidates = []
exhaustive_scan = os.environ.get("OFFHOST_BUNDLE_EXHAUSTIVE_SCAN", "").lower() in {"1", "true", "yes", "on"}
content_scan = os.environ.get("OFFHOST_BUNDLE_CONTENT_SCAN", "").lower() in {"1", "true", "yes", "on"}

def detect_tar_kind(path: Path):
    has_manifest = False
    has_required = False
    has_return_readme = False
    has_operator_status = False
    operator_status_text = ""
    selftest_only = False
    try:
        with tarfile.open(path, "r:gz") as tar:
            for member in tar.getmembers():
                p = PurePosixPath(member.name)
                if p.is_absolute() or ".." in p.parts:
                    return "unsafe"
                normalized = str(PurePosixPath(*[part for part in p.parts if part != "."]))
                if normalized == "manifest.sha256":
                    has_manifest = True
                if normalized == "required-file-check.json":
                    has_required = True
                if normalized == "README-return-bundle.md":
                    has_return_readme = True
                if normalized == "operator-status.env" or normalized.endswith("/operator-status.env"):
                    has_operator_status = True
                if member.isfile() and member.size <= 1024 * 1024:
                    f = tar.extractfile(member)
                    text = f.read().decode("utf-8", errors="replace") if f is not None else ""
                    if "SELFTEST_ONLY=true" in text:
                        selftest_only = True
                    if normalized == "operator-status.env" or normalized.endswith("/operator-status.env"):
                        operator_status_text = text
    except (OSError, tarfile.TarError, EOFError):
        return "invalid"
    if selftest_only:
        return "selftest"
    if has_manifest and has_required and has_return_readme:
        return "official_return"
    if has_operator_status and all(
        marker in operator_status_text
        for marker in (
            "STATUS=direct_official_wrapper_fallback",
            "ALLOW_UNDERPOWERED=false",
            "BENCHMARK_CHANNEL_ORGS=1,2,3,4",
            "BENCHMARK_CC_INSTALL_ORGS=1,2,3,4",
        )
    ):
        return "portable_fallback_diagnostic"
    if has_operator_status:
        return "diagnostic"
    return "unknown"

def candidate_from_path(path: Path):
    filename = path.name
    matched_kind = None
    for kind, pattern in patterns:
        if fnmatch.fnmatch(filename, pattern):
            matched_kind = kind
            break
    if matched_kind is None and not (content_scan and (filename.endswith(".tar.gz") or filename.endswith(".tgz"))):
        return None
    try:
        st = path.stat()
    except OSError:
        return None
    detected_kind = detect_tar_kind(path)
    if matched_kind is None:
        if detected_kind == "official_return":
            matched_kind = detected_kind
        elif detected_kind == "portable_fallback_diagnostic":
            matched_kind = "diagnostic"
        else:
            return None
    elif matched_kind == "diagnostic":
        if detected_kind not in {"diagnostic", "portable_fallback_diagnostic"}:
            return None
    elif detected_kind != matched_kind:
        return None
    return {
        "path": str(path.resolve()),
        "kind": matched_kind,
        "validatedKind": detected_kind,
        "kindRank": kind_rank[matched_kind],
        "mtime": st.st_mtime,
        "size": st.st_size,
    }

def append_candidate(path: Path):
    item = candidate_from_path(path)
    if item is not None:
        candidates.append(item)

def scan_limited(start: Path, remaining_depth: int):
    stack = [(start, 0)]
    while stack:
        directory, depth = stack.pop()
        try:
            with os.scandir(directory) as entries:
                for entry in entries:
                    try:
                        if entry.is_file(follow_symlinks=False):
                            append_candidate(Path(entry.path))
                        elif entry.is_dir(follow_symlinks=False) and depth < remaining_depth:
                            stack.append((Path(entry.path), depth + 1))
                    except OSError:
                        continue
        except OSError:
            continue

def scan_desktop_targeted(root: Path):
    target_dirs = []
    try:
        with os.scandir(root) as entries:
            for entry in entries:
                try:
                    if entry.is_file(follow_symlinks=False):
                        append_candidate(Path(entry.path))
                    elif entry.is_dir(follow_symlinks=False) and max_depth >= 1:
                        lowered = entry.name.lower()
                        if "offhost" in lowered or "write200" in lowered:
                            target_dirs.append(Path(entry.path))
                except OSError:
                    continue
    except OSError:
        return
    for directory in target_dirs:
        scan_limited(directory, max_depth - 1)

for root in roots:
    if not root.exists():
        continue
    root = root.resolve()
    if root.name.lower() == "desktop" and not exhaustive_scan:
        scan_desktop_targeted(root)
        continue
    find_max_depth = max_depth + 1
    if content_scan:
        name_terms = [
            "(",
            "-name",
            "offhost-write200-return-*.tar.gz",
            "-o",
            "-name",
            "offhost-write200-operator-diagnostics-*.tar.gz",
            "-o",
            "-name",
            "OMX_WRITE200_OUT_*.tar.gz",
            "-o",
            "-name",
            "*.tar.gz",
            "-o",
            "-name",
            "*.tgz",
            ")",
        ]
    else:
        name_terms = [
            "(",
            "-name",
            "offhost-write200-return-*.tar.gz",
            "-o",
            "-name",
            "offhost-write200-operator-diagnostics-*.tar.gz",
            "-o",
            "-name",
            "OMX_WRITE200_OUT_*.tar.gz",
            ")",
        ]
    find_cmd = [
        "find",
        str(root),
        "-maxdepth",
        str(find_max_depth),
        "-type",
        "f",
        *name_terms,
        "-print0",
    ]
    try:
        found = subprocess.run(
            find_cmd,
            check=False,
            stdout=subprocess.PIPE,
            stderr=subprocess.DEVNULL,
        )
    except OSError:
        found = None
    if found is not None and found.returncode in (0, 1):
        for raw_path in found.stdout.split(b"\0"):
            if not raw_path:
                continue
            item = candidate_from_path(Path(os.fsdecode(raw_path)))
            if item is not None:
                candidates.append(item)
        continue
    for dirpath, dirnames, filenames in os.walk(root):
        path_dir = Path(dirpath)
        try:
            rel = path_dir.relative_to(root)
            depth = 0 if str(rel) == "." else len(rel.parts)
        except ValueError:
            depth = max_depth + 1
        if depth >= max_depth:
            dirnames[:] = []
        if depth > max_depth:
            continue
        for filename in filenames:
            item = candidate_from_path(path_dir / filename)
            if item is not None:
                candidates.append(item)
seen = set()
deduped = []
for item in candidates:
    if item["path"] in seen:
        continue
    seen.add(item["path"])
    deduped.append(item)
candidates = deduped
candidates.sort(key=lambda item: (item.get("kindRank", 0), item["mtime"], item["path"]), reverse=True)
out.write_text(json.dumps(candidates, indent=2, ensure_ascii=False) + "\n")
print(candidates[0]["path"] if candidates else "")
PY
)"
else
  BUNDLE="$(cd "$(dirname "${BUNDLE}")" && pwd)/$(basename "${BUNDLE}")"
  python3 - "${CANDIDATES_JSON}" "${BUNDLE}" <<'PY'
import json, os, sys
path = sys.argv[2]
st = os.stat(path)
open(sys.argv[1], "w").write(json.dumps([{"path": path, "mtime": st.st_mtime, "size": st.st_size}], indent=2) + "\n")
PY
fi

if [[ -z "${BUNDLE}" || ! -f "${BUNDLE}" ]]; then
  {
    echo "STATUS=no_offhost_bundle_found"
    echo "SEARCH_ROOTS=${SEARCH_ROOTS[*]}"
    echo "MAX_DEPTH=${MAX_DEPTH}"
    echo "EXHAUSTIVE_SCAN=$(scan_flag "${OFFHOST_BUNDLE_EXHAUSTIVE_SCAN:-}")"
    echo "CONTENT_SCAN=$(scan_flag "${OFFHOST_BUNDLE_CONTENT_SCAN:-}")"
    echo "CANDIDATES_JSON=${CANDIDATES_JSON}"
  } > "${STATUS_ENV}"
  cat "${STATUS_ENV}"
  exit 1
fi

detect_bundle_kind() {
  local bundle=$1
  python3 - "$bundle" <<'PY'
import sys, tarfile
from pathlib import PurePosixPath

bundle = sys.argv[1]
has_manifest = False
has_required = False
has_return_readme = False
has_operator_status = False
selftest_only = False
try:
    with tarfile.open(bundle, 'r:gz') as tar:
        for member in tar.getmembers():
            p = PurePosixPath(member.name)
            if p.is_absolute() or '..' in p.parts:
                print("unknown")
                raise SystemExit(0)
            normalized = str(PurePosixPath(*[part for part in p.parts if part != "."]))
            if normalized == "manifest.sha256":
                has_manifest = True
            if normalized == "required-file-check.json":
                has_required = True
            if normalized == "README-return-bundle.md":
                has_return_readme = True
            if normalized == "operator-status.env" or normalized.endswith("/operator-status.env"):
                has_operator_status = True
            if member.isfile() and member.size <= 1024 * 1024:
                f = tar.extractfile(member)
                if f is not None and "SELFTEST_ONLY=true" in f.read().decode("utf-8", errors="replace"):
                    selftest_only = True
except (OSError, tarfile.TarError, EOFError):
    print("unknown")
    raise SystemExit(0)

if selftest_only:
    print("selftest")
elif has_manifest and has_required and has_return_readme:
    print("official_return")
elif has_operator_status:
    print("diagnostic")
else:
    print("unknown")
PY
}

SELECTED_KIND="$(detect_bundle_kind "${BUNDLE}")"

if [[ "${SELECTED_KIND}" == "unknown" || "${SELECTED_KIND}" == "selftest" ]]; then
  {
    if [[ "${SELECTED_KIND}" == "selftest" ]]; then
      echo "STATUS=selftest_only_bundle_ignored"
    else
      echo "STATUS=invalid_offhost_bundle"
    fi
    echo "SELECTED_BUNDLE=${BUNDLE}"
    echo "SELECTED_KIND=${SELECTED_KIND}"
    echo "EXHAUSTIVE_SCAN=$(scan_flag "${OFFHOST_BUNDLE_EXHAUSTIVE_SCAN:-}")"
    echo "CONTENT_SCAN=$(scan_flag "${OFFHOST_BUNDLE_CONTENT_SCAN:-}")"
    echo "CANDIDATES_JSON=${CANDIDATES_JSON}"
  } > "${STATUS_ENV}"
  cat "${STATUS_ENV}"
  exit 1
fi

args=(--bundle "${BUNDLE}" --slug "${SLUG}")
if [[ -n "${OUT_DIR}" ]]; then
  args+=(--out-dir "${OUT_DIR}")
fi
if [[ "${CHECKPOINT}" == "true" ]]; then
  args+=(--checkpoint)
fi
IGNORED_OPTIONS=""
if [[ "${SELECTED_KIND}" == "diagnostic" ]]; then
  ignored=()
  [[ -n "${COMPLETION_AUDIT}" ]] && ignored+=(--completion-audit)
  [[ "${AUTO_AUDIT}" == "true" ]] && ignored+=(--auto-audit)
  [[ "${RUN_INGEST}" != "true" ]] && ignored+=(--no-ingest)
  [[ "${UPDATE_RESULTS}" != "true" ]] && ignored+=(--no-update-results)
  IGNORED_OPTIONS="${ignored[*]:-}"
else
  if [[ -n "${COMPLETION_AUDIT}" ]]; then
    args+=(--completion-audit "${COMPLETION_AUDIT}")
  fi
  if [[ "${AUTO_AUDIT}" == "true" ]]; then
    args+=(--auto-audit)
  fi
  if [[ "${RUN_INGEST}" != "true" ]]; then
    args+=(--no-ingest)
  fi
  if [[ "${UPDATE_RESULTS}" != "true" ]]; then
    args+=(--no-update-results)
  fi
fi

if [[ "${DRY_RUN}" == "true" ]]; then
  {
    echo "STATUS=dry_run"
    echo "SELECTED_BUNDLE=${BUNDLE}"
    echo "SELECTED_KIND=${SELECTED_KIND}"
    echo "IGNORED_OPTIONS=${IGNORED_OPTIONS}"
    echo "EXHAUSTIVE_SCAN=$(scan_flag "${OFFHOST_BUNDLE_EXHAUSTIVE_SCAN:-}")"
    echo "CONTENT_SCAN=$(scan_flag "${OFFHOST_BUNDLE_CONTENT_SCAN:-}")"
    echo "CANDIDATES_JSON=${CANDIDATES_JSON}"
    echo "ROUTER_COMMAND=scripts/import-offhost-write200-bundle.sh ${args[*]}"
  } > "${STATUS_ENV}"
  cat "${STATUS_ENV}"
  exit 0
fi

set +e
scripts/import-offhost-write200-bundle.sh "${args[@]}" > "${ROUTER_LOG}" 2>&1
ROUTER_RC=$?
set -e

{
  echo "STATUS=$([[ "${ROUTER_RC}" == "0" ]] && echo imported || echo import_failed)"
  echo "SELECTED_BUNDLE=${BUNDLE}"
  echo "SELECTED_KIND=${SELECTED_KIND}"
  echo "IGNORED_OPTIONS=${IGNORED_OPTIONS}"
  echo "EXHAUSTIVE_SCAN=$(scan_flag "${OFFHOST_BUNDLE_EXHAUSTIVE_SCAN:-}")"
  echo "CONTENT_SCAN=$(scan_flag "${OFFHOST_BUNDLE_CONTENT_SCAN:-}")"
  echo "CANDIDATES_JSON=${CANDIDATES_JSON}"
  echo "ROUTER_LOG=${ROUTER_LOG}"
  echo "ROUTER_RC=${ROUTER_RC}"
} > "${STATUS_ENV}"
cat "${STATUS_ENV}"
exit "${ROUTER_RC}"
