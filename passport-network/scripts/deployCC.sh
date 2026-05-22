#!/usr/bin/env bash

source scripts/utils.sh

CHANNEL_NAME=""
CC_NAME=""
CC_SRC_PATH=""
CC_SRC_LANGUAGE=""
CC_VERSION="1.0"
CC_SEQUENCE="1"
CC_INIT_FCN="NA"
CC_END_POLICY="NA"
CC_COLL_CONFIG="NA"
DELAY="3"
MAX_RETRY="5"
VERBOSE="false"
CHAINCODE_INSTALL_ORGS="${CHAINCODE_INSTALL_ORGS:-1,2,3,4}"

# Parse command line arguments
while [[ $# -ge 1 ]] ; do
  key="$1"
  case $key in
  -c )
    CHANNEL_NAME="$2"
    shift
    ;;
  -ccn )
    CC_NAME="$2"
    shift
    ;;
  -ccp )
    CC_SRC_PATH="$2"
    shift
    ;;
  -ccl )
    CC_SRC_LANGUAGE="$2"
    shift
    ;;
  -ccv )
    CC_VERSION="$2"
    shift
    ;;
  -ccs )
    CC_SEQUENCE="$2"
    shift
    ;;
  -cci )
    CC_INIT_FCN="$2"
    shift
    ;;
  -ccep )
    CC_END_POLICY="$2"
    shift
    ;;
  -cccg )
    CC_COLL_CONFIG="$2"
    shift
    ;;
  -d )
    DELAY="$2"
    shift
    ;;
  -r )
    MAX_RETRY="$2"
    shift
    ;;
  -verbose )
    VERBOSE=true
    ;;
  * )
    errorln "Unknown flag: $key"
    exit 1
    ;;
  esac
  shift
done

: ${CHANNEL_NAME:="passportchannel"}
: ${CC_NAME:="passport"}

println "executing with the following"
println "- CHANNEL_NAME: ${C_GREEN}${CHANNEL_NAME}${C_RESET}"
println "- CC_NAME: ${C_GREEN}${CC_NAME}${C_RESET}"
println "- CC_SRC_PATH: ${C_GREEN}${CC_SRC_PATH}${C_RESET}"
println "- CC_SRC_LANGUAGE: ${C_GREEN}${CC_SRC_LANGUAGE}${C_RESET}"
println "- CC_VERSION: ${C_GREEN}${CC_VERSION}${C_RESET}"
println "- CC_SEQUENCE: ${C_GREEN}${CC_SEQUENCE}${C_RESET}"
println "- CC_END_POLICY: ${C_GREEN}${CC_END_POLICY}${C_RESET}"
println "- CC_COLL_CONFIG: ${C_GREEN}${CC_COLL_CONFIG}${C_RESET}"
println "- CC_INIT_FCN: ${C_GREEN}${CC_INIT_FCN}${C_RESET}"
println "- DELAY: ${C_GREEN}${DELAY}${C_RESET}"
println "- MAX_RETRY: ${C_GREEN}${MAX_RETRY}${C_RESET}"
println "- VERBOSE: ${C_GREEN}${VERBOSE}${C_RESET}"
println "- CHAINCODE_INSTALL_ORGS: ${C_GREEN}${CHAINCODE_INSTALL_ORGS}${C_RESET}"

INIT_REQUIRED="--init-required"
# check if the init fcn should be called
if [ "$CC_INIT_FCN" = "NA" ]; then
  INIT_REQUIRED=""
fi

if [ "$CC_END_POLICY" = "NA" ]; then
  CC_END_POLICY=""
else
  CC_END_POLICY="--signature-policy $CC_END_POLICY"
fi

if [ "$CC_COLL_CONFIG" = "NA" ]; then
  CC_COLL_CONFIG=""
else
  CC_COLL_CONFIG="--collections-config $CC_COLL_CONFIG"
fi

FABRIC_CFG_PATH=$PWD/../fabric-samples/config/

# import utils
. scripts/envVar.sh

function checkPrereqs() {
  jq --version > /dev/null 2>&1

  if [[ $? -ne 0 ]]; then
    errorln "jq command not found..."
    errorln
    errorln "Follow the instructions in the Fabric docs to install the prereqs"
    errorln "https://hyperledger-fabric.readthedocs.io/en/latest/prereqs.html"
    exit 1
  fi
}

