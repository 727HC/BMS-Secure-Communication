const { Gateway, Wallets } = require('fabric-network');
const FabricCAServices = require('fabric-ca-client');
const path = require('path');
const fs = require('fs');
const fabricConfig = require('../config/fabric');
const { createLogger } = require('./logger.service');
const log = createLogger('fabric');

// P0-1: Org별 Gateway pool — 요청자의 org identity로 트랜잭션 실행
const gatewayPool = new Map(); // key: walletLabel, value: { gateway, contract, lastUsed }
const gatewayPending = new Map(); // Promise dedup: 동시 요청 시 중복 gateway 생성 방지
const GATEWAY_TTL_MS = 30 * 60 * 1000; // 30분 미사용 시 제거
let defaultContract = null; // 서버 기본 org
let wallet = null;

// P1-6: Wallet namespacing — ${mspId}:${userId}
function walletLabel(userId, mspId) {
  if (!mspId) return userId; // backward compat for admin
  return `${mspId}:${userId}`;
}

async function getWallet() {
  if (!wallet) {
    wallet = await Wallets.newFileSystemWallet(fabricConfig.walletPath);
  }
  return wallet;
}

// 서버 기동 시 기본 org admin으로 연결
async function connectFabric() {
  const org = fabricConfig.currentOrg;
  const w = await getWallet();
  const ccp = JSON.parse(fs.readFileSync(org.ccpPath, 'utf8'));
  const adminLabel = walletLabel(fabricConfig.identity, org.mspId);

  const adminIdentity = await w.get(adminLabel);
  if (!adminIdentity) {
    log.info('Enrolling admin identity', { identity: fabricConfig.identity, mspId: org.mspId });
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
      log.info('Admin enrolled via CA', { identity: fabricConfig.identity, mspId: org.mspId });
    }
  }

  const gw = new Gateway();
  await gw.connect(ccp, {
    wallet: w,
    identity: adminLabel,
    discovery: { enabled: true, asLocalhost: fabricConfig.discoveryAsLocalhost },
  });

  const network = await gw.getNetwork(fabricConfig.channelName);
  defaultContract = network.getContract(fabricConfig.contractName);
  log.info('Connected to Fabric', { channel: fabricConfig.channelName, contract: fabricConfig.contractName });

  // Gateway pool 정리 타이머 시작
  setInterval(evictStaleGateways, GATEWAY_TTL_MS);
}

// Gateway pool TTL eviction — 미사용 연결 정리
function evictStaleGateways() {
  const now = Date.now();
  for (const [label, entry] of gatewayPool) {
    if (now - entry.lastUsed > GATEWAY_TTL_MS) {
      try { entry.gateway.disconnect(); } catch { /* ignore */ }
      gatewayPool.delete(label);
      log.info('Gateway evicted (TTL)', { label });
    }
  }
}

// P0-1: 요청자 identity로 gateway/contract 획득 (Promise dedup으로 race condition 방지)
async function getContractForUser(userId, orgMsp) {
  const label = walletLabel(userId, orgMsp);

  // Pool에서 캐시 확인
  if (gatewayPool.has(label)) {
    const entry = gatewayPool.get(label);
    entry.lastUsed = Date.now();
    return entry.contract;
  }

  // 동시 요청 시 중복 gateway 생성 방지
  if (gatewayPending.has(label)) {
    return gatewayPending.get(label);
  }

  const promise = (async () => {
    try {
      const w = await getWallet();

      // 해당 user의 wallet identity 확인
      const identity = await w.get(label);
      if (!identity) {
        throw new Error(`Identity ${label} not found in wallet. Register first.`);
      }

      // 해당 org의 CCP로 gateway 연결
      const orgNum = fabricConfig.mspToOrg[orgMsp];
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
        discovery: { enabled: true, asLocalhost: fabricConfig.discoveryAsLocalhost },
      });

      const network = await gw.getNetwork(fabricConfig.channelName);
      const ct = network.getContract(fabricConfig.contractName);
      gatewayPool.set(label, { gateway: gw, contract: ct, lastUsed: Date.now() });
      log.info('Gateway opened', { label });
      return ct;
    } finally {
      gatewayPending.delete(label);
    }
  })();

  gatewayPending.set(label, promise);
  return promise;
}

// defaultContract null 체크 helper
function requireDefaultContract() {
  if (!defaultContract) {
    throw new Error('Fabric not connected. Cannot execute transaction.');
  }
  return defaultContract;
}

// Submit: 인증된 사용자의 identity로 실행
async function submitTransaction(fcn, args, userCtx) {
  let ct;
  if (userCtx && userCtx.userId && userCtx.orgMsp) {
    ct = await getContractForUser(userCtx.userId, userCtx.orgMsp);
  } else {
    ct = requireDefaultContract();
  }
  return await ct.submitTransaction(fcn, ...args);
}

// Evaluate: submitTransaction과 동일한 시그니처 (fcn, args, userCtx)
async function evaluateTransaction(fcn, args, userCtx) {
  let ct;
  if (userCtx && userCtx.userId && userCtx.orgMsp) {
    ct = await getContractForUser(userCtx.userId, userCtx.orgMsp);
  } else {
    ct = requireDefaultContract();
  }
  if (Array.isArray(args)) {
    return await ct.evaluateTransaction(fcn, ...args);
  }
  return await ct.evaluateTransaction(fcn);
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
  const caHost = process.env.FABRIC_CA_HOST || 'localhost';
  const caScheme = process.env.FABRIC_CA_SCHEME || 'https';
  const caUrl = `${caScheme}://${caHost}:${org.caPort}`;
  const networkBase = path.resolve(__dirname, '..', '..', 'passport-network');
  const caTlsCertPath = path.resolve(
    networkBase, 'organizations', 'fabric-ca',
    org.caName.replace('ca-', ''), 'ca-cert.pem'
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

// 로그인 — 항상 CA enroll로 비밀번호 검증
async function loginUser(userId, userSecret, orgConfig) {
  const org = orgConfig || fabricConfig.currentOrg;
  const ca = getCAForOrg(org);

  // 항상 CA enroll 시도하여 비밀번호 검증 (wallet 캐시 유무와 무관)
  try {
    const enrollment = await ca.enroll({
      enrollmentID: userId,
      enrollmentSecret: userSecret,
    });
    // enroll 성공 시 wallet 갱신 (인증서 rotation)
    const w = await getWallet();
    const label = walletLabel(userId, org.mspId);
    await w.put(label, {
      credentials: {
        certificate: enrollment.certificate,
        privateKey: enrollment.key.toBytes(),
      },
      mspId: org.mspId,
      type: 'X.509',
    });
    // 기존 gateway pool에서 제거 (새 인증서로 재연결하도록)
    if (gatewayPool.has(label)) {
      try { gatewayPool.get(label).gateway.disconnect(); } catch { /* ignore */ }
      gatewayPool.delete(label);
    }
    return { mspId: org.mspId, userId };
  } catch (enrollErr) {
    throw new Error(`로그인 실패: ${enrollErr.message}`);
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
