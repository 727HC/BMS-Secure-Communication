import { useOrgRoles } from '../../lib/useOrgRoles';

export function useMaintenancePermissions(org: string | null) {
  const { isEVManufacturer, isService } = useOrgRoles(org);
  return {
    isEVManufacturer,
    isService,
    canRequestMaintenance: isEVManufacturer,
    canLogMaintenance: isService,
    canLogAccident: isEVManufacturer || isService,
  };
}
