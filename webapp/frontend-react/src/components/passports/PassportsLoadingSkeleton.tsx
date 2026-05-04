import { Skeleton, SkeletonTable } from '../ui';

export default function PassportsLoadingSkeleton() {
  return (
    <div data-page="passports" style={{ display: 'flex', flexDirection: 'column', gap: 16, minHeight: 520 }}>
      <div className="sn-page-head">
        <div className="sn-page-head-main" style={{ width: '100%', maxWidth: 720 }}>
          <Skeleton width="28%" height={12} style={{ marginBottom: 12 }} />
          <Skeleton width="46%" height={34} style={{ marginBottom: 12 }} />
          <Skeleton width="72%" height={16} />
        </div>
      </div>
      <div className="sn-section-card">
        <div className="sn-section-head">
          <Skeleton width="34%" height={16} style={{ marginBottom: 12 }} />
          <Skeleton width="58%" height={12} />
        </div>
        <div className="sn-info-grid sn-info-grid-auto">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="sn-info-tile">
              <Skeleton width="60%" height={12} style={{ marginBottom: 10 }} />
              <Skeleton width="40%" height={28} />
            </div>
          ))}
        </div>
      </div>
      <SkeletonTable rows={5} cols={5} />
    </div>
  );
}
