const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { requireMSP } = require('../middleware/rbac');
const fabricService = require('../services/fabric.service');

// POST /api/materials — Register raw material
router.post('/', authenticateToken, requireMSP('ManufacturerMSP'), async (req, res) => {
  const { materialId, name, origin, supplier, quantity, unit, certificationId } = req.body;

  if (!materialId || !name || !origin) {
    return res.status(400).json({ error: 'materialId, name, origin required' });
  }

  try {
    await fabricService.submitTransaction(
      'RegisterRawMaterial',
      materialId, name, origin,
      supplier || '', String(quantity || 0), unit || '', certificationId || ''
    );
    res.json({ success: true, materialId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/materials — List all raw materials
router.get('/', async (req, res) => {
  try {
    const result = await fabricService.evaluateTransaction('QueryRawMaterials');
    res.json(JSON.parse(result.toString()));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
