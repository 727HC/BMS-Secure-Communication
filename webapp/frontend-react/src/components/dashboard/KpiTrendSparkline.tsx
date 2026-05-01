import type { KpiTrendViewModel } from './lib';

export default function KpiTrendSparkline({ label, trend }: { label: string; trend: KpiTrendViewModel }) {
  // 모든 KPI를 동일한 wave 스타일로 통일. fill=0이면 baseline 평평(이전 fix 유지),
  // 그 외엔 fill * 100 + offsets로 amplitude wave를 그린다. daily-count는 실제 시계열,
  // snapshot-sparkline은 현재 비율을 wave amplitude로 시각화 (caption + valueLabel로 의미 명시).
  const width = 120;
  const height = 28;
  const paddingX = 3;
  const paddingY = 4;
  const minValue = Math.min(...trend.points.map((point) => point.value));
  const maxValue = Math.max(...trend.points.map((point) => point.value));
  const minTimestamp = Math.min(...trend.points.map((point) => point.timestamp));
  const maxTimestamp = Math.max(...trend.points.map((point) => point.timestamp));
  const valueRange = maxValue - minValue;
  const timeRange = maxTimestamp - minTimestamp;
  const centerY = height / 2;
  const coordinates = trend.points.map((point, index) => {
    const x = timeRange > 0
      ? paddingX + ((point.timestamp - minTimestamp) / timeRange) * (width - paddingX * 2)
      : paddingX + (index / Math.max(trend.points.length - 1, 1)) * (width - paddingX * 2);
    const y = valueRange > 0
      ? height - paddingY - ((point.value - minValue) / valueRange) * (height - paddingY * 2)
      : centerY;

    return { x, y };
  });
  const pathD = coordinates.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`).join(' ');
  const lastPoint = trend.points[trend.points.length - 1];
  const ariaLabel = trend.mode === 'daily-count'
    ? `${label} 실제 추이: ${trend.caption}`
    : `${label} 현재 비율 시각화: ${trend.valueLabel}`;

  return (
    <div
      className="vk-kpi__trend"
      aria-label={ariaLabel}
      data-kpi-trend-sparkline="true"
      data-kpi-trend-kind={trend.kind}
      data-kpi-trend-mode={trend.mode}
      data-kpi-trend-source={trend.source}
      data-kpi-trend-points={String(trend.points.length)}
      data-kpi-trend-values={trend.points.map((point) => point.value).join(',')}
      data-kpi-trend-caption={trend.caption}
    >
      <svg className="vk-kpi__trend-svg" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" aria-hidden="true" focusable="false">
        <path className="vk-kpi__trend-baseline" d={`M ${paddingX} ${height - paddingY} L ${width - paddingX} ${height - paddingY}`} />
        <path className="vk-kpi__trend-line" d={pathD} />
        {coordinates.length > 0 && (
          <circle
            className="vk-kpi__trend-dot"
            cx={coordinates[coordinates.length - 1].x}
            cy={coordinates[coordinates.length - 1].y}
            r="2.4"
          />
        )}
      </svg>
      <div className="vk-kpi__trend-meta">
        <span className="vk-kpi__trend-caption">{trend.caption}</span>
        <span className="vk-kpi__trend-value">{lastPoint ? trend.valueLabel : '—'}</span>
      </div>
    </div>
  );
}

