const test = require('node:test');
const assert = require('node:assert/strict');
const { sanitizeBody } = require('../middleware/audit');

test('sanitizeBody recursively redacts secrets, signatures, tokens, and raw BMU payloads', () => {
  const sanitized = sanitizeBody({
    userId: 'alice',
    password: 'pw',
    rawPayload: '00ff',
    nested: {
      token: 'jwt',
      signature: 'sig',
      safe: 'value',
      items: [
        { secret: 's1', materialId: 'MAT-1' },
      ],
    },
  });

  assert.deepEqual(sanitized, {
    userId: 'alice',
    password: '[REDACTED]',
    rawPayload: '[REDACTED]',
    nested: {
      token: '[REDACTED]',
      signature: '[REDACTED]',
      safe: 'value',
      items: [
        { secret: '[REDACTED]', materialId: 'MAT-1' },
      ],
    },
  });
});
