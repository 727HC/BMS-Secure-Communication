#!/usr/bin/env bash
# Remove non-live benchmark Fabric channels/state created by repeated TPS runs.
#
# Safety contract:
# - Never removes passportchannel.
# - Only targets channel names that start with "passport" and are not exactly
#   "passportchannel".
# - Requires CONFIRM_BENCHMARK_CLEANUP=benchmark-only unless DRY_RUN=true.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
NETWORK_DIR="${ROOT_DIR}/passport-network"
FABRIC_BIN="${ROOT_DIR}/fabric-samples/bin"
DRY_RUN="${DRY_RUN:-true}"
CONFIRM_BENCHMARK_CLEANUP="${CONFIRM_BENCHMARK_CLEANUP:-}"
EVIDENCE_DIR="${EVIDENCE_DIR:-${ROOT_DIR}/outputs/evidence/blockchain/benchmark-cleanup-$(date -u +%Y%m%dT%H%M%SZ)}"
CHANNEL_ALLOW_REGEX="${CHANNEL_ALLOW_REGEX:-^passport}"
KEEP_CHANNEL_REGEX="${KEEP_CHANNEL_REGEX:-^passportchannel$}"
KEEP_CHAINCODE_VERSION_REGEX="${KEEP_CHAINCODE_VERSION_REGEX:-_1\\.6-}"
CLEAN_CHAINCODE_CONTAINERS="${CLEAN_CHAINCODE_CONTAINERS:-true}"
FABRIC_NETWORK_MODE="${FABRIC_NETWORK_MODE:-host}"
FABRIC_TOOLS_IMAGE="${FABRIC_TOOLS_IMAGE:-hyperledger/fabric-tools:latest}"
if [[ "${FABRIC_NETWORK_MODE}" == "docker" ]]; then
  ORDERER_ADMIN_ADDRESS="${ORDERER_ADMIN_ADDRESS:-orderer.battery.com:7053}"
else
  ORDERER_ADMIN_ADDRESS="${ORDERER_ADMIN_ADDRESS:-localhost:7053}"
fi

mkdir -p "${EVIDENCE_DIR}"
LOG_FILE="${EVIDENCE_DIR}/cleanup.log"

log() {
  printf '%s\n' "$*" | tee -a "${LOG_FILE}"
}

run_or_echo() {
  if [[ "${DRY_RUN}" == "true" ]]; then
    log "DRY-RUN $*"
  else
    log "RUN $*"
    "$@"
  fi
}

if [[ "${DRY_RUN}" != "true" && "${CONFIRM_BENCHMARK_CLEANUP}" != "benchmark-only" ]]; then
  echo "ERROR: set CONFIRM_BENCHMARK_CLEANUP=benchmark-only for non-dry-run cleanup" >&2
  exit 2
fi

if [[ "${FABRIC_NETWORK_MODE}" != "docker" && ( ! -x "${FABRIC_BIN}/osnadmin" || ! -x "${FABRIC_BIN}/peer" ) ]]; then
  echo "ERROR: Fabric binaries not found under ${FABRIC_BIN}" >&2
  exit 2
fi

# shellcheck disable=SC1091
source "${NETWORK_DIR}/.env"

ORDERER_CA="${NETWORK_DIR}/organizations/ordererOrganizations/battery.com/tlsca/tlsca.battery.com-cert.pem"
ORDERER_ADMIN_TLS_SIGN_CERT="${NETWORK_DIR}/organizations/ordererOrganizations/battery.com/orderers/orderer.battery.com/tls/server.crt"
ORDERER_ADMIN_TLS_PRIVATE_KEY="${NETWORK_DIR}/organizations/ordererOrganizations/battery.com/orderers/orderer.battery.com/tls/server.key"

osnadmin_cmd() {
  if [[ "${FABRIC_NETWORK_MODE}" == "docker" ]]; then
    docker run --rm \
      --network passport_net \
      -v "${ROOT_DIR}:${ROOT_DIR}" \
      -w "${ROOT_DIR}" \
      "${FABRIC_TOOLS_IMAGE}" \
      osnadmin "$@"
  else
    "${FABRIC_BIN}/osnadmin" "$@"
  fi
}

orderer_json="${EVIDENCE_DIR}/orderer-channels.before.json"
osnadmin_cmd channel list \
  -o "${ORDERER_ADMIN_ADDRESS}" \
  --ca-file "${ORDERER_CA}" \
  --client-cert "${ORDERER_ADMIN_TLS_SIGN_CERT}" \
  --client-key "${ORDERER_ADMIN_TLS_PRIVATE_KEY}" \
  | sed '1{/^Status:/d;}' > "${orderer_json}"

