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
  const cy = size / 2;
  const r = (size - strokeWidth) / 2;

  // 반원: -180도(좌) → 0도(우), 즉 아래쪽 반원을 제외한 상단 반원
  // startAngle = 180deg (왼쪽), endAngle = 0deg (오른쪽) = 반시계방향으로 표현
  // SVG arc: 시작점과 끝점, 반경으로 계산
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  // 호를 180도 ~ 0도 (상단 반원, 왼→오)로 그린다
  const startAngle = 180; // 왼쪽 끝
  const totalSweep = 180; // 반원

  // track: 전체 반원
  const trackStart = polarToXY(cx, cy, r, startAngle);
  const trackEnd = polarToXY(cx, cy, r, startAngle + totalSweep);
  const trackD = describeArc(cx, cy, r, startAngle, startAngle + totalSweep);

  // fill: clamped/100 * 180도
  const fillSweep = (clamped / 100) * totalSweep;
  const fillD = fillSweep > 0 ? describeArc(cx, cy, r, startAngle, startAngle + fillSweep) : '';

  const fillColor = clamped < warningThreshold ? 'var(--color-warning)' : 'var(--color-accent)';

  // 수치 텍스트 위치: arc 중앙 아래 (cy + 약간 위)
  const valueFontSize = Math.round(size / 3.5);
  const labelFontSize = Math.max(11, Math.round(size / 10));
  const sublabelFontSize = Math.max(10, Math.round(size / 12));

  // cy + strokeWidth/2 아래에 수치 배치 (반원이므로 아크 아래쪽 중앙)
  const textY = cy + 4;

  // 사용하지 않는 변수 제거
  void trackStart;
  void trackEnd;
  void toRad;

  return (
    <svg
      width={size}
      height={cy + strokeWidth / 2 + 2}
      viewBox={`0 0 ${size} ${cy + strokeWidth / 2 + 2}`}
      aria-label={`${label} ${clamped}%`}
    >
      {/* Track */}
      <path
        d={trackD}
        fill="none"
        stroke="var(--color-border)"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
      {/* Fill */}
      {fillD && (
        <path
          d={fillD}
          fill="none"
          stroke={fillColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
      )}
      {/* Value */}
      <text
        x={cx}
        y={textY}
        textAnchor="middle"
        dominantBaseline="auto"
        fontFamily="var(--font-display)"
        fontWeight="800"
        fontSize={valueFontSize}
        fill="var(--color-text-1)"
      >
        {clamped}
        <tspan fontSize={Math.round(valueFontSize * 0.55)} fontWeight="600" fill="var(--color-text-2)">%</tspan>
      </text>
      {/* Label */}
      <text
        x={cx}
        y={textY + labelFontSize + 2}
        textAnchor="middle"
        dominantBaseline="hanging"
        fontFamily="var(--font-display)"
        fontWeight="600"
        fontSize={labelFontSize}
        fill="var(--color-text-3)"
        letterSpacing="0.05em"
      >
        {label}
      </text>
      {/* Sublabel */}
      {sublabel && (
        <text
          x={cx}
          y={textY + labelFontSize + 2 + sublabelFontSize + 3}
          textAnchor="middle"
          dominantBaseline="hanging"
          fontFamily="var(--font-display)"
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

/* ── helpers ── */

function polarToXY(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  };
}

function describeArc(cx: number, cy: number, r: number, startDeg: number, endDeg: number): string {
  // startDeg=180 → 왼쪽, endDeg=360 → 오른쪽 (시계방향)
  // SVG 각도 기준: 0deg = 우측, 90deg = 아래
  // 우리 기준: 0deg = 상단, 변환 필요
  const toSvgRad = (deg: number) => ((deg - 90) * Math.PI) / 180;

  const s = {
    x: cx + r * Math.cos(toSvgRad(startDeg)),
    y: cy + r * Math.sin(toSvgRad(startDeg)),
  };
  const e = {
    x: cx + r * Math.cos(toSvgRad(endDeg)),
    y: cy + r * Math.sin(toSvgRad(endDeg)),
  };

  const sweep = endDeg - startDeg;
  const largeArc = sweep > 180 ? 1 : 0;

  return `M ${s.x} ${s.y} A ${r} ${r} 0 ${largeArc} 1 ${e.x} ${e.y}`;
}
