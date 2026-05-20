const test = require('node:test');
const assert = require('node:assert/strict');
const { KJUR, KEYUTIL } = require('jsrsasign');

test('jsrsasign KJUR SHA256withECDSA P-256 sign+verify round-trip', () => {
  const kp = KEYUTIL.generateKeypair('EC', 'secp256r1');
  const msg = 'fabric-attach canary message';

  const sig = new KJUR.crypto.Signature({ alg: 'SHA256withECDSA' });
  sig.init(kp.prvKeyObj);
  sig.updateString(msg);
  const signature = sig.sign();

  assert.ok(typeof signature === 'string' && signature.length > 0,
    'signature must be a non-empty hex string');

  const ver = new KJUR.crypto.Signature({ alg: 'SHA256withECDSA' });
  ver.init(kp.pubKeyObj);
  ver.updateString(msg);
  assert.equal(ver.verify(signature), true, 'valid signature must verify');
});

test('jsrsasign verify rejects tampered signature', () => {
  const kp = KEYUTIL.generateKeypair('EC', 'secp256r1');
  const msg = 'fabric-attach canary message';

  const sig = new KJUR.crypto.Signature({ alg: 'SHA256withECDSA' });
  sig.init(kp.prvKeyObj);
  sig.updateString(msg);
  const signature = sig.sign();

  // Flip the last byte to tamper the signature
  const tampered = signature.slice(0, -2) +
    ((parseInt(signature.slice(-2), 16) ^ 0xff).toString(16).padStart(2, '0'));

  const ver = new KJUR.crypto.Signature({ alg: 'SHA256withECDSA' });
  ver.init(kp.pubKeyObj);
  ver.updateString(msg);
  assert.equal(ver.verify(tampered), false, 'tampered signature must not verify');
});
