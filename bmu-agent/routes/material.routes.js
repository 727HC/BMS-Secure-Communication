const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { requireMSP } = require('../middleware/rbac');
const fabricService = require('../services/fabric.service');
const { MSP } = require('../config/constants');
const { sendChaincodeError } = require('../middleware/chaincode-error');
const { validateId, validateText, validateNumber, firstError } = require('../utils/request-validation');

function validationError(res, error) {
  return res.status(400).json({ error, category: 'VAL' });
}

router.post('/', authenticateToken, requireMSP(MSP.MANUFACTURER), async (req, res) => {
  const { materialId, name, origin, supplier, quantity, unit, certificationId } = req.body;
  const bodyError = firstError(
    validateId(materialId, 'materialId'),
    validateText(name, 'name', { min: 1, max: 128 }),
    validateText(origin, 'origin', { min: 1, max: 128 }),
    validateText(supplier, 'supplier', { max: 128, required: false }),
    validateNumber(quantity, 'quantity', { min: 0, required: false }),
    validateText(unit, 'unit', { max: 32, required: false }),
    validateId(certificationId, 'certificationId', { required: false })
  );
  if (bodyError) return validationError(res, bodyError);
  try {
    await fabricService.submitTransaction('RegisterRawMaterial', [
      materialId, name, origin,
      supplier || '', String(quantity || 0), unit || '', certificationId || '',
    ], req.user);
    res.json({ success: true, materialId });
  } catch (err) {
    sendChaincodeError(res, err);
  }
});

router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await fabricService.evaluateTransaction('QueryRawMaterials', [], req.user);
    res.json(JSON.parse(result.toString()));
  } catch (err) {
    sendChaincodeError(res, err);
  }
});

module.exports = router;
