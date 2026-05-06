import { describe, expect, it } from 'vitest';
import {
  CHEMISTRY_COLORS,
  GBA_FIELDS,
  PAGE_SIZE,
  STATUS_COLORS,
  STATUS_OPTIONS,
} from './lib';

describe('passports constants', () => {
  it('PAGE_SIZE = 12', () => {
    expect(PAGE_SIZE).toBe(12);
  });

  it('STATUS_OPTIONS has placeholder (value="") + value/label pairs', () => {
    expect(STATUS_OPTIONS[0].value).toBe('');
    expect(STATUS_OPTIONS[0].label).toBeTruthy();
    expect(STATUS_OPTIONS.length).toBeGreaterThan(1);
  });

  it('every non-empty STATUS_OPTIONS value has a STATUS_COLORS entry', () => {
    for (const opt of STATUS_OPTIONS) {
      if (!opt.value) continue;
      expect(STATUS_COLORS[opt.value], `missing color for ${opt.value}`).toBeTruthy();
    }
  });

  it('CHEMISTRY_COLORS exposes core chemistries', () => {
    expect(CHEMISTRY_COLORS.NCM || CHEMISTRY_COLORS.NMC).toBeTruthy();
    expect(typeof CHEMISTRY_COLORS).toBe('object');
  });

  it('GBA_FIELDS is a 21-element array of Passport keys', () => {
    expect(GBA_FIELDS.length).toBe(21);
    for (const f of GBA_FIELDS) {
      expect(typeof f).toBe('string');
    }
  });
});