# installChaincode PEER ORG
function installChaincode() {
  ORG=$1
  setGlobals $ORG
  set -x
  peer lifecycle chaincode queryinstalled --output json | jq -r 'try (.installed_chaincodes[].package_id)' | grep ^${PACKAGE_ID}$ >&log.txt
  if test $? -ne 0; then
    peer lifecycle chaincode install ${CC_NAME}.tar.gz >&log.txt
    res=$?
  fi
  { set +x; } 2>/dev/null
  cat log.txt
  verifyResult $res "Chaincode installation on peer0.org${ORG} has failed"
  successln "Chaincode is installed on peer0.org${ORG}"
}

function orgName() {
  case "$1" in
    1) echo "manufacturer" ;;
    2) echo "evmanufacturer" ;;
    3) echo "service" ;;
    4) echo "regulator" ;;
    *) echo "" ;;
  esac
}

function installChaincodeForConfiguredOrgs() {
  local install_orgs=()
  local org org_name
  IFS=',' read -r -a install_orgs <<< "${CHAINCODE_INSTALL_ORGS}"
  if [ "${#install_orgs[@]}" -eq 0 ]; then
    errorln "CHAINCODE_INSTALL_ORGS must include at least one org number"
    exit 1
  fi

  for org in "${install_orgs[@]}"; do
    org="${org//[[:space:]]/}"
    org_name="$(orgName "${org}")"
    if [ -z "${org_name}" ]; then
      errorln "Invalid CHAINCODE_INSTALL_ORGS entry '${org}'. Expected comma-separated org numbers from 1 to 4."
      exit 1
    fi
    infoln "Installing chaincode on peer0.${org_name}..."
    installChaincode "${org}"
  done

  QUERY_INSTALLED_ORG="${install_orgs[0]//[[:space:]]/}"
}

# queryInstalled PEER ORG
function queryInstalled() {
  ORG=$1
  setGlobals $ORG
  set -x
  peer lifecycle chaincode queryinstalled --output json | jq -r 'try (.installed_chaincodes[].package_id)' | grep ^${PACKAGE_ID}$ >&log.txt
  res=$?
  { set +x; } 2>/dev/null
  cat log.txt
  verifyResult $res "Query installed on peer0.org${ORG} has failed"
  successln "Query installed successful on peer0.org${ORG} on channel"
}

# approveForMyOrg VERSION PEER ORG
function approveForMyOrg() {
  ORG=$1
  setGlobals $ORG
  set -x
  peer lifecycle chaincode approveformyorg -o localhost:7050 --ordererTLSHostnameOverride orderer.battery.com --tls --cafile "$ORDERER_CA" --channelID $CHANNEL_NAME --name ${CC_NAME} --version ${CC_VERSION} --package-id ${PACKAGE_ID} --sequence ${CC_SEQUENCE} ${INIT_REQUIRED} ${CC_END_POLICY} ${CC_COLL_CONFIG} >&log.txt
  res=$?
  { set +x; } 2>/dev/null
  cat log.txt
  verifyResult $res "Chaincode definition approved on peer0.org${ORG} on channel '$CHANNEL_NAME' failed"
  successln "Chaincode definition approved on peer0.org${ORG} on channel '$CHANNEL_NAME'"
}

# checkCommitReadiness VERSION PEER ORG
function checkCommitReadiness() {
  ORG=$1
  shift 1
  setGlobals $ORG
  infoln "Checking the commit readiness of the chaincode definition on peer0.org${ORG} on channel '$CHANNEL_NAME'..."
  local rc=1
  local COUNTER=1
  while [ $rc -ne 0 -a $COUNTER -lt $MAX_RETRY ]; do
    sleep $DELAY
    infoln "Attempting to check the commit readiness of the chaincode definition on peer0.org${ORG}, Retry after $DELAY seconds."
    set -x
    peer lifecycle chaincode checkcommitreadiness --channelID $CHANNEL_NAME --name ${CC_NAME} --version ${CC_VERSION} --sequence ${CC_SEQUENCE} ${INIT_REQUIRED} ${CC_END_POLICY} ${CC_COLL_CONFIG} --output json >&log.txt
    res=$?
    { set +x; } 2>/dev/null
    let rc=0
    for var in "$@"; do
      grep "$var" log.txt &>/dev/null || let rc=1
    done
    COUNTER=$(expr $COUNTER + 1)
  done
  cat log.txt
  if test $rc -eq 0; then
    infoln "Checking the commit readiness of the chaincode definition successful on peer0.org${ORG} on channel '$CHANNEL_NAME'"
  else
    fatalln "After $MAX_RETRY attempts, Check commit readiness result on peer0.org${ORG} is INVALID!"
  fi
}

