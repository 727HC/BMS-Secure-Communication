import { describe, expect, it } from 'vitest';
import { useMaintenanceLabels } from './useMaintenanceLabels';

describe('useMaintenanceLabels', () => {
  it('returns EV-manufacturer texts', () => {
    const result = useMaintenanceLabels({ isEVManufacturer: true, isService: false });
    expect(result.docketScopeLabel).toContain('EV manufacturer');
    expect(result.docketSummary).toContain('EV 제조사');
  });

  it('returns service texts', () => {
    const result = useMaintenanceLabels({ isEVManufacturer: false, isService: true });
    expect(result.docketScopeLabel).toContain('서비스');
    expect(result.docketSummary).toContain('정비 조직');
  });

  it("falls back to read-only for unknown roles", () => {
    const result = useMaintenanceLabels({ isEVManufacturer: false, isService: false });
    expect(result.docketScopeLabel).toBe('Read-only docket view');
    expect(result.docketSummary).toContain('현재 권한');
  });
});
