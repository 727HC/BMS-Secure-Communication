export function useOrgRoles(org: string | null) {
  return {
    isManufacturer: org === 'ManufacturerMSP',
    isEVManufacturer: org === 'EVManufacturerMSP',
    isService: org === 'ServiceMSP',
    isRegulator: org === 'RegulatorMSP',
  };
}
