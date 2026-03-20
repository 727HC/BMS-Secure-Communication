const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { requireMSP } = require('../middleware/rbac');
const fabricService = require('../services/fabric.service');

function parseResult(buffer) {
  return JSON.parse(buffer.toString());
}

// POST /api/passports — Create battery passport
router.post('/', authenticateToken, requireMSP('ManufacturerMSP'), async (req, res) => {
  const {
    passportId, batteryId, did, model, serialNumber,
    manufacturerName, manufactureCountry, cellManufacturer, cellManufactureCountry,
    manufactureDate, cellType, chemistry, cellCount, weight,
    totalEnergy, energyDensity, ratedCapacity, expectedLifespan,
    voltageRange, temperatureRange,
  } = req.body;

  if (!passportId || !batteryId || !serialNumber) {
    return res.status(400).json({ error: 'passportId, batteryId, serialNumber required' });
  }

  try {
    await fabricService.submitTransaction(
      'CreateBatteryPassport',
      passportId, batteryId, did || '',
      model || '', serialNumber,
      manufacturerName || '', manufactureCountry || '',
      cellManufacturer || '', cellManufactureCountry || '',
      manufactureDate || '', cellType || '', chemistry || '',
      String(cellCount || 0), String(weight || 0),
      String(totalEnergy || 0), String(energyDensity || 0),
      String(ratedCapacity || 0), String(expectedLifespan || 0),
      voltageRange || '', temperatureRange || ''
    );
    res.json({ success: true, passportId });
  } catch (err) {
    console.error('CreateBatteryPassport failed:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/passports — List all passports
router.get('/', async (req, res) => {
  try {
    const result = await fabricService.evaluateTransaction('QueryAllPassports');
    res.json(parseResult(result));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/passports/:id — Get passport by ID
router.get('/:id', async (req, res) => {
  try {
    const result = await fabricService.evaluateTransaction('QueryPassport', req.params.id);
    res.json(parseResult(result));
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
});

// GET /api/passports/:id/history — Get passport history
router.get('/:id/history', async (req, res) => {
  try {
    const result = await fabricService.evaluateTransaction('GetPassportHistory', req.params.id);
    res.json(parseResult(result));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/passports/:id/bind — Bind to vehicle (EV Manufacturer)
router.put('/:id/bind', authenticateToken, requireMSP('EVManufacturerMSP'), async (req, res) => {
  const { vin, installDate, evManufacturer, evAssemblyCountry } = req.body;

  if (!vin) {
    return res.status(400).json({ error: 'vin required' });
  }

  try {
    await fabricService.submitTransaction(
      'BindToVehicle',
      req.params.id, vin, installDate || '', evManufacturer || '', evAssemblyCountry || ''
    );
    res.json({ success: true, passportId: req.params.id, vin });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
