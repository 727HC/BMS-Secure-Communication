export function useRecyclingPermissions(org: string | null) {
  const isEVManufacturer = org === 'EVManufacturerMSP';
  const isService = org === 'ServiceMSP';
  const isRegulator = org === 'RegulatorMSP';
  return {
    isEVManufacturer,
    isService,
    isRegulator,
    canRequestAnalysis: isEVManufacturer,
    canSubmitAnalysis: isService,
    canToggleRecycle: isService || isRegulator,
    canExtract: isRegulator,
    canDispose: isRegulator,
  };
}
