import { useOrgRoles } from '../../lib/useOrgRoles';

export function useRecyclingPermissions(org: string | null) {
  const { isEVManufacturer, isService, isRegulator } = useOrgRoles(org);
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
