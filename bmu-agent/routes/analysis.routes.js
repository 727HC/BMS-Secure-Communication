const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { requireMSP } = require('../middleware/rbac');
const fabricService = require('../services/fabric.service');
const { MSP } = require('../config/constants');
const { sendChaincodeError } = require('../middleware/chaincode-error');
const { validateId, validateNumber, validateBoolean, firstError } = require('../utils/request-validation');

function validationError(res, error) {
  return res.status(400).json({ error, category: 'VAL' });
}

router.param('id', (req, res, next, id) => {
  const idError = validateId(id, 'passportId');
  if (idError) return validationError(res, idError);
  next();
});

router.post('/:id/request', authenticateToken, requireMSP(MSP.EV_MANUFACTURER), async (req, res) => {
  try {
    await fabricService.submitTransaction('RequestAnalysis', [req.params.id], req.user);
    res.json({ success: true, passportId: req.params.id, status: 'ANALYSIS' });
  } catch (err) {
    sendChaincodeError(res, err);
  }
});

router.post('/:id/result', authenticateToken, requireMSP(MSP.SERVICE), async (req, res) => {
  const { soh, soce, remainingLifeCycle, recycleAvailable } = req.body;
  const bodyError = firstError(
    validateNumber(soh, 'soh', { min: 0, max: 100 }),
    validateNumber(soce, 'soce', { min: 0, max: 100 }),
    validateNumber(remainingLifeCycle, 'remainingLifeCycle', { min: 0 }),
    validateBoolean(recycleAvailable, 'recycleAvailable')
  );
  if (bodyError) return validationError(res, bodyError);
  try {
    await fabricService.submitTransaction('SubmitAnalysisResult', [
      req.params.id,
      String(soh), String(soce),
      String(remainingLifeCycle), String(recycleAvailable),
    ], req.user);
    res.json({ success: true, passportId: req.params.id });
  } catch (err) {
    sendChaincodeError(res, err);
  }
});

module.exports = router;
