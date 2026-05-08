const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const path = require('path');
const multer = require('multer');
const { authenticateToken } = require('../middleware/auth');
const { requireMSP } = require('../middleware/rbac');
const fabricService = require('../services/fabric.service');
const { MSP, DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } = require('../config/constants');
const {
  SEED_FLAG,
  isDashboardPassportSeedEnabled,
  buildDashboardPassportSeed,
  paginateDashboardSeed,
} = require('../services/devPassportSeed.service');
const {
  overlayPassportWithLatestBmu,
  overlayPassportPageWithLatestBmu,
} = require('../services/passportSnapshotOverlay.service');

// Vehicle image upload config — static tree 밖에 저장하여 직접 접근 차단
const fs = require('fs');
const uploadDir = path.join(__dirname, '..', 'data', 'vehicle-images');
const VEHICLE_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];
const VEHICLE_IMAGE_MIME_TO_EXT = new Map([
  ['image/jpeg', '.jpg'],
  ['image/png', '.png'],
  ['image/webp', '.webp'],
]);
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
function vehicleImageExt(file) {
  return VEHICLE_IMAGE_MIME_TO_EXT.get(file.mimetype);
}
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = vehicleImageExt(file);
    if (!ext) return cb(Object.assign(new Error('지원하지 않는 이미지 형식입니다. JPG, PNG, WebP만 업로드할 수 있습니다.'), { code: 'UNSUPPORTED_VEHICLE_IMAGE' }));
    const safeId = path.basename(String(req.params.id || ''));
    if (!/^[A-Za-z0-9._-]+$/.test(safeId)) return cb(new Error('유효하지 않은 여권 ID입니다.'));
    cb(null, safeId + ext);
  },
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 }, fileFilter: (req, file, cb) => {
  const ext = path.extname(file.originalname || '').toLowerCase();
  if (vehicleImageExt(file) && VEHICLE_IMAGE_EXTENSIONS.includes(ext)) {
    return cb(null, true);
  }
  return cb(Object.assign(new Error('지원하지 않는 이미지 형식입니다. JPG, PNG, WebP만 업로드할 수 있습니다.'), { code: 'UNSUPPORTED_VEHICLE_IMAGE' }));
}});

const { createLogger } = require('../services/logger.service');
const { sendChaincodeError } = require('../middleware/chaincode-error');
const {
  validateId,
  validateText,
  validateInteger,
  validateNumber,
  validateObject,
  validateEnum,
  validateArray,
  validatePageSize,
  validateBookmark,
  firstError,
} = require('../utils/request-validation');
const log = createLogger('passport');

