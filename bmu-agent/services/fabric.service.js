const { Gateway, Wallets } = require('fabric-network');
const FabricCAServices = require('fabric-ca-client');
const path = require('path');
const fs = require('fs');
const fabricConfig = require('../config/fabric');

// P0-1: Org별 Gateway pool — 요청자의 org identity로 트랜잭션 실행
const gatewayPool = new Map(); // key: walletLabel, value: { gateway, contract }
let defaultContract = null; // 서버 기본 org (인증 불필요 쿼리용)
let wallet = null;

// P1-6: Wallet namespacing — ${mspId}:${userId}
function walletLabel(userId, mspId) {
  if (!mspId) return userId; // backward compat for admin
  return `${mspId}:${userId}`;
}

// MSP → orgNum 매핑
const MSP_TO_ORG = {
  ManufacturerMSP: 1,
  EVManufacturerMSP: 2,
  ServiceMSP: 3,
  RegulatorMSP: 4,
};

async function getWallet() {
  if (!wallet) {
    wallet = await Wallets.newFileSystemWallet(fabricConfig.walletPath);
  }
  return wallet;
}

// 서버 기동 시 기본 org admin으로 연결 (인증 불필요 쿼리용)
async function connectFabric() {
  const org = fabricConfig.currentOrg;
  const w = await getWallet();
  const ccp = JSON.parse(fs.readFileSync(org.ccpPath, 'utf8'));
  const adminLabel = walletLabel(fabricConfig.identity, org.mspId);

  const adminIdentity = await w.get(adminLabel);
  if (!adminIdentity) {
    console.log(`Enrolling ${fabricConfig.identity} for ${org.mspId}...`);
    const caInfo = ccp.certificateAuthorities?.[org.caHostname];
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
      await w.put(adminLabel, {
        credentials: {
          certificate: enrollment.certificate,
          privateKey: enrollment.key.toBytes(),
        },
        mspId: org.mspId,
        type: 'X.509',
      });
      console.log(`${fabricConfig.identity} enrolled via CA`);
    }
  }

  const gw = new Gateway();
  await gw.connect(ccp, {
    wallet: w,
    identity: adminLabel,
    discovery: { enabled: true, asLocalhost: true },
  });

  const network = await gw.getNetwork(fabricConfig.channelName);
  defaultContract = network.getContract(fabricConfig.contractName);
  console.log(`Connected to Fabric: ${fabricConfig.channelName}/${fabricConfig.contractName}`);
}

// P0-1: 요청자 identity로 gateway/contract 획득
async function getContractForUser(userId, orgMsp) {
  const label = walletLabel(userId, orgMsp);
  const w = await getWallet();

  // Pool에서 캐시 확인
  if (gatewayPool.has(label)) {
    return gatewayPool.get(label);
  }

  // 해당 user의 wallet identity 확인
  const identity = await w.get(label);
  if (!identity) {
    throw new Error(`Identity ${label} not found in wallet. Register first.`);
  }

  // 해당 org의 CCP로 gateway 연결
  const orgNum = MSP_TO_ORG[orgMsp];
  const org = fabricConfig.orgs[orgNum];
  if (!org) {
    throw new Error(`Unknown MSP: ${orgMsp}`);
  }

  let ccp;
  try {
    ccp = JSON.parse(fs.readFileSync(org.ccpPath, 'utf8'));
  } catch (err) {
    // CCP 없으면 기본 org CCP 사용
    ccp = JSON.parse(fs.readFileSync(fabricConfig.currentOrg.ccpPath, 'utf8'));
  }

  const gw = new Gateway();
  await gw.connect(ccp, {
    wallet: w,
    identity: label,
    discovery: { enabled: true, asLocalhost: true },
  });

  const network = await gw.getNetwork(fabricConfig.channelName);
  const ct = network.getContract(fabricConfig.contractName);
  gatewayPool.set(label, ct);
  console.log(`Gateway opened for ${label}`);
  return ct;
}

// Submit: 인증된 사용자의 identity로 실행
async function submitTransaction(fcn, args, userCtx) {
  let ct;
  if (userCtx && userCtx.userId && userCtx.orgMsp) {
    ct = await getContractForUser(userCtx.userId, userCtx.orgMsp);
  } else {
    ct = defaultContract;
  }
  return await ct.submitTransaction(fcn, ...args);
}

