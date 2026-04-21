import React from 'react';

const STYLE_ID = 'sn-skeleton-styles';

function injectStyles() {
  if (typeof document === 'undefined') return;
  if (document.getElementById(STYLE_ID)) return;
  const el = document.createElement('style');
  el.id = STYLE_ID;
  el.textContent = `
@keyframes skeleton-shimmer {
  0%   { background-position: -200% 0; }
  100% { background-position:  200% 0; }
}
.sn-skeleton {
  display: block;
  background: linear-gradient(
    90deg,
    var(--color-border)      25%,
    var(--color-surface-alt) 50%,
    var(--color-border)      75%
  );
  background-size: 200% 100%;
  animation: skeleton-shimmer 1.2s ease-in-out infinite;
  flex-shrink: 0;
}
`;
  document.head.appendChild(el);
}

injectStyles();

export interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  radius?: number;
  style?: React.CSSProperties;
}

export function Skeleton({ width = '100%', height = 16, radius = 8, style }: SkeletonProps) {
  return (
    <span
      className="sn-skeleton"
      style={{ width, height, borderRadius: radius, ...style }}
    />
  );
}

export function SkeletonRows({
  rows = 3,
  height = 16,
  gap = 10,
}: {
  rows?: number;
  height?: number;
  gap?: number;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap }}>
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} width={i === rows - 1 ? '72%' : '100%'} height={height} />
      ))}
    </div>
  );
}

export function SkeletonCard({
  lines = 3,
  showTitle = true,
}: {
  lines?: number;
  showTitle?: boolean;
}) {
  return (
    <div
      style={{
        padding: 20,
        borderRadius: 16,
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      {showTitle && <Skeleton width="45%" height={20} />}
      <SkeletonRows rows={lines} height={14} gap={8} />
    </div>
  );
}

export function SkeletonTable({
  rows = 5,
  cols = 4,
}: {
  rows?: number;
  cols?: number;
}) {
  return (
    <div
      style={{
        borderRadius: 16,
        border: '1px solid var(--color-border)',
        background: 'var(--color-surface)',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
          gap: 12,
          padding: '12px 16px',
          background: 'var(--color-surface-alt)',
          borderBottom: '1px solid var(--color-border)',
        }}
      >
        {Array.from({ length: cols }, (_, i) => (
          <Skeleton key={i} width="60%" height={12} />
        ))}
      </div>
      {Array.from({ length: rows }, (_, r) => (
        <div
          key={r}
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${cols}, 1fr)`,
            gap: 12,
            padding: '14px 16px',
            borderBottom: r < rows - 1 ? '1px solid var(--color-border)' : undefined,
          }}
        >
          {Array.from({ length: cols }, (_, c) => (
            <Skeleton key={c} width={c === 0 ? '80%' : '60%'} height={14} />
          ))}
        </div>
      ))}
    </div>
  );
}
