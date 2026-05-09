#!/usr/bin/env bash

# imports
. scripts/envVar.sh

CHANNEL_NAME="$1"
DELAY="$2"
MAX_RETRY="$3"
VERBOSE="$4"
: ${CHANNEL_NAME:="passportchannel"}
: ${DELAY:="3"}
: ${MAX_RETRY:="5"}
: ${VERBOSE:="false"}
CHANNEL_PROFILE="${CHANNEL_PROFILE:-PassportChannel}"

: ${CONTAINER_CLI:="docker"}
if command -v ${CONTAINER_CLI}-compose > /dev/null 2>&1; then
    : ${CONTAINER_CLI_COMPOSE:="${CONTAINER_CLI}-compose"}
else
    : ${CONTAINER_CLI_COMPOSE:="${CONTAINER_CLI} compose"}
fi
infoln "Using ${CONTAINER_CLI} and ${CONTAINER_CLI_COMPOSE}"

if [ ! -d "channel-artifacts" ]; then
	mkdir channel-artifacts
fi

createChannelGenesisBlock() {
  setGlobals 1
	which configtxgen
	if [ "$?" -ne 0 ]; then
		fatalln "configtxgen tool not found."
	fi
	set -x
	configtxgen -profile ${CHANNEL_PROFILE} -outputBlock ./channel-artifacts/${CHANNEL_NAME}.block -channelID $CHANNEL_NAME
	res=$?
	{ set +x; } 2>/dev/null
  verifyResult $res "Failed to generate channel configuration transaction..."
}

createChannel() {
	# Poll in case the raft leader is not set yet
	local rc=1
	local COUNTER=1
	infoln "Adding orderer"
	while [ $rc -ne 0 -a $COUNTER -lt $MAX_RETRY ] ; do
		sleep $DELAY
		set -x
		setOrdererGlobals
		osnadmin channel join --channelID ${CHANNEL_NAME} --config-block ./channel-artifacts/${CHANNEL_NAME}.block -o localhost:7053 --ca-file "$ORDERER_CA" --client-cert "$ORDERER_ADMIN_TLS_SIGN_CERT" --client-key "$ORDERER_ADMIN_TLS_PRIVATE_KEY" >> log.txt 2>&1
		res=$?
		{ set +x; } 2>/dev/null
		let rc=$res
		COUNTER=$(expr $COUNTER + 1)
	done
	cat log.txt
	verifyResult $res "Channel creation failed"
}

# joinChannel ORG
joinChannel() {
  ORG=$1
  FABRIC_CFG_PATH=$PWD/../fabric-samples/config/
  setGlobals $ORG
	local rc=1
	local COUNTER=1
	## Sometimes Join takes time, hence retry
	while [ $rc -ne 0 -a $COUNTER -lt $MAX_RETRY ] ; do
    sleep $DELAY
    set -x
    peer channel join -b $BLOCKFILE >&log.txt
    res=$?
    { set +x; } 2>/dev/null
		let rc=$res
		COUNTER=$(expr $COUNTER + 1)
	done
	cat log.txt
	verifyResult $res "After $MAX_RETRY attempts, peer0.org${ORG} has failed to join channel '$CHANNEL_NAME' "
}

setAnchorPeer() {
  ORG=$1
  . scripts/setAnchorPeer.sh $ORG $CHANNEL_NAME
}

## Create channel genesis block
FABRIC_CFG_PATH=${PWD}/configtx
BLOCKFILE="./channel-artifacts/${CHANNEL_NAME}.block"

infoln "Using channel profile ${CHANNEL_PROFILE}"
infoln "Generating channel genesis block '${CHANNEL_NAME}.block'"
createChannelGenesisBlock

## Create channel
infoln "Creating channel ${CHANNEL_NAME}"
createChannel
successln "Channel '$CHANNEL_NAME' created"

## Join all the peers to the channel
infoln "Joining Manufacturer peer to the channel..."
joinChannel 1
infoln "Joining EVManufacturer peer to the channel..."
joinChannel 2
infoln "Joining Service peer to the channel..."
joinChannel 3
infoln "Joining Regulator peer to the channel..."
joinChannel 4

## Set the anchor peers for each org in the channel
infoln "Setting anchor peer for Manufacturer..."
setAnchorPeer 1
infoln "Setting anchor peer for EVManufacturer..."
setAnchorPeer 2
infoln "Setting anchor peer for Service..."
setAnchorPeer 3
infoln "Setting anchor peer for Regulator..."
setAnchorPeer 4

successln "Channel '$CHANNEL_NAME' joined"
