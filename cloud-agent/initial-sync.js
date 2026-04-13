#!/usr/bin/env node
/**
 * Initial Sync — Fabric 원장의 현재 데이터를 MongoDB에 일괄 동기화
 * block event는 실시간 업데이트용, 이 스크립트는 초기 적재용
 *
 * 사용법: cd cloud-agent && node initial-sync.js
 */

require('dotenv').config();
const { MongoClient } = require('mongodb');
const { Gateway, Wallets } = require('fabric-network');
const FabricCAServices = require('fabric-ca-client');
const path = require('path');
const fs = require('fs');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const MONGODB_DB = process.env.MONGODB_DB || 'battery_passport';
const CHANNEL = process.env.FABRIC_CHANNEL || 'passportchannel';
const MSP = process.env.FABRIC_MSP || 'ManufacturerMSP';
const IDENTITY = process.env.FABRIC_IDENTITY || 'admin';

async function getContract() {
  const ccpPath = process.env.FABRIC_CCP_PATH ||
    path.resolve(__dirname, '..', 'passport-network', 'organizations',
      'peerOrganizations', 'manufacturer.battery.com', 'connection-manufacturer.json');
  const ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));

  const walletPath = process.env.FABRIC_WALLET_PATH || path.join(__dirname, 'wallet');
  const wallet = await Wallets.newFileSystemWallet(walletPath);

  // Enroll if needed
  const existing = await wallet.get(IDENTITY);
  if (!existing) {
    const caURL = `https://localhost:${process.env.FABRIC_CA_PORT || '7054'}`;
    const ca = new FabricCAServices(caURL, { verify: false },
      process.env.FABRIC_CA_NAME || 'ca-manufacturer');
    const enrollment = await ca.enroll({
      enrollmentID: IDENTITY,
      enrollmentSecret: process.env.FABRIC_ADMIN_SECRET || 'REMOVED_SECRET_ROTATED_2026_04_18',
    });
    await wallet.put(IDENTITY, {
      credentials: { certificate: enrollment.certificate, privateKey: enrollment.key.toBytes() },
      mspId: MSP, type: 'X.509',
    });
  }

  const gateway = new Gateway();
  await gateway.connect(ccp, {
    wallet, identity: IDENTITY,
    discovery: { enabled: true, asLocalhost: process.env.FABRIC_DISCOVERY_AS_LOCALHOST !== 'false' },
  });

  const network = await gateway.getNetwork(CHANNEL);
  return { contract: network.getContract(process.env.FABRIC_CONTRACT || 'passport-contract'), gateway };
}

async function syncPassports(contract, db) {
  console.log('[sync] Syncing passports...');
  let bookmark = '';
  let total = 0;

  do {
    let data;
    try {
      const result = await contract.evaluateTransaction('QueryPassportsWithPagination', '100', bookmark);
      data = JSON.parse(result.toString());
    } catch {
      break; // last page returns null/error — done
    }
    const records = data.records || [];

    if (records.length === 0) break;

    const ops = records.map(p => ({
      updateOne: {
        filter: { passportId: p.passportId },
        update: { $set: { ...p, _syncedAt: new Date().toISOString(), _syncType: 'initial' } },
        upsert: true,
      },
    }));

    await db.collection('passports').bulkWrite(ops);
    total += records.length;
    bookmark = data.bookmark || '';
    console.log(`[sync] passports: ${total} synced (bookmark: ${bookmark ? 'more' : 'done'})`);
  } while (bookmark);

  return total;
}

async function syncCredentials(contract, db) {
  console.log('[sync] Syncing credentials...');
  // Query by each credential type
  const credTypes = ['BATTERY_PASSPORT', 'BATTERY_HEALTH', 'MAINTENANCE', 'COMPLIANCE', 'RECYCLING'];
  let total = 0;

  for (const credType of credTypes) {
    let bookmark = '';
    do {
      try {
        const result = await contract.evaluateTransaction('QueryCredentialsByType', credType, '100', bookmark);
        const data = JSON.parse(result.toString());
        const records = data.records || [];
        if (records.length === 0) break;

        const ops = records.map(c => ({
          updateOne: {
            filter: { credentialId: c.credentialId },
            update: { $set: { ...c, _syncedAt: new Date().toISOString(), _syncType: 'initial' } },
            upsert: true,
          },
        }));

        await db.collection('credentials').bulkWrite(ops);
        total += records.length;
        bookmark = data.bookmark || '';
      } catch {
        break; // type에 데이터 없으면 skip
      }
    } while (bookmark);
  }

  console.log(`[sync] credentials: ${total} synced`);
  return total;
}

async function syncMaterials(contract, db) {
  console.log('[sync] Syncing raw materials...');
  try {
    const result = await contract.evaluateTransaction('QueryRawMaterials');
    const records = JSON.parse(result.toString());
    if (records.length > 0) {
      const ops = records.map(m => ({
        updateOne: {
          filter: { materialId: m.materialId },
          update: { $set: { ...m, _syncedAt: new Date().toISOString(), _syncType: 'initial' } },
          upsert: true,
        },
      }));
      await db.collection('materials').bulkWrite(ops);
    }
    console.log(`[sync] materials: ${records.length} synced`);
    return records.length;
  } catch {
    console.log('[sync] materials: 0 (query failed)');
    return 0;
  }
}

async function main() {
  const mongoClient = new MongoClient(MONGODB_URI);
  await mongoClient.connect();
  const db = mongoClient.db(MONGODB_DB);
  console.log('[sync] MongoDB connected');

  const { contract, gateway } = await getContract();
  console.log('[sync] Fabric connected');

  const t0 = Date.now();
  const passports = await syncPassports(contract, db);
  const credentials = await syncCredentials(contract, db);
  const materials = await syncMaterials(contract, db);
  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);

  console.log(`\n[sync] === Initial sync complete ===`);
  console.log(`[sync] Passports: ${passports}`);
  console.log(`[sync] Credentials: ${credentials}`);
  console.log(`[sync] Materials: ${materials}`);
  console.log(`[sync] Elapsed: ${elapsed}s`);

  gateway.disconnect();
  await mongoClient.close();
}

main().catch(err => { console.error('[sync] Fatal:', err); process.exit(1); });
