import { describe, expect, it } from 'vitest';
import { KPI_TREND_LABELS, SNAPSHOT_SPARKLINE_OFFSETS } from './lib-kpi';

describe('lib-kpi constants', () => {
  it('SNAPSHOT_SPARKLINE_OFFSETS exposes 4 trend kinds with 8 offsets each', () => {
    const kinds = ['total', 'normal', 'alerts', 'verified'] as const;
    for (const k of kinds) {
      expect(SNAPSHOT_SPARKLINE_OFFSETS[k]).toBeDefined();
      expect(SNAPSHOT_SPARKLINE_OFFSETS[k].length).toBe(8);
    }
  });

  it('SNAPSHOT_SPARKLINE_OFFSETS values are signed integers', () => {
    for (const offsets of Object.values(SNAPSHOT_SPARKLINE_OFFSETS)) {
      for (const v of offsets) {
        expect(Number.isInteger(v)).toBe(true);
      }
    }
  });

  it('KPI_TREND_LABELS provides caption + unit for 4 kinds', () => {
    const kinds = ['total', 'normal', 'alerts', 'verified'] as const;
    for (const k of kinds) {
      const label = KPI_TREND_LABELS[k];
      expect(label).toBeDefined();
      expect(label.caption).toBeTruthy();
      expect(label.unit).toBeTruthy();
    }
  });

  it('KPI_TREND_LABELS uses Korean captions', () => {
    expect(KPI_TREND_LABELS.total.caption).toContain('일별');
    expect(KPI_TREND_LABELS.normal.caption).toContain('정상');
    expect(KPI_TREND_LABELS.alerts.caption).toContain('알림');
  });
});
