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

async function verifyCredentialStatus(fabricService, credentialId, userCtx) {
  const result = await fabricService.evaluateTransaction('VerifyCredentialStatus', [credentialId], userCtx);
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

async function queryCredential(fabricService, credentialId, userCtx) {
  const result = await fabricService.evaluateTransaction('QueryCredential', [credentialId], userCtx);
  return JSON.parse(result.toString());
}

async function queryCredentialsByPassport(fabricService, passportId, pageSize, bookmark, userCtx) {
  const result = await fabricService.evaluateTransaction(
    'QueryCredentialsByPassport', [passportId, String(pageSize || 100), bookmark || ''], userCtx
  );
  return JSON.parse(result.toString());
}

async function queryCredentialsByHolder(fabricService, holderDid, pageSize, bookmark, userCtx) {
  const result = await fabricService.evaluateTransaction(
    'QueryCredentialsByHolder', [holderDid, String(pageSize || 100), bookmark || ''], userCtx
  );
  return JSON.parse(result.toString());
}

async function queryCredentialsByType(fabricService, credType, pageSize, bookmark, userCtx) {
  const result = await fabricService.evaluateTransaction(
    'QueryCredentialsByType', [credType, String(pageSize || 100), bookmark || ''], userCtx
  );
  return JSON.parse(result.toString());
}

async function queryRevokedCredentials(fabricService, pageSize, bookmark, userCtx) {
  const result = await fabricService.evaluateTransaction(
    'QueryRevokedCredentials', [String(pageSize || 100), bookmark || ''], userCtx
  );
  return JSON.parse(result.toString());
}

async function queryIssuers(fabricService, userCtx) {
  const result = await fabricService.evaluateTransaction('QueryIssuers', [], userCtx);
  return JSON.parse(result.toString());
}

async function queryCredentialTypesByIssuer(fabricService, issuerMsp, userCtx) {
  const result = await fabricService.evaluateTransaction('QueryCredentialTypesByIssuer', [issuerMsp], userCtx);
  return JSON.parse(result.toString());
}

async function requestCredentialIssuance(fabricService, requestId, passportId, credType, userCtx) {
  const result = await fabricService.submitTransaction('RequestCredentialIssuance', [requestId, passportId, credType], userCtx);
  return result?.length ? JSON.parse(result.toString()) : { requestId, passportId, credType, status: 'PENDING' };
}

async function approveCredentialIssuance(fabricService, requestId, userCtx) {
  const result = await fabricService.submitTransaction('ApproveCredentialIssuance', [requestId], userCtx);
  return result?.length ? JSON.parse(result.toString()) : { requestId, status: 'APPROVED' };
}

async function rejectCredentialIssuance(fabricService, requestId, reason, userCtx) {
  const result = await fabricService.submitTransaction('RejectCredentialIssuance', [requestId, reason], userCtx);
  return result?.length ? JSON.parse(result.toString()) : { requestId, status: 'REJECTED', reason };
}

async function getCredentialHistory(fabricService, credentialId, userCtx) {
  const result = await fabricService.evaluateTransaction('GetCredentialHistory', [credentialId], userCtx);
  return JSON.parse(result.toString());
}

async function queryVerificationsByCredential(fabricService, credentialId, pageSize, bookmark, userCtx) {
  const result = await fabricService.evaluateTransaction(
    'QueryVerificationsByCredential', [credentialId, String(pageSize || 100), bookmark || ''], userCtx
  );
  return JSON.parse(result.toString());
}

async function queryVerificationsByVerifier(fabricService, verifierDid, pageSize, bookmark, userCtx) {
  const result = await fabricService.evaluateTransaction(
    'QueryVerificationsByVerifier', [verifierDid, String(pageSize || 100), bookmark || ''], userCtx
  );
  return JSON.parse(result.toString());
}

async function updateRegulatoryVerification(fabricService, passportId, status, evidenceIds, userCtx) {
  const result = await fabricService.submitTransaction(
    'UpdateRegulatoryVerification', [passportId, status, JSON.stringify(evidenceIds || [])], userCtx
  );
  return result?.length ? JSON.parse(result.toString()) : { success: true };
}

async function verifyPhysicalHistory(fabricService, passportId, signals, reason, userCtx) {
  const result = await fabricService.submitTransaction(
    'VerifyPhysicalHistory', [passportId, JSON.stringify(signals || {}), reason], userCtx
  );
  return result?.length ? JSON.parse(result.toString()) : { success: true };
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
  queryIssuers,
  queryCredentialTypesByIssuer,
  requestCredentialIssuance,
  approveCredentialIssuance,
  rejectCredentialIssuance,
  getCredentialHistory,
  queryVerificationsByCredential,
  queryVerificationsByVerifier,
  updateRegulatoryVerification,
  verifyPhysicalHistory,
  initializeSchemas,
  BATTERY_SCHEMAS,
};
