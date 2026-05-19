#!/usr/bin/env bash
# Non-writing Docker host readiness check for official write200 runs.
set -euo pipefail

OUTPUT=""
MIN_DOCKER_CPUS="${MIN_DOCKER_CPUS:-12}"
MIN_DOCKER_MEMORY_GIB="${MIN_DOCKER_MEMORY_GIB:-24}"
ALLOW_UNDERPOWERED="${ALLOW_UNDERPOWERED:-false}"

usage() {
  cat <<'USAGE'
Usage:
  scripts/check-benchmark-host-readiness.sh [--output <json>] [--min-cpus <n>] [--min-memory-gib <n>] [--allow-underpowered]

Checks Docker CPU/memory readiness without creating channels or running writes.
Exit codes:
  0  ready, or underpowered but explicitly allowed
 20  blocked_underpowered_host
  2  invalid arguments
USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --output)
      OUTPUT="${2:-}"
      shift 2
      ;;
    --min-cpus)
      MIN_DOCKER_CPUS="${2:-}"
      shift 2
      ;;
    --min-memory-gib)
      MIN_DOCKER_MEMORY_GIB="${2:-}"
      shift 2
      ;;
    --allow-underpowered)
      ALLOW_UNDERPOWERED=true
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

if ! [[ "${MIN_DOCKER_CPUS}" =~ ^[0-9]+$ ]]; then
  echo "ERROR: --min-cpus must be an integer" >&2
  exit 2
fi
if ! [[ "${MIN_DOCKER_MEMORY_GIB}" =~ ^[0-9]+([.][0-9]+)?$ ]]; then
  echo "ERROR: --min-memory-gib must be numeric" >&2
  exit 2
fi

docker_cpus="$(docker info --format '{{.NCPU}}' 2>/dev/null || echo 0)"
docker_mem_bytes="$(docker info --format '{{.MemTotal}}' 2>/dev/null || echo 0)"

tmp="$(mktemp)"
cleanup() {
  rm -f "${tmp}"
}
trap cleanup EXIT

set +e
python3 - "${docker_cpus}" "${docker_mem_bytes}" "${MIN_DOCKER_CPUS}" "${MIN_DOCKER_MEMORY_GIB}" "${ALLOW_UNDERPOWERED}" > "${tmp}" <<'PY'
import json
import sys

cpus = int(float(sys.argv[1] or 0))
mem_bytes = int(float(sys.argv[2] or 0))
min_cpus = int(float(sys.argv[3]))
min_mem_gib = float(sys.argv[4])
allow = sys.argv[5].lower() == "true"
mem_gib = mem_bytes / (1024 ** 3) if mem_bytes else 0.0
ready = cpus >= min_cpus and mem_gib >= min_mem_gib
status = "ready" if ready else ("underpowered_allowed" if allow else "blocked_underpowered_host")
print(json.dumps({
    "dockerCpus": cpus,
    "dockerMemoryGiB": round(mem_gib, 2),
    "minDockerCpus": min_cpus,
    "minDockerMemoryGiB": min_mem_gib,
    "ready": ready,
    "allowUnderpowered": allow,
    "status": status,
}, indent=2))
if not ready and not allow:
    raise SystemExit(20)
PY
rc=$?
set -e

if [[ -n "${OUTPUT}" ]]; then
  mkdir -p "$(dirname "${OUTPUT}")"
  cp "${tmp}" "${OUTPUT}"
fi
cat "${tmp}"
exit "${rc}"
