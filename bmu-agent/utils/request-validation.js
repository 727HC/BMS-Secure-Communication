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
  const required = options.required !== false;
  if (value == null || value === '') {
    return required ? `${fieldName} required` : null;
  }
  const min = options.min ?? 0;
  const max = options.max ?? Number.MAX_SAFE_INTEGER;
  let parsed;
  if (typeof value === 'number') {
    parsed = value;
  } else if (typeof value === 'string' && /^-?\d+$/.test(value.trim())) {
    parsed = Number(value.trim());
  } else {
    return `${fieldName} must be an integer`;
  }
  if (!Number.isSafeInteger(parsed)) {
    return `${fieldName} must be an integer`;
  }
  if (parsed < min || parsed > max) {
    return `${fieldName} out of range`;
  }
  return null;
}

function validateNumber(value, fieldName, options = {}) {
  const required = options.required !== false;
  if (value == null || value === '') {
    return required ? `${fieldName} required` : null;
  }
  const min = options.min ?? 0;
  const max = options.max ?? Number.MAX_SAFE_INTEGER;
  let parsed;
  if (typeof value === 'number') {
    parsed = value;
  } else if (typeof value === 'string' && value.trim() !== '') {
    parsed = Number(value.trim());
  } else {
    return `${fieldName} must be a number`;
  }
  if (!Number.isFinite(parsed)) {
    return `${fieldName} must be a number`;
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

function validateEnum(value, fieldName, allowedValues, options = {}) {
  const required = options.required !== false;
  if (value == null || value === '') {
    return required ? `${fieldName} required` : null;
  }
  if (typeof value !== 'string') {
    return `${fieldName} must be a string`;
  }
  if (!allowedValues.includes(value)) {
    return `${fieldName} must be one of ${allowedValues.join(', ')}`;
  }
  return null;
}

function validateArray(value, fieldName, options = {}) {
  const required = options.required !== false;
  const min = options.min ?? 1;
  const max = options.max ?? 100;
  if (value == null) {
    return required ? `${fieldName} required` : null;
  }
  if (!Array.isArray(value)) {
    return `${fieldName} must be an array`;
  }
  if (value.length < min) {
    return `${fieldName} must not be empty`;
  }
  if (value.length > max) {
    return `${fieldName} has too many entries`;
  }
  if (options.itemValidator) {
    for (let i = 0; i < value.length; i += 1) {
      const error = options.itemValidator(value[i], `${fieldName}[${i}]`);
      if (error) return error;
    }
  }
  return null;
}

function validatePageSize(value, defaultValue, maxValue) {
  if (value == null || value === '') return { value: defaultValue };
  if (typeof value !== 'string' && typeof value !== 'number') {
    return { error: 'pageSize must be a positive integer' };
  }
  const raw = String(value).trim();
  if (!/^\d+$/.test(raw)) return { error: 'pageSize must be a positive integer' };
  const parsed = Number(raw);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
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
  validateNumber,
  validateBoolean,
  validateObject,
  validateEnum,
  validateArray,
  validatePageSize,
  validateBookmark,
  firstError,
};