const DEFAULT_BMS_MANAGEMENT_ID = process.env.BMS_MANAGEMENT_ID || 'BMS-MGMT-001';
const DEFAULT_BMS_BINDING_ID = process.env.BMS_BINDING_ID || 'did:battery:001#BMS-MGMT-001';
const DEFAULT_BMS_BINDING_CODE32 = process.env.BMS_BINDING_CODE32 || '0x2c9a0e0c';
const DEFAULT_BMS_EVIDENCE_HASH = process.env.BMS_EVIDENCE_HASH || 'b3c37ed2cdd2831cc0c212445905ced4a20ea51e129bff2e7418deddf7223178';
const SHA256_HEX_RE = /^[0-9a-fA-F]{64}$/;
const BMS_IDENTIFIER_RE = /^[A-Za-z0-9:_./#-]+$/;
const RECYCLED_ELEMENT_KEYS = new Set([
  'lithium', 'nickel', 'cobalt', 'manganese', 'graphite',
  'aluminum', 'copper', 'iron', 'plastic', 'other',
  'Li', 'Ni', 'Co', 'Mn', 'C', 'Al', 'Cu', 'Fe',
]);

const CORRECTABLE_FIELDS = [
  'model',
  'serialNumber',
  'manufacturerName',
  'manufactureCountry',
  'cellManufacturer',
  'cellManufactureCountry',
  'manufactureDate',
  'cellType',
  'chemistry',
  'voltageRange',
  'temperatureRange',
  'cellCount',
  'weight',
  'totalEnergy',
  'energyDensity',
  'ratedCapacity',
  'expectedLifespan',
  'carbonFootprint',
  'manufacturingProcess',
  'disposalMethod',
  'recycledElementContent',
  'extensionInfo',
  'vin',
  'installDate',
  'evManufacturer',
  'evAssemblyCountry',
];
const REGULATORY_STATUSES = ['VERIFIED', 'PARTIAL', 'PENDING', 'FAILED'];
const PHYSICAL_SIGNAL_KEYS = ['socMatched', 'didMatched', 'vinMatched', 'fcMatched', 'bmsIdentifierMatched'];
const JSON_CORRECTION_FIELDS = new Set(['recycledElementContent', 'extensionInfo']);

function parseResult(buffer) {
  return JSON.parse(buffer.toString());
}

function validationError(res, error) {
  return res.status(400).json({ error, category: 'VAL' });
}

function isPlainObject(value) {
  return value != null && typeof value === 'object' && !Array.isArray(value);
}

function readPagination(req) {
  const pageSize = validatePageSize(req.query.pageSize, DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);
  if (pageSize.error) return { error: pageSize.error };
  const bookmark = validateBookmark(req.query.bookmark);
  if (bookmark.error) return { error: bookmark.error };
  return { pageSize: pageSize.value, bookmark: bookmark.value };
}

function validateCreatePassportBody(body) {
  return firstError(
    validateId(body.passportId, 'passportId'),
    validateId(body.batteryId, 'batteryId'),
    validateId(body.did, 'did', { max: 256, pattern: /^[A-Za-z0-9._:-]+$/ }),
    validateText(body.serialNumber, 'serialNumber', { min: 1, max: 128 }),
    validateInteger(body.cellCount, 'cellCount', { min: 0, required: false }),
    validateNumber(body.weight, 'weight', { min: 0, required: false }),
    validateNumber(body.totalEnergy, 'totalEnergy', { min: 0, required: false }),
    validateNumber(body.energyDensity, 'energyDensity', { min: 0, required: false }),
    validateNumber(body.ratedCapacity, 'ratedCapacity', { min: 0, required: false }),
    validateInteger(body.expectedLifespan, 'expectedLifespan', { min: 0, required: false }),
    validateNumber(body.carbonFootprint, 'carbonFootprint', { min: 0, required: false })
  );
}

function validateCorrectionValue(fieldName, newValue) {
  if (!JSON_CORRECTION_FIELDS.has(fieldName)) return null;

  let parsed;
  try {
    parsed = JSON.parse(newValue);
  } catch {
    return `${fieldName} must be valid JSON`;
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return `${fieldName} must be a JSON object`;
  }

  if (Object.keys(parsed).length === 0) {
    return `${fieldName} must not be empty`;
  }

  if (fieldName === 'recycledElementContent') {
    for (const [key, value] of Object.entries(parsed)) {
      const keyError = validateId(key, `${fieldName} key`);
      if (keyError) return keyError;
      if (!RECYCLED_ELEMENT_KEYS.has(key)) return `unknown recycledElementContent key: ${key}`;
      if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 100) {
        return `${fieldName}.${key} must be a number between 0 and 100`;
      }
    }
  }

  if (fieldName === 'extensionInfo') {
    for (const [key, value] of Object.entries(parsed)) {
      const keyError = validateId(key, `${fieldName} key`);
      if (keyError) return keyError;
      if (typeof value !== 'string' || value.length > 512) {
        return `${fieldName}.${key} must be a string`;
      }
    }
  }

  return null;
}

function parseOptionalJsonObject(value, fieldName) {
  if (value == null || value === '') return { value: '' };
  if (isPlainObject(value)) return { parsed: value };
  if (typeof value !== 'string') return { error: `${fieldName} must be a JSON object` };
  const trimmed = value.trim();
  if (!trimmed) return { value: '' };
  try {
    const parsed = JSON.parse(trimmed);
    if (!isPlainObject(parsed)) return { error: `${fieldName} must be a JSON object` };
    return { parsed };
  } catch {
    return { error: `${fieldName} must be valid JSON` };
  }
}

