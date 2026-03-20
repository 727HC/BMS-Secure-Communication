#!/usr/bin/env bash
#
# Copyright IBM Corp All Rights Reserved
#
# SPDX-License-Identifier: Apache-2.0
#

# This is a collection of bash functions used by different scripts

# imports
NETWORK_HOME=${NETWORK_HOME:-${PWD}}
. ${NETWORK_HOME}/scripts/utils.sh

export CORE_PEER_TLS_ENABLED=true
export ORDERER_CA=${NETWORK_HOME}/organizations/ordererOrganizations/battery.com/tlsca/tlsca.battery.com-cert.pem
export PEER0_MANUFACTURER_CA=${NETWORK_HOME}/organizations/peerOrganizations/manufacturer.battery.com/tlsca/tlsca.manufacturer.battery.com-cert.pem
export PEER0_EVMANUFACTURER_CA=${NETWORK_HOME}/organizations/peerOrganizations/evmanufacturer.battery.com/tlsca/tlsca.evmanufacturer.battery.com-cert.pem
export PEER0_SERVICE_CA=${NETWORK_HOME}/organizations/peerOrganizations/service.battery.com/tlsca/tlsca.service.battery.com-cert.pem
export PEER0_REGULATOR_CA=${NETWORK_HOME}/organizations/peerOrganizations/regulator.battery.com/tlsca/tlsca.regulator.battery.com-cert.pem

# Set environment variables for the peer org
setGlobals() {
  local USING_ORG=""
  if [ -z "$OVERRIDE_ORG" ]; then
    USING_ORG=$1
  else
    USING_ORG="${OVERRIDE_ORG}"
  fi
  infoln "Using organization ${USING_ORG}"
  if [ $USING_ORG -eq 1 ]; then
    export CORE_PEER_LOCALMSPID=ManufacturerMSP
    export CORE_PEER_TLS_ROOTCERT_FILE=$PEER0_MANUFACTURER_CA
    export CORE_PEER_MSPCONFIGPATH=${NETWORK_HOME}/organizations/peerOrganizations/manufacturer.battery.com/users/Admin@manufacturer.battery.com/msp
    export CORE_PEER_ADDRESS=localhost:7051
  elif [ $USING_ORG -eq 2 ]; then
    export CORE_PEER_LOCALMSPID=EVManufacturerMSP
    export CORE_PEER_TLS_ROOTCERT_FILE=$PEER0_EVMANUFACTURER_CA
    export CORE_PEER_MSPCONFIGPATH=${NETWORK_HOME}/organizations/peerOrganizations/evmanufacturer.battery.com/users/Admin@evmanufacturer.battery.com/msp
    export CORE_PEER_ADDRESS=localhost:9051
  elif [ $USING_ORG -eq 3 ]; then
    export CORE_PEER_LOCALMSPID=ServiceMSP
    export CORE_PEER_TLS_ROOTCERT_FILE=$PEER0_SERVICE_CA
    export CORE_PEER_MSPCONFIGPATH=${NETWORK_HOME}/organizations/peerOrganizations/service.battery.com/users/Admin@service.battery.com/msp
    export CORE_PEER_ADDRESS=localhost:11051
  elif [ $USING_ORG -eq 4 ]; then
    export CORE_PEER_LOCALMSPID=RegulatorMSP
    export CORE_PEER_TLS_ROOTCERT_FILE=$PEER0_REGULATOR_CA
    export CORE_PEER_MSPCONFIGPATH=${NETWORK_HOME}/organizations/peerOrganizations/regulator.battery.com/users/Admin@regulator.battery.com/msp
    export CORE_PEER_ADDRESS=localhost:13051
  else
    errorln "ORG Unknown"
  fi

  if [ "$VERBOSE" = "true" ]; then
    env | grep CORE
  fi
}

# Set environment variables for the orderer
setOrdererGlobals() {
  export ORDERER_CA=${NETWORK_HOME}/organizations/ordererOrganizations/battery.com/tlsca/tlsca.battery.com-cert.pem
  export ORDERER_ADMIN_TLS_SIGN_CERT=${NETWORK_HOME}/organizations/ordererOrganizations/battery.com/orderers/orderer.battery.com/tls/server.crt
  export ORDERER_ADMIN_TLS_PRIVATE_KEY=${NETWORK_HOME}/organizations/ordererOrganizations/battery.com/orderers/orderer.battery.com/tls/server.key
}

# parsePeerConnectionParameters $@
# Helper function that sets the peer connection parameters for a chaincode
# operation
parsePeerConnectionParameters() {
  PEER_CONN_PARMS=()
  PEERS=""
  while [ "$#" -gt 0 ]; do
    setGlobals $1
    PEER="peer0.org$1"
    ## Set peer addresses
    if [ -z "$PEERS" ]; then
      PEERS="$PEER"
    else
      PEERS="$PEERS $PEER"
    fi
    PEER_CONN_PARMS=("${PEER_CONN_PARMS[@]}" --peerAddresses $CORE_PEER_ADDRESS)
    ## Set path to TLS certificate
    if [ $1 -eq 1 ]; then
      TLSINFO=(--tlsRootCertFiles "${PEER0_MANUFACTURER_CA}")
    elif [ $1 -eq 2 ]; then
      TLSINFO=(--tlsRootCertFiles "${PEER0_EVMANUFACTURER_CA}")
    elif [ $1 -eq 3 ]; then
      TLSINFO=(--tlsRootCertFiles "${PEER0_SERVICE_CA}")
    elif [ $1 -eq 4 ]; then
      TLSINFO=(--tlsRootCertFiles "${PEER0_REGULATOR_CA}")
    fi
    PEER_CONN_PARMS=("${PEER_CONN_PARMS[@]}" "${TLSINFO[@]}")
    # shift by one to get to the next organization
    shift
  done
}

verifyResult() {
  if [ $1 -ne 0 ]; then
    fatalln "$2"
  fi
}
