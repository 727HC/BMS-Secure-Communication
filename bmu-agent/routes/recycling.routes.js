const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { requireMSP } = require('../middleware/rbac');
const fabricService = require('../services/fabric.service');

// PUT /api/recycling/:id/availability — Set recycle availability (Service or Regulator)
router.put('/:id/availability', authenticateToken, requireMSP('ServiceMSP', 'RegulatorMSP'), async (req, res) => {
  const { available } = req.body;

  try {
    await fabricService.submitTransaction(
      'SetRecycleAvailability',
      req.params.id, String(available)
    );
    res.json({ success: true, passportId: req.params.id, recycleAvailable: available });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/recycling/:id/extract — Extract materials (Regulator only)
router.post('/:id/extract', authenticateToken, requireMSP('RegulatorMSP'), async (req, res) => {
  const { recyclingRates } = req.body;

  if (!recyclingRates) {
    return res.status(400).json({ error: 'recyclingRates required (JSON object)' });
  }

  try {
    await fabricService.submitTransaction(
      'ExtractMaterials',
      req.params.id, JSON.stringify(recyclingRates)
    );
    res.json({ success: true, passportId: req.params.id, status: 'RECYCLING' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/recycling/:id/dispose — Dispose battery (Regulator only)
router.post('/:id/dispose', authenticateToken, requireMSP('RegulatorMSP'), async (req, res) => {
  try {
    await fabricService.submitTransaction('DisposeBattery', req.params.id);
    res.json({ success: true, passportId: req.params.id, status: 'DISPOSED' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