# commitChaincodeDefinition VERSION PEER ORG (PEER ORG)...
function commitChaincodeDefinition() {
  parsePeerConnectionParameters $@
  res=$?
  verifyResult $res "Invoke transaction failed on channel '$CHANNEL_NAME' due to uneven number of peer and org parameters "

  set -x
  peer lifecycle chaincode commit -o localhost:7050 --ordererTLSHostnameOverride orderer.battery.com --tls --cafile "$ORDERER_CA" --channelID $CHANNEL_NAME --name ${CC_NAME} "${PEER_CONN_PARMS[@]}" --version ${CC_VERSION} --sequence ${CC_SEQUENCE} ${INIT_REQUIRED} ${CC_END_POLICY} ${CC_COLL_CONFIG} >&log.txt
  res=$?
  { set +x; } 2>/dev/null
  cat log.txt
  verifyResult $res "Chaincode definition commit failed on peer0.org${ORG} on channel '$CHANNEL_NAME' failed"
  successln "Chaincode definition committed on channel '$CHANNEL_NAME'"
}

# queryCommitted ORG
function queryCommitted() {
  ORG=$1
  setGlobals $ORG
  EXPECTED_RESULT="Version: ${CC_VERSION}, Sequence: ${CC_SEQUENCE}, Endorsement Plugin: escc, Validation Plugin: vscc"
  infoln "Querying chaincode definition on peer0.org${ORG} on channel '$CHANNEL_NAME'..."
  local rc=1
  local COUNTER=1
  while [ $rc -ne 0 -a $COUNTER -lt $MAX_RETRY ]; do
    sleep $DELAY
    infoln "Attempting to Query committed status on peer0.org${ORG}, Retry after $DELAY seconds."
    set -x
    peer lifecycle chaincode querycommitted --channelID $CHANNEL_NAME --name ${CC_NAME} >&log.txt
    res=$?
    { set +x; } 2>/dev/null
    test $res -eq 0 && VALUE=$(cat log.txt | grep -o '^Version: '$CC_VERSION', Sequence: [0-9]*, Endorsement Plugin: escc, Validation Plugin: vscc')
    test "$VALUE" = "$EXPECTED_RESULT" && let rc=0
    COUNTER=$(expr $COUNTER + 1)
  done
  cat log.txt
  if test $rc -eq 0; then
    successln "Query chaincode definition successful on peer0.org${ORG} on channel '$CHANNEL_NAME'"
  else
    fatalln "After $MAX_RETRY attempts, Query chaincode definition result on peer0.org${ORG} is INVALID!"
  fi
}

function chaincodeInvokeInit() {
  parsePeerConnectionParameters $@
  res=$?
  verifyResult $res "Invoke transaction failed on channel '$CHANNEL_NAME' due to uneven number of peer and org parameters "

  local rc=1
  local COUNTER=1
  local fcn_call='{"function":"'${CC_INIT_FCN}'","Args":[]}'
  while [ $rc -ne 0 -a $COUNTER -lt $MAX_RETRY ]; do
    sleep $DELAY
    set -x
    infoln "invoke fcn call:${fcn_call}"
    peer chaincode invoke -o localhost:7050 --ordererTLSHostnameOverride orderer.battery.com --tls --cafile "$ORDERER_CA" -C $CHANNEL_NAME -n ${CC_NAME} "${PEER_CONN_PARMS[@]}" --isInit -c ${fcn_call} >&log.txt
    res=$?
    { set +x; } 2>/dev/null
    let rc=$res
    COUNTER=$(expr $COUNTER + 1)
  done
  cat log.txt
  verifyResult $res "Invoke execution on $PEERS failed "
  successln "Invoke transaction successful on $PEERS on channel '$CHANNEL_NAME'"
}