mapfile -t CHANNELS < <(
  jq -r '.channels[]?.name' "${orderer_json}" |
    grep -E "${CHANNEL_ALLOW_REGEX}" |
    grep -Ev "${KEEP_CHANNEL_REGEX}" |
    sort
)

if (( ${#CHANNELS[@]} == 0 )); then
  log "No benchmark channels found. Evidence: ${EVIDENCE_DIR}"
  exit 0
fi

printf '%s\n' "${CHANNELS[@]}" > "${EVIDENCE_DIR}/benchmark-channels.txt"

log "Benchmark cleanup evidence: ${EVIDENCE_DIR}"
log "Dry run: ${DRY_RUN}"
log "Channels targeted: ${#CHANNELS[@]}"
log "Keep channel regex: ${KEEP_CHANNEL_REGEX}"
log "Target channels:"
sed 's/^/  - /' "${EVIDENCE_DIR}/benchmark-channels.txt" | tee -a "${LOG_FILE}"

if printf '%s\n' "${CHANNELS[@]}" | grep -Fxq 'passportchannel'; then
  echo "ERROR: passportchannel appeared in cleanup target list" >&2
  exit 3
fi

remove_orderer_channels() {
  local ch
  for ch in "${CHANNELS[@]}"; do
    if [[ "${DRY_RUN}" == "true" ]]; then
      log "DRY-RUN osnadmin channel remove --channelID ${ch}"
      continue
    fi
    log "Removing orderer channel: ${ch}"
    osnadmin_cmd channel remove \
      --channelID "${ch}" \
      -o "${ORDERER_ADMIN_ADDRESS}" \
      --ca-file "${ORDERER_CA}" \
      --client-cert "${ORDERER_ADMIN_TLS_SIGN_CERT}" \
      --client-key "${ORDERER_ADMIN_TLS_PRIVATE_KEY}" \
      2>&1 | tee -a "${LOG_FILE}" || true
  done
}

unjoin_peer_channels() {
  local peer_container=$1
  local local_msp=$2
  local peer_address=$3
  local couch_address=$4
  local joined_channels=()
  local target_joined=()
  local ch joined

  log "Unjoining benchmark channels from ${peer_container}"
  if [[ "${DRY_RUN}" == "true" ]]; then
    log "DRY-RUN docker stop ${peer_container}; peer node unjoin ${#CHANNELS[@]} channels; docker start ${peer_container}"
    return 0
  fi

  mapfile -t joined_channels < <(
    docker exec "${peer_container}" peer channel list 2>/dev/null |
      awk '/^[[:alnum:]_.-]+$/ { print }' || true
  )
  for ch in "${CHANNELS[@]}"; do
    for joined in "${joined_channels[@]}"; do
      if [[ "${ch}" == "${joined}" ]]; then
        target_joined+=("${ch}")
        break
      fi
    done
  done
  if (( ${#target_joined[@]} == 0 )); then
    log "No targeted benchmark channels joined on ${peer_container}; skipping peer unjoin"
    return 0
  fi

  docker stop "${peer_container}" >> "${LOG_FILE}" 2>&1 || true
  docker run --rm \
    --volumes-from "${peer_container}" \
    --network passport_net \
    -e FABRIC_CFG_PATH=/etc/hyperledger/peercfg \
    -e CORE_PEER_ID="${peer_container}" \
    -e CORE_PEER_ADDRESS="${peer_address}" \
    -e CORE_PEER_LOCALMSPID="${local_msp}" \
    -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/msp \
    -e CORE_PEER_TLS_ENABLED=true \
    -e CORE_LEDGER_STATE_STATEDATABASE=CouchDB \
    -e CORE_LEDGER_STATE_COUCHDBCONFIG_COUCHDBADDRESS="${couch_address}" \
    -e CORE_LEDGER_STATE_COUCHDBCONFIG_USERNAME="${COUCHDB_USER}" \
    -e CORE_LEDGER_STATE_COUCHDBCONFIG_PASSWORD="${COUCHDB_PASSWORD}" \
    hyperledger/fabric-peer:2.5 \
    sh -c '
      status=0
      for ch do
        echo "[unjoin] ${CORE_PEER_ID} ${ch}"
        peer node unjoin -c "${ch}" || status=1
      done
      exit "${status}"
    ' sh "${target_joined[@]}" 2>&1 | tee -a "${LOG_FILE}" || true
  docker start "${peer_container}" >> "${LOG_FILE}"

  # Wait until the peer can answer a non-destructive live channel list.
  for _ in {1..60}; do
    if docker exec "${peer_container}" peer channel list >/dev/null 2>&1; then
      log "Peer restarted: ${peer_container}"
      return 0
    fi
    sleep 2
  done
  log "WARN: peer did not answer channel list within timeout: ${peer_container}"
}

delete_couchdb_benchmark_dbs() {
  local couch=$1
  local db_list="${EVIDENCE_DIR}/${couch}-benchmark-dbs.txt"
  log "Deleting benchmark CouchDB databases from ${couch}"

  docker exec "${couch}" curl -fsS -u "${COUCHDB_USER}:${COUCHDB_PASSWORD}" \
    http://127.0.0.1:5984/_all_dbs |
    python3 -c '
import json, sys
channels = [line.strip() for line in open(sys.argv[1]) if line.strip()]
dbs = json.load(sys.stdin)
for db in dbs:
    if any(db == ch or db.startswith(ch + "_") for ch in channels):
        print(db)
' "${EVIDENCE_DIR}/benchmark-channels.txt" > "${db_list}"

  local count
  count="$(wc -l < "${db_list}" | tr -d ' ')"
  log "${couch} benchmark DBs: ${count}"
  if [[ "${DRY_RUN}" == "true" ]]; then
    sed 's/^/DRY-RUN delete db /' "${db_list}" | tee -a "${LOG_FILE}"
    return 0
  fi

  python3 - "${db_list}" <<'PY' |
import sys, urllib.parse
for line in open(sys.argv[1]):
    db=line.strip()
    if db:
        print(urllib.parse.quote(db, safe=''))
PY
  while IFS= read -r encoded; do
    docker exec "${couch}" curl -fsS -X DELETE -u "${COUCHDB_USER}:${COUCHDB_PASSWORD}" \
      "http://127.0.0.1:5984/${encoded}" >> "${LOG_FILE}" 2>&1 || true
  done
}

cleanup_chaincode_containers() {
  if [[ "${CLEAN_CHAINCODE_CONTAINERS}" != "true" ]]; then
    log "Skipping chaincode container cleanup"
    return 0
  fi

  mapfile -t stale < <(
    docker ps -a --format '{{.Names}}' |
      grep -E '^dev-peer0\..*passport-contract_' |
      grep -Ev "${KEEP_CHAINCODE_VERSION_REGEX}" || true
  )
  printf '%s\n' "${stale[@]}" > "${EVIDENCE_DIR}/stale-chaincode-containers.txt"
  log "Stale chaincode containers targeted: ${#stale[@]} (keep regex: ${KEEP_CHAINCODE_VERSION_REGEX})"
  if (( ${#stale[@]} == 0 )); then
    return 0
  fi
  if [[ "${DRY_RUN}" == "true" ]]; then
    sed 's/^/DRY-RUN remove container /' "${EVIDENCE_DIR}/stale-chaincode-containers.txt" | tee -a "${LOG_FILE}"
  else
    docker rm -f "${stale[@]}" >> "${LOG_FILE}" 2>&1 || true
  fi
}

remove_orderer_channels

unjoin_peer_channels "peer0.manufacturer.battery.com" "ManufacturerMSP" "peer0.manufacturer.battery.com:7051" "couchdb0:5984"
unjoin_peer_channels "peer0.evmanufacturer.battery.com" "EVManufacturerMSP" "peer0.evmanufacturer.battery.com:9051" "couchdb1:5984"
unjoin_peer_channels "peer0.service.battery.com" "ServiceMSP" "peer0.service.battery.com:11051" "couchdb2:5984"
unjoin_peer_channels "peer0.regulator.battery.com" "RegulatorMSP" "peer0.regulator.battery.com:13051" "couchdb3:5984"

delete_couchdb_benchmark_dbs couchdb0
delete_couchdb_benchmark_dbs couchdb1
delete_couchdb_benchmark_dbs couchdb2
delete_couchdb_benchmark_dbs couchdb3

cleanup_chaincode_containers

osnadmin_cmd channel list \
  -o "${ORDERER_ADMIN_ADDRESS}" \
  --ca-file "${ORDERER_CA}" \
  --client-cert "${ORDERER_ADMIN_TLS_SIGN_CERT}" \
  --client-key "${ORDERER_ADMIN_TLS_PRIVATE_KEY}" \
  | sed '1{/^Status:/d;}' > "${EVIDENCE_DIR}/orderer-channels.after.json" || true

for couch in couchdb0 couchdb1 couchdb2 couchdb3; do
  docker exec "${couch}" curl -fsS -u "${COUCHDB_USER}:${COUCHDB_PASSWORD}" \
    http://127.0.0.1:5984/_all_dbs > "${EVIDENCE_DIR}/${couch}-dbs.after.json" || true
done

log "Cleanup complete. Evidence: ${EVIDENCE_DIR}"
