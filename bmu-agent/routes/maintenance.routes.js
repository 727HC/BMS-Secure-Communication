const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { requireMSP } = require('../middleware/rbac');
const fabricService = require('../services/fabric.service');
const { MSP } = require('../config/constants');
const { sendChaincodeError } = require('../middleware/chaincode-error');
const { validateId, validateText, firstError } = require('../utils/request-validation');

function validationError(res, error) {
  return res.status(400).json({ error, category: 'VAL' });
}

router.param('id', (req, res, next, id) => {
  const idError = validateId(id, 'passportId');
  if (idError) return validationError(res, idError);
  next();
});

router.post('/:id/request', authenticateToken, requireMSP(MSP.EV_MANUFACTURER), async (req, res) => {
  const { maintenanceType, description } = req.body;
  const bodyError = firstError(
    validateText(maintenanceType, 'maintenanceType', { max: 128, required: false }),
    validateText(description, 'description', { max: 1024, required: false })
  );
  if (bodyError) return validationError(res, bodyError);
  try {
    await fabricService.submitTransaction('RequestMaintenance', [
      req.params.id, maintenanceType || 'routine', description || '',
    ], req.user);
    res.json({ success: true, passportId: req.params.id, status: 'MAINTENANCE' });
  } catch (err) {
    sendChaincodeError(res, err);
  }
});

router.post('/:id/log', authenticateToken, requireMSP(MSP.SERVICE), async (req, res) => {
  const { maintenanceType, description, technician } = req.body;
  const bodyError = firstError(
    validateText(maintenanceType, 'maintenanceType', { max: 128, required: false }),
    validateText(description, 'description', { max: 1024, required: false }),
    validateText(technician, 'technician', { max: 128, required: false })
  );
  if (bodyError) return validationError(res, bodyError);
  try {
    await fabricService.submitTransaction('AddMaintenanceLog', [
      req.params.id, maintenanceType || 'routine', description || '', technician || '',
    ], req.user);
    res.json({ success: true, passportId: req.params.id });
  } catch (err) {
    sendChaincodeError(res, err);
  }
});

router.post('/:id/accident', authenticateToken, requireMSP(MSP.EV_MANUFACTURER, MSP.SERVICE), async (req, res) => {
  const { severity, description, reporter } = req.body;
  const bodyError = firstError(
    validateText(severity, 'severity', { min: 1, max: 64 }),
    validateText(description, 'description', { min: 1, max: 1024 }),
    validateText(reporter, 'reporter', { max: 128, required: false })
  );
  if (bodyError) return validationError(res, bodyError);
  try {
    await fabricService.submitTransaction('AddAccidentLog', [
      req.params.id, severity, description, reporter || req.user.userId,
    ], req.user);
    res.json({ success: true, passportId: req.params.id });
  } catch (err) {
    sendChaincodeError(res, err);
  }
});

module.exports = router;
