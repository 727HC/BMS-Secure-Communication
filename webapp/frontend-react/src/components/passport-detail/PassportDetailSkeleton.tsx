import { Skeleton, SkeletonCard } from '../ui';

export default function PassportDetailSkeleton() {
  return (
    <div data-page="passport-detail" style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 1320, width: '100%', margin: '0 auto' }}>
      <div style={{ background: 'var(--color-surface)', padding: '1.5rem 1.75rem', borderRadius: '1rem', border: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Skeleton width="40%" height={28} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20 }}>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
              <Skeleton width={120} height={120} radius={60} />
              <Skeleton width="60%" height={12} />
            </div>
          ))}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 4 }}>
        {[0, 1, 2, 3, 4].map((i) => (
          <Skeleton key={i} width={80} height={36} radius={8} />
        ))}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {[0, 1, 2].map((i) => (
          <SkeletonCard key={i} lines={3} showTitle />
        ))}
      </div>
    </div>
  );
}
