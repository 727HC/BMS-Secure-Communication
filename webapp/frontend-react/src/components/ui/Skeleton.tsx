import React from 'react';

/* Skeleton — sn-skeleton.css 정본 참조 (shimmer, var(--color-*) 토큰) */

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
