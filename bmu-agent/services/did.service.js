const axios = require('axios');
const bs58 = require('bs58').default;
const nacl = require('tweetnacl');
const { acaPyUrl } = require('../config/auth');

// Verkey cache: DID verkeys are immutable on ledger, so long TTL is safe
const VERKEY_CACHE_TTL_MS = parseInt(process.env.VERKEY_CACHE_TTL_MS || '3600000', 10); // 1h
const MAX_VERKEY_CACHE = parseInt(process.env.MAX_VERKEY_CACHE_SIZE || '10000', 10);
const verkeyCache = new Map();
const verkeyPending = new Map();

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
  const cached = verkeyCache.get(did);
  if (cached && Date.now() - cached.ts < VERKEY_CACHE_TTL_MS) {
    return cached.verkey;
  }

  if (verkeyPending.has(did)) {
    return verkeyPending.get(did);
  }

  const promise = (async () => {
    try {
      const res = await axios.get(`${acaPyUrl}/ledger/did-verkey`, {
        params: { did },
      });
      const verkey = res.data.verkey;
      verkeyCache.set(did, { verkey, ts: Date.now() });
      // LRU-style eviction
      if (verkeyCache.size > MAX_VERKEY_CACHE) {
        const oldest = verkeyCache.keys().next().value;
        verkeyCache.delete(oldest);
      }
      return verkey;
    } finally {
      verkeyPending.delete(did);
    }
  })();

  verkeyPending.set(did, promise);
  return promise;
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
