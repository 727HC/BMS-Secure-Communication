import { describe, expect, it } from 'vitest';
import { useRecyclingLabels } from './useRecyclingLabels';

describe('useRecyclingLabels', () => {
  it('returns EV-manufacturer texts when isEVManufacturer', () => {
    const result = useRecyclingLabels({ isEVManufacturer: true, isService: false, isRegulator: false });
    expect(result.deskLabel).toContain('EV제조사');
    expect(result.pageSummary).toContain('EV 제조사');
  });

  it('returns service texts when isService', () => {
    const result = useRecyclingLabels({ isEVManufacturer: false, isService: true, isRegulator: false });
    expect(result.deskLabel).toContain('서비스');
    expect(result.pageSummary).toContain('정비·분석');
  });

  it('returns regulator texts when isRegulator', () => {
    const result = useRecyclingLabels({ isEVManufacturer: false, isService: false, isRegulator: true });
    expect(result.deskLabel).toContain('규제기관');
    expect(result.pageSummary).toContain('검증기관');
  });

  it('falls back to default when no role flag is set', () => {
    const result = useRecyclingLabels({ isEVManufacturer: false, isService: false, isRegulator: false });
    expect(result.deskLabel).toBe('생애 주기 등록부');
    expect(result.pageSummary).toContain('조직 권한');
  });
});
