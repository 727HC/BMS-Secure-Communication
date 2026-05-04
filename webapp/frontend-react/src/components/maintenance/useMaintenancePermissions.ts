export function useMaintenancePermissions(org: string | null) {
  const isEVManufacturer = org === 'EVManufacturerMSP';
  const isService = org === 'ServiceMSP';
  return {
    isEVManufacturer,
    isService,
    canRequestMaintenance: isEVManufacturer,
    canLogMaintenance: isService,
    canLogAccident: isEVManufacturer || isService,
  };
}
