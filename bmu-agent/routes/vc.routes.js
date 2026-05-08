const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { requireMSP } = require('../middleware/rbac');
const fabricService = require('../services/fabric.service');
const vcService = require('../services/vc.service');
const { MSP, DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } = require('../config/constants');
const { createLogger } = require('../services/logger.service');
const { sendChaincodeError } = require('../middleware/chaincode-error');
const {
  validateId,
  validateText,
  validateObject,
  validateBoolean,
  validatePageSize,
  validateBookmark,
  firstError,
} = require('../utils/request-validation');
const log = createLogger('vc');

function makeRequestId() {
  return `VCREQ-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
}

function validationError(res, error) {
  return res.status(400).json({ error, category: 'VAL' });
}

function readPagination(req) {
  const pageSize = validatePageSize(req.query.pageSize, DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);
  if (pageSize.error) return { error: pageSize.error };
  const bookmark = validateBookmark(req.query.bookmark);
  if (bookmark.error) return { error: bookmark.error };
  return { pageSize: pageSize.value, bookmark: bookmark.value };
}

function validateDid(value, fieldName, options = {}) {
  return validateId(value, fieldName, { max: 256, pattern: /^[A-Za-z0-9._:-]+$/, ...options });
}

const DATE_ONLY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const RFC3339_RE = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;

function isValidCalendarDate(year, month, day) {
  if (month < 1 || month > 12) return false;
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return day >= 1 && day <= daysInMonth;
}

function isValidRfc3339(value) {
  const match = value.match(RFC3339_RE);
  if (!match) return false;
  const [, year, month, day, hour, minute, second, , zone] = match;
  const y = Number(year);
  const mo = Number(month);
  const d = Number(day);
  const h = Number(hour);
  const mi = Number(minute);
  const s = Number(second);
  if (!isValidCalendarDate(y, mo, d)) return false;
  if (h > 23 || mi > 59 || s > 59) return false;
  if (zone !== 'Z') {
    const [offsetHour, offsetMinute] = zone.slice(1).split(':').map(Number);
    if (offsetHour > 23 || offsetMinute > 59) return false;
  }
  return true;
}

function normalizeOptionalRfc3339(value, fieldName) {
  if (value == null || value === '') return { value: '' };
  if (typeof value !== 'string') return { error: `${fieldName} must be a string` };
  const trimmed = value.trim();
  if (!trimmed) return { value: '' };
  if (DATE_ONLY_RE.test(trimmed)) {
    const normalized = `${trimmed}T00:00:00Z`;
    return isValidRfc3339(normalized) ? { value: normalized } : { error: `${fieldName} must be RFC3339` };
  }
  return isValidRfc3339(trimmed) ? { value: trimmed } : { error: `${fieldName} must be RFC3339` };
}

function parseFabricJson(result) {
  return JSON.parse(result.toString());
}

function getPassportDid(passport) {
  if (typeof passport?.did === 'string') return passport.did.trim();
  if (typeof passport?.DID === 'string') return passport.DID.trim();
  return '';
}

// ============================================================
// Schema / Credential Definition 관리
// ============================================================

// POST /api/vc/schemas — Create schema on Indy ledger
router.post('/schemas', authenticateToken, requireMSP(MSP.MANUFACTURER), async (req, res) => {
  const { name, version, attributes } = req.body;
  const bodyError = firstError(
    validateText(name, 'name', { min: 1, max: 128 }),
    validateText(version, 'version', { min: 1, max: 64 }),
    Array.isArray(attributes) && attributes.length > 0 ? null : 'attributes must be a non-empty array'
  );
  if (bodyError) return validationError(res, bodyError);
  try {
    const result = await vcService.createSchema(name, version, attributes);
    res.json({ success: true, ...result });
  } catch (err) {
    sendChaincodeError(res, err);
  }
});

// POST /api/vc/credential-definitions — Create credential definition
router.post('/credential-definitions', authenticateToken, requireMSP(MSP.MANUFACTURER), async (req, res) => {
  const { schemaId, tag, supportRevocation } = req.body;
  const bodyError = firstError(
    validateText(schemaId, 'schemaId', { min: 1, max: 256 }),
    validateText(tag, 'tag', { max: 128, required: false }),
    supportRevocation == null ? null : validateBoolean(supportRevocation, 'supportRevocation')
  );
  if (bodyError) return validationError(res, bodyError);
  try {
    const result = await vcService.createCredentialDefinition(schemaId, tag, supportRevocation);
    res.json({ success: true, ...result });
  } catch (err) {
    sendChaincodeError(res, err);
  }
});

// POST /api/vc/schemas/init — Initialize all battery passport schemas
router.post('/schemas/init', authenticateToken, requireMSP(MSP.MANUFACTURER), async (req, res) => {
  try {
    const results = await vcService.initializeSchemas();
    res.json({ success: true, schemas: results });
  } catch (err) {
    sendChaincodeError(res, err);
  }
});

// ============================================================
// Credential 발급
// ============================================================

// GET /api/vc/issuers — List issuers (RegulatorMSP only)
router.get('/issuers', authenticateToken, requireMSP(MSP.REGULATOR), async (req, res) => {
  try {
    const issuers = await vcService.queryIssuers(fabricService, req.user);
    res.json({ issuers });
  } catch (err) {
    sendChaincodeError(res, err);
  }
});

// GET /api/vc/issuers/:issuerMsp/types — List credential types by issuer
router.get('/issuers/:issuerMsp/types', authenticateToken, async (req, res) => {
  try {
    const issuerError = validateText(req.params.issuerMsp, 'issuerMsp', { min: 1, max: 64 });
    if (issuerError) return validationError(res, issuerError);
    const types = await vcService.queryCredentialTypesByIssuer(fabricService, req.params.issuerMsp, req.user);
    res.json({ issuerMsp: req.params.issuerMsp, types });
  } catch (err) {
    sendChaincodeError(res, err);
  }
});

// POST /api/vc/request — Request credential issuance
router.post('/request', authenticateToken, requireMSP(MSP.MANUFACTURER, MSP.EV_MANUFACTURER, MSP.SERVICE, MSP.REGULATOR), async (req, res) => {
  const { passportId, credType } = req.body;
  const bodyError = firstError(
    validateId(passportId, 'passportId'),
    validateText(credType, 'credType', { min: 1, max: 64 })
  );
  if (bodyError) return validationError(res, bodyError);
  const requestId = makeRequestId();
  try {
    const result = await vcService.requestCredentialIssuance(fabricService, requestId, passportId, credType, req.user);
    res.json({ success: true, requestId, ...result });
  } catch (err) {
    sendChaincodeError(res, err);
  }
});

// POST /api/vc/request/:requestId/approve — Approve credential issuance request
router.post('/request/:requestId/approve', authenticateToken, requireMSP(MSP.MANUFACTURER, MSP.SERVICE, MSP.REGULATOR), async (req, res) => {
  try {
    const idError = validateId(req.params.requestId, 'requestId');
    if (idError) return validationError(res, idError);
    const result = await vcService.approveCredentialIssuance(fabricService, req.params.requestId, req.user);
    res.json({ success: true, ...result });
  } catch (err) {
    sendChaincodeError(res, err);
  }
});

// POST /api/vc/request/:requestId/reject — Reject credential issuance request
router.post('/request/:requestId/reject', authenticateToken, requireMSP(MSP.MANUFACTURER, MSP.SERVICE, MSP.REGULATOR), async (req, res) => {
  const { reason } = req.body;
  const bodyError = firstError(
    validateId(req.params.requestId, 'requestId'),
    validateText(reason, 'reason', { min: 1, max: 512 })
  );
  if (bodyError) return validationError(res, bodyError);
  try {
    const result = await vcService.rejectCredentialIssuance(fabricService, req.params.requestId, reason, req.user);
    res.json({ success: true, ...result });
  } catch (err) {
    sendChaincodeError(res, err);
  }
});

// POST /api/vc/issue — Issue a verifiable credential
router.post('/issue', authenticateToken, requireMSP(MSP.MANUFACTURER, MSP.SERVICE, MSP.REGULATOR), async (req, res) => {
  const {
    passportId, credType, issuerDid, holderDid,
    schemaId, credDefId, attributes, expiresAt,
  } = req.body;
  const requestedHolderDid = typeof holderDid === 'string' ? holderDid.trim() : holderDid;
  const hasHolderDidValue = holderDid != null && !(typeof holderDid === 'string' && holderDid.trim() === '');

  const issueError = firstError(
    validateId(passportId, 'passportId'),
    validateText(credType, 'credType', { min: 1, max: 64 }),
    hasHolderDidValue ? validateDid(requestedHolderDid, 'holderDid') : null,
    validateDid(issuerDid, 'issuerDid', { required: false }),
    attributes == null ? null : validateObject(attributes, 'attributes', { maxKeys: 64 })
  );
  if (issueError) return validationError(res, issueError);
  const normalizedExpiresAt = normalizeOptionalRfc3339(expiresAt, 'expiresAt');
  if (normalizedExpiresAt.error) return validationError(res, normalizedExpiresAt.error);

  // credType에 따른 MSP 검증은 체인코드에서 수행
  const credentialId = `VC-${credType}-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;

  try {
    const passportResult = await fabricService.evaluateTransaction('QueryPassport', [passportId], req.user);
    const passportDid = getPassportDid(parseFabricJson(passportResult));
    if (!passportDid) {
      return validationError(res, 'passport.did required');
    }
    const resolvedHolderDid = hasHolderDidValue ? requestedHolderDid : passportDid;
    if (resolvedHolderDid !== passportDid) {
      return validationError(res, `holder DID mismatch: holderDid must match passport.did (${passportDid})`);
    }
    const result = await vcService.issueCredential(fabricService, {
      credentialId,
      passportId,
      credType,
      issuerDid: issuerDid || '',
      holderDid: resolvedHolderDid,
      schemaId: schemaId || '',
      credDefId: credDefId || '',
      attributes: attributes || {},
      expiresAt: normalizedExpiresAt.value,
      userCtx: req.user,
    });
    log.info('VC issued', { action: 'IssueCredential', credentialId, passportId, credType, holderDid: resolvedHolderDid });
    res.json({ success: true, ...result });
  } catch (err) {
    log.error('VC issue failed', { action: 'IssueCredential', credentialId, passportId, credType, error: err.message });
    sendChaincodeError(res, err);
  }
});

