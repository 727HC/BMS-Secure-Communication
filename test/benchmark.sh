#!/usr/bin/env bash
#
# BMS Blockchain Performance Benchmark
# Measures: Passport creation TPS, query latency, BMU data recording TPS
#

set -eo pipefail

########################################
# Environment Setup
########################################
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR/../passport-network"

export PATH=$PWD/../fabric-samples/bin:$PATH
export FABRIC_CFG_PATH=$PWD/../fabric-samples/config
export NETWORK_HOME=$PWD
export OVERRIDE_ORG=""
source scripts/envVar.sh

# Set identity to ManufacturerMSP (org 1)
setGlobals 1

CHANNEL="passportchannel"
CC_NAME="passport-contract"

# Orderer flags
ORDERER_ARGS="-o localhost:7050 --ordererTLSHostnameOverride orderer.battery.com --tls --cafile $ORDERER_CA"

# Multi-org endorsement (MAJORITY: 3 of 4 orgs)
ENDORSER_ARGS="--peerAddresses localhost:7051 --tlsRootCertFiles $PEER0_MANUFACTURER_CA \
--peerAddresses localhost:9051 --tlsRootCertFiles $PEER0_EVMANUFACTURER_CA \
--peerAddresses localhost:11051 --tlsRootCertFiles $PEER0_SERVICE_CA"

NUM_ITEMS=20
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

########################################
# Helper: nanosecond clock
########################################
now_ns() {
  date +%s%N
}

########################################
# Arrays to track results
########################################
declare -a CREATE_DURATIONS=()
declare -a QUERY_DURATIONS=()
declare -a BMU_DURATIONS=()
CREATE_FAILURES=0
QUERY_FAILURES=0
BMU_FAILURES=0

echo "============================================================"
echo " BMS Blockchain Performance Benchmark"
echo " Date: $(date)"
echo " Items per test: $NUM_ITEMS"
echo "============================================================"
echo ""

########################################
# 1. Passport Creation TPS
########################################
echo "------------------------------------------------------------"
echo " [1/3] Passport Creation Benchmark ($NUM_ITEMS passports)"
echo "------------------------------------------------------------"

CREATE_TOTAL_START=$(now_ns)

for i in $(seq 1 $NUM_ITEMS); do
  IDX=$(printf "%03d" $i)
  PASSPORT_ID="PASSPORT-BENCH-${IDX}"
  BATTERY_ID="BAT-BENCH-${IDX}"
  DID="did:example:bench${IDX}"

  echo -n "  Creating $PASSPORT_ID ... "

  CALL_START=$(now_ns)

  set +e
  OUTPUT=$(peer chaincode invoke \
    $ORDERER_ARGS \
    -C $CHANNEL -n $CC_NAME \
    $ENDORSER_ARGS \
    -c "{\"function\":\"CreateBatteryPassport\",\"Args\":[\"${PASSPORT_ID}\",\"${BATTERY_ID}\",\"${DID}\",\"BenchModel\",\"SN-${IDX}\",\"BenchMfg\",\"KR\",\"BenchCell\",\"KR\",\"${TIMESTAMP}\",\"Pouch\",\"NMC811\",\"96\",\"450.5\",\"72.6\",\"180.0\",\"65.0\",\"2000\",\"300V-400V\",\"-20C-60C\"]}" \
    --waitForEvent 2>&1)
  RC=$?
  set -e

  CALL_END=$(now_ns)
  DURATION_NS=$((CALL_END - CALL_START))
  DURATION_MS=$(echo "scale=2; $DURATION_NS / 1000000" | bc)

  if [ $RC -eq 0 ]; then
    echo "OK (${DURATION_MS} ms)"
    CREATE_DURATIONS+=($DURATION_NS)
  else
    echo "FAIL"
    echo "    Error: $(echo "$OUTPUT" | tail -1)"
    CREATE_FAILURES=$((CREATE_FAILURES + 1))
  fi

  sleep 1
done

CREATE_TOTAL_END=$(now_ns)
CREATE_TOTAL_NS=$((CREATE_TOTAL_END - CREATE_TOTAL_START))

