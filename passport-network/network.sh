#!/usr/bin/env bash
#
# Battery Passport Network Management Script
#
# This script brings up a Hyperledger Fabric network for the Battery Passport
# platform. The network consists of four organizations (Manufacturer,
# EVManufacturer, Service, Regulator) with one peer each, and a single node
# Raft ordering service.

ROOTDIR=$(cd "$(dirname "$0")" && pwd)
export PATH=${ROOTDIR}/../fabric-samples/bin:${PWD}/../fabric-samples/bin:$PATH
export FABRIC_CFG_PATH=${PWD}/configtx
export VERBOSE=false

# push to the required directory & set a trap to go back if needed
pushd ${ROOTDIR} > /dev/null
trap "popd > /dev/null" EXIT

. scripts/utils.sh

: ${CONTAINER_CLI:="docker"}
if command -v ${CONTAINER_CLI}-compose > /dev/null 2>&1; then
    : ${CONTAINER_CLI_COMPOSE:="${CONTAINER_CLI}-compose"}
else
    : ${CONTAINER_CLI_COMPOSE:="${CONTAINER_CLI} compose"}
fi
infoln "Using ${CONTAINER_CLI} and ${CONTAINER_CLI_COMPOSE}"

# Obtain CONTAINER_IDS and remove them
function clearContainers() {
  infoln "Removing remaining containers"
  ${CONTAINER_CLI} rm -f $(${CONTAINER_CLI} ps -aq --filter label=service=hyperledger-fabric) 2>/dev/null || true
  ${CONTAINER_CLI} rm -f $(${CONTAINER_CLI} ps -aq --filter name='dev-peer*') 2>/dev/null || true
  ${CONTAINER_CLI} kill "$(${CONTAINER_CLI} ps -q --filter name=ccaas)" 2>/dev/null || true
}

# Delete any images that were generated as a part of this setup
function removeUnwantedImages() {
  infoln "Removing generated chaincode docker images"
  ${CONTAINER_CLI} image rm -f $(${CONTAINER_CLI} images -aq --filter reference='dev-peer*') 2>/dev/null || true
}

# Do some basic sanity checking to make sure that the appropriate versions of fabric
# binaries/images are available.
function checkPrereqs() {
  peer version > /dev/null 2>&1

  if [[ $? -ne 0 || ! -d "../fabric-samples/config" ]]; then
    errorln "Peer binary and configuration files not found.."
    errorln
    errorln "Follow the instructions in the Fabric docs to install the Fabric Binaries:"
    errorln "https://hyperledger-fabric.readthedocs.io/en/latest/install.html"
    exit 1
  fi

  LOCAL_VERSION=$(peer version | sed -ne 's/^ Version: //p')
  DOCKER_IMAGE_VERSION=$(${CONTAINER_CLI} run --rm hyperledger/fabric-peer:latest peer version | sed -ne 's/^ Version: //p')

  infoln "LOCAL_VERSION=$LOCAL_VERSION"
  infoln "DOCKER_IMAGE_VERSION=$DOCKER_IMAGE_VERSION"

  if [ "$LOCAL_VERSION" != "$DOCKER_IMAGE_VERSION" ]; then
    warnln "Local fabric binaries and docker images are out of sync. This may cause problems."
  fi

  ## Check for fabric-ca
  if [ "$CRYPTO" == "Certificate Authorities" ]; then
    fabric-ca-client version > /dev/null 2>&1
    if [[ $? -ne 0 ]]; then
      errorln "fabric-ca-client binary not found.."
      errorln
      errorln "Follow the instructions in the Fabric docs to install the Fabric Binaries:"
      errorln "https://hyperledger-fabric.readthedocs.io/en/latest/install.html"
      exit 1
    fi
    CA_LOCAL_VERSION=$(fabric-ca-client version | sed -ne 's/ Version: //p')
    CA_DOCKER_IMAGE_VERSION=$(${CONTAINER_CLI} run --rm hyperledger/fabric-ca:latest fabric-ca-client version | sed -ne 's/ Version: //p' | head -1)
    infoln "CA_LOCAL_VERSION=$CA_LOCAL_VERSION"
    infoln "CA_DOCKER_IMAGE_VERSION=$CA_DOCKER_IMAGE_VERSION"

    if [ "$CA_LOCAL_VERSION" != "$CA_DOCKER_IMAGE_VERSION" ]; then
      warnln "Local fabric-ca binaries and docker images are out of sync. This may cause problems."
    fi
  fi
}