// ============================================================
// Credential 폐기
// ============================================================

// POST /api/vc/revoke — Revoke a credential
router.post('/revoke', authenticateToken, requireMSP(MSP.MANUFACTURER, MSP.SERVICE, MSP.REGULATOR), async (req, res) => {
  const { credentialId, reason } = req.body;
  const bodyError = firstError(
    validateId(credentialId, 'credentialId'),
    validateText(reason, 'reason', { max: 512, required: false })
  );
  if (bodyError) return validationError(res, bodyError);
  try {
    const result = await vcService.revokeCredential(
      fabricService, credentialId, reason, req.user
    );
    log.info('VC revoked', { action: 'RevokeCredential', credentialId, reason });
    res.json({ success: true, ...result });
  } catch (err) {
    log.error('VC revoke failed', { action: 'RevokeCredential', credentialId, error: err.message });
    sendChaincodeError(res, err);
  }
});

// ============================================================
// Credential 검증
// ============================================================

// GET /api/vc/verify/:credentialId — Verify credential status
router.get('/verify/:credentialId', authenticateToken, async (req, res) => {
  try {
    const idError = validateId(req.params.credentialId, 'credentialId');
    if (idError) return validationError(res, idError);
    const result = await vcService.verifyCredentialStatus(
      fabricService, req.params.credentialId, req.user
    );
    res.json(result);
  } catch (err) {
    sendChaincodeError(res, err);
  }
});