########################################
# 2. Passport Query Latency
########################################
echo ""
echo "------------------------------------------------------------"
echo " [2/3] Passport Query Latency Benchmark ($NUM_ITEMS queries)"
echo "------------------------------------------------------------"

QUERY_TOTAL_START=$(now_ns)

for i in $(seq 1 $NUM_ITEMS); do
  IDX=$(printf "%03d" $i)
  PASSPORT_ID="PASSPORT-BENCH-${IDX}"

  echo -n "  Querying $PASSPORT_ID ... "

  CALL_START=$(now_ns)

  set +e
  OUTPUT=$(peer chaincode query \
    -C $CHANNEL -n $CC_NAME \
    -c "{\"function\":\"QueryPassport\",\"Args\":[\"${PASSPORT_ID}\"]}" 2>&1)
  RC=$?
  set -e

  CALL_END=$(now_ns)
  DURATION_NS=$((CALL_END - CALL_START))
  DURATION_MS=$(echo "scale=2; $DURATION_NS / 1000000" | bc)

  if [ $RC -eq 0 ]; then
    echo "OK (${DURATION_MS} ms)"
    QUERY_DURATIONS+=($DURATION_NS)
  else
    echo "FAIL"
    echo "    Error: $(echo "$OUTPUT" | tail -1)"
    QUERY_FAILURES=$((QUERY_FAILURES + 1))
  fi
done

QUERY_TOTAL_END=$(now_ns)
QUERY_TOTAL_NS=$((QUERY_TOTAL_END - QUERY_TOTAL_START))

########################################
# 3. BMU Data Recording TPS
########################################
echo ""
echo "------------------------------------------------------------"
echo " [3/3] BMU Data Recording Benchmark ($NUM_ITEMS records)"
echo "------------------------------------------------------------"
echo "  Target passport: PASSPORT-BENCH-001"
echo ""

BMU_TOTAL_START=$(now_ns)

for i in $(seq 1 $NUM_ITEMS); do
  IDX=$(printf "%03d" $i)
  RECORD_ID="BMU-BENCH-${IDX}"
  PASSPORT_ID="PASSPORT-BENCH-001"
  DID="did:example:bench001"
  DATA_HASH="hash-bench-${IDX}"
  SIG="sig-bench-${IDX}"

  echo -n "  Recording $RECORD_ID ... "

  CALL_START=$(now_ns)

  set +e
  OUTPUT=$(peer chaincode invoke \
    $ORDERER_ARGS \
    -C $CHANNEL -n $CC_NAME \
    $ENDORSER_ARGS \
    -c "{\"function\":\"RecordBMUData\",\"Args\":[\"${RECORD_ID}\",\"${PASSPORT_ID}\",\"${DID}\",\"${DATA_HASH}\",\"${SIG}\",\"${i}\",\"85\",\"370.5\",\"12.3\",\"25\",\"96\",\"0\",\"${i}\",\"${TIMESTAMP}\"]}" \
    --waitForEvent 2>&1)
  RC=$?
  set -e

  CALL_END=$(now_ns)
  DURATION_NS=$((CALL_END - CALL_START))
  DURATION_MS=$(echo "scale=2; $DURATION_NS / 1000000" | bc)

  if [ $RC -eq 0 ]; then
    echo "OK (${DURATION_MS} ms)"
    BMU_DURATIONS+=($DURATION_NS)
  else
    echo "FAIL"
    echo "    Error: $(echo "$OUTPUT" | tail -1)"
    BMU_FAILURES=$((BMU_FAILURES + 1))
  fi

  sleep 1
done

BMU_TOTAL_END=$(now_ns)
BMU_TOTAL_NS=$((BMU_TOTAL_END - BMU_TOTAL_START))

########################################
# Compute Statistics
########################################

