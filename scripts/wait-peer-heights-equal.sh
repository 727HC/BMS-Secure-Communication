#!/usr/bin/env bash
# Read-only helper: wait until all selected peers report the same channel height.
set -euo pipefail

CHANNEL="${CHANNEL_NAME:-}"
TIMEOUT="${PEER_HEIGHTS_TIMEOUT:-300}"
INTERVAL="${PEER_HEIGHTS_INTERVAL:-5}"
OUTPUT=""
PEERS="${PEER_HEIGHT_CONTAINERS:-peer0.manufacturer.battery.com peer0.evmanufacturer.battery.com peer0.service.battery.com peer0.regulator.battery.com}"

usage() {
  cat <<USAGE
Usage: $0 --channel <name> [--timeout <seconds>] [--interval <seconds>] [--output <json>]

Environment:
  PEER_HEIGHT_CONTAINERS  space-separated peer containers to query
  PEER_HEIGHTS_TIMEOUT    default 300
  PEER_HEIGHTS_INTERVAL   default 5
USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --channel) CHANNEL="${2:-}"; shift 2 ;;
    --timeout) TIMEOUT="${2:-}"; shift 2 ;;
    --interval) INTERVAL="${2:-}"; shift 2 ;;
    --output) OUTPUT="${2:-}"; shift 2 ;;
    -h|--help) usage; exit 0 ;;
    *) echo "ERROR: unknown argument: $1" >&2; usage >&2; exit 64 ;;
  esac
done

if [[ -z "${CHANNEL}" ]]; then
  echo "ERROR: --channel is required" >&2
  exit 2
fi
if ! [[ "${TIMEOUT}" =~ ^[0-9]+$ ]] || (( TIMEOUT < 1 )); then
  echo "ERROR: --timeout must be a positive integer" >&2
  exit 2
fi
if ! [[ "${INTERVAL}" =~ ^[0-9]+$ ]] || (( INTERVAL < 1 )); then
  echo "ERROR: --interval must be a positive integer" >&2
  exit 2
fi

if [[ -n "${OUTPUT}" ]]; then
  mkdir -p "$(dirname "${OUTPUT}")"
fi

started_at="$(date -Is)"
deadline=$(( $(date +%s) + TIMEOUT ))
attempt=0
status_json=""

collect_once() {
  local now peer raw rc
  now="$(date -Is)"
  tmp="$(mktemp)"
  printf '{"ts":"%s","channel":"%s","peers":[\n' "${now}" "${CHANNEL}" > "${tmp}"
  local first=true
  for peer in ${PEERS}; do
    set +e
    raw="$(docker exec "${peer}" peer channel getinfo -c "${CHANNEL}" 2>&1)"
    rc=$?
    set -e
    if [[ "${first}" == "false" ]]; then
      printf ',\n' >> "${tmp}"
    fi
    first=false
    python3 - "${peer}" "${rc}" "${raw}" >> "${tmp}" <<'PY'
import json, re, sys
peer, rc, raw = sys.argv[1], int(sys.argv[2]), sys.argv[3]
height = None
error = None
if rc == 0:
    match = re.search(r'(\{.*\})', raw, re.S)
    if match:
        try:
            data = json.loads(match.group(1))
            if "height" in data:
                height = int(data["height"])
        except Exception as exc:
            error = f"parse_error:{exc}"
    if height is None and error is None:
        error = "height_not_found"
else:
    error = raw[-500:]
print(json.dumps({"peer": peer, "rc": rc, "height": height, "error": error}, ensure_ascii=False))
PY
  done
  printf '\n]}' >> "${tmp}"
  python3 - "${tmp}" <<'PY'
import json, sys
p = sys.argv[1]
data = json.load(open(p))
heights = [x.get("height") for x in data["peers"] if x.get("height") is not None]
errors = [x for x in data["peers"] if x.get("height") is None]
all_present = len(heights) == len(data["peers"]) and not errors
unique = sorted(set(heights))
data["allPresent"] = all_present
data["equal"] = all_present and len(unique) == 1
data["height"] = unique[0] if len(unique) == 1 else None
data["uniqueHeights"] = unique
data["status"] = "equal" if data["equal"] else "waiting"
print(json.dumps(data, ensure_ascii=False))
PY
  rm -f "${tmp}"
}

while true; do
  attempt=$((attempt + 1))
  status_json="$(collect_once)"
  is_equal="$(printf '%s' "${status_json}" | python3 -c 'import json, sys; print("true" if json.load(sys.stdin).get("equal") else "false")')"
  echo "[peer-heights] attempt=${attempt} equal=${is_equal} channel=${CHANNEL}"
  if [[ "${is_equal}" == "true" ]]; then
    final_json="$(printf '%s' "${status_json}" | python3 -c 'import json, sys; data=json.load(sys.stdin); data["startedAt"]=sys.argv[1]; data["attempts"]=int(sys.argv[2]); data["finishedAt"]=data.get("ts"); data["status"]="equal"; print(json.dumps(data, indent=2, ensure_ascii=False))' "${started_at}" "${attempt}")"
    if [[ -n "${OUTPUT}" ]]; then printf '%s\n' "${final_json}" > "${OUTPUT}"; fi
    printf '%s\n' "${final_json}"
    exit 0
  fi
  if (( $(date +%s) >= deadline )); then
    final_json="$(printf '%s' "${status_json}" | python3 -c 'import json, sys; data=json.load(sys.stdin); data["startedAt"]=sys.argv[1]; data["attempts"]=int(sys.argv[2]); data["finishedAt"]=data.get("ts"); data["status"]="timeout"; print(json.dumps(data, indent=2, ensure_ascii=False))' "${started_at}" "${attempt}")"
    if [[ -n "${OUTPUT}" ]]; then printf '%s\n' "${final_json}" > "${OUTPUT}"; fi
    printf '%s\n' "${final_json}"
    exit 1
  fi
  sleep "${INTERVAL}"
done