// POST /api/vc/verify-log — Log a verification event
router.post('/verify-log', authenticateToken, async (req, res) => {
  const { credentialId, verifierDid, result } = req.body;
  const bodyError = firstError(
    validateId(credentialId, 'credentialId'),
    validateDid(verifierDid, 'verifierDid', { required: false }),
    result == null ? null : validateBoolean(result, 'result')
  );
  if (bodyError) return validationError(res, bodyError);

  const verificationId = `VERIFY-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;

  try {
    const logResult = await vcService.logVerification(fabricService, {
      verificationId,
      credentialId,
      verifierDid: verifierDid || '',
      result: result !== false,
      userCtx: req.user,
    });
    res.json({ success: true, ...logResult });
  } catch (err) {
    sendChaincodeError(res, err);
  }
});

// GET /api/vc/verify-log/:credentialId — Query verification history by credential
router.get('/verify-log/:credentialId', authenticateToken, async (req, res) => {
  try {
    const idError = validateId(req.params.credentialId, 'credentialId');
    if (idError) return validationError(res, idError);
    const pagination = readPagination(req);
    if (pagination.error) return validationError(res, pagination.error);
    const { pageSize, bookmark } = pagination;
    const result = await vcService.queryVerificationsByCredential(
      fabricService, req.params.credentialId, pageSize, bookmark, req.user
    );
    res.json(result);
  } catch (err) {
    sendChaincodeError(res, err);
  }
});

// GET /api/vc/verifier/:verifierDid/history — Query verification history by verifier
router.get('/verifier/:verifierDid/history', authenticateToken, requireMSP(MSP.REGULATOR), async (req, res) => {
  try {
    const didError = validateDid(req.params.verifierDid, 'verifierDid');
    if (didError) return validationError(res, didError);
    const pagination = readPagination(req);
    if (pagination.error) return validationError(res, pagination.error);
    const { pageSize, bookmark } = pagination;
    const result = await vcService.queryVerificationsByVerifier(
      fabricService, req.params.verifierDid, pageSize, bookmark, req.user
    );
    res.json(result);
  } catch (err) {
    sendChaincodeError(res, err);
  }
});

// ============================================================
// Credential 조회
// ============================================================

// GET /api/vc/:credentialId — Get credential by ID
router.get('/:credentialId', authenticateToken, async (req, res) => {
  try {
    const idError = validateId(req.params.credentialId, 'credentialId');
    if (idError) return validationError(res, idError);
    const result = await vcService.queryCredential(
      fabricService, req.params.credentialId, req.user
    );
    res.json(result);
  } catch (err) {
    sendChaincodeError(res, err);
  }
});

// GET /api/vc/passport/:passportId — List credentials for a passport
router.get('/passport/:passportId', authenticateToken, async (req, res) => {
  try {
    const idError = validateId(req.params.passportId, 'passportId');
    if (idError) return validationError(res, idError);
    const pagination = readPagination(req);
    if (pagination.error) return validationError(res, pagination.error);
    const { pageSize, bookmark } = pagination;
    const result = await vcService.queryCredentialsByPassport(
      fabricService, req.params.passportId, pageSize, bookmark, req.user
    );
    res.json(result);
  } catch (err) {
    sendChaincodeError(res, err);
  }
});

// GET /api/vc/holder/:holderDid — List credentials by holder DID
router.get('/holder/:holderDid', authenticateToken, async (req, res) => {
  try {
    const didError = validateDid(req.params.holderDid, 'holderDid');
    if (didError) return validationError(res, didError);
    const pagination = readPagination(req);
    if (pagination.error) return validationError(res, pagination.error);
    const { pageSize, bookmark } = pagination;
    const result = await vcService.queryCredentialsByHolder(
      fabricService, req.params.holderDid, pageSize, bookmark, req.user
    );
    res.json(result);
  } catch (err) {
    sendChaincodeError(res, err);
  }
});

// GET /api/vc/type/:credType — List credentials by type
router.get('/type/:credType', authenticateToken, async (req, res) => {
  try {
    const typeError = validateText(req.params.credType, 'credType', { min: 1, max: 64 });
    if (typeError) return validationError(res, typeError);
    const pagination = readPagination(req);
    if (pagination.error) return validationError(res, pagination.error);
    const { pageSize, bookmark } = pagination;
    const result = await vcService.queryCredentialsByType(
      fabricService, req.params.credType, pageSize, bookmark, req.user
    );
    res.json(result);
  } catch (err) {
    sendChaincodeError(res, err);
  }
});

// GET /api/vc/revoked/list — List revoked credentials (RegulatorMSP)
router.get('/revoked/list', authenticateToken, requireMSP(MSP.REGULATOR), async (req, res) => {
  try {
    const pagination = readPagination(req);
    if (pagination.error) return validationError(res, pagination.error);
    const { pageSize, bookmark } = pagination;
    const result = await vcService.queryRevokedCredentials(
      fabricService, pageSize, bookmark, req.user
    );
    res.json(result);
  } catch (err) {
    sendChaincodeError(res, err);
  }
});

// GET /api/vc/:credentialId/history — Get credential history
router.get('/:credentialId/history', authenticateToken, async (req, res) => {
  try {
    const idError = validateId(req.params.credentialId, 'credentialId');
    if (idError) return validationError(res, idError);
    const result = await vcService.getCredentialHistory(
      fabricService, req.params.credentialId, req.user
    );
    res.json(result);
  } catch (err) {
    sendChaincodeError(res, err);
  }
});

module.exports = router;
