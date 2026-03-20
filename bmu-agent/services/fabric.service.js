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
    return gatewayPool.get(label).contract;
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

  // P1-5: CCP fallback 제거 — fail-fast
  if (!fs.existsSync(org.ccpPath)) {
    throw new Error(`CCP not found for ${orgMsp}: ${org.ccpPath}`);
  }
  const ccp = JSON.parse(fs.readFileSync(org.ccpPath, 'utf8'));

  const gw = new Gateway();
  await gw.connect(ccp, {
    wallet: w,
    identity: label,
    discovery: { enabled: true, asLocalhost: true },
  });

  const network = await gw.getNetwork(fabricConfig.channelName);
  const ct = network.getContract(fabricConfig.contractName);
  // P1-3: gateway도 함께 저장 (disconnect 가능하게)
  gatewayPool.set(label, { gateway: gw, contract: ct });
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
  for (const [label, entry] of gatewayPool) {
    try { await entry.gateway.disconnect(); } catch (e) { /* ignore */ }
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

// 로그인 — wallet 확인 → enroll 시도 → re-register fallback
async function loginUser(userId, userSecret, orgConfig) {
  const org = orgConfig || fabricConfig.currentOrg;
  const w = await getWallet();
  const label = walletLabel(userId, org.mspId);

  // 1. wallet에 이미 있으면 바로 성공
  const existing = await w.get(label);
  if (existing) {
    return { mspId: org.mspId, userId };
  }

  // 2. wallet에 없으면 CA enroll 시도
  const ca = getCAForOrg(org);
  try {
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
    return { mspId: org.mspId, userId };
  } catch (enrollErr) {
    // 3. enroll 실패 (횟수 소진 등) → 새 비밀번호로 re-register 후 enroll
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

    // 기존 사용자 삭제 후 재등록 (reenroll은 CA에서 지원 안 하므로)
    const newSecret = userSecret + '_' + Date.now();
    try {
      await ca.register({
        enrollmentID: userId + '_recovery',
        enrollmentSecret: newSecret,
        maxEnrollments: -1,
        attrs: [],
      }, adminUser);
    } catch (regErr) {
      // 이미 recovery도 등록됨 → 원래 에러 throw
      if (!regErr.message?.includes('already registered')) {
        throw new Error(`계정 복구 실패: ${enrollErr.message}`);
      }
    }

    // 원래 에러 메시지를 사용자에게 알려줌
    throw new Error(`계정 "${userId}"의 인증 횟수가 초과되었습니다. 새 계정으로 가입해주세요.`);
  }
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
