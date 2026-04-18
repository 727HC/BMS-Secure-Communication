function isPlainObject(value) {
  return value != null && typeof value === 'object' && !Array.isArray(value);
}

function validateId(value, fieldName = 'id', options = {}) {
  const required = options.required !== false;
  const max = options.max || 128;
  const pattern = options.pattern || /^[A-Za-z0-9._:-]+$/;
  if (value == null || value === '') {
    return required ? `${fieldName} required` : null;
  }
  if (typeof value !== 'string' || !value.trim()) {
    return `${fieldName} has invalid format`;
  }
  const trimmed = value.trim();
  if (trimmed.length > max) {
    return `${fieldName} too long`;
  }
  if (!pattern.test(trimmed)) {
    return `${fieldName} has invalid format`;
  }
  return null;
}

function validateText(value, fieldName, options = {}) {
  const required = options.required !== false;
  const min = options.min || 1;
  const max = options.max || 256;
  if (value == null || value === '') {
    return required ? `${fieldName} required` : null;
  }
  if (typeof value !== 'string') {
    return `${fieldName} must be a string`;
  }
  const trimmed = value.trim();
  if (required && trimmed.length < min) {
    return `${fieldName} too short`;
  }
  if (trimmed.length > max) {
    return `${fieldName} too long`;
  }
  return null;
}

function validateInteger(value, fieldName, options = {}) {
  const min = options.min ?? 0;
  const max = options.max ?? Number.MAX_SAFE_INTEGER;
  const parsed = typeof value === 'number' ? value : Number.parseInt(String(value), 10);
  if (!Number.isInteger(parsed)) {
    return `${fieldName} must be an integer`;
  }
  if (parsed < min || parsed > max) {
    return `${fieldName} out of range`;
  }
  return null;
}

function validateBoolean(value, fieldName) {
  if (typeof value !== 'boolean') {
    return `${fieldName} must be a boolean`;
  }
  return null;
}

function validateObject(value, fieldName, options = {}) {
  if (!isPlainObject(value)) {
    return `${fieldName} must be an object`;
  }
  const keys = Object.keys(value);
  const maxKeys = options.maxKeys || 64;
  if (keys.length === 0) {
    return `${fieldName} must not be empty`;
  }
  if (keys.length > maxKeys) {
    return `${fieldName} has too many entries`;
  }
  return null;
}

function validatePageSize(value, defaultValue, maxValue) {
  if (value == null || value === '') return defaultValue;
  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return { error: 'pageSize must be a positive integer' };
  }
  return { value: Math.min(parsed, maxValue) };
}

function validateBookmark(value) {
  if (value == null || value === '') return { value: '' };
  if (typeof value !== 'string') {
    return { error: 'bookmark must be a string' };
  }
  if (value.length > 512) {
    return { error: 'bookmark too long' };
  }
  return { value };
}

function firstError(...errors) {
  return errors.find(Boolean) || null;
}

module.exports = {
  validateId,
  validateText,
  validateInteger,
  validateBoolean,
  validateObject,
  validatePageSize,
  validateBookmark,
  firstError,
};
