const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { requireMSP } = require('../middleware/rbac');
const fabricService = require('../services/fabric.service');
const { MSP } = require('../config/constants');

router.put('/:id/availability', authenticateToken, requireMSP(MSP.SERVICE, MSP.REGULATOR), async (req, res) => {
  const { available } = req.body;
  if (typeof available !== 'boolean') {
    return res.status(400).json({ error: 'available (boolean) required' });
  }
  try {
    await fabricService.submitTransaction('SetRecycleAvailability', [
      req.params.id, String(available),
    ], req.user);
    res.json({ success: true, passportId: req.params.id, recycleAvailable: available });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/extract', authenticateToken, requireMSP(MSP.REGULATOR), async (req, res) => {
  const { recyclingRates } = req.body;
  if (!recyclingRates) {
    return res.status(400).json({ error: 'recyclingRates required (JSON object)' });
  }
  try {
    await fabricService.submitTransaction('ExtractMaterials', [
      req.params.id, JSON.stringify(recyclingRates),
    ], req.user);
    res.json({ success: true, passportId: req.params.id, status: 'RECYCLING' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/dispose', authenticateToken, requireMSP(MSP.REGULATOR), async (req, res) => {
  try {
    await fabricService.submitTransaction('DisposeBattery', [req.params.id], req.user);
    res.json({ success: true, passportId: req.params.id, status: 'DISPOSED' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
