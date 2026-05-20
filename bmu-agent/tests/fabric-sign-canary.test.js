// Canary for the elliptic-based sign path used by fabric-common.
// fabric-common/lib/impl/CryptoSuite_ECDSA_AES.js lines 12-18 require('elliptic')
// and use EC.keyFromPrivate(prvKeyHex, 'hex') (lines ~213-217) for signing.
// These tests mirror that exact call pattern to catch import/API regressions.

const test = require('node:test');
const assert = require('node:assert/strict');
const elliptic = require('elliptic');

const EC = new elliptic.ec('p256');

test('elliptic EC p256 keypair generate → sign digest → verify true (fabric-common sign path)', () => {
  const key = EC.genKeyPair();
  const digest = Buffer.from('fabric-sign-canary-digest-0000000000000000', 'hex').slice(0, 32);

  const sig = key.sign(digest);

  assert.ok(sig && sig.r && sig.s, 'sign() must return an object with r and s components');
  const valid = key.verify(digest, sig);
  assert.equal(valid, true, 'valid signature must verify to true');
});

test('elliptic EC p256 keyFromPrivate(hex) → sign → verify false for tampered sig (fabric-common sign path)', () => {
  // Generate via genKeyPair, extract private key hex — mirrors keyFromPrivate usage
  const original = EC.genKeyPair();
  const prvKeyHex = original.getPrivate('hex');

  const key = EC.keyFromPrivate(prvKeyHex, 'hex');
  const digest = Buffer.alloc(32, 0xab);

  const sig = key.sign(digest);

  // Tamper: increment r by 1
  const tampered = { r: sig.r.addn(1), s: sig.s };
  const invalid = key.verify(digest, tampered);
  assert.equal(invalid, false, 'tampered signature must verify to false');
});
