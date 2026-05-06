import { describe, expect, it } from 'vitest';
import {
  SOC_DBC_FACTOR,
  STATUS_CONFIG,
  STATUS_DOT_COLORS,
  STATUS_LABELS,
  STATUS_LIST,
  TEMP_DBC_FACTOR,
} from './helpers';

describe('DBC scaling constants', () => {
  it('SOC_DBC_FACTOR = 100/65535 (uint16 → percent mapping)', () => {
    expect(SOC_DBC_FACTOR).toBe(100 / 65535);
  });

  it('TEMP_DBC_FACTOR = 50/65535 (uint16 → 0~50°C mapping)', () => {
    expect(TEMP_DBC_FACTOR).toBe(50 / 65535);
  });
});

describe('STATUS_LIST order and content', () => {
  it('contains 6 statuses in exact lifecycle order', () => {
    expect(STATUS_LIST).toEqual([
      'MANUFACTURED', 'ACTIVE', 'MAINTENANCE', 'ANALYSIS', 'RECYCLING', 'DISPOSED',
    ]);
  });
});

describe('STATUS_LABELS Korean mapping', () => {
  it('maps every STATUS_LIST status to a Korean label', () => {
    for (const s of STATUS_LIST) {
      expect(STATUS_LABELS[s]).toBeTruthy();
      expect(typeof STATUS_LABELS[s]).toBe('string');
    }
  });

  it('uses expected Korean labels', () => {
    expect(STATUS_LABELS.MANUFACTURED).toBe('제조완료');
    expect(STATUS_LABELS.ACTIVE).toBe('운행중');
    expect(STATUS_LABELS.MAINTENANCE).toBe('정비중');
    expect(STATUS_LABELS.ANALYSIS).toBe('분석중');
    expect(STATUS_LABELS.RECYCLING).toBe('재활용');
    expect(STATUS_LABELS.DISPOSED).toBe('폐기');
  });
});

describe('STATUS_CONFIG provides bg/text/border + label', () => {
  it('every STATUS_LIST entry has full config', () => {
    for (const s of STATUS_LIST) {
      const cfg = STATUS_CONFIG[s];
      expect(cfg).toBeDefined();
      expect(cfg.label).toBe(STATUS_LABELS[s]);
      expect(typeof cfg.bg).toBe('string');
      expect(typeof cfg.text).toBe('string');
      expect(typeof cfg.border).toBe('string');
    }
  });
});

describe('STATUS_DOT_COLORS provides a hex/var color per status', () => {
  it('maps every STATUS_LIST status to a non-empty color', () => {
    for (const s of STATUS_LIST) {
      expect(STATUS_DOT_COLORS[s]).toBeTruthy();
      expect(typeof STATUS_DOT_COLORS[s]).toBe('string');
    }
  });
});
