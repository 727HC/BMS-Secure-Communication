const { Gateway, Wallets } = require('fabric-network');
const FabricCAServices = require('fabric-ca-client');
const path = require('path');
const fs = require('fs');
const fabricConfig = require('../config/fabric');

let gateway = null;
let contract = null;
let network = null;

async function connectFabric(orgConfig) {
  const org = orgConfig || fabricConfig.currentOrg;
  const ccp = JSON.parse(fs.readFileSync(org.ccpPath, 'utf8'));
  const wallet = await Wallets.newFileSystemWallet(fabricConfig.walletPath);

  const adminIdentity = await wallet.get(fabricConfig.identity);
  if (!adminIdentity) {
    console.log(`Enrolling ${fabricConfig.identity} for ${org.mspId}...`);
    const caInfo = ccp.certificateAuthorities
      ? ccp.certificateAuthorities[org.caHostname]
      : null;

    if (caInfo) {
      const caTLSCACerts = caInfo.tlsCACerts?.pem;
      const tlsOptions = caTLSCACerts
        ? { trustedRoots: caTLSCACerts, verify: fabricConfig.tlsVerify }
        : undefined;
      const ca = new FabricCAServices(caInfo.url, tlsOptions, caInfo.caName);
      const enrollment = await ca.enroll({
        enrollmentID: fabricConfig.identity,
        enrollmentSecret: fabricConfig.adminSecret,
      });
      const identity = {
        credentials: {
          certificate: enrollment.certificate,
          privateKey: enrollment.key.toBytes(),
        },
        mspId: org.mspId,
        type: 'X.509',
      };
      await wallet.put(fabricConfig.identity, identity);
      console.log(`${fabricConfig.identity} enrolled via CA`);
    } else {
      // Fallback: cryptogen mode
      const orgPath = path.dirname(path.dirname(org.ccpPath));
      const adminUser = `Admin@${org.domain}`;
      const certPath = path.join(orgPath, `users/${adminUser}/msp/signcerts/${adminUser}-cert.pem`);
      const keyDir = path.join(orgPath, `users/${adminUser}/msp/keystore`);
      const keyFiles = fs.readdirSync(keyDir);
      if (!keyFiles || keyFiles.length === 0) {
        throw new Error('keystore empty: ' + keyDir);
      }
      const keyPath = path.join(keyDir, keyFiles[0]);
      const certificate = fs.readFileSync(certPath, 'utf8');
      const privateKey = fs.readFileSync(keyPath, 'utf8');
      const identity = {
        credentials: { certificate, privateKey },
        mspId: org.mspId,
        type: 'X.509',
      };
      await wallet.put(fabricConfig.identity, identity);
      console.log('Admin identity loaded from cryptogen certs');
    }
  }

  gateway = new Gateway();
  await gateway.connect(ccp, {
    wallet,
    identity: fabricConfig.identity,
    discovery: { enabled: true, asLocalhost: true },
  });

  network = await gateway.getNetwork(fabricConfig.channelName);
  contract = network.getContract(fabricConfig.contractName);
  console.log(`Connected to Fabric: ${fabricConfig.channelName}/${fabricConfig.contractName}`);
}

async function submitTransaction(fcn, ...args) {
  try {
    return await contract.submitTransaction(fcn, ...args);
  } catch (err) {
    console.warn('Fabric TX failed, attempting reconnect:', err.message);
    await connectFabric();
    return await contract.submitTransaction(fcn, ...args);
  }
}

async function evaluateTransaction(fcn, ...args) {
  try {
    return await contract.evaluateTransaction(fcn, ...args);
  } catch (err) {
    console.warn('Fabric query failed, attempting reconnect:', err.message);
    await connectFabric();
    return await contract.evaluateTransaction(fcn, ...args);
  }
}

function getContract() {
  return contract;
}

function isConnected() {
  return contract !== null;
}

async function disconnect() {
  if (gateway) {
    await gateway.disconnect();
    gateway = null;
    contract = null;
    network = null;
  }
}

// Register and enroll a new user via Fabric CA
async function registerUser(userId, userSecret, orgConfig) {
  const org = orgConfig || fabricConfig.currentOrg;
  const ccp = JSON.parse(fs.readFileSync(org.ccpPath, 'utf8'));
  const wallet = await Wallets.newFileSystemWallet(fabricConfig.walletPath);

  // Check if user already exists
  const existing = await wallet.get(userId);
  if (existing) {
    return { message: `User ${userId} already enrolled` };
  }

  // Get admin identity to register new user
  const adminIdentity = await wallet.get(fabricConfig.identity);
  if (!adminIdentity) {
    throw new Error('Admin identity not found. Connect to Fabric first.');
  }

  const caInfo = ccp.certificateAuthorities[org.caHostname];
  const caTLSCACerts = caInfo.tlsCACerts?.pem;
  const tlsOptions = caTLSCACerts
    ? { trustedRoots: caTLSCACerts, verify: fabricConfig.tlsVerify }
    : undefined;
  const ca = new FabricCAServices(caInfo.url, tlsOptions, caInfo.caName);

  const provider = wallet.getProviderRegistry().getProvider(adminIdentity.type);
  const adminUser = await provider.getUserContext(adminIdentity, fabricConfig.identity);

  await ca.register({
    enrollmentID: userId,
    enrollmentSecret: userSecret,
    maxEnrollments: -1,
    attrs: [],
  }, adminUser);

  const enrollment = await ca.enroll({
    enrollmentID: userId,
    enrollmentSecret: userSecret,
  });

  const identity = {
    credentials: {
      certificate: enrollment.certificate,
      privateKey: enrollment.key.toBytes(),
    },
    mspId: org.mspId,
    type: 'X.509',
  };
  await wallet.put(userId, identity);

  return { message: `User ${userId} registered and enrolled`, mspId: org.mspId };
}

module.exports = {
  connectFabric,
  submitTransaction,
  evaluateTransaction,
  getContract,
  isConnected,
  disconnect,
  registerUser,
};