// Evaluate: 기본 identity로 실행 (읽기 전용)
async function evaluateTransaction(fcn, ...args) {
  return await defaultContract.evaluateTransaction(fcn, ...args);
}

function isConnected() {
  return defaultContract !== null;
}

async function disconnect() {
  for (const [label, ct] of gatewayPool) {
    // Contract doesn't have disconnect, gateway does
  }
  gatewayPool.clear();
  defaultContract = null;
  wallet = null;
}

// org별 CA 접속 helper
function getCAForOrg(org) {
  const caUrl = `https://localhost:${org.caPort}`;
  const caTlsCertPath = path.resolve(
    __dirname, '..', '..', 'passport-network',
    'organizations', 'fabric-ca', org.caName.replace('ca-', ''), 'ca-cert.pem'
  );
  let tlsOptions;
  if (fs.existsSync(caTlsCertPath)) {
    const caTlsCert = fs.readFileSync(caTlsCertPath, 'utf8');
    tlsOptions = { trustedRoots: caTlsCert, verify: fabricConfig.tlsVerify };
  }
  return new FabricCAServices(caUrl, tlsOptions, org.caName);
}

// Register and enroll a new user via Fabric CA
async function registerUser(userId, userSecret, orgConfig) {
  const org = orgConfig || fabricConfig.currentOrg;
  const w = await getWallet();
  const label = walletLabel(userId, org.mspId);

  // Check if user already exists in wallet
  const existing = await w.get(label);
  if (existing) {
    return { message: `User ${userId} already enrolled` };
  }

  const ca = getCAForOrg(org);

  // Enroll CA bootstrap admin for this org
  const adminLabel2 = `${org.caName}-admin`;
  let adminIdentity = await w.get(adminLabel2);
  if (!adminIdentity) {
    const adminEnrollment = await ca.enroll({
      enrollmentID: 'admin',
      enrollmentSecret: fabricConfig.adminSecret,
    });
    adminIdentity = {
      credentials: {
        certificate: adminEnrollment.certificate,
        privateKey: adminEnrollment.key.toBytes(),
      },
      mspId: org.mspId,
      type: 'X.509',
    };
    await w.put(adminLabel2, adminIdentity);
  }

  const provider = w.getProviderRegistry().getProvider(adminIdentity.type);
  const adminUser = await provider.getUserContext(adminIdentity, adminLabel2);

  // Register (skip if already registered in CA)
  try {
    await ca.register({
      enrollmentID: userId,
      enrollmentSecret: userSecret,
      maxEnrollments: -1,
      attrs: [],
    }, adminUser);
  } catch (registerErr) {
    if (!registerErr.message?.includes('already registered')) {
      throw registerErr;
    }
  }

  const enrollment = await ca.enroll({
    enrollmentID: userId,
    enrollmentSecret: userSecret,
  });

  await w.put(label, {
    credentials: {
      certificate: enrollment.certificate,
      privateKey: enrollment.key.toBytes(),
    },
    mspId: org.mspId,
    type: 'X.509',
  });

  return { message: `User ${userId} registered and enrolled`, mspId: org.mspId };
}

// P0-2: 로그인 — CA enroll로 비밀번호 검증 (wallet 있어도 재검증)
async function loginUser(userId, userSecret, orgConfig) {
  const org = orgConfig || fabricConfig.currentOrg;
  const w = await getWallet();
  const label = walletLabel(userId, org.mspId);
  const ca = getCAForOrg(org);

  // 항상 CA enroll로 비밀번호 검증
  const enrollment = await ca.enroll({
    enrollmentID: userId,
    enrollmentSecret: userSecret,
  });

  await w.put(label, {
    credentials: {
      certificate: enrollment.certificate,
      privateKey: enrollment.key.toBytes(),
    },
    mspId: org.mspId,
    type: 'X.509',
  });

  // 기존 gateway cache 무효화
  if (gatewayPool.has(label)) {
    gatewayPool.delete(label);
  }

  return { mspId: org.mspId, userId };
}

module.exports = {
  connectFabric,
  submitTransaction,
  evaluateTransaction,
  getContractForUser,
  isConnected,
  disconnect,
  registerUser,
  loginUser,
  walletLabel,
};