# Create Organization crypto material using Fabric CAs
function createOrgs() {
  if [ -d "organizations/peerOrganizations" ]; then
    rm -Rf organizations/peerOrganizations && rm -Rf organizations/ordererOrganizations
  fi

  # Create crypto material using Fabric CA
  if [ "$CRYPTO" == "Certificate Authorities" ]; then
    infoln "Generating certificates using Fabric CA"
    ${CONTAINER_CLI_COMPOSE} -f compose/${COMPOSE_FILE_CA} up -d 2>&1

    . organizations/registerEnroll.sh

    # Make sure CA files have been created
    while :
    do
      if [ ! -f "organizations/fabric-ca/manufacturer/tls-cert.pem" ]; then
        sleep 1
      else
        break
      fi
    done

    # Make sure CA service is initialized and can accept requests
    export FABRIC_CA_CLIENT_HOME=${PWD}/organizations/peerOrganizations/manufacturer.battery.com/
    COUNTER=0
    rc=1
    while [[ $rc -ne 0 && $COUNTER -lt $MAX_RETRY ]]; do
      sleep 1
      set -x
      : "${CA_ADMIN_USER:?CA_ADMIN_USER must be set}"
      : "${CA_ADMIN_PASSWORD:?CA_ADMIN_PASSWORD must be set}"
      fabric-ca-client getcainfo -u "https://${CA_ADMIN_USER}:${CA_ADMIN_PASSWORD}@localhost:7054" --caname ca-manufacturer --tls.certfiles "${PWD}/organizations/fabric-ca/manufacturer/ca-cert.pem"
      res=$?
      { set +x; } 2>/dev/null
      rc=$res
      COUNTER=$((COUNTER + 1))
    done

    infoln "Creating Manufacturer Identities"
    createManufacturer

    infoln "Creating EVManufacturer Identities"
    createEVManufacturer

    infoln "Creating Service Identities"
    createService

    infoln "Creating Regulator Identities"
    createRegulator

    infoln "Creating Orderer Org Identities"
    createOrderer
  fi

  infoln "Generating CCP files for all organizations"
  ./organizations/ccp-generate.sh
}

# Bring up the peer and orderer nodes using docker compose.
function networkUp() {
  checkPrereqs

  # generate artifacts if they don't exist
  if [ ! -d "organizations/peerOrganizations" ]; then
    createOrgs
  fi

  # rich query(GetQueryResult) 지원을 위해 CouchDB를 항상 포함
  COMPOSE_FILES="-f compose/${COMPOSE_FILE_BASE} -f compose/${COMPOSE_FILE_COUCH}"

  ${CONTAINER_CLI_COMPOSE} ${COMPOSE_FILES} up -d 2>&1

  $CONTAINER_CLI ps -a
  if [ $? -ne 0 ]; then
    fatalln "Unable to start network"
  fi
}