# Helper: compute avg from array of nanosecond durations
compute_avg_ms() {
  local -n arr=$1
  local count=${#arr[@]}
  if [ $count -eq 0 ]; then
    echo "N/A"
    return
  fi
  local sum=0
  for d in "${arr[@]}"; do
    sum=$((sum + d))
  done
  echo "scale=2; $sum / $count / 1000000" | bc
}

compute_min_ms() {
  local -n arr=$1
  local count=${#arr[@]}
  if [ $count -eq 0 ]; then
    echo "N/A"
    return
  fi
  local min=${arr[0]}
  for d in "${arr[@]}"; do
    if [ $d -lt $min ]; then
      min=$d
    fi
  done
  echo "scale=2; $min / 1000000" | bc
}

compute_max_ms() {
  local -n arr=$1
  local count=${#arr[@]}
  if [ $count -eq 0 ]; then
    echo "N/A"
    return
  fi
  local max=${arr[0]}
  for d in "${arr[@]}"; do
    if [ $d -gt $max ]; then
      max=$d
    fi
  done
  echo "scale=2; $max / 1000000" | bc
}

compute_tps() {
  local total_ns=$1
  local success_count=$2
  if [ "$success_count" -eq 0 ] || [ "$total_ns" -eq 0 ]; then
    echo "N/A"
    return
  fi
  echo "scale=4; $success_count / ($total_ns / 1000000000)" | bc
}

CREATE_SUCCESS=$((NUM_ITEMS - CREATE_FAILURES))
QUERY_SUCCESS=$((NUM_ITEMS - QUERY_FAILURES))
BMU_SUCCESS=$((NUM_ITEMS - BMU_FAILURES))

CREATE_AVG=$(compute_avg_ms CREATE_DURATIONS)
CREATE_MIN=$(compute_min_ms CREATE_DURATIONS)
CREATE_MAX=$(compute_max_ms CREATE_DURATIONS)
CREATE_TPS=$(compute_tps $CREATE_TOTAL_NS $CREATE_SUCCESS)

QUERY_AVG=$(compute_avg_ms QUERY_DURATIONS)
QUERY_MIN=$(compute_min_ms QUERY_DURATIONS)
QUERY_MAX=$(compute_max_ms QUERY_DURATIONS)

BMU_AVG=$(compute_avg_ms BMU_DURATIONS)
BMU_MIN=$(compute_min_ms BMU_DURATIONS)
BMU_MAX=$(compute_max_ms BMU_DURATIONS)
BMU_TPS=$(compute_tps $BMU_TOTAL_NS $BMU_SUCCESS)

CREATE_TOTAL_SEC=$(echo "scale=2; $CREATE_TOTAL_NS / 1000000000" | bc)
QUERY_TOTAL_SEC=$(echo "scale=2; $QUERY_TOTAL_NS / 1000000000" | bc)
BMU_TOTAL_SEC=$(echo "scale=2; $BMU_TOTAL_NS / 1000000000" | bc)

########################################
# Summary
########################################
echo ""
echo "============================================================"
echo " BENCHMARK RESULTS SUMMARY"
echo "============================================================"
echo ""
printf "%-30s %15s %15s %15s\n" "" "Passport Create" "Passport Query" "BMU Record"
printf "%-30s %15s %15s %15s\n" "------------------------------" "---------------" "---------------" "---------------"
printf "%-30s %15s %15s %15s\n" "Total items"       "$NUM_ITEMS"       "$NUM_ITEMS"       "$NUM_ITEMS"
printf "%-30s %15s %15s %15s\n" "Successes"          "$CREATE_SUCCESS"  "$QUERY_SUCCESS"   "$BMU_SUCCESS"
printf "%-30s %15s %15s %15s\n" "Failures"           "$CREATE_FAILURES" "$QUERY_FAILURES"  "$BMU_FAILURES"
printf "%-30s %15s %15s %15s\n" "Total time (sec)"   "$CREATE_TOTAL_SEC" "$QUERY_TOTAL_SEC" "$BMU_TOTAL_SEC"
printf "%-30s %15s %15s %15s\n" "Avg latency (ms)"   "$CREATE_AVG"      "$QUERY_AVG"       "$BMU_AVG"
printf "%-30s %15s %15s %15s\n" "Min latency (ms)"   "$CREATE_MIN"      "$QUERY_MIN"       "$BMU_MIN"
printf "%-30s %15s %15s %15s\n" "Max latency (ms)"   "$CREATE_MAX"      "$QUERY_MAX"       "$BMU_MAX"
printf "%-30s %15s %15s %15s\n" "TPS (effective)"     "$CREATE_TPS"      "N/A"              "$BMU_TPS"
echo ""
echo "============================================================"
echo " Benchmark completed at $(date)"
echo "============================================================"
