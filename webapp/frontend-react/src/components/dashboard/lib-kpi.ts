import {
  clamp01,
  formatMetricNumber,
  isPassportNormal,
  isPassportVerified,
  niceCeil,
  type DashboardPassport,
} from './lib';

export type KpiTone = 'blue' | 'green' | 'amber' | 'purple';
export type KpiIconName = 'battery' | 'check' | 'alert' | 'chain';
export type KpiSnapshotKind = 'total' | 'normal' | 'alerts' | 'verified';
export type SnapshotSparklineKind = Exclude<KpiSnapshotKind, 'total'>;
export type KpiSnapshotTrendKind = 'total' | SnapshotSparklineKind;

export interface KpiSnapshotViewModel {
  kind: KpiSnapshotKind;
  fill: number;
  caption: string;
  valueLabel: string;
}

export interface KpiTrendPoint {
  label: string;
  value: number;
  timestamp: number;
}

export interface KpiTrendBaseViewModel {
  points: KpiTrendPoint[];
  caption: string;
  valueLabel: string;
}

export type KpiTrendViewModel =
  | (KpiTrendBaseViewModel & {
    kind: KpiSnapshotKind;
    mode: 'daily-count';
    source: 'passports.createdAt';
  })
  | (KpiTrendBaseViewModel & {
    kind: KpiSnapshotTrendKind;
    mode: 'snapshot-sparkline';
    source: 'metric.snapshot';
  });

export interface KpiVisualViewModel {
  trend: KpiTrendViewModel;
}

export interface KpiSnapshotInput {
  kind: KpiSnapshotKind;
  value: number;
  total: number;
  alerts: number;
}

export interface KpiCardViewModel {
  label: string;
  value: string;
  delta: string;
  visual: KpiVisualViewModel;
  tone: KpiTone;
  icon: KpiIconName;
}

export function buildKpiSnapshot({ kind, value, total, alerts }: KpiSnapshotInput): KpiSnapshotViewModel {
  const valueLabel = (fill: number) => `${formatMetricNumber(fill * 100)}%`;

  if (kind === 'total') {
    const scaleMax = Math.max(10, niceCeil(total));
    const fill = total > 0 ? clamp01(total / scaleMax) : 0;
    return {
      kind,
      fill,
      caption: total > 0 ? `현재 ${total} / ${scaleMax}대 규모` : '등록 데이터 없음',
      valueLabel: valueLabel(fill),
    };
  }

  if (kind === 'normal') {
    const fill = total > 0 ? clamp01(value / total) : 0;
    return {
      kind,
      fill,
      caption: total > 0 ? `${value} / ${total} 정상` : '등록 데이터 없음',
      valueLabel: valueLabel(fill),
    };
  }

  if (kind === 'alerts') {
    const base = Math.max(total, 1);
    const fill = alerts > 0 ? clamp01(alerts / (alerts + base)) : 0;
    return {
      kind,
      fill,
      caption: alerts > 0 ? `경보 ${alerts}건 · 등록 ${total}대 기준` : '경보 없음',
      valueLabel: valueLabel(fill),
    };
  }

  const fill = total > 0 ? clamp01(value / total) : 0;
  return {
    kind,
    fill,
    caption: total > 0 ? `${value} / ${total} 검증` : '등록 데이터 없음',
    valueLabel: valueLabel(fill),
  };
}

export const SNAPSHOT_SPARKLINE_OFFSETS: Record<KpiSnapshotTrendKind, number[]> = {
  total: [-4, -2, -3, 0, 2, 1, 4, 3],
  normal: [-6, -2, -4, 1, 3, 1, 6, 5],
  alerts: [-3, 1, -1, 2, 0, 4, 3, 6],
  verified: [-5, -3, 0, -1, 3, 2, 5, 4],
};

export function buildSnapshotSparkline(snapshot: KpiSnapshotViewModel): KpiTrendViewModel {
  const rawBase = snapshot.fill * 100;
  const points = SNAPSHOT_SPARKLINE_OFFSETS[snapshot.kind].map((offset, index) => ({
    label: `snapshot-${index + 1}`,
    value: rawBase === 0 ? 0 : Math.min(100, Math.max(0, rawBase + offset)),
    timestamp: index,
  }));

  return {
    kind: snapshot.kind,
    mode: 'snapshot-sparkline',
    source: 'metric.snapshot',
    points,
    caption: '현재 비율 시각화',
    valueLabel: snapshot.valueLabel,
  };
}

export const KPI_FILTERS: Record<KpiSnapshotKind, (p: DashboardPassport) => boolean> = {
  total: () => true,
  normal: isPassportNormal,
  alerts: (p) => !isPassportNormal(p),
  verified: isPassportVerified,
};

export const KPI_TREND_LABELS: Record<KpiSnapshotKind, { caption: string; unit: string }> = {
  total: { caption: '일별 등록 추이', unit: '대/일' },
  normal: { caption: '정상 상태 일별 등록', unit: '대/일' },
  alerts: { caption: '알림 발생 일별 등록', unit: '건/일' },
  verified: { caption: '검증 완료 일별 등록', unit: '건/일' },
};

export function buildDailyKindTrend(
  kind: KpiSnapshotKind,
  passports: DashboardPassport[],
): KpiTrendViewModel | null {
  const filtered = passports.filter(KPI_FILTERS[kind]);
  if (filtered.length === 0) return null;

  const buckets = new Map<string, { count: number; timestamp: number }>();

  for (const passport of filtered) {
    if (!passport.createdAt) continue;
    const parsed = Date.parse(passport.createdAt);
    if (!Number.isFinite(parsed)) continue;

    const date = new Date(parsed);
    const label = date.toISOString().slice(0, 10);
    const timestamp = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
    const bucket = buckets.get(label);
    buckets.set(label, {
      count: (bucket?.count ?? 0) + 1,
      timestamp,
    });
  }

  if (buckets.size < 2) return null;

  const points = [...buckets.entries()]
    .sort(([, a], [, b]) => a.timestamp - b.timestamp)
    .map(([label, bucket]) => ({ label, value: bucket.count, timestamp: bucket.timestamp }));

  const maxDaily = Math.max(...points.map((point) => point.value));
  const labels = KPI_TREND_LABELS[kind];

  return {
    kind,
    mode: 'daily-count',
    source: 'passports.createdAt',
    points,
    caption: `${labels.caption} · ${points.length}개 날짜`,
    valueLabel: `최고 ${maxDaily}${labels.unit}`,
  };
}

export function buildKpiVisual({
  kind,
  snapshot,
  passports,
}: {
  kind: KpiSnapshotKind;
  snapshot: KpiSnapshotViewModel;
  passports: DashboardPassport[];
  total: number;
}): KpiVisualViewModel {
  const dailyTrend = buildDailyKindTrend(kind, passports);
  if (dailyTrend) return { trend: dailyTrend };
  return { trend: buildSnapshotSparkline(snapshot) };
}