# call the script to create the channel, join the peers,
# and then update the anchor peers for each organization
function createChannel() {
  # Bring up the network if it is not already up.
  bringUpNetwork="false"

  if ! $CONTAINER_CLI info > /dev/null 2>&1 ; then
    fatalln "$CONTAINER_CLI network is required to be running to create a channel"
  fi

  # check if all containers are present
  CONTAINERS=($($CONTAINER_CLI ps | grep hyperledger/ | awk '{print $2}'))
  len=$(echo ${#CONTAINERS[@]})

  if [[ $len -ge 4 ]] && [[ ! -d "organizations/peerOrganizations" ]]; then
    echo "Bringing network down to sync certs with containers"
    networkDown
  fi

  [[ $len -lt 4 ]] || [[ ! -d "organizations/peerOrganizations" ]] && bringUpNetwork="true" || echo "Network Running Already"

  if [ $bringUpNetwork == "true"  ]; then
    infoln "Bringing up network"
    networkUp
  fi

  # now run the script that creates a channel
  scripts/createChannel.sh $CHANNEL_NAME $CLI_DELAY $MAX_RETRY $VERBOSE
}

## Call the script to deploy a chaincode to the channel
function deployCC() {
  scripts/deployCC.sh -c $CHANNEL_NAME -ccn $CC_NAME -ccp $CC_SRC_PATH -ccl $CC_SRC_LANGUAGE -ccv $CC_VERSION -ccs $CC_SEQUENCE ${CC_INIT_FCN:+-cci $CC_INIT_FCN} ${CC_END_POLICY_FLAG} ${CC_COLL_CONFIG_FLAG} -d $CLI_DELAY -r $MAX_RETRY ${VERBOSE_FLAG}

  if [ $? -ne 0 ]; then
    fatalln "Deploying chaincode failed"
  fi
}

# Tear down running network
function networkDown() {
  COMPOSE_BASE_FILES="-f compose/${COMPOSE_FILE_BASE}"
  COMPOSE_COUCH_FILES="-f compose/${COMPOSE_FILE_COUCH}"
  COMPOSE_CA_FILES="-f compose/${COMPOSE_FILE_CA}"
  COMPOSE_FILES="${COMPOSE_BASE_FILES} ${COMPOSE_COUCH_FILES} ${COMPOSE_CA_FILES}"

  ${CONTAINER_CLI_COMPOSE} ${COMPOSE_FILES} down --volumes --remove-orphans 2>/dev/null

  # Cleanup the chaincode containers
  clearContainers
  # Cleanup images
  removeUnwantedImages

  # remove orderer block and other channel configuration transactions and certs
  ${CONTAINER_CLI} run --rm -v "$(pwd):/data" busybox sh -c 'cd /data && rm -rf channel-artifacts/*.block organizations/peerOrganizations organizations/ordererOrganizations'
  ## remove fabric ca artifacts
  ${CONTAINER_CLI} run --rm -v "$(pwd):/data" busybox sh -c 'cd /data && rm -rf organizations/fabric-ca/manufacturer/msp organizations/fabric-ca/manufacturer/tls-cert.pem organizations/fabric-ca/manufacturer/ca-cert.pem organizations/fabric-ca/manufacturer/IssuerPublicKey organizations/fabric-ca/manufacturer/IssuerRevocationPublicKey organizations/fabric-ca/manufacturer/fabric-ca-server.db'
  ${CONTAINER_CLI} run --rm -v "$(pwd):/data" busybox sh -c 'cd /data && rm -rf organizations/fabric-ca/evmanufacturer/msp organizations/fabric-ca/evmanufacturer/tls-cert.pem organizations/fabric-ca/evmanufacturer/ca-cert.pem organizations/fabric-ca/evmanufacturer/IssuerPublicKey organizations/fabric-ca/evmanufacturer/IssuerRevocationPublicKey organizations/fabric-ca/evmanufacturer/fabric-ca-server.db'
  ${CONTAINER_CLI} run --rm -v "$(pwd):/data" busybox sh -c 'cd /data && rm -rf organizations/fabric-ca/service/msp organizations/fabric-ca/service/tls-cert.pem organizations/fabric-ca/service/ca-cert.pem organizations/fabric-ca/service/IssuerPublicKey organizations/fabric-ca/service/IssuerRevocationPublicKey organizations/fabric-ca/service/fabric-ca-server.db'
  ${CONTAINER_CLI} run --rm -v "$(pwd):/data" busybox sh -c 'cd /data && rm -rf organizations/fabric-ca/regulator/msp organizations/fabric-ca/regulator/tls-cert.pem organizations/fabric-ca/regulator/ca-cert.pem organizations/fabric-ca/regulator/IssuerPublicKey organizations/fabric-ca/regulator/IssuerRevocationPublicKey organizations/fabric-ca/regulator/fabric-ca-server.db'
  ${CONTAINER_CLI} run --rm -v "$(pwd):/data" busybox sh -c 'cd /data && rm -rf organizations/fabric-ca/ordererOrg/msp organizations/fabric-ca/ordererOrg/tls-cert.pem organizations/fabric-ca/ordererOrg/ca-cert.pem organizations/fabric-ca/ordererOrg/IssuerPublicKey organizations/fabric-ca/ordererOrg/IssuerRevocationPublicKey organizations/fabric-ca/ordererOrg/fabric-ca-server.db'
  # remove channel and script artifacts
  ${CONTAINER_CLI} run --rm -v "$(pwd):/data" busybox sh -c 'cd /data && rm -rf channel-artifacts log.txt *.tar.gz'
}

# use this as the default docker-compose yaml definition
COMPOSE_FILE_BASE=compose-net.yaml
# CouchDB는 DID rich query 지원에 필수 — 기본 포함
COMPOSE_FILE_COUCH=compose-couch.yaml
# certificate authorities compose file
COMPOSE_FILE_CA=compose-ca.yaml

# default channel name
CHANNEL_NAME="passportchannel"

# default chaincode settings
CC_NAME="passport"
CC_SRC_PATH="NA"
CC_SRC_LANGUAGE="go"
CC_VERSION="1.0"
CC_SEQUENCE="1"
CC_INIT_FCN=""
CC_END_POLICY="NA"
CC_COLL_CONFIG="NA"

# default image tag
IMAGETAG="latest"
CA_IMAGETAG="latest"

# default cli delays and retries
MAX_RETRY=5
CLI_DELAY=3

# Get docker sock path from environment variable
SOCK="${DOCKER_HOST:-/var/run/docker.sock}"
DOCKER_SOCK="${SOCK##unix://}"

## Parse mode
if [[ $# -lt 1 ]] ; then
  println "Usage: "
  println "  network.sh <Mode> [Flags]"
  println "    Modes:"
  println "      up          - Bring up Fabric orderer and peer nodes. No channel is created"
  println "      createChannel - Create and join a channel after the network is created"
  println "      deployCC    - Deploy a chaincode to a channel"
  println "      down        - Bring down the network"
  println
  println "    Flags:"
  println "    -ca              - Use Certificate Authorities to generate network crypto material"
  println "    -c <channel name> - Name of channel to create (defaults to 'passportchannel')"
  println "    -ccn <name>      - Chaincode name"
  println "    -ccl <language>  - Programming language of the chaincode: go, java, javascript, typescript"
  println "    -ccv <version>   - Chaincode version. 1.0 (default)"
  println "    -ccs <sequence>  - Chaincode definition sequence. 1 (default)"
  println "    -ccp <path>      - File path to the chaincode"
  println "    -ccep <policy>   - Chaincode endorsement policy using signature policy syntax"
  println "    -cccg <config>   - File path to private data collections configuration file"
  println "    -cci <fcn name>  - Name of chaincode initialization function"
  println "    -r <max retry>   - CLI times out after certain number of attempts (defaults to 5)"
  println "    -d <delay>       - CLI delays for a certain number of seconds (defaults to 3)"
  println "    -verbose         - Verbose mode"
  println
  println " Examples:"
  println "   network.sh up -ca"
  println "   network.sh createChannel -c passportchannel"
  println "   network.sh deployCC -ccn passport -ccp ../chaincode/bms-contract -ccl go"
  println "   network.sh down"
  exit 0
else
  MODE=$1
  shift
fi

# parse subcommands if used
if [[ $# -ge 1 ]] ; then
  key="$1"
  if [[ "$key" == "createChannel" ]]; then
    export MODE="createChannel"
    shift
  fi
fi

# parse flags
while [[ $# -ge 1 ]] ; do
  key="$1"
  case $key in
  -h )
    println "See usage above"
    exit 0
    ;;
  -c )
    CHANNEL_NAME="$2"
    shift
    ;;
  -ca )
    CRYPTO="Certificate Authorities"
    ;;
  -r )
    MAX_RETRY="$2"
    shift
    ;;
  -d )
    CLI_DELAY="$2"
    shift
    ;;
  -ccl )
    CC_SRC_LANGUAGE="$2"
    shift
    ;;
  -ccn )
    CC_NAME="$2"
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
  -ccp )
    CC_SRC_PATH="$2"
    shift
    ;;
  -ccep )
    CC_END_POLICY="$2"
    CC_END_POLICY_FLAG="-ccep $CC_END_POLICY"
    shift
    ;;
  -cccg )
    CC_COLL_CONFIG="$2"
    CC_COLL_CONFIG_FLAG="-cccg $CC_COLL_CONFIG"
    shift
    ;;
  -cci )
    CC_INIT_FCN="$2"
    shift
    ;;
  -verbose )
    VERBOSE=true
    VERBOSE_FLAG="-verbose"
    ;;
  * )
    errorln "Unknown flag: $key"
    exit 1
    ;;
  esac
  shift
done

# Are we generating crypto material with this command?
if [ ! -d "organizations/peerOrganizations" ]; then
  CRYPTO_MODE="with crypto from '${CRYPTO}'"
else
  CRYPTO_MODE=""
fi

# Determine mode of operation and printing out what we asked for
if [ "$MODE" == "up" ]; then
  infoln "Starting nodes with CLI timeout of '${MAX_RETRY}' tries and CLI delay of '${CLI_DELAY}' seconds ${CRYPTO_MODE}"
  networkUp
elif [ "$MODE" == "createChannel" ]; then
  infoln "Creating channel '${CHANNEL_NAME}'."
  infoln "If network is not up, starting nodes with CLI timeout of '${MAX_RETRY}' tries and CLI delay of '${CLI_DELAY}' seconds ${CRYPTO_MODE}"
  createChannel
elif [ "$MODE" == "down" ]; then
  infoln "Stopping network"
  networkDown
elif [ "$MODE" == "deployCC" ]; then
  infoln "Deploying chaincode on channel '${CHANNEL_NAME}'"
  deployCC
else
  println "Usage: "
  println "  network.sh <Mode> [Flags]"
  println "    Modes: up, createChannel, deployCC, down"
  exit 1
fi
