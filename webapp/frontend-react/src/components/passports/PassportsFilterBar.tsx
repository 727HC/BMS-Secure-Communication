import { STATUS_OPTIONS, type GbaFilter } from './lib';

type SortBy = 'latest' | 'gba';

interface Props {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  filterStatus: string;
  onFilterStatusChange: (value: string) => void;
  gbaFilter: GbaFilter;
  onGbaFilterChange: (value: GbaFilter) => void;
  sortBy: SortBy;
  onSortByChange: (value: SortBy) => void;
  filteredCount: number;
  hasActiveFilters: boolean;
  currentPage: number;
  totalPages: number;
}

export default function PassportsFilterBar({
  searchQuery,
  onSearchChange,
  filterStatus,
  onFilterStatusChange,
  gbaFilter,
  onGbaFilterChange,
  sortBy,
  onSortByChange,
  filteredCount,
  hasActiveFilters,
  currentPage,
  totalPages,
}: Props) {
  return (
    <section className="sn-section-card">
      <div className="sn-section-head">
        <div className="sn-section-head-row">
          <div>
            <p className="sn-eyebrow" style={{ margin: '0 0 0.4rem', color: 'var(--color-text-3)' }}>등재 제어</p>
            <h2 className="sn-heading" style={{ margin: 0, fontSize: '1.25rem' }}>등록부 검색과 정렬</h2>
            <p className="sn-caption" style={{ margin: '0.45rem 0 0', maxWidth: '44rem' }}>
              여권 ID, 제조 근거, 차량 연결, GBA 보완 상태를 기준으로 서류철을 좁힙니다.
            </p>
          </div>
        </div>
      </div>

      <div className="sn-toolbar" style={{ padding: '0.9rem 1.25rem', background: 'var(--color-surface)' }}>
        <input
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          type="text"
          placeholder="여권 ID, 배터리 ID, DID, 시리얼, 모델, 제조사, VIN으로 등록부 검색"
          className="sn-input"
          style={{ flex: 1, minWidth: 220 }}
        />
        <select
          value={filterStatus}
          onChange={(e) => onFilterStatusChange(e.target.value)}
          className="sn-input"
          style={{ width: 'auto', minWidth: 140 }}
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <select
          value={gbaFilter}
          onChange={(e) => onGbaFilterChange(e.target.value as GbaFilter)}
          className="sn-input"
          style={{ width: 'auto', minWidth: 150 }}
        >
          <option value="all">규제 준수 전체</option>
          <option value="complete">필수 항목 충족</option>
          <option value="incomplete">문서 보완 필요</option>
        </select>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <span style={{ fontSize: '0.875rem', color: 'var(--color-text-3)' }}>정렬</span>
          {([{ v: 'latest', l: '최근 갱신' }, { v: 'gba', l: '보완 우선' }] as const).map((s) => {
            const active = sortBy === s.v;
            return (
              <button
                key={s.v}
                onClick={() => onSortByChange(s.v)}
                type="button"
                style={{
                  fontSize: '0.875rem',
                  padding: '0.3rem 0.55rem',
                  background: active ? 'var(--color-surface-alt)' : 'none',
                  border: 'none',
                  cursor: 'pointer',
                  borderRadius: 3,
                  color: active ? 'var(--color-text-1)' : 'var(--color-text-3)',
                }}
              >
                {s.l}
              </button>
            );
          })}
        </div>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', padding: '0 1.25rem 1rem', background: 'var(--color-surface)' }}>
        <span className="sn-detail-inline-stamp">검색 후보 {filteredCount}</span>
        <span className="sn-detail-inline-stamp">필터 {hasActiveFilters ? '적용' : '전체'}</span>
        <span className="sn-detail-inline-stamp">페이지 {currentPage}/{totalPages}</span>
      </div>
    </section>
  );
}
