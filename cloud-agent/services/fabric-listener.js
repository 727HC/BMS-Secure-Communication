/**
 * Fabric Block Event Listener — 블록 이벤트 수신 → MongoDB 동기화
 *
 * 논문 설계: "Blockchain Agent는 해시만 기록, Cloud Agent는 원본 데이터를 저장"
 * 구현: Fabric block event에서 write set을 파싱하여 MongoDB에 upsert
 */

const { Gateway, Wallets } = require('fabric-network');
const FabricCAServices = require('fabric-ca-client');
const path = require('path');
const fs = require('fs');

const CHANNEL = process.env.FABRIC_CHANNEL || 'passportchannel';
const CONTRACT = process.env.FABRIC_CONTRACT || 'passport-contract';
const WALLET_PATH = process.env.FABRIC_WALLET_PATH || path.join(__dirname, '..', 'wallet');
const MSP = process.env.FABRIC_MSP || 'ManufacturerMSP';
const IDENTITY = process.env.FABRIC_IDENTITY || 'admin';
const ADMIN_SECRET = process.env.FABRIC_ADMIN_SECRET || 'REMOVED_SECRET_ROTATED_2026_04_18';

function loadCCP() {
  const ccpPath = process.env.FABRIC_CCP_PATH ||
    path.resolve(__dirname, '..', '..', 'passport-network', 'organizations',
      'peerOrganizations', 'manufacturer.battery.com', 'connection-manufacturer.json');
  const ccpJSON = fs.readFileSync(ccpPath, 'utf8');
  return JSON.parse(ccpJSON);
}

async function enrollAdmin(wallet, ccp) {
  const existing = await wallet.get(IDENTITY);
  if (existing) return;

  const caHostname = process.env.FABRIC_CA_HOSTNAME || 'ca.manufacturer.battery.com';
  const caPort = process.env.FABRIC_CA_PORT || '7054';
  const caURL = `https://${caHostname}:${caPort}`;

  const ca = new FabricCAServices(caURL, {
    trustedRoots: [],
    verify: false,
  }, process.env.FABRIC_CA_NAME || 'ca-manufacturer');

  const enrollment = await ca.enroll({
    enrollmentID: IDENTITY,
    enrollmentSecret: ADMIN_SECRET,
  });

  await wallet.put(IDENTITY, {
    credentials: {
      certificate: enrollment.certificate,
      privateKey: enrollment.key.toBytes(),
    },
    mspId: MSP,
    type: 'X.509',
  });
  console.log('[listener] Admin enrolled');
}

async function connectGateway() {
  const ccp = loadCCP();
  const wallet = await Wallets.newFileSystemWallet(WALLET_PATH);
  await enrollAdmin(wallet, ccp);

  const gateway = new Gateway();
  await gateway.connect(ccp, {
    wallet,
    identity: IDENTITY,
    discovery: {
      enabled: true,
      asLocalhost: process.env.FABRIC_DISCOVERY_AS_LOCALHOST !== 'false',
    },
  });

  console.log('[listener] Gateway connected');
  return gateway;
}

// docType → MongoDB collection 매핑
const DOC_TYPE_MAP = {
  batteryPassport: 'passports',
  bmuRecord: 'bmuRecords',
  bmuSnapshot: 'snapshots',
  verifiableCredential: 'credentials',
  vcVerification: 'verifications',
  rawMaterial: 'materials',
  credentialRequest: 'credentialRequests',
  fcReset: 'fcResetLogs',
};

function getCollectionName(docType) {
  return DOC_TYPE_MAP[docType] || null;
}

function getUniqueKey(docType, data) {
  switch (docType) {
    case 'batteryPassport': return { passportId: data.passportId };
    case 'bmuRecord': return { recordId: data.recordId };
    case 'bmuSnapshot': return { passportId: data.passportId };
    case 'verifiableCredential': return { credentialId: data.credentialId };
    case 'vcVerification': return { verificationId: data.verificationId };
    case 'rawMaterial': return { materialId: data.materialId };
    case 'credentialRequest': return { requestId: data.requestId };
    case 'fcReset': return { logId: data.logId };
    default: return null;
  }
}

async function processBlock(blockNumber, blockData, db) {
  let synced = 0;

  // blockData.data.data = array of transactions
  const txs = blockData.data?.data || [];
  for (const tx of txs) {
    try {
      const actions = tx.payload?.data?.actions || [];
      for (const action of actions) {
        const rwSets = action.payload?.action?.proposal_response_payload
          ?.extension?.results?.ns_rwset || [];

        for (const nsRw of rwSets) {
          if (nsRw.namespace !== CONTRACT) continue;
          const writes = nsRw.rwset?.writes || [];

          for (const write of writes) {
            if (write.is_delete) {
              // 삭제 처리 — 해당 key 제거
              // composite key는 무시 (snapshot~, lastFc~ 등)
              continue;
            }

            try {
              const data = JSON.parse(write.value);
              const docType = data.docType;
              if (!docType) continue;

              const collectionName = getCollectionName(docType);
              if (!collectionName) continue;

              const uniqueKey = getUniqueKey(docType, data);
              if (!uniqueKey) continue;

              // MongoDB upsert
              await db.collection(collectionName).updateOne(
                uniqueKey,
                { $set: { ...data, _syncedAt: new Date().toISOString(), _blockNumber: blockNumber } },
                { upsert: true }
              );
              synced++;
            } catch {
              // non-JSON write (composite keys 등) — 무시
            }
          }
        }
      }
    } catch {
      // 시스템 트랜잭션 등 — 무시
    }
  }

  if (synced > 0) {
    console.log(`[listener] Block ${blockNumber}: synced ${synced} documents`);
  }
}

async function startBlockListener(gateway, db) {
  const network = await gateway.getNetwork(CHANNEL);

  // 마지막 동기화 블록 번호 조회
  const meta = db.collection('_sync_meta');
  const lastSync = await meta.findOne({ _id: 'lastBlock' });
  const startBlock = lastSync ? lastSync.blockNumber + 1 : 0;

  console.log(`[listener] Starting from block ${startBlock}`);

  // Block event listener
  await network.addBlockListener(async (event) => {
    const blockNumber = Number(event.blockNumber);

    try {
      await processBlock(blockNumber, event.blockData, db);

      // 동기화 위치 저장
      await meta.updateOne(
        { _id: 'lastBlock' },
        { $set: { blockNumber, syncedAt: new Date().toISOString() } },
        { upsert: true }
      );
    } catch (err) {
      console.error(`[listener] Block ${blockNumber} processing error:`, err.message);
    }
  }, { startBlock: startBlock > 0 ? Long.fromNumber(startBlock) : undefined });
}

// fabric-network Long 타입 지원
let Long;
try {
  Long = require('long');
} catch {
  Long = { fromNumber: (n) => n };
}

module.exports = { connectGateway, startBlockListener };
