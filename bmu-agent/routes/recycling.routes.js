const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { requireMSP } = require('../middleware/rbac');
const fabricService = require('../services/fabric.service');
const { MSP } = require('../config/constants');
const { sendChaincodeError } = require('../middleware/chaincode-error');
const { validateBoolean, validateObject, validateId, firstError } = require('../utils/request-validation');

function validationError(res, error) {
  return res.status(400).json({ error, category: 'VAL' });
}

router.param('id', (req, res, next, id) => {
  const idError = validateId(id, 'passportId');
  if (idError) return validationError(res, idError);
  next();
});

router.put('/:id/availability', authenticateToken, requireMSP(MSP.SERVICE, MSP.REGULATOR), async (req, res) => {
  const { available } = req.body;
  const bodyError = validateBoolean(available, 'available');
  if (bodyError) return validationError(res, bodyError);
  try {
    await fabricService.submitTransaction('SetRecycleAvailability', [
      req.params.id, String(available),
    ], req.user);
    res.json({ success: true, passportId: req.params.id, recycleAvailable: available });
  } catch (err) {
    sendChaincodeError(res, err);
  }
});

router.post('/:id/extract', authenticateToken, requireMSP(MSP.REGULATOR), async (req, res) => {
  const { recyclingRates } = req.body;
  const bodyError = firstError(
    validateObject(recyclingRates, 'recyclingRates', { maxKeys: 64 }),
    ...Object.entries(recyclingRates || {}).map(([material, rate]) =>
      validateId(material, 'recyclingRates material') ||
      (typeof rate === 'number' && Number.isFinite(rate) && rate >= 0 && rate <= 100
        ? null
        : `recyclingRates.${material} must be a number between 0 and 100`)
    )
  );
  if (bodyError) return validationError(res, bodyError);
  try {
    await fabricService.submitTransaction('ExtractMaterials', [
      req.params.id, JSON.stringify(recyclingRates),
    ], req.user);
    res.json({ success: true, passportId: req.params.id, status: 'RECYCLING' });
  } catch (err) {
    sendChaincodeError(res, err);
  }
});

router.post('/:id/dispose', authenticateToken, requireMSP(MSP.REGULATOR), async (req, res) => {
  try {
    await fabricService.submitTransaction('DisposeBattery', [req.params.id], req.user);
    res.json({ success: true, passportId: req.params.id, status: 'DISPOSED' });
  } catch (err) {
    sendChaincodeError(res, err);
  }
});

module.exports = router;
