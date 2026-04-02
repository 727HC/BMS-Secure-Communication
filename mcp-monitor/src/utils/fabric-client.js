// Shared Fabric client for MCP monitor — read-only queries only
const { Gateway, Wallets } = require('fabric-network');
const fs = require('fs');
const path = require('path');

const NETWORK_BASE = path.resolve(__dirname, '..', '..', '..', 'passport-network');

let gateway = null;
let contract = null;
let network = null;

function getOrgConfig() {
  const orgNum = parseInt(process.env.FABRIC_ORG || '1', 10);
  const prefix = `FABRIC_ORG${orgNum}_`;
  const msp = process.env[`${prefix}MSP`];
  const domain = process.env[`${prefix}DOMAIN`];
  const caName = process.env[`${prefix}CA_NAME`];

  if (!msp) throw new Error(`Missing env: ${prefix}MSP (Fabric org ${orgNum} MSP ID)`);
  if (!domain) throw new Error(`Missing env: ${prefix}DOMAIN (Fabric org ${orgNum} domain)`);

  return {
    mspId: msp,
    domain,
    caName,
    caPort: parseInt(process.env[`${prefix}CA_PORT`] || '7054', 10),
    peerEndpoint: process.env[`${prefix}PEER_ENDPOINT`] || 'localhost:7051',
    ccpPath: process.env[`${prefix}CCP_PATH`] || path.resolve(
      NETWORK_BASE, 'organizations', 'peerOrganizations', domain,
      `connection-${caName ? caName.replace('ca-', '') : domain.split('.')[0]}.json`
    ),
  };
}

async function connect() {
  if (contract) return { gateway, contract, network };

  const org = getOrgConfig();
  const channelName = process.env.FABRIC_CHANNEL || 'passportchannel';
  const contractName = process.env.FABRIC_CONTRACT || 'passport-contract';
  const identity = process.env.FABRIC_IDENTITY || 'admin';
  const walletPath = process.env.FABRIC_WALLET_PATH ||
    path.resolve(__dirname, '..', '..', '..', 'bmu-agent', 'wallet');

  const wallet = await Wallets.newFileSystemWallet(walletPath);
  const label = `${org.mspId}:${identity}`;

  // Wallet identity must already exist (monitor is read-only, no enrollment)
  const adminId = await wallet.get(label);
  if (!adminId) {
    throw new Error(
      `Wallet identity "${label}" not found at ${walletPath}. ` +
      'The monitor is read-only and does not enroll identities. ' +
      'Please enroll via bmu-agent first.'
    );
  }

  const ccp = JSON.parse(fs.readFileSync(org.ccpPath, 'utf8'));
  gateway = new Gateway();
  await gateway.connect(ccp, {
    wallet,
    identity: label,
    discovery: { enabled: true, asLocalhost: process.env.FABRIC_DISCOVERY_AS_LOCALHOST !== 'false' },
  });

  network = await gateway.getNetwork(channelName);
  contract = network.getContract(contractName);
  return { gateway, contract, network };
}

async function evaluate(fcn, ...args) {
  const { contract: ct } = await connect();
  try {
    const result = await ct.evaluateTransaction(fcn, ...args);
    const parsed = JSON.parse(result.toString());
    // Normalize null arrays to empty arrays (Go chaincode returns null for empty slices)
    if (parsed && parsed.records === null) parsed.records = [];
    return parsed;
  } catch (err) {
    // Handle schema validation errors from empty Go slices (null → expected array)
    if (err.message && err.message.includes('Expected: array, given: null')) {
      return { records: [], bookmark: '', count: 0 };
    }
    throw err;
  }
}

async function getNetwork() {
  const { network: net } = await connect();
  return net;
}

async function disconnect() {
  if (gateway) {
    gateway.disconnect();
    gateway = null;
    contract = null;
    network = null;
  }
}

module.exports = { connect, evaluate, getNetwork, disconnect, getOrgConfig };
