import { useEffect, useMemo, useState } from 'react';
import { toastFromError } from '../lib/chaincodeErrorMessages';
import { api } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { PageHead } from '../components/ui';
import { BarRows } from '../components/ui/Charts';
import {
  MaterialCreateModal,
  MaterialDetailModal,
  type MaterialFormData,
  type Material,
} from '../components/modals/materials';
import MaterialsTable from '../components/materials/MaterialsTable';
import MaterialsFilterBar from '../components/materials/MaterialsFilterBar';
import MaterialsSummaryCard from '../components/materials/MaterialsSummaryCard';
import MaterialsStateView from '../components/materials/MaterialsStateView';

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
  const [submitError, setSubmitError] = useState<string | null>(null);
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
    setSubmitError(null);
    try {
      const payload = { ...form, quantity: Number(form.quantity) };
      await api.post('/materials', payload);
      closeCreateModal();
      await fetchMaterials();
    } catch (err) {
      const { toast, debug, category } = toastFromError(err);
      console.warn('[materials] mutation failed', { category, debug });
      setSubmitError(toast);
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
        title="공급망 등록부"
        subtitle={registerSummary}
        actions={isManufacturer ? (
          <button onClick={openCreateModal} className="sn-btn sn-btn-accent" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            공급망 자재 등재
          </button>
        ) : undefined}
      />

      {submitError && (
        <div role="alert" style={{ padding: '0.9rem 1rem', borderRadius: '0.85rem', background: 'var(--color-danger-soft)', color: 'var(--color-danger)', border: '1px solid var(--color-border)' }}>
          <span style={{ fontSize: '0.9rem', lineHeight: 1.6 }}>{submitError}</span>
        </div>
      )}

      <MaterialsFilterBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        filteredCount={filteredMaterials.length}
        hasSearch={hasSearch}
        currentPage={currentPage}
        totalPages={totalPages}
      />

      {!loading && filteredMaterials.length > 0 && (
        <MaterialsSummaryCard
          filteredCount={filteredMaterials.length}
          certifiedCount={certifiedCount}
          certifiedRatio={certifiedRatio}
          originUniqueCount={originUniqueCount}
        />
      )}

      {!loading && materials.length > 0 && (
        <div className="sn-panel" style={{ padding: '0.9rem 1rem', maxWidth: 1080 }}>
          <p className="sn-eyebrow" style={{ margin: '0 0 0.35rem' }}>공급망 구성</p>
          <h2 className="sn-heading" style={{ margin: '0 0 0.75rem', fontSize: '1.125rem' }}>소재 분류</h2>
          <p className="sn-caption" style={{ margin: '0 0 0.9rem' }}>리튬·니켈·코발트·망간 키워드로 전체 등록부의 소재 분포를 계산합니다.</p>
          <BarRows
            items={catLabels.map((cat) => ({ label: cat, value: categoryDist[cat] || 0 }))}
            max={Math.max(...catLabels.map((c) => categoryDist[c] || 0), 1)}
          />
        </div>
      )}

      <MaterialsStateView
        loading={loading}
        filteredCount={filteredMaterials.length}
        hasSearch={hasSearch}
        isManufacturer={isManufacturer}
        onCreateClick={openCreateModal}
      />
      {!loading && filteredMaterials.length > 0 && (
        <MaterialsTable
          filteredCount={filteredMaterials.length}
          paginatedMaterials={paginatedMaterials}
          showingFrom={showingFrom}
          showingTo={showingTo}
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          onRowClick={openDetail}
        />
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
