import { describe, expect, it } from 'vitest';
import { ACTION_LABELS, ACTION_OPTIONS, METHOD_COLORS } from './lib';

describe('audit-log constants', () => {
  it('ACTION_OPTIONS has placeholder + every value maps to a label', () => {
    expect(ACTION_OPTIONS[0]).toEqual({ value: '', label: '전체' });
    for (const opt of ACTION_OPTIONS.slice(1)) {
      expect(opt.value).toBeTruthy();
      expect(opt.label).toBeTruthy();
    }
  });

  it('every non-empty ACTION_OPTIONS value exists in ACTION_LABELS', () => {
    for (const opt of ACTION_OPTIONS) {
      if (!opt.value) continue;
      expect(ACTION_LABELS[opt.value], `missing label for ${opt.value}`).toBeTruthy();
    }
  });

  it('ACTION_LABELS contains core action keys', () => {
    expect(ACTION_LABELS.CREATE_PASSPORT).toBe('여권 생성');
    expect(ACTION_LABELS.BIND_VEHICLE).toBe('VIN 바인딩');
    expect(ACTION_LABELS.RECORD_BMU).toBe('BMU 데이터');
    expect(ACTION_LABELS.LOGIN).toBe('로그인');
  });

  it('METHOD_COLORS provides 4 HTTP methods', () => {
    expect(METHOD_COLORS.GET).toBeTruthy();
    expect(METHOD_COLORS.POST).toBeTruthy();
    expect(METHOD_COLORS.PUT).toBeTruthy();
    expect(METHOD_COLORS.DELETE).toBeTruthy();
  });
});
