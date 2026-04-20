const express = require('express');
const router = express.Router();
const path = require('path');
const multer = require('multer');
const { authenticateToken } = require('../middleware/auth');
const { requireMSP } = require('../middleware/rbac');
const fabricService = require('../services/fabric.service');
const { MSP, DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } = require('../config/constants');

// Vehicle image upload config — static tree 밖에 저장하여 직접 접근 차단
const fs = require('fs');
const uploadDir = path.join(__dirname, '..', 'data', 'vehicle-images');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    const safeId = path.basename(String(req.params.id || ''));
    if (!/^[A-Za-z0-9._-]+$/.test(safeId)) return cb(new Error('유효하지 않은 여권 ID입니다.'));
    cb(null, safeId + ext);
  },
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 }, fileFilter: (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) cb(null, true);
  else cb(new Error('이미지 파일만 업로드 가능합니다.'));
}});

const { createLogger } = require('../services/logger.service');
const log = createLogger('passport');

function parseResult(buffer) {
  return JSON.parse(buffer.toString());
}

function mapPassportErrorStatus(err) {
  const msg = String(err?.message || '').toLowerCase();
  if (msg.includes('does not exist') || msg.includes('not found')) return 404;
  if (msg.includes('access denied') || msg.includes('not authorized') || msg.includes('permission')) return 403;
  return 500;
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

  if (!passportId || !batteryId || !serialNumber || !did) {
    return res.status(400).json({ error: 'passportId, batteryId, serialNumber, did required' });
  }

  try {
    await fabricService.submitTransaction('CreateBatteryPassport', [
      passportId, batteryId, did,
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
    log.error('CreateBatteryPassport failed', { action: 'CreateBatteryPassport', error: err.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/passports — List passports with pagination (user identity로 RBAC 적용)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const pageSize = Math.min(
      parseInt(req.query.pageSize, 10) || DEFAULT_PAGE_SIZE,
      MAX_PAGE_SIZE
    );
    const bookmark = req.query.bookmark || '';
    const result = await fabricService.evaluateTransaction(
      'QueryPassportsWithPagination', [String(pageSize), bookmark], req.user
    );
    res.json(parseResult(result));
  } catch (err) {
    log.error('QueryPassportsWithPagination failed', { action: 'QueryPassportsWithPagination', error: err.message, stack: err.stack?.split('\n').slice(0,3).join(' | ') });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/passports/:id — Get passport by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await fabricService.evaluateTransaction('QueryPassport', [req.params.id], req.user);
    res.json(parseResult(result));
  } catch (err) {
    res.status(mapPassportErrorStatus(err)).json({ error: err.message });
  }
});

// GET /api/passports/:id/history — Get passport history
router.get('/:id/history', authenticateToken, async (req, res) => {
  try {
    const result = await fabricService.evaluateTransaction('GetPassportHistory', [req.params.id], req.user);
    res.json(parseResult(result));
  } catch (err) {
    res.status(mapPassportErrorStatus(err)).json({ error: err.message });
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
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/passports/:id/vehicle-image — Upload vehicle image (ownership verified)
router.post('/:id/vehicle-image', authenticateToken, requireMSP(MSP.EV_MANUFACTURER, MSP.MANUFACTURER), async (req, res, next) => {
  // Verify passport exists and caller has access
  try {
    const result = await fabricService.evaluateTransaction('QueryPassport', [req.params.id], req.user);
    if (!result) return res.status(404).json({ error: 'passport not found' });
    next();
  } catch (err) {
    return res.status(403).json({ error: 'passport access denied' });
  }
}, upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'image file required' });
  }
  res.json({ success: true, filename: req.file.filename, path: `/api/passports/${req.params.id}/vehicle-image` });
});

// GET /api/passports/:id/vehicle-image — Auth + passport 접근 권한 확인 후 이미지 스트리밍
router.get('/:id/vehicle-image', authenticateToken, async (req, res) => {
  try {
    await fabricService.evaluateTransaction('QueryPassport', [req.params.id], req.user);
  } catch (err) {
    return res.status(403).json({ error: 'passport access denied' });
  }

  const exts = ['.jpg', '.jpeg', '.png', '.webp', '.svg'];
  for (const ext of exts) {
    const safeId = path.basename(String(req.params.id || ''));
    if (!/^[A-Za-z0-9._-]+$/.test(safeId)) {
      return res.status(400).json({ error: 'invalid passport id' });
    }
    const filePath = path.resolve(path.join(uploadDir, safeId + ext));
    if (!filePath.startsWith(path.resolve(uploadDir) + path.sep)) {
      return res.status(400).json({ error: 'invalid passport id' });
    }
    if (fs.existsSync(filePath)) {
      return res.sendFile(filePath);
    }
  }
  res.status(404).json({ exists: false });
});

// POST /api/passports/:id/materials — Link raw materials to passport
router.post('/:id/materials', authenticateToken, requireMSP(MSP.MANUFACTURER), async (req, res) => {
  const { materialIds } = req.body;
  if (!materialIds || !Array.isArray(materialIds) || materialIds.length === 0) {
    return res.status(400).json({ error: 'materialIds (array) required' });
  }
  try {
    await fabricService.submitTransaction('LinkRawMaterials', [
      req.params.id, materialIds.join(','),
    ], req.user);
    res.json({ success: true, passportId: req.params.id, linked: materialIds });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/passports/:id/correct — Correct passport field
router.post('/:id/correct', authenticateToken, requireMSP(MSP.MANUFACTURER, MSP.EV_MANUFACTURER, MSP.REGULATOR), async (req, res) => {
  const { fieldName, newValue, reason } = req.body;
  if (fieldName == null || newValue == null || reason == null) {
    return res.status(400).json({ error: 'fieldName, newValue, reason required' });
  }
  try {
    await fabricService.submitTransaction('CorrectPassportData', [
      req.params.id, fieldName, newValue, reason,
    ], req.user);
    res.json({ success: true, passportId: req.params.id, fieldName, newValue });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/passports/:id/corrections — Get correction history
router.get('/:id/corrections', authenticateToken, async (req, res) => {
  try {
    const result = await fabricService.evaluateTransaction('QueryCorrectionHistory', [req.params.id], req.user);
    res.json(parseResult(result));
  } catch (err) {
    res.status(mapPassportErrorStatus(err)).json({ error: err.message });
  }
});

// PUT /api/passports/:id/regulatory-verification — Update regulatory verification state
router.put('/:id/regulatory-verification', authenticateToken, requireMSP(MSP.REGULATOR), async (req, res) => {
  const { status, evidenceIds } = req.body;
  if (!status) {
    return res.status(400).json({ error: 'status required' });
  }
  try {
    const result = await fabricService.submitTransaction(
      'UpdateRegulatoryVerification', [req.params.id, status, JSON.stringify(evidenceIds || [])], req.user
    );
    res.json(result?.length ? parseResult(result) : { success: true, passportId: req.params.id, status });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/passports/:id/physical-verification — Verify physical-history match
router.put('/:id/physical-verification', authenticateToken, requireMSP(MSP.MANUFACTURER, MSP.REGULATOR), async (req, res) => {
  const { signals, reason } = req.body;
  if (!signals || !reason) {
    return res.status(400).json({ error: 'signals, reason required' });
  }
  try {
    const result = await fabricService.submitTransaction(
      'VerifyPhysicalHistory', [req.params.id, JSON.stringify(signals), reason], req.user
    );
    res.json(result?.length ? parseResult(result) : { success: true, passportId: req.params.id });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
