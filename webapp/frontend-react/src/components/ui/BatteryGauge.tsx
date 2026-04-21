/* SVG 배터리 게이지 — 외부 의존 없음, 디자인 토큰만 사용 */

export interface BatteryOutlineProps {
  /** 0~100 */
  soc: number;
  /** 0~100 */
  soh?: number;
  width?: number;
  height?: number;
}

export function BatteryOutline({ soc, soh, width = 140, height = 70 }: BatteryOutlineProps) {
  const clamped = Math.min(100, Math.max(0, soc));
  const tipW = 8;
  const tipH = height * 0.4;
  const bodyW = width - tipW - 2;
  const bodyH = height;
  const radius = 6;
  const pad = 4;
  const innerW = bodyW - pad * 2;
  const innerH = bodyH - pad * 2;
  const fillW = (clamped / 100) * innerW;

  const fillColor =
    clamped >= 50
      ? 'var(--color-success)'
      : clamped >= 20
        ? 'var(--color-warning)'
        : 'var(--color-danger)';

  const sohTrackH = 4;
  const totalH = soh != null ? bodyH + sohTrackH + 4 : bodyH;
  const sohClamped = soh != null ? Math.min(100, Math.max(0, soh)) : 0;

  return (
    <svg
      width={width}
      height={totalH}
      viewBox={`0 0 ${width} ${totalH}`}
      aria-label={`SOC ${clamped}%${soh != null ? `, SOH ${sohClamped}%` : ''}`}
    >
      {/* Battery body outline */}
      <rect
        x={0}
        y={0}
        width={bodyW}
        height={bodyH}
        rx={radius}
        ry={radius}
        fill="none"
        stroke="var(--color-border)"
        strokeWidth={1.5}
      />
      {/* Battery tip */}
      <rect
        x={bodyW + 2}
        y={(bodyH - tipH) / 2}
        width={tipW}
        height={tipH}
        rx={2}
        ry={2}
        fill="var(--color-border)"
      />
      {/* SOC fill */}
      <rect
        x={pad}
        y={pad}
        width={fillW}
        height={innerH}
        rx={radius - 2}
        ry={radius - 2}
        fill={fillColor}
        style={{ transition: 'width 0.4s ease' }}
      />
      {/* SOH track (below body) */}
      {soh != null && (
        <>
          <rect
            x={0}
            y={bodyH + 4}
            width={bodyW}
            height={sohTrackH}
            rx={sohTrackH / 2}
            ry={sohTrackH / 2}
            fill="var(--color-border)"
          />
          <rect
            x={0}
            y={bodyH + 4}
            width={(sohClamped / 100) * bodyW}
            height={sohTrackH}
            rx={sohTrackH / 2}
            ry={sohTrackH / 2}
            fill={
              sohClamped >= 80
                ? 'var(--color-success)'
                : sohClamped >= 50
                  ? 'var(--color-warning)'
                  : 'var(--color-danger)'
            }
            style={{ transition: 'width 0.4s ease' }}
          />
        </>
      )}
    </svg>
  );
}

export interface ArcGaugeProps {
  /** 0~100 */
  value: number;
  label: string;
  sublabel?: string;
  size?: number;
  strokeWidth?: number;
  /** 이 값 미만이면 warning 색상 (기본 80) */
  warningThreshold?: number;
}

let _arcCounter = 0;

export function ArcGauge({
  value,
  label,
  sublabel,
  size = 140,
  strokeWidth = 14,
  warningThreshold = 80,
}: ArcGaugeProps) {
  const clamped = Math.min(100, Math.max(0, value));
  const cx = size / 2;
  const r = (size - strokeWidth) / 2;
  const cy = r + strokeWidth / 2; // 반원 아래 기준선

  /* 상단 반원: 왼쪽(cx-r, cy) → 오른쪽(cx+r, cy), 시계방향으로 위쪽을 지남 */
  const left = { x: cx - r, y: cy };
  const right = { x: cx + r, y: cy };
  const trackD = `M ${left.x} ${left.y} A ${r} ${r} 0 0 1 ${right.x} ${right.y}`;

  /* 호 전체 길이 = π * r. 부분 채움은 stroke-dasharray로 제어 */
  const arcLen = Math.PI * r;
  const fillLen = (clamped / 100) * arcLen;

  const fillColor = clamped < warningThreshold ? 'var(--color-warning)' : 'var(--color-accent)';

  /* 텍스트 레이아웃 — 반원 아래 */
  const valueFontSize = Math.round(size / 3);
  const labelFontSize = Math.max(13, Math.round(size / 10));
  const sublabelFontSize = Math.max(11, Math.round(size / 12));

  const valueY = cy + strokeWidth / 2 + valueFontSize * 0.75 + 4;
  const labelY = valueY + labelFontSize + 4;
  const sublabelY = labelY + sublabelFontSize + 4;

  const svgHeight = (sublabel ? sublabelY : labelY) + 6;
  const animId = `sn-arc-${++_arcCounter}`;

  return (
    <svg
      width={size}
      height={svgHeight}
      viewBox={`0 0 ${size} ${svgHeight}`}
      aria-label={`${label} ${clamped}%`}
    >
      <style>{`
@keyframes ${animId} {
  from { stroke-dasharray: 0 ${arcLen.toFixed(2)}; }
  to   { stroke-dasharray: ${fillLen.toFixed(2)} ${arcLen.toFixed(2)}; }
}
.${animId}-fill {
  animation: ${animId} 0.9s cubic-bezier(0.33, 1, 0.68, 1) forwards;
  stroke-dasharray: 0 ${arcLen.toFixed(2)};
}
      `}</style>
      {/* Track — 반원 전체 */}
      <path
        d={trackD}
        fill="none"
        stroke="var(--color-border)"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
      {/* Fill — 같은 path에 dasharray로 clip */}
      {clamped > 0 && (
        <path
          d={trackD}
          fill="none"
          stroke={fillColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          className={`${animId}-fill`}
        />
      )}
      {/* Value (반원 아래 중앙) */}
      <text
        x={cx}
        y={valueY}
        textAnchor="middle"
        fontFamily="var(--font-display)"
        fontWeight="800"
        fontSize={valueFontSize}
        fill="var(--color-text-1)"
      >
        {clamped}
        <tspan fontSize={Math.round(valueFontSize * 0.5)} fontWeight="600" fill="var(--color-text-3)" dx={2}>%</tspan>
      </text>
      {/* Label */}
      <text
        x={cx}
        y={labelY}
        textAnchor="middle"
        dominantBaseline="hanging"
        fontFamily="var(--font-body)"
        fontWeight="600"
        fontSize={labelFontSize}
        fill="var(--color-text-2)"
      >
        {label}
      </text>
      {sublabel && (
        <text
          x={cx}
          y={sublabelY}
          textAnchor="middle"
          dominantBaseline="hanging"
          fontFamily="var(--font-body)"
          fontWeight="500"
          fontSize={sublabelFontSize}
          fill="var(--color-text-3)"
        >
          {sublabel}
        </text>
      )}
    </svg>
  );
}
