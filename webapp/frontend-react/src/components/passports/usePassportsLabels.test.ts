import { describe, expect, it } from 'vitest';
import { usePassportsLabels } from './usePassportsLabels';

describe('usePassportsLabels', () => {
  it('returns Manufacturer texts', () => {
    const result = usePassportsLabels({ isManufacturer: true, isRegulator: false });
    expect(result.registerScopeLabel).toContain('제조사');
    expect(result.registerSummary).toContain('제조사');
  });

  it('returns Regulator texts when not manufacturer', () => {
    const result = usePassportsLabels({ isManufacturer: false, isRegulator: true });
    expect(result.registerScopeLabel).toContain('규제기관');
    expect(result.registerSummary).toContain('검증기관');
  });

  it('falls back to shared view when no role flag set', () => {
    const result = usePassportsLabels({ isManufacturer: false, isRegulator: false });
    expect(result.registerScopeLabel).toBe('공유 등록부 뷰');
    expect(result.registerSummary).toContain('조직 권한');
  });

  it('Manufacturer takes priority when both flags true', () => {
    const result = usePassportsLabels({ isManufacturer: true, isRegulator: true });
    expect(result.registerScopeLabel).toContain('제조사');
  });
});
