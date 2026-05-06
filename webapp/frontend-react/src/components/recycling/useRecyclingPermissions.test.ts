import { describe, expect, it } from 'vitest';
import { useRecyclingPermissions } from './useRecyclingPermissions';

describe('useRecyclingPermissions', () => {
  it('EVManufacturerMSP can request analysis only', () => {
    const result = useRecyclingPermissions('EVManufacturerMSP');
    expect(result.canRequestAnalysis).toBe(true);
    expect(result.canSubmitAnalysis).toBe(false);
    expect(result.canToggleRecycle).toBe(false);
    expect(result.canExtract).toBe(false);
    expect(result.canDispose).toBe(false);
  });

  it('ServiceMSP submits analysis and toggles recycle', () => {
    const result = useRecyclingPermissions('ServiceMSP');
    expect(result.canSubmitAnalysis).toBe(true);
    expect(result.canToggleRecycle).toBe(true);
    expect(result.canRequestAnalysis).toBe(false);
    expect(result.canExtract).toBe(false);
  });

  it('RegulatorMSP toggles, extracts, disposes', () => {
    const result = useRecyclingPermissions('RegulatorMSP');
    expect(result.canToggleRecycle).toBe(true);
    expect(result.canExtract).toBe(true);
    expect(result.canDispose).toBe(true);
    expect(result.canRequestAnalysis).toBe(false);
    expect(result.canSubmitAnalysis).toBe(false);
  });

  it('unknown org has no permissions', () => {
    const result = useRecyclingPermissions(null);
    expect(result.canRequestAnalysis).toBe(false);
    expect(result.canSubmitAnalysis).toBe(false);
    expect(result.canToggleRecycle).toBe(false);
    expect(result.canExtract).toBe(false);
    expect(result.canDispose).toBe(false);
  });
});
