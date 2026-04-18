const E2E_ADMIN_USER = process.env.E2E_ADMIN_USER || 'admin';
const E2E_ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD || process.env.FABRIC_ADMIN_SECRET;

if (!E2E_ADMIN_PASSWORD) {
  throw new Error('E2E_ADMIN_PASSWORD or FABRIC_ADMIN_SECRET must be set for e2e-tests.');
}

function makeOrg(orgNum, msp, label) {
  return {
    userId: E2E_ADMIN_USER,
    password: E2E_ADMIN_PASSWORD,
    orgNum,
    msp,
    label,
  };
}

module.exports = {
  E2E_ADMIN_USER,
  E2E_ADMIN_PASSWORD,
  ORGS: [
    makeOrg(1, 'ManufacturerMSP', 'Manufacturer'),
    makeOrg(2, 'EVManufacturerMSP', 'EVManufacturer'),
    makeOrg(3, 'ServiceMSP', 'Service'),
    makeOrg(4, 'RegulatorMSP', 'Regulator'),
  ],
};
