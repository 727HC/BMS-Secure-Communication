// Normalize Fabric query failures so monitor tools expose fail-closed chaincode errors
// instead of silently degrading to empty or log-only results.
function classifyQueryError(message) {
  const text = String(message || '').toLowerCase();

  if (text.includes('state type mismatch') || (text.includes('doctype') && text.includes('expected'))) {
    return 'DOC_TYPE_MISMATCH';
  }
  if (text.includes('failed to unmarshal') || text.includes('failed to decode')) {
    return 'DECODE_FAILURE';
  }
  if (text.includes('no valid responses') || text.includes('endorsement failure') || text.includes('status=500')) {
    return 'FABRIC_EVALUATE_ERROR';
  }
  if (text.includes('wallet identity') || text.includes('missing env')) {
    return 'MONITOR_CONFIGURATION_ERROR';
  }
  return 'QUERY_ERROR';
}

function normalizeQueryError(err, context = {}) {
  const message = err?.message || String(err);
  return {
    source: 'fabric',
    operation: 'evaluateTransaction',
    function: context.functionName || context.function || null,
    target: context.target || null,
    type: classifyQueryError(message),
    message,
  };
}

function addQueryError(errors, err, context) {
  errors.push(normalizeQueryError(err, context));
}

function queryErrorReport(errors) {
  return {
    count: errors.length,
    hasErrors: errors.length > 0,
    errors,
  };
}

module.exports = { addQueryError, classifyQueryError, normalizeQueryError, queryErrorReport };