function packageChaincode() {
  CC_SRC_LANGUAGE=$(echo "$CC_SRC_LANGUAGE" | tr [:upper:] [:lower:])

  if [ "$CC_SRC_LANGUAGE" = "go" ]; then
    CC_RUNTIME_LANGUAGE=golang
    infoln "Vendoring Go dependencies at $CC_SRC_PATH"
    pushd $CC_SRC_PATH
    GO111MODULE=on go mod vendor
    popd
    successln "Finished vendoring Go dependencies"
  elif [ "$CC_SRC_LANGUAGE" = "java" ]; then
    CC_RUNTIME_LANGUAGE=java
    infoln "Compiling Java code..."
    pushd $CC_SRC_PATH
    ./gradlew installDist
    popd
    successln "Finished compiling Java code"
    CC_SRC_PATH=$CC_SRC_PATH/build/install/$CC_NAME
  elif [ "$CC_SRC_LANGUAGE" = "javascript" ]; then
    CC_RUNTIME_LANGUAGE=node
  elif [ "$CC_SRC_LANGUAGE" = "typescript" ]; then
    CC_RUNTIME_LANGUAGE=node
    infoln "Compiling TypeScript code into JavaScript..."
    pushd $CC_SRC_PATH
    npm install
    npm run build
    popd
    successln "Finished compiling TypeScript code into JavaScript"
  else
    fatalln "The chaincode language ${CC_SRC_LANGUAGE} is not supported by this script. Supported chaincode languages are: go, java, javascript, and typescript"
  fi

  set -x
  peer lifecycle chaincode package ${CC_NAME}.tar.gz --path ${CC_SRC_PATH} --lang ${CC_RUNTIME_LANGUAGE} --label ${CC_NAME}_${CC_VERSION} >&log.txt
  res=$?
  { set +x; } 2>/dev/null
  cat log.txt
  verifyResult $res "Chaincode packaging has failed"
  successln "Chaincode is packaged"
}

#check for prerequisites
checkPrereqs

## package the chaincode
packageChaincode

PACKAGE_ID=$(peer lifecycle chaincode calculatepackageid ${CC_NAME}.tar.gz)

## Install chaincode on configured peers.
## Default keeps the historical all-4-org behavior. Operators may narrow
## package installation to the orgs that need to execute the chaincode while
## leaving definition approvals and channel commit validation unchanged.
QUERY_INSTALLED_ORG=1
installChaincodeForConfiguredOrgs

## query whether the chaincode is installed
queryInstalled "${QUERY_INSTALLED_ORG}"

## approve the definition for each org
approveForMyOrg 1

## check whether the chaincode definition is ready to be committed
checkCommitReadiness 1 "\"ManufacturerMSP\": true" "\"EVManufacturerMSP\": false" "\"ServiceMSP\": false" "\"RegulatorMSP\": false"

## approve for org2
approveForMyOrg 2

## check commit readiness
checkCommitReadiness 1 "\"ManufacturerMSP\": true" "\"EVManufacturerMSP\": true" "\"ServiceMSP\": false" "\"RegulatorMSP\": false"

## approve for org3
approveForMyOrg 3

## check commit readiness
checkCommitReadiness 1 "\"ManufacturerMSP\": true" "\"EVManufacturerMSP\": true" "\"ServiceMSP\": true" "\"RegulatorMSP\": false"

## approve for org4
approveForMyOrg 4

## check whether all orgs have approved
checkCommitReadiness 1 "\"ManufacturerMSP\": true" "\"EVManufacturerMSP\": true" "\"ServiceMSP\": true" "\"RegulatorMSP\": true"

## now that we know for sure all orgs have approved, commit the definition
commitChaincodeDefinition 1 2 3 4

## query on all orgs to see that the definition committed successfully
queryCommitted 1
queryCommitted 2
queryCommitted 3
queryCommitted 4

## Invoke the chaincode - this does require that the chaincode have the 'initLedger'
## method defined
if [ "$CC_INIT_FCN" = "NA" ]; then
  infoln "Chaincode initialization is not required"
else
  chaincodeInvokeInit 1 2 3 4
fi

exit 0
