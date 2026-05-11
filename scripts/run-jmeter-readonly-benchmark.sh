#!/usr/bin/env bash
# Run JMeter HTTP/API read-only benchmark evidence for cloud-agent.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
JMX_FILE="${JMX_FILE:-${ROOT_DIR}/benchmarks/jmeter/cloud-read.jmx}"
RUN_ID="${RUN_ID:-jmeter-readonly-$(date -u +%Y%m%dT%H%M%SZ)}"
OUT_DIR="${OUT_DIR:-/tmp/bms-jmeter-readonly-${RUN_ID}}"
JTL_FILE="${JTL_FILE:-${OUT_DIR}/results.jtl}"
SUMMARY_JSON="${SUMMARY_JSON:-${OUT_DIR}/summary.json}"
EVIDENCE_MD="${EVIDENCE_MD:-${OUT_DIR}/evidence.md}"
HTML_DIR="${HTML_DIR:-${OUT_DIR}/html}"
SUCCESS_RATE_MIN="${SUCCESS_RATE_MIN:-99}"
ERROR_RATE_MAX="${ERROR_RATE_MAX:-1}"
CLOUD_PROTOCOL="${CLOUD_PROTOCOL:-http}"
CLOUD_HOST="${CLOUD_HOST:-localhost}"
CLOUD_PORT="${CLOUD_PORT:-3002}"
PASSPORT_ID="${PASSPORT_ID:-PASSPORT-BMU-DEVICE}"
BMU_ID_OR_DID="${BMU_ID_OR_DID:-${PASSPORT_ID}}"
THREADS="${THREADS:-100}"
LOOP_COUNT="${LOOP_COUNT:-50}"
RAMP_SECONDS="${RAMP_SECONDS:-10}"
GENERATE_HTML="${GENERATE_HTML:-false}"
DRY_RUN="false"

usage() {
  cat <<USAGE
Usage: $0 [--dry-run]

Runs JMeter read-only HTTP/API evidence against cloud-agent.

Environment:
  CLOUD_PROTOCOL=${CLOUD_PROTOCOL}
  CLOUD_HOST=${CLOUD_HOST}
  CLOUD_PORT=${CLOUD_PORT}
  PASSPORT_ID=${PASSPORT_ID}
  BMU_ID_OR_DID=${BMU_ID_OR_DID}
  THREADS=${THREADS}
  LOOP_COUNT=${LOOP_COUNT}
  RAMP_SECONDS=${RAMP_SECONDS}
  OUT_DIR=${OUT_DIR}
  SUCCESS_RATE_MIN=${SUCCESS_RATE_MIN}
  ERROR_RATE_MAX=${ERROR_RATE_MAX}
  GENERATE_HTML=${GENERATE_HTML}
  JMETER_CMD=<optional jmeter command override>
USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run)
      DRY_RUN="true"
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "ERROR: unknown argument: $1" >&2
      usage >&2
      exit 64
      ;;
  esac
  shift
done

if [[ ! -f "${JMX_FILE}" ]]; then
  echo "ERROR: JMX file not found: ${JMX_FILE}" >&2
  exit 1
fi

mkdir -p "${OUT_DIR}"

cat <<PLAN
=== JMeter read-only benchmark ===
Run ID: ${RUN_ID}
JMX: ${JMX_FILE}
Target: ${CLOUD_PROTOCOL}://${CLOUD_HOST}:${CLOUD_PORT}
Passport ID: ${PASSPORT_ID}
BMU ID/DID: ${BMU_ID_OR_DID}
Threads: ${THREADS}
Loop count: ${LOOP_COUNT}
Ramp seconds: ${RAMP_SECONDS}
JTL: ${JTL_FILE}
Summary JSON: ${SUMMARY_JSON}
Evidence MD: ${EVIDENCE_MD}
Acceptance: 2xx success rate >= ${SUCCESS_RATE_MIN}%, error rate < ${ERROR_RATE_MAX}%
Boundary: JMeter is HTTP/API read-only evidence; Fabric write KPI remains Caliper.
PLAN

if [[ "${DRY_RUN}" == "true" ]]; then
  echo "DRY-RUN: no JMeter command executed."
  exit 0
fi

if [[ -n "${JMETER_CMD:-}" ]]; then
  JMETER_BASE=(bash -lc)
  RUN_JMETER_WITH_SHELL="true"
elif command -v jmeter >/dev/null 2>&1; then
  JMETER_BASE=(jmeter)
  RUN_JMETER_WITH_SHELL="false"
else
  cat >&2 <<'ERROR'
ERROR: jmeter is not installed or not on PATH.
Install Apache JMeter and add its bin/ directory to PATH, or set JMETER_CMD to a site-approved wrapper.
Do not vendor JMeter binaries into this repository.

Example:
  export PATH=/opt/apache-jmeter/bin:$PATH
  scripts/run-jmeter-readonly-benchmark.sh
ERROR
  exit 127
fi

JMETER_ARGS=(
  -n
  -t "${JMX_FILE}"
  -l "${JTL_FILE}"
  -JCLOUD_PROTOCOL="${CLOUD_PROTOCOL}"
  -JCLOUD_HOST="${CLOUD_HOST}"
  -JCLOUD_PORT="${CLOUD_PORT}"
  -JPASSPORT_ID="${PASSPORT_ID}"
  -JBMU_ID_OR_DID="${BMU_ID_OR_DID}"
  -JTHREADS="${THREADS}"
  -JLOOP_COUNT="${LOOP_COUNT}"
  -JRAMP_SECONDS="${RAMP_SECONDS}"
  -Jjmeter.save.saveservice.output_format=csv
  -Jjmeter.save.saveservice.print_field_names=true
  -Jjmeter.save.saveservice.timestamp_format=ms
)

if [[ "${GENERATE_HTML}" == "true" ]]; then
  rm -rf "${HTML_DIR}"
  JMETER_ARGS+=( -e -o "${HTML_DIR}" )
fi

if [[ "${RUN_JMETER_WITH_SHELL}" == "true" ]]; then
  quoted_args=()
  for arg in "${JMETER_ARGS[@]}"; do
    quoted_args+=("$(printf '%q' "${arg}")")
  done
  bash -lc "${JMETER_CMD} ${quoted_args[*]}"
else
  "${JMETER_BASE[@]}" "${JMETER_ARGS[@]}"
fi

node "${ROOT_DIR}/scripts/parse-jmeter-summary.js" \
  --jtl "${JTL_FILE}" \
  --out-json "${SUMMARY_JSON}" \
  --out-md "${EVIDENCE_MD}" \
  --success-rate-min "${SUCCESS_RATE_MIN}" \
  --error-rate-max "${ERROR_RATE_MAX}" \
  --run-id "${RUN_ID}"

echo "JMeter read-only evidence written to ${OUT_DIR}"