function normalizeRecycledElementContent(value) {
  const result = parseOptionalJsonObject(value, 'recycledElementContent');
  if (result.error || result.value === '') return result;
  for (const [key, rate] of Object.entries(result.parsed)) {
    if (!RECYCLED_ELEMENT_KEYS.has(key)) return { error: `unknown recycledElementContent key: ${key}` };
    if (typeof rate !== 'number' || !Number.isFinite(rate) || rate < 0 || rate > 100) {
      return { error: `recycledElementContent.${key} must be a number between 0 and 100` };
    }
  }
  return { value: JSON.stringify(result.parsed) };
}

function normalizeExtensionInfo(value, fieldName = 'extensionInfo') {
  const result = parseOptionalJsonObject(value, fieldName);
  if (result.error || result.value === '') return result;
  for (const [key, itemValue] of Object.entries(result.parsed)) {
    const keyError = validateId(key, `${fieldName} key`, { max: 64 });
    if (keyError) return { error: keyError };
    if (typeof itemValue !== 'string' || itemValue.length > 512) {
      return { error: `${fieldName}.${key} must be a string` };
    }
  }
  return { value: JSON.stringify(result.parsed) };
}

function validateOptionalSha256Hex(value, fieldName) {
  if (value == null || value === '') return null;
  if (typeof value !== 'string' || !SHA256_HEX_RE.test(value.trim())) {
    return `${fieldName} must be 64-character hex SHA-256`;
  }
  return null;
}

function normalizeBmsIdentifier(value, fieldName, fallback) {
  const raw = value == null || value === '' ? fallback : value;
  const textError = validateText(raw, fieldName, { min: 1, max: 128 });
  if (textError) return { error: textError };
  const trimmed = raw.trim();
  if (!BMS_IDENTIFIER_RE.test(trimmed)) return { error: `${fieldName} has invalid format` };
  return { value: trimmed };
}

function defaultSourceVerificationDetails() {
  return {
    bmsManagementId: DEFAULT_BMS_MANAGEMENT_ID,
    bmsBindingId: DEFAULT_BMS_BINDING_ID,
    bmsBindingCode32: DEFAULT_BMS_BINDING_CODE32,
  };
}

router.param('id', (req, res, next, id) => {
  const idError = validateId(id, 'passportId');
  if (idError) return validationError(res, idError);
  next();
});

// POST /api/passports — Create battery passport
router.post('/', authenticateToken, requireMSP(MSP.MANUFACTURER), async (req, res) => {
  const {
    passportId, batteryId, did, model, serialNumber,
    manufacturerName, manufactureCountry, cellManufacturer, cellManufactureCountry,
    manufactureDate, cellType, chemistry, cellCount, weight,
    totalEnergy, energyDensity, ratedCapacity, expectedLifespan,
    voltageRange, temperatureRange, carbonFootprint,
  } = req.body;

  const bodyError = validateCreatePassportBody(req.body);
  if (bodyError) return validationError(res, bodyError);

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
    sendChaincodeError(res, err);
  }
});

// POST /api/passports/:id/extended-attributes — Set 3rd-year extended attributes
router.post('/:id/extended-attributes', authenticateToken, requireMSP(MSP.MANUFACTURER, MSP.REGULATOR), async (req, res) => {
  const {
    manufacturingProcess = '',
    disposalMethod = '',
    recycledElementContent,
    extensionInfo,
    reason,
  } = req.body;
  const recycled = normalizeRecycledElementContent(recycledElementContent);
  if (recycled.error) return validationError(res, recycled.error);
  const extension = normalizeExtensionInfo(extensionInfo);
  if (extension.error) return validationError(res, extension.error);
  const bodyError = firstError(
    validateText(manufacturingProcess, 'manufacturingProcess', { max: 256, required: false }),
    validateText(disposalMethod, 'disposalMethod', { max: 256, required: false }),
    validateText(reason, 'reason', { min: 1, max: 512 })
  );
  if (bodyError) return validationError(res, bodyError);

  try {
    await fabricService.submitTransaction('SetPassportExtendedAttributes', [
      req.params.id,
      manufacturingProcess.trim(),
      disposalMethod.trim(),
      recycled.value || '',
      extension.value || '',
      reason.trim(),
    ], req.user);
    res.json({ success: true, passportId: req.params.id });
  } catch (err) {
    log.error('SetPassportExtendedAttributes failed', { action: 'SetPassportExtendedAttributes', passportId: req.params.id, error: err.message });
    sendChaincodeError(res, err);
  }
});

