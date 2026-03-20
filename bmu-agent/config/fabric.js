const path = require('path');

const isDev = process.env.NODE_ENV !== 'production';

// P1-5: production에서는 FABRIC_ADMIN_SECRET 필수
if (!isDev && !process.env.FABRIC_ADMIN_SECRET) {
  throw new Error('FABRIC_ADMIN_SECRET is required in production.');
}

const config = {
  channelName: process.env.FABRIC_CHANNEL || 'passportchannel',
  contractName: process.env.FABRIC_CONTRACT || 'passport-contract',
  identity: process.env.FABRIC_IDENTITY || 'admin',
  adminSecret: process.env.FABRIC_ADMIN_SECRET || (isDev ? 'REMOVED_SECRET_ROTATED_2026_04_18' : undefined),
  walletPath: process.env.FABRIC_WALLET_PATH || path.join(__dirname, '..', 'wallet'),

  // P1-7: TLS 검증 (기본 true, dev에서만 false 허용)
  tlsVerify: process.env.FABRIC_CA_TLS_VERIFY !== 'false',

  orgs: {
    1: {
      mspId: 'ManufacturerMSP',
      caHostname: 'ca.manufacturer.battery.com',
      caName: 'ca-manufacturer',
      caPort: 7054,
      peerEndpoint: 'localhost:7051',
      domain: 'manufacturer.battery.com',
      ccpPath: process.env.FABRIC_CCP_PATH || path.resolve(
        __dirname, '..', '..', 'passport-network',
        'organizations/peerOrganizations/manufacturer.battery.com/connection-manufacturer.json'
      ),
    },
    2: {
      mspId: 'EVManufacturerMSP',
      caHostname: 'ca.evmanufacturer.battery.com',
      caName: 'ca-evmanufacturer',
      caPort: 8054,
      peerEndpoint: 'localhost:9051',
      domain: 'evmanufacturer.battery.com',
      ccpPath: path.resolve(
        __dirname, '..', '..', 'passport-network',
        'organizations/peerOrganizations/evmanufacturer.battery.com/connection-evmanufacturer.json'
      ),
    },
    3: {
      mspId: 'ServiceMSP',
      caHostname: 'ca.service.battery.com',
      caName: 'ca-service',
      caPort: 9054,
      peerEndpoint: 'localhost:11051',
      domain: 'service.battery.com',
      ccpPath: path.resolve(
        __dirname, '..', '..', 'passport-network',
        'organizations/peerOrganizations/service.battery.com/connection-service.json'
      ),
    },
    4: {
      mspId: 'RegulatorMSP',
      caHostname: 'ca.regulator.battery.com',
      caName: 'ca-regulator',
      caPort: 10054,
      peerEndpoint: 'localhost:13051',
      domain: 'regulator.battery.com',
      ccpPath: path.resolve(
        __dirname, '..', '..', 'passport-network',
        'organizations/peerOrganizations/regulator.battery.com/connection-regulator.json'
      ),
    },
  },

  get currentOrg() {
    const orgNum = parseInt(process.env.FABRIC_ORG || '1', 10);
    return this.orgs[orgNum];
  },
};

module.exports = config;
