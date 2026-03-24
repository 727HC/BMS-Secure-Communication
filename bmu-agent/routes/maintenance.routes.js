const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { requireMSP } = require('../middleware/rbac');
const fabricService = require('../services/fabric.service');
const { MSP } = require('../config/constants');

router.post('/:id/request', authenticateToken, requireMSP(MSP.EV_MANUFACTURER), async (req, res) => {
  const { maintenanceType, description } = req.body;
  try {
    await fabricService.submitTransaction('RequestMaintenance', [
      req.params.id, maintenanceType || 'routine', description || '',
    ], req.user);
    res.json({ success: true, passportId: req.params.id, status: 'MAINTENANCE' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/log', authenticateToken, requireMSP(MSP.SERVICE), async (req, res) => {
  const { maintenanceType, description, technician } = req.body;
  try {
    await fabricService.submitTransaction('AddMaintenanceLog', [
      req.params.id, maintenanceType || 'routine', description || '', technician || '',
    ], req.user);
    res.json({ success: true, passportId: req.params.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/accident', authenticateToken, requireMSP(MSP.EV_MANUFACTURER, MSP.SERVICE), async (req, res) => {
  const { severity, description, reporter } = req.body;
  if (!severity || !description) {
    return res.status(400).json({ error: 'severity, description required' });
  }
  try {
    await fabricService.submitTransaction('AddAccidentLog', [
      req.params.id, severity, description, reporter || req.user.userId,
    ], req.user);
    res.json({ success: true, passportId: req.params.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
