const axios = require('axios');
const bs58 = require('bs58').default;
const nacl = require('tweetnacl');
const { acaPyUrl } = require('../config/auth');

function isHex(str) {
  return /^[0-9A-Fa-f]+$/.test(str) && str.length % 2 === 0;
}

function decodeSignature(signature) {
  if (isHex(signature)) {
    return Buffer.from(signature, 'hex');
  }
  return Buffer.from(signature, 'base64');
}

async function getVerkey(did) {
  const res = await axios.get(`${acaPyUrl}/ledger/did-verkey`, {
    params: { did },
  });
  return res.data.verkey;
}

async function verifySignature(did, verifyTarget, signature) {
  const verkey = await getVerkey(did);
  const publicKey = bs58.decode(verkey);
  const msgBytes = Buffer.isBuffer(verifyTarget)
    ? verifyTarget
    : Buffer.from(verifyTarget);
  const sigBytes = decodeSignature(signature);
  return nacl.sign.detached.verify(msgBytes, sigBytes, publicKey);
}

async function registerDID(did, verkey, role) {
  const verkeyStr = typeof verkey === 'string'
    ? verkey
    : bs58.encode(Uint8Array.from(verkey));
  const res = await axios.post(`${acaPyUrl}/ledger/register-nym`, {
    did,
    verkey: verkeyStr,
    role: role || null,
  });
  return res.data;
}

async function getAcaPyStatus() {
  const res = await axios.get(`${acaPyUrl}/status`);
  return res.data;
}

module.exports = {
  getVerkey,
  verifySignature,
  registerDID,
  getAcaPyStatus,
  isHex,
  decodeSignature,
};
