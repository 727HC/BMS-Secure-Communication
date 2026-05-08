/**
 * Realtime read-model proxy
 *
 * cloud-agent(3002, MongoDB read model) 응답을 JWT 인증 후 그대로 전달.
 * frontend는 bmu-agent에 JWT로 호출, bmu-agent가 X-API-Key로 cloud-agent에 위임.
 *
 * 사용 케이스: passport snapshot의 current* 필드 (chaincode 직접 조회는 0 반환,
 *           cloud-agent listener가 bmuRecord 블록 이벤트마다 갱신함)
 */

const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const fabricService = require('../services/fabric.service');
const { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } = require('../config/constants');
const { validatePageSize, validateBookmark } = require('../utils/request-validation');
const { sendChaincodeError } = require('../middleware/chaincode-error');
const {
  overlayPassportWithLatestBmu,
  overlayPassportPageWithLatestBmu,
} = require('../services/passportSnapshotOverlay.service');

const router = express.Router();

const CLOUD_AGENT_BASE = process.env.CLOUD_AGENT_BASE || 'http://localhost:3002';
const CLOUD_AGENT_API_KEY = process.env.CLOUD_AGENT_API_KEY || '';

if (!CLOUD_AGENT_API_KEY) {
  console.warn('[realtime] CLOUD_AGENT_API_KEY not set — realtime endpoints will fail authentication against cloud-agent');
}

async function proxyGet(path, query = '') {
  const url = `${CLOUD_AGENT_BASE}${path}${query}`;
  const r = await fetch(url, {
    headers: { 'X-API-Key': CLOUD_AGENT_API_KEY },
  });
  const text = await r.text();
  let body;
  try { body = JSON.parse(text); } catch { body = { error: text.slice(0, 200) }; }
  return { status: r.status, body };
}

function parseResult(buffer) {
  return JSON.parse(buffer.toString());
}

function readPagination(req) {
  const pageSize = validatePageSize(req.query.pageSize, DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);
  if (pageSize.error) return { error: pageSize.error };
  const bookmark = validateBookmark(req.query.bookmark);
  if (bookmark.error) return { error: bookmark.error };
  return { pageSize: pageSize.value, bookmark: bookmark.value };
}

async function queryBmuRecords(passportId, req, pageSizeOverride) {
  const pagination = readPagination(req);
  if (pagination.error) {
    const err = new Error(pagination.error);
    err.status = 400;
    err.category = 'VAL';
    throw err;
  }
  const pageSize = pageSizeOverride || pagination.pageSize;
  const result = await fabricService.evaluateTransaction(
    'QueryBMURecordsByPassport',
    [passportId, String(pageSize), pagination.bookmark],
    req.user
  );
  return parseResult(result);
}

router.get('/passports', authenticateToken, async (req, res) => {
  try {
    const qs = new URLSearchParams(req.query).toString();
    try {
      const { status, body } = await proxyGet('/api/passports', qs ? `?${qs}` : '');
      if (status >= 200 && status < 300 && !body?.error) {
        return res.status(status).json(await overlayPassportPageWithLatestBmu(body, req.user));
      }
    } catch {
      // cloud-agent read model is optional. Fall back to Fabric below.
    }

    const pagination = readPagination(req);
    if (pagination.error) {
      return res.status(400).json({ error: pagination.error, category: 'VAL' });
    }
    const result = await fabricService.evaluateTransaction(
      'QueryPassportsWithPagination',
      [String(pagination.pageSize), pagination.bookmark],
      req.user
    );
    return res.json(await overlayPassportPageWithLatestBmu(parseResult(result), req.user));
  } catch (err) {
    sendChaincodeError(res, err);
  }
});

router.get('/passports/:id', authenticateToken, async (req, res) => {
  try {
    try {
      const { status, body } = await proxyGet(`/api/passports/${encodeURIComponent(req.params.id)}`);
      if (status === 200 && !body?.error) {
        return res.status(status).json(body);
      }
    } catch {
      // cloud-agent read model is optional. Fall back to Fabric so live BMU data
      // remains visible in the battery passport during local MATLAB/HIL runs.
    }

    const passport = parseResult(await fabricService.evaluateTransaction(
      'QueryPassport',
      [req.params.id],
      req.user
    ));
    return res.json(await overlayPassportWithLatestBmu(passport, req.user));
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message, category: err.category });
    sendChaincodeError(res, err);
  }
});

router.get('/bmu/:passportId', authenticateToken, async (req, res) => {
  try {
    const qs = new URLSearchParams(req.query).toString();
    try {
      const { status, body } = await proxyGet(
        `/api/bmu/${encodeURIComponent(req.params.passportId)}`,
        qs ? `?${qs}` : ''
      );
      if (status === 200 && !body?.error) {
        return res.status(status).json(body);
      }
    } catch {
      // cloud-agent read model is optional; Fabric ledger is the fallback source.
    }

    const bmu = await queryBmuRecords(req.params.passportId, req);
    return res.json(bmu);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message, category: err.category });
    sendChaincodeError(res, err);
  }
});

router.get('/stats', authenticateToken, async (_req, res) => {
  try {
    const { status, body } = await proxyGet('/api/stats');
    res.status(status).json(body);
  } catch (err) {
    res.status(502).json({ error: 'cloud-agent unreachable', detail: err.message });
  }
});

module.exports = router;
