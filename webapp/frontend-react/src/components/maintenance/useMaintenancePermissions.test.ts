import { describe, expect, it } from 'vitest';
import { useMaintenancePermissions } from './useMaintenancePermissions';

describe('useMaintenancePermissions', () => {
  it('EVManufacturerMSP requests maintenance and logs accidents', () => {
    const result = useMaintenancePermissions('EVManufacturerMSP');
    expect(result.canRequestMaintenance).toBe(true);
    expect(result.canLogAccident).toBe(true);
    expect(result.canLogMaintenance).toBe(false);
  });

  it('ServiceMSP logs maintenance and accidents', () => {
    const result = useMaintenancePermissions('ServiceMSP');
    expect(result.canLogMaintenance).toBe(true);
    expect(result.canLogAccident).toBe(true);
    expect(result.canRequestMaintenance).toBe(false);
  });

  it('RegulatorMSP cannot do anything in maintenance scope', () => {
    const result = useMaintenancePermissions('RegulatorMSP');
    expect(result.canRequestMaintenance).toBe(false);
    expect(result.canLogMaintenance).toBe(false);
    expect(result.canLogAccident).toBe(false);
  });

  it('null org has no permissions', () => {
    const result = useMaintenancePermissions(null);
    expect(result.canRequestMaintenance).toBe(false);
    expect(result.canLogMaintenance).toBe(false);
    expect(result.canLogAccident).toBe(false);
  });
});
