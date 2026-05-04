interface Props {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  filteredCount: number;
  hasSearch: boolean;
  currentPage: number;
  totalPages: number;
}

export default function MaterialsFilterBar({
  searchQuery,
  onSearchChange,
  filteredCount,
  hasSearch,
  currentPage,
  totalPages,
}: Props) {
  return (
    <section className="sn-section-card">
      <div className="sn-section-head">
        <div className="sn-section-head-row">
          <div>
            <p className="sn-eyebrow" style={{ margin: '0 0 0.4rem', color: 'var(--color-text-3)' }}>등록부 제어</p>
            <h2 className="sn-heading" style={{ margin: 0, fontSize: '1.25rem' }}>공급망 검색</h2>
            <p className="sn-caption" style={{ margin: '0.45rem 0 0', maxWidth: '44rem' }}>
              자재 ID, 소재명, 원산지, 공급사, 인증번호로 등재 파일을 좁힙니다.
            </p>
          </div>
        </div>
      </div>

      <div className="sn-toolbar" style={{ padding: '0.9rem 1.25rem', background: 'var(--color-surface)' }}>
        <input
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          type="text"
          placeholder="자재 ID, 소재명, 원산지, 공급사, 인증번호로 등록부 검색"
          className="sn-input"
          style={{ flex: 1, minWidth: 220 }}
        />
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', padding: '0 1.25rem 1rem', background: 'var(--color-surface)' }}>
        <span className="sn-detail-inline-stamp">검색 후보 {filteredCount}</span>
        <span className="sn-detail-inline-stamp">검색 {hasSearch ? '적용' : '전체'}</span>
        <span className="sn-detail-inline-stamp">페이지 {currentPage}/{totalPages}</span>
      </div>
    </section>
  );
}
