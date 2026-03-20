const jwt = require('jsonwebtoken');
const authConfig = require('../config/auth');
const fabricService = require('./fabric.service');

function generateToken(userId, orgMsp) {
  return jwt.sign(
    { userId, orgMsp },
    authConfig.jwtSecret,
    { expiresIn: authConfig.jwtExpiry }
  );
}

function verifyToken(token) {
  return jwt.verify(token, authConfig.jwtSecret);
}

async function registerAndEnroll(userId, password, orgNum) {
  const fabricConfig = require('../config/fabric');
  const orgConfig = fabricConfig.orgs[orgNum];
  if (!orgConfig) {
    throw new Error(`Invalid org number: ${orgNum}`);
  }
  const result = await fabricService.registerUser(userId, password, orgConfig);
  const token = generateToken(userId, orgConfig.mspId);
  return { ...result, token };
}

async function login(userId, password, orgNum) {
  const fabricConfig = require('../config/fabric');
  const orgConfig = fabricConfig.orgs[orgNum];
  if (!orgConfig) {
    throw new Error(`Invalid org number: ${orgNum}`);
  }

  const { Wallets } = require('fabric-network');
  const wallet = await Wallets.newFileSystemWallet(fabricConfig.walletPath);

  // If already in wallet, issue JWT directly
  const existing = await wallet.get(userId);
  if (existing) {
    const token = generateToken(userId, orgConfig.mspId);
    return { token, mspId: orgConfig.mspId, userId };
  }

  // Not in wallet — try enroll with CA (first-time login after register)
  const FabricCAServices = require('fabric-ca-client');
  const fs = require('fs');
  const ccp = JSON.parse(fs.readFileSync(orgConfig.ccpPath, 'utf8'));

  const caInfo = ccp.certificateAuthorities[orgConfig.caHostname];
  const caTLSCACerts = caInfo.tlsCACerts?.pem;
  const tlsOptions = caTLSCACerts
    ? { trustedRoots: caTLSCACerts, verify: fabricConfig.tlsVerify }
    : undefined;
  const ca = new FabricCAServices(caInfo.url, tlsOptions, caInfo.caName);

  const enrollment = await ca.enroll({
    enrollmentID: userId,
    enrollmentSecret: password,
  });

  const identity = {
    credentials: {
      certificate: enrollment.certificate,
      privateKey: enrollment.key.toBytes(),
    },
    mspId: orgConfig.mspId,
    type: 'X.509',
  };
  await wallet.put(userId, identity);

  const token = generateToken(userId, orgConfig.mspId);
  return { token, mspId: orgConfig.mspId, userId };
}

module.exports = {
  generateToken,
  verifyToken,
  registerAndEnroll,
  login,
};