// POST /api/passports/:id/bms-binding — Bind full BMS management identifier
router.post('/:id/bms-binding', authenticateToken, requireMSP(MSP.MANUFACTURER, MSP.REGULATOR), async (req, res) => {
  const management = normalizeBmsIdentifier(req.body.bmsManagementId, 'bmsManagementId', DEFAULT_BMS_MANAGEMENT_ID);
  if (management.error) return validationError(res, management.error);
  const binding = normalizeBmsIdentifier(req.body.bmsBindingId, 'bmsBindingId', DEFAULT_BMS_BINDING_ID);
  if (binding.error) return validationError(res, binding.error);
  const evidenceHash = req.body.evidenceHash == null || req.body.evidenceHash === ''
    ? DEFAULT_BMS_EVIDENCE_HASH
    : String(req.body.evidenceHash).trim();
  const bodyError = firstError(
    validateOptionalSha256Hex(evidenceHash, 'evidenceHash'),
    validateText(req.body.reason || 'initial BMS binding', 'reason', { min: 1, max: 512 })
  );
  if (bodyError) return validationError(res, bodyError);

  try {
    await fabricService.submitTransaction('BindBMSIdentifier', [
      req.params.id,
      management.value,
      binding.value,
      evidenceHash,
      (req.body.reason || 'initial BMS binding').trim(),
    ], req.user);
    res.json({
      success: true,
      passportId: req.params.id,
      bmsManagementId: management.value,
      bmsBindingId: binding.value,
      bmsBindingCode32: DEFAULT_BMS_BINDING_CODE32,
      evidenceHash,
    });
  } catch (err) {
    log.error('BindBMSIdentifier failed', { action: 'BindBMSIdentifier', passportId: req.params.id, error: err.message });
    sendChaincodeError(res, err);
  }
});

