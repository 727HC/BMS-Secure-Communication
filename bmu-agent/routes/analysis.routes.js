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
  try {
    await fabricService.submitTransaction('SubmitAnalysisResult', [
      req.params.id,
      String(soh || 0), String(soce || 0),
      String(remainingLifeCycle || 0), String(recycleAvailable || false),
    ], req.user);
    res.json({ success: true, passportId: req.params.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
