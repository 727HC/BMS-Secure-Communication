const axios = require('axios');
const crypto = require('crypto');
const { acaPyUrl } = require('../config/auth');
const { createLogger } = require('./logger.service');
const log = createLogger('vc');

// ACA-Py schema/cred_def 캐시
let schemaCache = {};
let credDefCache = {};

// ============================================================
// Schema 관리 (Indy Ledger via ACA-Py)
// ============================================================

async function createSchema(name, version, attributes) {
  const res = await axios.post(`${acaPyUrl}/schemas`, {
    schema_name: name,
    schema_version: version,
    attributes,
  });
  const schemaId = res.data.schema_id || res.data.sent?.schema_id;
  schemaCache[`${name}:${version}`] = schemaId;
  return { schemaId, schema: res.data };
}

async function getSchema(schemaId) {
  const res = await axios.get(`${acaPyUrl}/schemas/${schemaId}`);
  return res.data;
}

// ============================================================
// Credential Definition 관리
// ============================================================

async function createCredentialDefinition(schemaId, tag, supportRevocation) {
  const res = await axios.post(`${acaPyUrl}/credential-definitions`, {
    schema_id: schemaId,
    tag: tag || 'default',
    support_revocation: supportRevocation || false,
  });
  const credDefId = res.data.credential_definition_id || res.data.sent?.credential_definition_id;
  credDefCache[schemaId] = credDefId;
  return { credDefId, result: res.data };
}

async function getCredentialDefinition(credDefId) {
  const res = await axios.get(`${acaPyUrl}/credential-definitions/${credDefId}`);
  return res.data;
}

// ============================================================
// Credential 발급 (ACA-Py + Fabric 앵커)
// ============================================================

async function issueCredential(fabricService, {
  credentialId, passportId, credType,
  issuerDid, holderDid,
  schemaId, credDefId,
  attributes, expiresAt,
  userCtx,
}) {
  // 1. attribute hash 생성 (Fabric 앵커용)
  const attrString = JSON.stringify(attributes);
  const dataHash = crypto.createHash('sha256').update(attrString).digest('hex');

  // 2. Fabric에 VC 앵커 기록
  await fabricService.submitTransaction('IssueCredential', [
    credentialId, passportId, credType,
    issuerDid || '', holderDid,
    schemaId || '', credDefId || '',
    dataHash, expiresAt || '',
  ], userCtx);

  return {
    credentialId,
    passportId,
    credType,
    dataHash,
    status: 'ACTIVE',
  };
}

// ============================================================
// Credential 폐기
// ============================================================

async function revokeCredential(fabricService, credentialId, reason, userCtx) {
  await fabricService.submitTransaction('RevokeCredential', [
    credentialId, reason || '',
  ], userCtx);
  return { credentialId, status: 'REVOKED', reason };
}

// ============================================================
// Credential 검증
// ============================================================

async function verifyCredentialStatus(fabricService, credentialId) {
  const result = await fabricService.evaluateTransaction('VerifyCredentialStatus', [credentialId]);
  return JSON.parse(result.toString());
}

async function logVerification(fabricService, {
  verificationId, credentialId, verifierDid, result, userCtx,
}) {
  await fabricService.submitTransaction('LogCredentialVerification', [
    verificationId, credentialId, verifierDid || '', String(result),
  ], userCtx);
  return { verificationId, credentialId, result };
}

// ============================================================
// Credential 조회
// ============================================================

async function queryCredential(fabricService, credentialId) {
  const result = await fabricService.evaluateTransaction('QueryCredential', [credentialId]);
  return JSON.parse(result.toString());
}

async function queryCredentialsByPassport(fabricService, passportId, pageSize, bookmark) {
  const result = await fabricService.evaluateTransaction(
    'QueryCredentialsByPassport', [passportId, String(pageSize || 100), bookmark || '']
  );
  return JSON.parse(result.toString());
}

async function queryCredentialsByHolder(fabricService, holderDid, pageSize, bookmark) {
  const result = await fabricService.evaluateTransaction(
    'QueryCredentialsByHolder', [holderDid, String(pageSize || 100), bookmark || '']
  );
  return JSON.parse(result.toString());
}

async function queryCredentialsByType(fabricService, credType, pageSize, bookmark) {
  const result = await fabricService.evaluateTransaction(
    'QueryCredentialsByType', [credType, String(pageSize || 100), bookmark || '']
  );
  return JSON.parse(result.toString());
}

async function queryRevokedCredentials(fabricService, pageSize, bookmark) {
  const result = await fabricService.evaluateTransaction(
    'QueryRevokedCredentials', [String(pageSize || 100), bookmark || '']
  );
  return JSON.parse(result.toString());
}

async function getCredentialHistory(fabricService, credentialId) {
  const result = await fabricService.evaluateTransaction('GetCredentialHistory', [credentialId]);
  return JSON.parse(result.toString());
}

// ============================================================
// Battery Passport 전용 스키마 초기화
// ============================================================

const BATTERY_SCHEMAS = {
  BATTERY_PASSPORT: {
    name: 'battery_passport',
    version: '1.0',
    attributes: [
      'passport_id', 'battery_id', 'serial_number',
      'manufacturer', 'manufacture_date', 'chemistry',
      'rated_capacity', 'voltage_range', 'cell_count',
    ],
  },
  BATTERY_HEALTH: {
    name: 'battery_health',
    version: '1.0',
    attributes: [
      'passport_id', 'soh', 'soce',
      'remaining_life_cycle', 'analysis_date', 'technician',
    ],
  },
  MAINTENANCE: {
    name: 'maintenance_record',
    version: '1.0',
    attributes: [
      'passport_id', 'maintenance_type', 'description',
      'technician', 'maintenance_date', 'result',
    ],
  },
  COMPLIANCE: {
    name: 'regulatory_compliance',
    version: '1.0',
    attributes: [
      'passport_id', 'regulation', 'compliance_status',
      'inspector', 'inspection_date', 'valid_until',
    ],
  },
  RECYCLING: {
    name: 'recycling_eligibility',
    version: '1.0',
    attributes: [
      'passport_id', 'recycling_available', 'recycling_rates',
      'hazardous_materials', 'evaluator', 'evaluation_date',
    ],
  },
};

async function initializeSchemas() {
  const results = {};
  for (const [type, schema] of Object.entries(BATTERY_SCHEMAS)) {
    try {
      const { schemaId } = await createSchema(schema.name, schema.version, schema.attributes);
      const { credDefId } = await createCredentialDefinition(schemaId, type);
      results[type] = { schemaId, credDefId };
      log.info('VC Schema initialized', { action: 'InitSchema', type, schemaId });
    } catch (err) {
      // Schema already exists 등 — 무시
      log.warn('Schema init failed', { action: 'InitSchema', type, error: err.message });
      results[type] = { error: err.message };
    }
  }
  return results;
}

module.exports = {
  createSchema,
  getSchema,
  createCredentialDefinition,
  getCredentialDefinition,
  issueCredential,
  revokeCredential,
  verifyCredentialStatus,
  logVerification,
  queryCredential,
  queryCredentialsByPassport,
  queryCredentialsByHolder,
  queryCredentialsByType,
  queryRevokedCredentials,
  getCredentialHistory,
  initializeSchemas,
  BATTERY_SCHEMAS,
};
