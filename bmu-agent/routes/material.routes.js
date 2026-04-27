const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { requireMSP } = require('../middleware/rbac');
const fabricService = require('../services/fabric.service');
const { MSP } = require('../config/constants');
const { sendChaincodeError } = require('../middleware/chaincode-error');

router.post('/', authenticateToken, requireMSP(MSP.MANUFACTURER), async (req, res) => {
  const { materialId, name, origin, supplier, quantity, unit, certificationId } = req.body;
  if (!materialId || !name || !origin) {
    return res.status(400).json({ error: 'materialId, name, origin required' });
  }
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