// POST /api/passports/:id/source-verification — Record source/oracle verification evidence
router.post('/:id/source-verification', authenticateToken, requireMSP(MSP.MANUFACTURER, MSP.REGULATOR), async (req, res) => {
  const verificationId = req.body.verificationId || `SRC-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
  const sourceType = req.body.sourceType || 'BMS_BINDING';
  const sourceId = req.body.sourceId || DEFAULT_BMS_BINDING_ID;
  const dataHash = req.body.dataHash || DEFAULT_BMS_EVIDENCE_HASH;
  const details = req.body.details ?? defaultSourceVerificationDetails();
  const normalizedDetails = normalizeExtensionInfo(details, 'details');
  if (normalizedDetails.error) return validationError(res, normalizedDetails.error);
  const bodyError = firstError(
    validateId(verificationId, 'verificationId'),
    validateText(sourceType, 'sourceType', { min: 1, max: 64 }),
    validateText(sourceId, 'sourceId', { min: 1, max: 128 }),
    validateOptionalSha256Hex(dataHash, 'dataHash'),
    typeof (req.body.result ?? true) === 'boolean' ? null : 'result must be a boolean'
  );
  if (bodyError) return validationError(res, bodyError);

  try {
    await fabricService.submitTransaction('RecordSourceVerification', [
      verificationId,
      req.params.id,
      sourceType,
      sourceId,
      dataHash,
      String(req.body.result ?? true),
      normalizedDetails.value || '{}',
    ], req.user);
    res.json({ success: true, verificationId, passportId: req.params.id });
  } catch (err) {
    log.error('RecordSourceVerification failed', { action: 'RecordSourceVerification', passportId: req.params.id, error: err.message });
    sendChaincodeError(res, err);
  }
});

// GET /api/passports — List passports with pagination (user identity로 RBAC 적용)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const pagination = readPagination(req);
    if (pagination.error) return validationError(res, pagination.error);
    const { pageSize, bookmark } = pagination;
    if (isDashboardPassportSeedEnabled()) {
      const records = buildDashboardPassportSeed();
      const paginatedResult = paginateDashboardSeed(records, pageSize, bookmark);
      res.set('X-BMS-Dev-Seed', SEED_FLAG);
      return res.json(paginatedResult);
    }

    const result = await fabricService.evaluateTransaction(
      'QueryPassportsWithPagination', [String(pageSize), bookmark], req.user
    );
    res.json(await overlayPassportPageWithLatestBmu(parseResult(result), req.user));
  } catch (err) {
    log.error('QueryPassportsWithPagination failed', { action: 'QueryPassportsWithPagination', error: err.message, stack: err.stack?.split('\n').slice(0,3).join(' | ') });
    sendChaincodeError(res, err);
  }
});

// GET /api/passports/:id — Get passport by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    if (isDashboardPassportSeedEnabled() && /^DEV-DASH-P-/.test(req.params.id)) {
      const records = buildDashboardPassportSeed();
      const record = records.find((r) => r.passportId === req.params.id);
      if (!record) {
        return res.status(404).json({ error: `passport ${req.params.id} not found in dev seed`, category: 'NOT_FOUND' });
      }
      res.set('X-BMS-Dev-Seed', SEED_FLAG);
      return res.json(record);
    }
    const result = await fabricService.evaluateTransaction('QueryPassport', [req.params.id], req.user);
    res.json(await overlayPassportWithLatestBmu(parseResult(result), req.user));
  } catch (err) {
    sendChaincodeError(res, err);
  }
});

// GET /api/passports/:id/history — Get passport history
router.get('/:id/history', authenticateToken, async (req, res) => {
  try {
    if (isDashboardPassportSeedEnabled() && /^DEV-DASH-P-/.test(req.params.id)) {
      const records = buildDashboardPassportSeed();
      const record = records.find((r) => r.passportId === req.params.id);
      if (!record) {
        return res.status(404).json({ error: `passport ${req.params.id} not found in dev seed`, category: 'NOT_FOUND' });
      }
      res.set('X-BMS-Dev-Seed', SEED_FLAG);
      return res.json([{ txId: `DEV-DASH-TX-${record.passportId}`, timestamp: record.createdAt, value: record, isDelete: false }]);
    }
    const result = await fabricService.evaluateTransaction('GetPassportHistory', [req.params.id], req.user);
    res.json(parseResult(result));
  } catch (err) {
    sendChaincodeError(res, err);
  }
});

// PUT /api/passports/:id/bind — Bind to vehicle (EV Manufacturer)
router.put('/:id/bind', authenticateToken, requireMSP(MSP.EV_MANUFACTURER), async (req, res) => {
  const { vin, installDate, evManufacturer, evAssemblyCountry } = req.body;
  const bodyError = firstError(
    validateText(vin, 'vin', { min: 1, max: 64 }),
    validateText(installDate, 'installDate', { max: 64, required: false }),
    validateText(evManufacturer, 'evManufacturer', { max: 128, required: false }),
    validateText(evAssemblyCountry, 'evAssemblyCountry', { max: 128, required: false })
  );
  if (bodyError) return validationError(res, bodyError);
  try {
    await fabricService.submitTransaction('BindToVehicle', [
      req.params.id, vin, installDate || '', evManufacturer || '', evAssemblyCountry || '',
    ], req.user);
    res.json({ success: true, passportId: req.params.id, vin });
  } catch (err) {
    sendChaincodeError(res, err);
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

  for (const ext of VEHICLE_IMAGE_EXTENSIONS) {
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
  const bodyError = validateArray(materialIds, 'materialIds', {
    min: 1,
    max: 100,
    itemValidator: (value, fieldName) => validateId(value, fieldName),
  });
  if (bodyError) return validationError(res, bodyError);
  try {
    await fabricService.submitTransaction('LinkRawMaterials', [
      req.params.id, materialIds.join(','),
    ], req.user);
    res.json({ success: true, passportId: req.params.id, linked: materialIds });
  } catch (err) {
    sendChaincodeError(res, err);
  }
});

// POST /api/passports/:id/correct — Correct passport field
router.post('/:id/correct', authenticateToken, requireMSP(MSP.MANUFACTURER, MSP.EV_MANUFACTURER, MSP.REGULATOR), async (req, res) => {
  const { fieldName, newValue, reason } = req.body;
  const bodyError = firstError(
    validateEnum(fieldName, 'fieldName', CORRECTABLE_FIELDS),
    validateText(newValue, 'newValue', { min: 1, max: 4096 }),
    validateText(reason, 'reason', { min: 1, max: 512 }),
    validateCorrectionValue(fieldName, newValue)
  );
  if (bodyError) return validationError(res, bodyError);
  try {
    await fabricService.submitTransaction('CorrectPassportData', [
      req.params.id, fieldName, newValue, reason,
    ], req.user);
    res.json({ success: true, passportId: req.params.id, fieldName, newValue });
  } catch (err) {
    sendChaincodeError(res, err);
  }
});

// GET /api/passports/:id/corrections — Get correction history
router.get('/:id/corrections', authenticateToken, async (req, res) => {
  try {
    const result = await fabricService.evaluateTransaction('QueryCorrectionHistory', [req.params.id], req.user);
    res.json(parseResult(result));
  } catch (err) {
    sendChaincodeError(res, err);
  }
});

// PUT /api/passports/:id/regulatory-verification — Update regulatory verification state
router.put('/:id/regulatory-verification', authenticateToken, requireMSP(MSP.REGULATOR), async (req, res) => {
  const { status, evidenceIds } = req.body;
  const normalizedEvidenceIds = evidenceIds == null ? [] : evidenceIds;
  const bodyError = firstError(
    validateEnum(status, 'status', REGULATORY_STATUSES),
    validateArray(normalizedEvidenceIds, 'evidenceIds', {
      min: 0,
      max: 50,
      itemValidator: (value, fieldName) => validateId(value, fieldName),
    })
  );
  if (bodyError) return validationError(res, bodyError);
  try {
    const result = await fabricService.submitTransaction(
      'UpdateRegulatoryVerification', [req.params.id, status, JSON.stringify(normalizedEvidenceIds)], req.user
    );
    res.json(result?.length ? parseResult(result) : { success: true, passportId: req.params.id, status });
  } catch (err) {
    sendChaincodeError(res, err);
  }
});

// PUT /api/passports/:id/physical-verification — Verify physical-history match
router.put('/:id/physical-verification', authenticateToken, requireMSP(MSP.MANUFACTURER, MSP.REGULATOR), async (req, res) => {
  const { signals, reason } = req.body;
  const signalError = validateObject(signals, 'signals', { maxKeys: 5 });
  if (signalError) return validationError(res, signalError);
  for (const [key, value] of Object.entries(signals)) {
    if (!PHYSICAL_SIGNAL_KEYS.includes(key)) return validationError(res, `signals.${key} is not supported`);
    if (typeof value !== 'boolean') return validationError(res, `signals.${key} must be a boolean`);
  }
  const reasonError = validateText(reason, 'reason', { min: 1, max: 512 });
  if (reasonError) return validationError(res, reasonError);
  try {
    const result = await fabricService.submitTransaction(
      'VerifyPhysicalHistory', [req.params.id, JSON.stringify(signals), reason], req.user
    );
    res.json(result?.length ? parseResult(result) : { success: true, passportId: req.params.id });
  } catch (err) {
    sendChaincodeError(res, err);
  }
});

module.exports = router;
