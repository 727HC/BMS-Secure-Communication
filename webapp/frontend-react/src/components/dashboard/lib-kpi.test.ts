import { describe, expect, it } from 'vitest';
import {
  KPI_FILTERS,
  SNAPSHOT_SPARKLINE_OFFSETS,
  buildDailyKindTrend,
  buildKpiSnapshot,
  buildKpiVisual,
  buildSnapshotSparkline,
} from './lib-kpi';
import type { DashboardPassport } from './lib';

describe('buildKpiSnapshot', () => {
  it('total: caps fill at clamped scale', () => {
    const snap = buildKpiSnapshot({ kind: 'total', value: 0, total: 5, alerts: 0 });
    expect(snap.kind).toBe('total');
    expect(snap.fill).toBeGreaterThan(0);
    expect(snap.fill).toBeLessThanOrEqual(1);
    expect(snap.caption).toContain('현재 5');
  });

  it('total: zero registry uses "등록 데이터 없음"', () => {
    const snap = buildKpiSnapshot({ kind: 'total', value: 0, total: 0, alerts: 0 });
    expect(snap.fill).toBe(0);
    expect(snap.caption).toBe('등록 데이터 없음');
  });

  it('normal: fill equals value/total', () => {
    const snap = buildKpiSnapshot({ kind: 'normal', value: 3, total: 4, alerts: 0 });
    expect(snap.fill).toBeCloseTo(0.75);
    expect(snap.caption).toBe('3 / 4 정상');
  });

  it('alerts: zero alerts → 0 fill, "경보 없음"', () => {
    const snap = buildKpiSnapshot({ kind: 'alerts', value: 0, total: 10, alerts: 0 });
    expect(snap.fill).toBe(0);
    expect(snap.caption).toBe('경보 없음');
  });

  it('alerts: caption includes alert count and base', () => {
    const snap = buildKpiSnapshot({ kind: 'alerts', value: 0, total: 10, alerts: 3 });
    expect(snap.fill).toBeGreaterThan(0);
    expect(snap.caption).toBe('경보 3건 · 등록 10대 기준');
  });

  it('verified: fill is value/total fraction', () => {
    const snap = buildKpiSnapshot({ kind: 'verified', value: 5, total: 10, alerts: 0 });
    expect(snap.fill).toBeCloseTo(0.5);
    expect(snap.caption).toBe('5 / 10 검증');
  });
});

describe('buildSnapshotSparkline', () => {
  it('produces points matching SNAPSHOT_SPARKLINE_OFFSETS length', () => {
    const snap = buildKpiSnapshot({ kind: 'total', value: 0, total: 50, alerts: 0 });
    const trend = buildSnapshotSparkline(snap);
    expect(trend.points.length).toBe(SNAPSHOT_SPARKLINE_OFFSETS.total.length);
    expect(trend.mode).toBe('snapshot-sparkline');
    expect(trend.source).toBe('metric.snapshot');
  });

  it('flattens to all-zero points when fill is 0 (no fudge baseline)', () => {
    const snap = buildKpiSnapshot({ kind: 'alerts', value: 0, total: 10, alerts: 0 });
    const trend = buildSnapshotSparkline(snap);
    expect(trend.points.every((p) => p.value === 0)).toBe(true);
  });

  it('clamps points to 0..100 when offsets push past bounds', () => {
    const snap = buildKpiSnapshot({ kind: 'normal', value: 100, total: 100, alerts: 0 });
    const trend = buildSnapshotSparkline(snap);
    expect(trend.points.every((p) => p.value >= 0 && p.value <= 100)).toBe(true);
  });
});

describe('KPI_FILTERS', () => {
  it('total accepts every passport', () => {
    expect(KPI_FILTERS.total({})).toBe(true);
  });

  it('alerts is the negation of normal', () => {
    const active80: DashboardPassport = { status: 'ACTIVE', currentSoh: 80 };
    expect(KPI_FILTERS.normal(active80)).toBe(true);
    expect(KPI_FILTERS.alerts(active80)).toBe(false);

    const lowSoh: DashboardPassport = { status: 'ACTIVE', currentSoh: 50 };
    expect(KPI_FILTERS.normal(lowSoh)).toBe(false);
    expect(KPI_FILTERS.alerts(lowSoh)).toBe(true);
  });
});

describe('buildDailyKindTrend', () => {
  it('returns null for empty filtered set', () => {
    expect(buildDailyKindTrend('total', [])).toBeNull();
  });

  it('returns null when only one date bucket exists', () => {
    const single: DashboardPassport[] = [{ createdAt: '2026-05-01T00:00:00.000Z' }];
    expect(buildDailyKindTrend('total', single)).toBeNull();
  });

  it('groups by ISO date and sorts chronologically', () => {
    const passports: DashboardPassport[] = [
      { createdAt: '2026-05-03T00:00:00.000Z' },
      { createdAt: '2026-05-01T00:00:00.000Z' },
      { createdAt: '2026-05-01T12:00:00.000Z' },
    ];
    const trend = buildDailyKindTrend('total', passports);
    expect(trend?.mode).toBe('daily-count');
    expect(trend?.points.map((p) => p.label)).toEqual(['2026-05-01', '2026-05-03']);
    expect(trend?.points[0].value).toBe(2);
  });

  it('skips passports without parseable createdAt', () => {
    const passports: DashboardPassport[] = [
      { createdAt: 'broken' },
      { createdAt: '2026-05-01T00:00:00.000Z' },
    ];
    expect(buildDailyKindTrend('total', passports)).toBeNull();
  });
});

describe('buildKpiVisual', () => {
  it('uses daily trend when buckets ≥ 2', () => {
    const passports: DashboardPassport[] = [
      { createdAt: '2026-05-01T00:00:00.000Z' },
      { createdAt: '2026-05-02T00:00:00.000Z' },
    ];
    const snap = buildKpiSnapshot({ kind: 'total', value: 0, total: 2, alerts: 0 });
    const visual = buildKpiVisual({ kind: 'total', snapshot: snap, passports, total: 2 });
    expect(visual.trend.mode).toBe('daily-count');
  });

  it('falls back to snapshot sparkline when daily trend not viable', () => {
    const snap = buildKpiSnapshot({ kind: 'total', value: 0, total: 1, alerts: 0 });
    const visual = buildKpiVisual({ kind: 'total', snapshot: snap, passports: [{ createdAt: '2026-05-01T00:00:00.000Z' }], total: 1 });
    expect(visual.trend.mode).toBe('snapshot-sparkline');
  });
});
