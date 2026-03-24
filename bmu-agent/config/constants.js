// Shared constants — loaded from env with defaults

module.exports = {
  // Pagination
  DEFAULT_PAGE_SIZE: parseInt(process.env.DEFAULT_PAGE_SIZE || '100', 10),
  MAX_PAGE_SIZE: parseInt(process.env.MAX_PAGE_SIZE || '500', 10),

  // Cache
  DID_CACHE_TTL_MS: parseInt(process.env.DID_CACHE_TTL_MS || '300000', 10),

  // MSP IDs (centralized — routes reference these instead of string literals)
  MSP: {
    MANUFACTURER: process.env.FABRIC_ORG1_MSP || 'ManufacturerMSP',
    EV_MANUFACTURER: process.env.FABRIC_ORG2_MSP || 'EVManufacturerMSP',
    SERVICE: process.env.FABRIC_ORG3_MSP || 'ServiceMSP',
    REGULATOR: process.env.FABRIC_ORG4_MSP || 'RegulatorMSP',
  },
};
