import { Skeleton, SkeletonTable } from '../ui';

interface Props {
  loading: boolean;
  filteredCount: number;
  hasSearch: boolean;
  isManufacturer: boolean;
  onCreateClick: () => void;
}

export default function MaterialsStateView({
  loading,
  filteredCount,
  hasSearch,
  isManufacturer,
  onCreateClick,
}: Props) {
  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
          {[0, 1, 2].map((i) => (
            <div key={i} style={{ padding: '0.75rem', background: 'var(--color-surface-alt)', borderRadius: '0.5rem', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Skeleton width="50%" height={12} />
              <Skeleton width="40%" height={28} />
              <Skeleton width="70%" height={10} />
            </div>
          ))}
        </div>
        <SkeletonTable rows={5} cols={8} />
      </div>
    );
  }

  if (filteredCount === 0) {
    return (
      <div className="sn-empty-dashed" style={{ minHeight: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
        <p className="sn-heading" style={{ fontSize: '1.125rem', margin: '0 0 0.5rem' }}>
          {hasSearch ? '검색 조건에 맞는 공급망 파일이 없습니다.' : '등재된 공급망 파일이 없습니다.'}
        </p>
        <p className="sn-caption" style={{ margin: '0 0 0.9rem', maxWidth: '38rem', textAlign: 'center' }}>
          {hasSearch
            ? '자재 ID, 소재명, 원산지, 공급사, 인증번호를 다시 확인하세요.'
            : 'Manufacturer 조직에서 소재 원산지와 인증 근거를 등재하면 이 등록부에서 공급망 추적을 시작할 수 있습니다.'}
        </p>
        {isManufacturer && (
          <button onClick={onCreateClick} className="sn-btn sn-btn-accent">공급망 자재 등재</button>
        )}
      </div>
    );
  }

  return null;
}
