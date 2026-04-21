/* 경량 SVG 차트 — 외부 의존 없음, 디자인 토큰만 사용 */

interface DonutProps {
  segments: { label: string; value: number; color: string }[];
  size?: number;
  thickness?: number;
  centerLabel?: string;
  centerValue?: string;
  animate?: boolean;
}

let _donutCounter = 0;

export function DonutChart({ segments, size = 180, thickness = 22, centerLabel, centerValue, animate = true }: DonutProps) {
  const total = segments.reduce((a, s) => a + s.value, 0) || 1;
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  const animId = `sn-donut-${++_donutCounter}`;
  let offset = 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {animate && (
        <style>{`
@keyframes ${animId} {
  from { stroke-dasharray: 0 ${c.toFixed(2)}; }
}
.${animId}-seg {
  animation: ${animId} 0.55s cubic-bezier(0.33, 1, 0.68, 1) forwards;
  will-change: stroke-dasharray;
}
@media (prefers-reduced-motion: reduce) {
  .${animId}-seg { animation: none; }
}
        `}</style>
      )}
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-border)" strokeWidth={thickness} />
      {segments.map((seg, i) => {
        const dash = (seg.value / total) * c;
        const gap = c - dash;
        const el = (
          <circle
            key={i}
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={seg.color}
            strokeWidth={thickness}
            strokeDasharray={`${dash} ${gap}`}
            strokeDashoffset={-offset}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
            strokeLinecap="butt"
            className={animate ? `${animId}-seg` : undefined}
            style={animate ? { animationDelay: `${i * 50}ms` } : undefined}
          />
        );
        offset += dash;
        return el;
      })}
      {centerValue && (
        <text
          x={size / 2}
          y={size / 2}
          textAnchor="middle"
          dominantBaseline="central"
          fontFamily="var(--font-display)"
          fontWeight="800"
          fontSize={size / 5}
          fill="var(--color-text-1)"
          dy={centerLabel ? -6 : 0}
        >
          {centerValue}
        </text>
      )}
      {centerLabel && (
        <text
          x={size / 2}
          y={size / 2}
          textAnchor="middle"
          dominantBaseline="central"
          fontFamily="var(--font-body)"
          fontSize="12"
          fontWeight="600"
          fill="var(--color-text-3)"
          letterSpacing="0.06em"
          dy={size / 8}
          style={{ textTransform: 'uppercase' }}
        >
          {centerLabel}
        </text>
      )}
    </svg>
  );
}

interface SparklineProps {
  values: number[];
  width?: number;
  height?: number;
  color?: string;
  fillOpacity?: number;
  min?: number;
  max?: number;
  animate?: boolean;
}

/* 고유 id — 복수 Sparkline이 같은 페이지에 있을 때 keyframes 충돌 방지 */
let _sparklineCounter = 0;

export function Sparkline({ values, width = 280, height = 64, color = 'var(--color-accent)', fillOpacity = 0.12, min, max, animate = true }: SparklineProps) {
  if (values.length === 0) return <svg width={width} height={height} />;
  const lo = min ?? Math.min(...values);
  const hi = max ?? Math.max(...values);
  const span = hi - lo || 1;
  const pad = 4;
  const innerH = height - pad * 2;
  const step = values.length > 1 ? width / (values.length - 1) : 0;
  const pts = values.map((v, i) => [i * step, pad + innerH - ((v - lo) / span) * innerH] as const);
  const d = pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x},${y}`).join(' ');
  const fill = `${d} L${width},${height} L0,${height} Z`;

  /* 실제 path 길이: 연속된 점 사이 유클리드 거리 합 (getTotalLength 없이 정확) */
  let pathLen = 0;
  for (let i = 1; i < pts.length; i++) {
    const dx = pts[i][0] - pts[i - 1][0];
    const dy = pts[i][1] - pts[i - 1][1];
    pathLen += Math.sqrt(dx * dx + dy * dy);
  }
  pathLen = Math.max(pathLen, 1);
  const animId = `sn-spark-${++_sparklineCounter}`;

  return (
    <>
      {animate && (
        <style>{`
@keyframes ${animId} {
  from { stroke-dashoffset: ${pathLen.toFixed(1)}; }
  to   { stroke-dashoffset: 0; }
}
.${animId}-line {
  stroke-dasharray: ${pathLen.toFixed(1)};
  stroke-dashoffset: ${pathLen.toFixed(1)};
  animation: ${animId} 0.5s ease-out forwards;
  will-change: stroke-dashoffset;
}
@media (prefers-reduced-motion: reduce) {
  .${animId}-line { animation: none; stroke-dashoffset: 0; }
}
        `}</style>
      )}
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
        <path d={fill} fill={color} opacity={fillOpacity} />
        <path
          d={d}
          fill="none"
          stroke={color}
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
          className={animate ? `${animId}-line` : undefined}
        />
      </svg>
    </>
  );
}

interface BarRowsProps {
  items: { label: string; value: number; hint?: string; color?: string }[];
  max?: number;
  barColor?: string;
}

export function BarRows({ items, max, barColor = 'var(--color-accent)' }: BarRowsProps) {
  const m = max ?? Math.max(...items.map((i) => i.value), 1);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {items.map((it) => {
        const pct = (it.value / m) * 100;
        return (
          <div key={it.label} style={{ display: 'grid', gridTemplateColumns: 'minmax(6rem, 1fr) 2.75fr auto', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: '0.9375rem', color: 'var(--color-text-2)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {it.label}
            </span>
            <div style={{ height: 10, background: 'var(--color-border)', borderRadius: 999, overflow: 'hidden' }}>
              <div style={{ width: `${pct}%`, height: '100%', background: it.color || barColor, borderRadius: 999, transition: 'width 0.4s ease' }} />
            </div>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.9375rem', fontWeight: 700, color: 'var(--color-text-1)', minWidth: '2.5rem', textAlign: 'right' }}>
              {it.value}
              {it.hint && <span style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'var(--color-text-3)', marginLeft: 4 }}>{it.hint}</span>}
            </span>
          </div>
        );
      })}
    </div>
  );
}

interface LegendItem { label: string; value: number; color: string }
export function LegendStack({ items }: { items: LegendItem[] }) {
  const total = items.reduce((a, x) => a + x.value, 0) || 1;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {items.map((it) => (
        <div key={it.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: it.color }} />
            <span style={{ fontSize: '0.9375rem', color: 'var(--color-text-2)' }}>{it.label}</span>
          </div>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.9375rem', fontWeight: 700, color: 'var(--color-text-1)' }}>
            {it.value}
            <span style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'var(--color-text-3)', marginLeft: 6 }}>
              {Math.round((it.value / total) * 100)}%
            </span>
          </span>
        </div>
      ))}
    </div>
  );
}
