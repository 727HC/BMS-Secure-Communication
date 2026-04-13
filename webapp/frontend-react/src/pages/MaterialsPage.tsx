import { useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import Spinner from '../components/ui/Spinner';
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
  const certifiedPct = filteredMaterials.length > 0
    ? (certifiedCount / filteredMaterials.length) * 100
    : 0;

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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="sn-page-head">
        <div className="sn-page-head-main">
          <p className="sn-eyebrow" style={{ margin: '0 0 0.35rem', color: '#1769e0' }}>원자재 관리</p>
          <h1 className="sn-page-title">원자재 관리</h1>
          <p className="sn-page-subtitle">총 {materials.length}건의 원자재가 등록되어 있습니다</p>
        </div>
        {isManufacturer && (
          <button onClick={openCreateModal} className="sn-btn sn-btn-accent" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            원자재 등록
          </button>
        )}
      </div>

      <div className="sn-panel sn-toolbar">
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          type="text"
          placeholder="자재ID, 명칭, 원산지, 공급업체, 인증번호 검색..."
          className="sn-input"
          style={{ width: '100%', fontSize: '0.875rem' }}
        />
      </div>

      {!loading && filteredMaterials.length > 0 && (
        <div className="sn-panel" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.9rem 1rem', marginBottom: '1rem' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2">
            <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
            <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
          </svg>
          <div style={{ flex: 1 }}>
            <p className="sn-eyebrow" style={{ margin: '0 0 0.25rem' }}>추적 요약</p>
            <span style={{ fontSize: '0.875rem', color: '#16a34a', fontWeight: 600 }}>블록체인 인증 공급망 추적</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
              <div style={{ flex: 1, maxWidth: 120, height: 4, background: 'rgba(22,163,74,0.15)', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{ height: '100%', background: '#16a34a', borderRadius: 2, width: `${certifiedPct}%` }} />
              </div>
              <span style={{ fontSize: '0.8125rem', color: '#16a34a', fontWeight: 600 }}>
                {certifiedCount}/{filteredMaterials.length} 인증
              </span>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <Spinner />
      ) : filteredMaterials.length === 0 ? (
        <div style={{ padding: '3rem', textAlign: 'center', border: '1px dashed var(--color-border)', borderRadius: '0.5rem' }}>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-text-3)', marginBottom: '0.75rem' }}>
            등록된 원자재가 없습니다. 원자재를 등록하여 공급망을 투명하게 추적하세요.
          </p>
          {isManufacturer && (
            <button onClick={openCreateModal} className="sn-btn sn-btn-accent">원자재 등록</button>
          )}
        </div>
      ) : (
        <div className="sn-panel" style={{ overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto', fontSize: '0.875rem' }}>
            <table className="sn-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>이름</th>
                  <th>원산지</th>
                  <th>공급사</th>
                  <th style={{ textAlign: 'right' }}>수량</th>
                  <th>단위</th>
                  <th>인증ID</th>
                  <th>등록일</th>
                </tr>
              </thead>
              <tbody>
                {paginatedMaterials.map((m) => (
                  <tr
                    key={m.materialId}
                    onClick={() => openDetail(m)}
                    style={{ cursor: 'pointer', transition: 'all 0.5s cubic-bezier(0.16,1,0.3,1)' }}
                  >
                    <td><span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: '0.8125rem', color: '#a3a3a3' }}>{m.materialId}</span></td>
                    <td style={{ fontWeight: 600, color: '#171717' }}>{m.name}</td>
                    <td style={{ color: '#525252' }}>{m.origin}</td>
                    <td style={{ color: '#525252' }}>{m.supplier}</td>
                    <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 500, color: '#171717' }}>{m.quantity}</td>
                    <td style={{ color: '#a3a3a3' }}>{m.unit}</td>
                    <td>
                      {m.certificationId ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 20, background: '#f0fdf4', border: '1px solid #bbf7d0', fontSize: '0.8125rem', fontWeight: 600, color: '#16a34a' }}>
                          <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                          </svg>
                          인증됨
                        </span>
                      ) : (
                        <span style={{ fontSize: '0.8125rem', color: '#a3a3a3', fontStyle: 'italic' }}>미인증</span>
                      )}
                    </td>
                    <td style={{ color: '#a3a3a3', fontSize: '0.875rem' }}>{formatDate(m.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '0.9rem 1rem', borderTop: '1px solid var(--color-border)' }}>
            <span className="sn-caption">
              {filteredMaterials.length}개 중 {filteredMaterials.length ? (currentPage - 1) * PAGE_SIZE + 1 : 0}-{Math.min(currentPage * PAGE_SIZE, filteredMaterials.length)} 표시
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button className="sn-btn sn-btn-ghost" style={{ padding: '6px 10px', fontSize: '0.8125rem' }} disabled={currentPage === 1} onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}>이전</button>
              <span className="sn-caption">{currentPage} / {totalPages}</span>
              <button className="sn-btn sn-btn-ghost" style={{ padding: '6px 10px', fontSize: '0.8125rem' }} disabled={currentPage === totalPages} onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}>다음</button>
            </div>
          </div>
        </div>
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
