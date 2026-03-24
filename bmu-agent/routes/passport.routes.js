const express = require('express');
const router = express.Router();
const path = require('path');
const multer = require('multer');
const { authenticateToken } = require('../middleware/auth');
const { requireMSP } = require('../middleware/rbac');
const fabricService = require('../services/fabric.service');
const { MSP } = require('../config/constants');

// Vehicle image upload config
const uploadDir = path.join(__dirname, '..', '..', 'webapp', 'frontend', 'uploads', 'vehicles');
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, req.params.id + ext);
  },
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 }, fileFilter: (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) cb(null, true);
  else cb(new Error('이미지 파일만 업로드 가능합니다.'));
}});

function parseResult(buffer) {
  return JSON.parse(buffer.toString());
}

// POST /api/passports — Create battery passport
router.post('/', authenticateToken, requireMSP(MSP.MANUFACTURER), async (req, res) => {
  const {
    passportId, batteryId, did, model, serialNumber,
    manufacturerName, manufactureCountry, cellManufacturer, cellManufactureCountry,
    manufactureDate, cellType, chemistry, cellCount, weight,
    totalEnergy, energyDensity, ratedCapacity, expectedLifespan,
    voltageRange, temperatureRange, carbonFootprint,
  } = req.body;

  if (!passportId || !batteryId || !serialNumber) {
    return res.status(400).json({ error: 'passportId, batteryId, serialNumber required' });
  }

  try {
    await fabricService.submitTransaction('CreateBatteryPassport', [
      passportId, batteryId, did || '',
      model || '', serialNumber,
      manufacturerName || '', manufactureCountry || '',
      cellManufacturer || '', cellManufactureCountry || '',
      manufactureDate || '', cellType || '', chemistry || '',
      String(cellCount || 0), String(weight || 0),
      String(totalEnergy || 0), String(energyDensity || 0),
      String(ratedCapacity || 0), String(expectedLifespan || 0),
      voltageRange || '', temperatureRange || '',
      String(carbonFootprint || 0),
    ], req.user);
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
router.put('/:id/bind', authenticateToken, requireMSP(MSP.EV_MANUFACTURER), async (req, res) => {
  const { vin, installDate, evManufacturer, evAssemblyCountry } = req.body;
  if (!vin) {
    return res.status(400).json({ error: 'vin required' });
  }
  try {
    await fabricService.submitTransaction('BindToVehicle', [
      req.params.id, vin, installDate || '', evManufacturer || '', evAssemblyCountry || '',
    ], req.user);
    res.json({ success: true, passportId: req.params.id, vin });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/passports/:id/vehicle-image — Upload vehicle image
router.post('/:id/vehicle-image', authenticateToken, upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'image file required' });
  }
  res.json({ success: true, filename: req.file.filename, path: '/uploads/vehicles/' + req.file.filename });
});

// GET /api/passports/:id/vehicle-image — Check if image exists
router.get('/:id/vehicle-image', (req, res) => {
  const fs = require('fs');
  const exts = ['.jpg', '.jpeg', '.png', '.webp', '.svg'];
  for (const ext of exts) {
    const filePath = path.join(uploadDir, req.params.id + ext);
    if (fs.existsSync(filePath)) {
      return res.json({ exists: true, path: '/uploads/vehicles/' + req.params.id + ext });
    }
  }
  res.json({ exists: false });
});

// POST /api/passports/:id/correct — Correct passport field
router.post('/:id/correct', authenticateToken, requireMSP(MSP.MANUFACTURER, MSP.REGULATOR), async (req, res) => {
  const { fieldName, newValue, reason } = req.body;
  if (!fieldName || !newValue || !reason) {
    return res.status(400).json({ error: 'fieldName, newValue, reason required' });
  }
  try {
    await fabricService.submitTransaction('CorrectPassportData', [
      req.params.id, fieldName, newValue, reason,
    ], req.user);
    res.json({ success: true, passportId: req.params.id, fieldName, newValue });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/passports/:id/corrections — Get correction history
router.get('/:id/corrections', async (req, res) => {
  try {
    const result = await fabricService.evaluateTransaction('QueryCorrectionHistory', req.params.id);
    res.json(parseResult(result));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
