import { describe, expect, it } from 'vitest';
import { useOrgRoles } from './useOrgRoles';

describe('useOrgRoles', () => {
  it('returns all flags false for null/empty org', () => {
    const result = useOrgRoles(null);
    expect(result).toEqual({
      isManufacturer: false,
      isEVManufacturer: false,
      isService: false,
      isRegulator: false,
    });
  });

  it('flags ManufacturerMSP', () => {
    const result = useOrgRoles('ManufacturerMSP');
    expect(result.isManufacturer).toBe(true);
    expect(result.isEVManufacturer).toBe(false);
    expect(result.isService).toBe(false);
    expect(result.isRegulator).toBe(false);
  });

  it('flags EVManufacturerMSP', () => {
    const result = useOrgRoles('EVManufacturerMSP');
    expect(result.isEVManufacturer).toBe(true);
    expect(result.isManufacturer).toBe(false);
  });

  it('flags ServiceMSP', () => {
    expect(useOrgRoles('ServiceMSP').isService).toBe(true);
  });

  it('flags RegulatorMSP', () => {
    expect(useOrgRoles('RegulatorMSP').isRegulator).toBe(true);
  });

  it('returns all false for unknown org name', () => {
    const result = useOrgRoles('UnknownMSP');
    expect(result.isManufacturer).toBe(false);
    expect(result.isEVManufacturer).toBe(false);
    expect(result.isService).toBe(false);
    expect(result.isRegulator).toBe(false);
  });
});
