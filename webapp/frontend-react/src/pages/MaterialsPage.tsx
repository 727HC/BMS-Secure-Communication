import { useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { PageHead, Skeleton, SkeletonTable } from '../components/ui';
import { BarRows } from '../components/ui/Charts';
import {
  MaterialCreateModal,
  MaterialDetailModal,
  type MaterialFormData,
  type Material,
} from '../components/modals/materials';

function formatDate(dateStr?: string): string {
  if (!dateStr) return '-';
  try { return new Date(dateStr).toLocaleString('ko-KR'); }
  catch { return dateStr; }
}

const CATEGORY_KEYWORDS: { label: string; keywords: string[] }[] = [
  { label: '리튬', keywords: ['리튬', 'lithium', 'li'] },
  { label: '니켈', keywords: ['니켈', 'nickel', 'ni'] },
  { label: '코발트', keywords: ['코발트', 'cobalt', 'co'] },
  { label: '망간', keywords: ['망간', 'manganese', 'mn'] },
];

function categorize(name: string): string {
  const lower = name.toLowerCase();
  for (const cat of CATEGORY_KEYWORDS) {
    if (cat.keywords.some((k) => lower.includes(k))) return cat.label;
  }
  return '기타';
}

export default function MaterialsPage() {
  const PAGE_SIZE = 12;
  const { org } = useAuth();
  const isManufacturer = org === 'ManufacturerMSP';

  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const fetchMaterials = async () => {
    setLoading(true);
    try {
      const data = await api.get<Material[] | { records?: Material[]; materials?: Material[] }>('/materials');
      const list = Array.isArray(data) ? data : data.records || data.materials || [];
      setMaterials(list);
    } catch {
      setMaterials([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMaterials();
  }, []);

  const filteredMaterials = useMemo(() => {
    if (!searchQuery) return materials;
    const q = searchQuery.toLowerCase();
    return materials.filter((m) =>
      (m.materialId || '').toLowerCase().includes(q) ||
      (m.name || '').toLowerCase().includes(q) ||
      (m.origin || '').toLowerCase().includes(q) ||
      (m.supplier || '').toLowerCase().includes(q) ||
      (m.certificationId || '').toLowerCase().includes(q)
    );
  }, [materials, searchQuery]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredMaterials.length / PAGE_SIZE));
  const paginatedMaterials = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredMaterials.slice(start, start + PAGE_SIZE);
  }, [filteredMaterials, currentPage]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const certifiedCount = filteredMaterials.filter((m) => m.certificationId).length;

  const originUniqueCount = useMemo(() => {
    const origins = filteredMaterials.map((m) => m.origin).filter(Boolean);
    return new Set(origins).size;
  }, [filteredMaterials]);

  const categoryDist = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const m of materials) {
      const cat = categorize(m.name || '');
      counts[cat] = (counts[cat] || 0) + 1;
    }
    return counts;
  }, [materials]);

  const openCreateModal = () => setShowCreateModal(true);
  const closeCreateModal = () => setShowCreateModal(false);

  const openDetail = (m: Material) => {
    setSelectedMaterial(m);
    setShowDetailModal(true);
  };
  const closeDetail = () => {
    setShowDetailModal(false);
    setSelectedMaterial(null);
  };

  const submitMaterial = async (form: MaterialFormData) => {
    setSubmitting(true);
    try {
      const payload = { ...form, quantity: Number(form.quantity) };
      await api.post('/materials', payload);
      closeCreateModal();
      await fetchMaterials();
    } catch {
      // toast 생략
    } finally {
      setSubmitting(false);
    }
  };

  const catLabels = ['리튬', '니켈', '코발트', '망간', '기타'];
  const certifiedRatio = filteredMaterials.length > 0
    ? Math.round((certifiedCount / filteredMaterials.length) * 100)
    : 0;
  const showingFrom = filteredMaterials.length ? (currentPage - 1) * PAGE_SIZE + 1 : 0;
  const showingTo = Math.min(currentPage * PAGE_SIZE, filteredMaterials.length);
  const hasSearch = Boolean(searchQuery.trim());
  const registerSummary = hasSearch
    ? `${filteredMaterials.length}개의 공급망 파일이 검색 조건에 맞습니다.`
    : `총 ${materials.length}개의 공급망 자재 파일이 등록부에 등재되어 있습니다.`;

  return (
    <div data-page="materials" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <PageHead
        eyebrow="공급망 등록부"
        eyebrowColor="var(--color-accent)"
        title="Supply Chain Register"
        subtitle={registerSummary}
        actions={(
          <>
            <div className="sn-kpi-mini">
              <p className="sn-eyebrow" style={{ margin: '0 0 0.3rem' }}>현재 표시</p>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-text-1)', margin: 0 }}>
                {filteredMaterials.length}
              </p>
            </div>
            {isManufacturer && (
              <button onClick={openCreateModal} className="sn-btn sn-btn-accent" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                공급망 자재 등재
              </button>
            )}
          </>
        )}
      />

      <section className="sn-section-card">
        <div className="sn-section-head">
          <div className="sn-section-head-row">
            <div>
              <p className="sn-eyebrow" style={{ margin: '0 0 0.4rem', color: 'var(--color-text-3)' }}>Register controls</p>
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
            onChange={(e) => setSearchQuery(e.target.value)}
            type="text"
            placeholder="자재 ID, 소재명, 원산지, 공급사, 인증번호로 등록부 검색"
            className="sn-input"
            style={{ flex: 1, minWidth: 220 }}
          />
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', padding: '0 1.25rem 1rem', background: 'var(--color-surface)' }}>
          <span className="sn-detail-inline-stamp">검색 후보 {filteredMaterials.length}</span>
          <span className="sn-detail-inline-stamp">검색 {hasSearch ? '적용' : '전체'}</span>
          <span className="sn-detail-inline-stamp">페이지 {currentPage}/{totalPages}</span>
        </div>
      </section>

      {!loading && filteredMaterials.length > 0 && (
        <section className="sn-section-card">
          <div className="sn-section-head">
            <div className="sn-section-head-row">
              <div>
                <p className="sn-eyebrow" style={{ margin: '0 0 0.4rem', color: 'var(--color-text-3)' }}>Register summary</p>
                <h2 className="sn-heading" style={{ margin: 0, fontSize: '1.25rem' }}>공급망 파일 요약</h2>
                <p className="sn-caption" style={{ margin: '0.45rem 0 0', maxWidth: '44rem' }}>
                  현재 조회 결과를 등재 파일, 인증 근거, 원산지 범위 기준으로 정리합니다.
                </p>
              </div>
            </div>
          </div>

          <div className="sn-info-grid sn-info-grid-auto">
            <div className="sn-info-tile">
              <p className="sn-eyebrow" style={{ margin: '0 0 0.5rem' }}>등록 파일</p>
              <p className="sn-info-tile-value">{filteredMaterials.length}</p>
              <p className="sn-stat-note">검색 결과 기준</p>
            </div>
            <div className="sn-info-tile">
              <p className="sn-eyebrow" style={{ margin: '0 0 0.5rem', color: 'var(--color-success)' }}>인증 근거</p>
              <p className="sn-info-tile-value" style={{ color: 'var(--color-success)' }}>{certifiedCount}</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.65rem' }}>
                <div style={{ flex: 1, height: 4, background: 'var(--color-border)', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{ height: '100%', background: 'var(--color-success)', borderRadius: 2, width: `${certifiedRatio}%` }} />
                </div>
                <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-3)', whiteSpace: 'nowrap' }}>
                  {certifiedRatio}%
                </span>
              </div>
            </div>
            <div className="sn-info-tile">
              <p className="sn-eyebrow" style={{ margin: '0 0 0.5rem', color: 'var(--color-accent)' }}>원산지 범위</p>
              <p className="sn-info-tile-value" style={{ color: 'var(--color-accent)' }}>{originUniqueCount}</p>
              <p className="sn-stat-note">고유 원산지 수</p>
            </div>
          </div>
        </section>
      )}

      {!loading && materials.length > 0 && (
        <div className="sn-panel" style={{ padding: '0.9rem 1rem' }}>
          <p className="sn-eyebrow" style={{ margin: '0 0 0.35rem' }}>Supply chain composition</p>
          <h2 className="sn-heading" style={{ margin: '0 0 0.75rem', fontSize: '1.125rem' }}>소재 분류</h2>
          <p className="sn-caption" style={{ margin: '0 0 0.9rem' }}>리튬·니켈·코발트·망간 키워드로 전체 등록부의 소재 분포를 계산합니다.</p>
          <BarRows
            items={catLabels.map((cat) => ({ label: cat, value: categoryDist[cat] || 0 }))}
            max={Math.max(...catLabels.map((c) => categoryDist[c] || 0), 1)}
          />
        </div>
      )}

      {loading ? (
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
      ) : filteredMaterials.length === 0 ? (
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
            <button onClick={openCreateModal} className="sn-btn sn-btn-accent">공급망 자재 등재</button>
          )}
        </div>
      ) : (
        <section className="sn-section-card">
          <div className="sn-section-head">
            <div className="sn-section-head-row">
              <div>
                <p className="sn-eyebrow" style={{ margin: '0 0 0.4rem', color: 'var(--color-text-3)' }}>Supply ledger</p>
                <h2 className="sn-heading" style={{ margin: 0, fontSize: '1.25rem' }}>공급망 파일</h2>
              </div>
              <p className="sn-caption" style={{ margin: 0 }}>
                {filteredMaterials.length}개 중 {showingFrom}-{showingTo} 표시
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
                    onClick={() => openDetail(m)}
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
              {filteredMaterials.length}개 중 {showingFrom}-{showingTo} 표시
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button className="sn-btn sn-btn-ghost" style={{ padding: '6px 10px', fontSize: '0.8125rem' }} disabled={currentPage === 1} onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}>이전</button>
              <span className="sn-caption">{currentPage} / {totalPages}</span>
              <button className="sn-btn sn-btn-ghost" style={{ padding: '6px 10px', fontSize: '0.8125rem' }} disabled={currentPage === totalPages} onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}>다음</button>
            </div>
          </div>
        </section>
      )}

      {/* MODALS */}
      <MaterialCreateModal
        open={showCreateModal}
        submitting={submitting}
        onClose={closeCreateModal}
        onSubmit={submitMaterial}
      />
      <MaterialDetailModal
        open={showDetailModal}
        material={selectedMaterial}
        onClose={closeDetail}
      />
    </div>
  );
}
