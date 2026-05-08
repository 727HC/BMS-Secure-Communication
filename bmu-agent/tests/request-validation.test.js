const test = require('node:test');
const assert = require('node:assert/strict');
const {
  validateInteger,
  validateNumber,
  validatePageSize,
  validateArray,
  validateId,
} = require('../utils/request-validation');

test('validateInteger rejects partial parses such as "1abc"', () => {
  assert.equal(validateInteger('1abc', 'orgNum', { min: 1, max: 4 }), 'orgNum must be an integer');
  assert.equal(validateInteger('2', 'orgNum', { min: 1, max: 4 }), null);
});

test('validateInteger supports optional empty values', () => {
  assert.equal(validateInteger('', 'cellCount', { required: false }), null);
  assert.equal(validateInteger(undefined, 'cellCount', { required: false }), null);
});

test('validateNumber rejects non-finite and out-of-range values', () => {
  assert.equal(validateNumber('abc', 'soh'), 'soh must be a number');
  assert.equal(validateNumber('101', 'soh', { min: 0, max: 100 }), 'soh out of range');
  assert.equal(validateNumber('99.5', 'soh', { min: 0, max: 100 }), null);
});

test('validatePageSize returns a uniform object and rejects partial integers', () => {
  assert.deepEqual(validatePageSize(undefined, 100, 500), { value: 100 });
  assert.deepEqual(validatePageSize('100abc', 100, 500), { error: 'pageSize must be a positive integer' });
  assert.deepEqual(validatePageSize('1000', 100, 500), { value: 500 });
});

test('validateArray applies item validators', () => {
  const error = validateArray(['MAT-1', 'bad id'], 'materialIds', {
    itemValidator: (value, fieldName) => validateId(value, fieldName),
  });
  assert.equal(error, 'materialIds[1] has invalid format');
});
