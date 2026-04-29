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

router.get('/passports', authenticateToken, async (req, res) => {
  try {
    const qs = new URLSearchParams(req.query).toString();
    const { status, body } = await proxyGet('/api/passports', qs ? `?${qs}` : '');
    res.status(status).json(body);
  } catch (err) {
    res.status(502).json({ error: 'cloud-agent unreachable', detail: err.message });
  }
});

router.get('/passports/:id', authenticateToken, async (req, res) => {
  try {
    const { status, body } = await proxyGet(`/api/passports/${encodeURIComponent(req.params.id)}`);
    res.status(status).json(body);
  } catch (err) {
    res.status(502).json({ error: 'cloud-agent unreachable', detail: err.message });
  }
});

router.get('/bmu/:passportId', authenticateToken, async (req, res) => {
  try {
    const qs = new URLSearchParams(req.query).toString();
    const { status, body } = await proxyGet(
      `/api/bmu/${encodeURIComponent(req.params.passportId)}`,
      qs ? `?${qs}` : ''
    );
    res.status(status).json(body);
  } catch (err) {
    res.status(502).json({ error: 'cloud-agent unreachable', detail: err.message });
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
