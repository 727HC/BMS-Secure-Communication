import { getStatusBadge, scaleSOC } from '../../lib/helpers';
import { getGbaPct, type Passport } from './lib';

interface Props {
  filteredPassports: Passport[];
  paginatedPassports: Passport[];
  showingFrom: number;
  showingTo: number;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onView: (passportId: string | undefined) => void;
  hasActiveFilters: boolean;
  isManufacturer: boolean;
}

export default function PassportsListCard({
  filteredPassports,
  paginatedPassports,
  showingFrom,
  showingTo,
  currentPage,
  totalPages,
  onPageChange,
  onView,
  hasActiveFilters,
  isManufacturer,
}: Props) {
  if (filteredPassports.length === 0) {
    return (
      <div className="sn-empty-dashed" style={{ minHeight: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
        <p className="sn-heading" style={{ fontSize: '1.125rem', margin: '0 0 0.5rem' }}>
          표시할 등록 파일이 없습니다.
        </p>
        <p className="sn-caption" style={{ margin: 0, maxWidth: '36rem' }}>
          {hasActiveFilters
            ? '검색어, 상태, GBA 필터를 조정해 등록부를 다시 확인하세요.'
            : isManufacturer
              ? '아직 등재된 배터리 여권이 없습니다. 발급 접수 후 이 등록부에서 확인할 수 있습니다.'
              : '제조사가 여권을 발급하면 이 등록부에서 열람할 수 있습니다.'}
        </p>
      </div>
    );
  }

  return (
    <div className="sn-section-card">
      <div className="sn-section-head">
        <div className="sn-section-head-row">
          <div>
            <p className="sn-eyebrow" style={{ margin: '0 0 0.4rem', color: 'var(--color-text-3)' }}>자료 원장</p>
            <h2 className="sn-heading" style={{ margin: 0, fontSize: '1.25rem' }}>여권 파일</h2>
          </div>
          <p className="sn-caption" style={{ margin: 0 }}>
            {filteredPassports.length}개 중 {showingFrom}-{showingTo} 표시
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.05fr) minmax(0, 1.25fr) minmax(0, 0.9fr) minmax(0, 0.95fr) minmax(0, 0.8fr)', gap: '1rem', padding: '0.9rem 1.1rem', borderBottom: '1px solid var(--color-border)', background: 'var(--color-surface-alt)' }}>
        <span className="sn-eyebrow">등재 참조</span>
        <span className="sn-eyebrow">자료 요약</span>
        <span className="sn-eyebrow">배터리 근거</span>
        <span className="sn-eyebrow">GBA 완성도</span>
        <span className="sn-eyebrow">원장 갱신</span>
      </div>

      {paginatedPassports.map((p) => {
        const badge = getStatusBadge(p.status || 'DISPOSED');
        const gbaPct = getGbaPct(p);
        return (
          <div
            key={p.passportId}
            onClick={() => onView(p.passportId)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onView(p.passportId);
              }
            }}
            style={{ padding: '1rem 1.1rem', borderBottom: '1px solid var(--color-border)', cursor: 'pointer', transition: 'background 0.2s' }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-surface-accent)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--color-surface)')}
          >
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.05fr) minmax(0, 1.25fr) minmax(0, 0.9fr) minmax(0, 0.95fr) minmax(0, 0.8fr)', gap: '1rem', alignItems: 'start' }}>
              <div>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.9375rem', fontWeight: 700, color: 'var(--color-text-1)' }}>{p.passportId}</p>
                <p style={{ marginTop: '0.35rem', fontSize: '0.9375rem', color: 'var(--color-text-3)' }}>{p.serialNumber || '시리얼 정보 없음'}</p>
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <p style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-text-1)' }}>{p.model || '미등록 모델'}</p>
                  <span className={`bp-stamp ${badge.bg} ${badge.text} ${badge.border}`} style={{ fontSize: '0.8125rem' }}>
                    {badge.label}
                  </span>
                </div>
                <p style={{ marginTop: '0.35rem', fontSize: '0.9375rem', color: 'var(--color-text-2)' }}>
                  {p.manufacturerName || '제조사 미기록'} · {p.chemistry || '화학 정보 없음'}
                </p>
                <p style={{ marginTop: '0.35rem', fontSize: '0.875rem', color: 'var(--color-text-3)' }}>
                  {p.vin ? `VIN ${p.vin}` : 'VIN 등록 대기'}
                </p>
              </div>
              <div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <span style={{ fontSize: '0.9375rem', color: 'var(--color-text-2)' }}>
                    SOH <strong style={{ color: 'var(--color-text-1)', fontFamily: 'var(--font-mono)' }}>{p.currentSoh != null ? `${p.currentSoh}%` : '--'}</strong>
                  </span>
                  <span style={{ fontSize: '0.9375rem', color: 'var(--color-text-2)' }}>
                    SOC <strong style={{ color: 'var(--color-text-1)', fontFamily: 'var(--font-mono)' }}>{p.currentSoc != null ? `${scaleSOC(p.currentSoc)}%` : '--'}</strong>
                  </span>
                  <span style={{ fontSize: '0.875rem', color: 'var(--color-text-3)' }}>
                    {p.currentSoh != null && p.currentSoh < 80 ? '우선 점검 필요' : '기본 상태 확인됨'}
                  </span>
                </div>
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{ flex: 1, height: 6, background: 'var(--color-border)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${gbaPct}%`, background: gbaPct === 100 ? 'var(--color-success)' : 'var(--color-warning)' }} />
                  </div>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.9375rem', fontWeight: 600, color: 'var(--color-text-1)' }}>{gbaPct}%</span>
                </div>
                <p style={{ marginTop: '0.35rem', fontSize: '0.9375rem', color: 'var(--color-text-3)' }}>
                  {gbaPct === 100 ? '필수 항목 충족' : '문서 보완 필요'}
                </p>
              </div>
              <div>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.9375rem', fontWeight: 600, color: 'var(--color-text-1)' }}>
                  {new Date(p.updatedAt || p.createdAt || '').toString() !== 'Invalid Date' ? new Date(p.updatedAt || p.createdAt || '').toLocaleDateString('ko-KR') : '-'}
                </p>
                <p style={{ marginTop: '0.35rem', fontSize: '0.875rem', color: 'var(--color-text-3)' }}>
                  {p.recycleAvailable ? '회수 검토 대상' : !p.vin ? 'VIN 등록 대기' : '상세 검토 가능'}
                </p>
              </div>
            </div>
          </div>
        );
      })}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '0.9rem 1.1rem', borderTop: '1px solid var(--color-border)', background: 'var(--color-surface-alt)' }}>
        <span className="sn-caption">
          {filteredPassports.length}개 중 {showingFrom}-{showingTo} 표시
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            className="sn-btn sn-btn-ghost"
            style={{ padding: '6px 10px', fontSize: 12 }}
            disabled={currentPage === 1}
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          >
            이전
          </button>
          <span className="sn-caption">{currentPage} / {totalPages}</span>
          <button
            className="sn-btn sn-btn-ghost"
            style={{ padding: '6px 10px', fontSize: 12 }}
            disabled={currentPage === totalPages}
            onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          >
            다음
          </button>
        </div>
      </div>
    </div>
  );
}
