const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { requireMSP } = require('../middleware/rbac');
const fabricService = require('../services/fabric.service');
const vcService = require('../services/vc.service');
const { MSP, DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } = require('../config/constants');
const { createLogger } = require('../services/logger.service');
const log = createLogger('vc');

function makeRequestId() {
  return `VCREQ-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
}

// ============================================================
// Schema / Credential Definition 관리
// ============================================================

// POST /api/vc/schemas — Create schema on Indy ledger
router.post('/schemas', authenticateToken, requireMSP(MSP.MANUFACTURER), async (req, res) => {
  const { name, version, attributes } = req.body;
  if (!name || !version || !attributes) {
    return res.status(400).json({ error: 'name, version, attributes required' });
  }
  try {
    const result = await vcService.createSchema(name, version, attributes);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/vc/credential-definitions — Create credential definition
router.post('/credential-definitions', authenticateToken, requireMSP(MSP.MANUFACTURER), async (req, res) => {
  const { schemaId, tag, supportRevocation } = req.body;
  if (!schemaId) {
    return res.status(400).json({ error: 'schemaId required' });
  }
  try {
    const result = await vcService.createCredentialDefinition(schemaId, tag, supportRevocation);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/vc/schemas/init — Initialize all battery passport schemas
router.post('/schemas/init', authenticateToken, requireMSP(MSP.MANUFACTURER), async (req, res) => {
  try {
    const results = await vcService.initializeSchemas();
    res.json({ success: true, schemas: results });
  } catch (err) {
    res.status(500).json({ error: err.message });
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
    res.status(500).json({ error: err.message });
  }
});

// GET /api/vc/issuers/:issuerMsp/types — List credential types by issuer
router.get('/issuers/:issuerMsp/types', authenticateToken, async (req, res) => {
  try {
    const types = await vcService.queryCredentialTypesByIssuer(fabricService, req.params.issuerMsp, req.user);
    res.json({ issuerMsp: req.params.issuerMsp, types });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/vc/request — Request credential issuance
router.post('/request', authenticateToken, async (req, res) => {
  const { passportId, credType } = req.body;
  if (!passportId || !credType) {
    return res.status(400).json({ error: 'passportId, credType required' });
  }
  const requestId = makeRequestId();
  try {
    const result = await vcService.requestCredentialIssuance(fabricService, requestId, passportId, credType, req.user);
    res.json({ success: true, requestId, ...result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/vc/request/:requestId/approve — Approve credential issuance request
router.post('/request/:requestId/approve', authenticateToken, async (req, res) => {
  try {
    const result = await vcService.approveCredentialIssuance(fabricService, req.params.requestId, req.user);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/vc/request/:requestId/reject — Reject credential issuance request
router.post('/request/:requestId/reject', authenticateToken, async (req, res) => {
  const { reason } = req.body;
  if (!reason) {
    return res.status(400).json({ error: 'reason required' });
  }
  try {
    const result = await vcService.rejectCredentialIssuance(fabricService, req.params.requestId, reason, req.user);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/vc/issue — Issue a verifiable credential
router.post('/issue', authenticateToken, async (req, res) => {
  const {
    passportId, credType, issuerDid, holderDid,
    schemaId, credDefId, attributes, expiresAt,
  } = req.body;

  if (!passportId || !credType || !holderDid) {
    return res.status(400).json({ error: 'passportId, credType, holderDid required' });
  }

  // credType에 따른 MSP 검증은 체인코드에서 수행
  const credentialId = `VC-${credType}-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;

  try {
    const result = await vcService.issueCredential(fabricService, {
      credentialId,
      passportId,
      credType,
      issuerDid: issuerDid || '',
      holderDid,
      schemaId: schemaId || '',
      credDefId: credDefId || '',
      attributes: attributes || {},
      expiresAt: expiresAt || '',
      userCtx: req.user,
    });
    log.info('VC issued', { action: 'IssueCredential', credentialId, passportId, credType, holderDid });
    res.json({ success: true, ...result });
  } catch (err) {
    log.error('VC issue failed', { action: 'IssueCredential', credentialId, passportId, credType, error: err.message });
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// Credential 폐기
// ============================================================

// POST /api/vc/revoke — Revoke a credential
router.post('/revoke', authenticateToken, async (req, res) => {
  const { credentialId, reason } = req.body;
  if (!credentialId) {
    return res.status(400).json({ error: 'credentialId required' });
  }
  try {
    const result = await vcService.revokeCredential(
      fabricService, credentialId, reason, req.user
    );
    log.info('VC revoked', { action: 'RevokeCredential', credentialId, reason });
    res.json({ success: true, ...result });
  } catch (err) {
    log.error('VC revoke failed', { action: 'RevokeCredential', credentialId, error: err.message });
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// Credential 검증
// ============================================================

// GET /api/vc/verify/:credentialId — Verify credential status
router.get('/verify/:credentialId', authenticateToken, async (req, res) => {
  try {
    const result = await vcService.verifyCredentialStatus(
      fabricService, req.params.credentialId, req.user
    );
    res.json(result);
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
});

// POST /api/vc/verify-log — Log a verification event
router.post('/verify-log', authenticateToken, async (req, res) => {
  const { credentialId, verifierDid, result } = req.body;
  if (!credentialId) {
    return res.status(400).json({ error: 'credentialId required' });
  }

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
    res.status(500).json({ error: err.message });
  }
});

// GET /api/vc/verify-log/:credentialId — Query verification history by credential
router.get('/verify-log/:credentialId', authenticateToken, async (req, res) => {
  try {
    const pageSize = Math.min(parseInt(req.query.pageSize || String(DEFAULT_PAGE_SIZE), 10), MAX_PAGE_SIZE);
    const bookmark = req.query.bookmark || '';
    const result = await vcService.queryVerificationsByCredential(
      fabricService, req.params.credentialId, pageSize, bookmark, req.user
    );
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/vc/verifier/:verifierDid/history — Query verification history by verifier
router.get('/verifier/:verifierDid/history', authenticateToken, requireMSP(MSP.REGULATOR), async (req, res) => {
  try {
    const pageSize = Math.min(parseInt(req.query.pageSize || String(DEFAULT_PAGE_SIZE), 10), MAX_PAGE_SIZE);
    const bookmark = req.query.bookmark || '';
    const result = await vcService.queryVerificationsByVerifier(
      fabricService, req.params.verifierDid, pageSize, bookmark, req.user
    );
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// Credential 조회
// ============================================================

// GET /api/vc/:credentialId — Get credential by ID
router.get('/:credentialId', authenticateToken, async (req, res) => {
  try {
    const result = await vcService.queryCredential(
      fabricService, req.params.credentialId, req.user
    );
    res.json(result);
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
});

// GET /api/vc/passport/:passportId — List credentials for a passport
router.get('/passport/:passportId', authenticateToken, async (req, res) => {
  try {
    const pageSize = Math.min(parseInt(req.query.pageSize || String(DEFAULT_PAGE_SIZE), 10), MAX_PAGE_SIZE);
    const bookmark = req.query.bookmark || '';
    const result = await vcService.queryCredentialsByPassport(
      fabricService, req.params.passportId, pageSize, bookmark, req.user
    );
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/vc/holder/:holderDid — List credentials by holder DID
router.get('/holder/:holderDid', authenticateToken, async (req, res) => {
  try {
    const pageSize = Math.min(parseInt(req.query.pageSize || String(DEFAULT_PAGE_SIZE), 10), MAX_PAGE_SIZE);
    const bookmark = req.query.bookmark || '';
    const result = await vcService.queryCredentialsByHolder(
      fabricService, req.params.holderDid, pageSize, bookmark, req.user
    );
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/vc/type/:credType — List credentials by type
router.get('/type/:credType', authenticateToken, async (req, res) => {
  try {
    const pageSize = Math.min(parseInt(req.query.pageSize || String(DEFAULT_PAGE_SIZE), 10), MAX_PAGE_SIZE);
    const bookmark = req.query.bookmark || '';
    const result = await vcService.queryCredentialsByType(
      fabricService, req.params.credType, pageSize, bookmark, req.user
    );
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/vc/revoked/list — List revoked credentials (RegulatorMSP)
router.get('/revoked/list', authenticateToken, requireMSP(MSP.REGULATOR), async (req, res) => {
  try {
    const pageSize = Math.min(parseInt(req.query.pageSize || String(DEFAULT_PAGE_SIZE), 10), MAX_PAGE_SIZE);
    const bookmark = req.query.bookmark || '';
    const result = await vcService.queryRevokedCredentials(
      fabricService, pageSize, bookmark, req.user
    );
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/vc/:credentialId/history — Get credential history
router.get('/:credentialId/history', authenticateToken, async (req, res) => {
  try {
    const result = await vcService.getCredentialHistory(
      fabricService, req.params.credentialId, req.user
    );
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
