const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { requireMSP } = require('../middleware/rbac');
const fabricService = require('../services/fabric.service');

// POST /api/analysis/:id/request — Request analysis (EV Manufacturer)
router.post('/:id/request', authenticateToken, requireMSP('EVManufacturerMSP'), async (req, res) => {
  try {
    await fabricService.submitTransaction('RequestAnalysis', req.params.id);
    res.json({ success: true, passportId: req.params.id, status: 'ANALYSIS' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/analysis/:id/result — Submit analysis result (Service)
router.post('/:id/result', authenticateToken, requireMSP('ServiceMSP'), async (req, res) => {
  const { soh, soce, remainingLifeCycle, recycleAvailable } = req.body;

  try {
    await fabricService.submitTransaction(
      'SubmitAnalysisResult',
      req.params.id,
      String(soh || 0),
      String(soce || 0),
      String(remainingLifeCycle || 0),
      String(recycleAvailable || false)
    );
    res.json({ success: true, passportId: req.params.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
