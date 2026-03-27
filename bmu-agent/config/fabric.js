const path = require('path');

const isDev = process.env.NODE_ENV !== 'production';

// P1-5: production에서는 FABRIC_ADMIN_SECRET 필수
if (!isDev && !process.env.FABRIC_ADMIN_SECRET) {
  throw new Error('FABRIC_ADMIN_SECRET is required in production.');
}

const NETWORK_BASE = path.resolve(__dirname, '..', '..', 'passport-network');

function buildOrgConfig(num) {
  const prefix = `FABRIC_ORG${num}_`;
  const msp = process.env[`${prefix}MSP`];
  const domain = process.env[`${prefix}DOMAIN`];
  if (!msp || !domain) return null;

  const caName = process.env[`${prefix}CA_NAME`];
  return {
    mspId: msp,
    caHostname: `ca.${domain}`,
    caName,
    caPort: parseInt(process.env[`${prefix}CA_PORT`] || '7054', 10),
    peerEndpoint: process.env[`${prefix}PEER_ENDPOINT`] || `localhost:7051`,
    domain,
    ccpPath: process.env[`${prefix}CCP_PATH`] || path.resolve(
      NETWORK_BASE, 'organizations', 'peerOrganizations', domain,
      `connection-${caName ? caName.replace('ca-', '') : domain.split('.')[0]}.json`
    ),
  };
}

// Build org configs from env (supports 1-8 orgs)
const orgs = {};
for (let i = 1; i <= 8; i++) {
  const org = buildOrgConfig(i);
  if (org) orgs[i] = org;
}

// Build MSP → orgNum reverse map
const mspToOrg = {};
for (const [num, org] of Object.entries(orgs)) {
  mspToOrg[org.mspId] = parseInt(num, 10);
}

const discoveryAsLocalhost = process.env.FABRIC_DISCOVERY_AS_LOCALHOST !== 'false';

const config = {
  channelName: process.env.FABRIC_CHANNEL || 'passportchannel',
  contractName: process.env.FABRIC_CONTRACT || 'passport-contract',
  identity: process.env.FABRIC_IDENTITY || 'admin',
  adminSecret: process.env.FABRIC_ADMIN_SECRET || (isDev ? 'REMOVED_SECRET_ROTATED_2026_04_18' : undefined),
  walletPath: process.env.FABRIC_WALLET_PATH || path.join(__dirname, '..', 'wallet'),

  // P1-7: TLS 검증 (기본 true, dev에서만 false 허용)
  tlsVerify: process.env.FABRIC_CA_TLS_VERIFY !== 'false',

  discoveryAsLocalhost,
  orgs,
  mspToOrg,

  get currentOrg() {
    const orgNum = parseInt(process.env.FABRIC_ORG || '1', 10);
    return this.orgs[orgNum];
  },
};

module.exports = config;
