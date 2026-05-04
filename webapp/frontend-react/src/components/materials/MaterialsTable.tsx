import type { Material } from '../modals/materials';

function formatDate(dateStr?: string): string {
  if (!dateStr) return '-';
  try { return new Date(dateStr).toLocaleString('ko-KR'); }
  catch { return dateStr; }
}

interface Props {
  filteredCount: number;
  paginatedMaterials: Material[];
  showingFrom: number;
  showingTo: number;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onRowClick: (m: Material) => void;
}

export default function MaterialsTable({
  filteredCount,
  paginatedMaterials,
  showingFrom,
  showingTo,
  currentPage,
  totalPages,
  onPageChange,
  onRowClick,
}: Props) {
  return (
    <section className="sn-section-card">
      <div className="sn-section-head">
        <div className="sn-section-head-row">
          <div>
            <p className="sn-eyebrow" style={{ margin: '0 0 0.4rem', color: 'var(--color-text-3)' }}>공급 원장</p>
            <h2 className="sn-heading" style={{ margin: 0, fontSize: '1.25rem' }}>공급망 파일</h2>
          </div>
          <p className="sn-caption" style={{ margin: 0 }}>
            {filteredCount}개 중 {showingFrom}-{showingTo} 표시
          </p>
        </div>
      </div>
      <div style={{ overflowX: 'auto', fontSize: '0.875rem' }}>
        <table className="sn-table">
          <thead>
            <tr>
              <th>자재 ID</th>
              <th>소재명</th>
              <th>원산지</th>
              <th>공급사</th>
              <th style={{ textAlign: 'right' }}>수량</th>
              <th>단위</th>
              <th>인증 근거</th>
              <th>Ledger date</th>
            </tr>
          </thead>
          <tbody>
            {paginatedMaterials.map((m) => (
              <tr
                key={m.materialId}
                onClick={() => onRowClick(m)}
                style={{ cursor: 'pointer', transition: 'all 0.5s cubic-bezier(0.16,1,0.3,1)' }}
              >
                <td><span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: '0.875rem', color: 'var(--color-text-3)' }}>{m.materialId}</span></td>
                <td style={{ fontWeight: 600, color: 'var(--color-text-1)', fontSize: '0.9375rem' }}>{m.name}</td>
                <td style={{ color: 'var(--color-text-2)', fontSize: '0.9375rem' }}>{m.origin}</td>
                <td style={{ color: 'var(--color-text-2)', fontSize: '0.9375rem' }}>{m.supplier}</td>
                <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 500, color: 'var(--color-text-1)', fontSize: '0.9375rem' }}>{m.quantity}</td>
                <td style={{ color: 'var(--color-text-3)', fontSize: '0.9375rem' }}>{m.unit}</td>
                <td>
                  {m.certificationId ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 20, background: 'var(--color-success-soft)', border: '1px solid transparent', fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-success)' }}>
                      <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                      인증 확인
                    </span>
                  ) : (
                    <span style={{ fontSize: '0.875rem', color: 'var(--color-text-3)', fontStyle: 'italic' }}>근거 대기</span>
                  )}
                </td>
                <td style={{ color: 'var(--color-text-3)', fontSize: '0.9375rem' }}>{formatDate(m.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '0.9rem 1rem', borderTop: '1px solid var(--color-border)' }}>
        <span className="sn-caption">
          {filteredCount}개 중 {showingFrom}-{showingTo} 표시
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button className="sn-btn sn-btn-ghost" style={{ padding: '6px 10px', fontSize: '0.8125rem' }} disabled={currentPage === 1} onClick={() => onPageChange(Math.max(1, currentPage - 1))}>이전</button>
          <span className="sn-caption">{currentPage} / {totalPages}</span>
          <button className="sn-btn sn-btn-ghost" style={{ padding: '6px 10px', fontSize: '0.8125rem' }} disabled={currentPage === totalPages} onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}>다음</button>
        </div>
      </div>
    </section>
  );
}
