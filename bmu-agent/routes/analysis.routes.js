const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { requireMSP } = require('../middleware/rbac');
const fabricService = require('../services/fabric.service');
const { MSP } = require('../config/constants');

router.post('/:id/request', authenticateToken, requireMSP(MSP.EV_MANUFACTURER), async (req, res) => {
  try {
    await fabricService.submitTransaction('RequestAnalysis', [req.params.id], req.user);
    res.json({ success: true, passportId: req.params.id, status: 'ANALYSIS' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/result', authenticateToken, requireMSP(MSP.SERVICE), async (req, res) => {
  const { soh, soce, remainingLifeCycle, recycleAvailable } = req.body;
  if (soh == null || soce == null || remainingLifeCycle == null || recycleAvailable == null) {
    return res.status(400).json({ error: 'soh, soce, remainingLifeCycle, recycleAvailable required' });
  }
  try {
    await fabricService.submitTransaction('SubmitAnalysisResult', [
      req.params.id,
      String(soh), String(soce),
      String(remainingLifeCycle), String(recycleAvailable),
    ], req.user);
    res.json({ success: true, passportId: req.params.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
