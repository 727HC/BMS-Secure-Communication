import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { toastFromError } from '../lib/chaincodeErrorMessages';
import { useAuth } from '../contexts/AuthContext';
import PassportCreateModal, { type PassportCreateFormData } from '../components/modals/passports/PassportCreateModal';
import { DonutChart, BarRows, LegendStack, PageHead, Skeleton, SkeletonTable } from '../components/ui';
import {
  CHEMISTRY_COLORS,
  PAGE_SIZE,
  STATUS_COLORS,
  STATUS_OPTIONS,
  getGbaPct,
  type GbaFilter,
  type ListResponse,
  type Passport,
} from '../components/passports/lib';
import PassportsSummaryCard from '../components/passports/PassportsSummaryCard';
import PassportsListCard from '../components/passports/PassportsListCard';

export default function PassportsPage() {
  const navigate = useNavigate();
  const { org } = useAuth();
  const [passports, setPassports] = useState<Passport[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [sortBy, setSortBy] = useState<'latest' | 'gba'>('latest');
  const [gbaFilter, setGbaFilter] = useState<GbaFilter>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const isManufacturer = org === 'ManufacturerMSP';
  const isRegulator = org === 'RegulatorMSP';

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await api.get<ListResponse<Passport> | Passport[]>('/passports');
        const list = Array.isArray(data) ? data : data.records || [];
        if (!cancelled) setPassports(list);
      } catch {
        if (!cancelled) setPassports([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const filteredPassports = useMemo(() => {
    let list = passports;
    if (filterStatus) list = list.filter((p) => p.status === filterStatus);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter((p) =>
        (p.serialNumber || '').toLowerCase().includes(q) ||
        (p.passportId || '').toLowerCase().includes(q) ||
        (p.batteryId || '').toLowerCase().includes(q) ||
        (p.did || '').toLowerCase().includes(q) ||
        (p.model || '').toLowerCase().includes(q) ||
        (p.manufacturerName || '').toLowerCase().includes(q) ||
        (p.vin || '').toLowerCase().includes(q)
      );
    }
    if (gbaFilter === 'complete') list = list.filter((p) => getGbaPct(p) === 100);
    if (gbaFilter === 'incomplete') list = list.filter((p) => getGbaPct(p) < 100);
    if (sortBy === 'latest') {
      list = [...list].sort((a, b) =>
        String(b.updatedAt || b.createdAt || '').localeCompare(String(a.updatedAt || a.createdAt || ''))
      );
    } else if (sortBy === 'gba') {
      list = [...list].sort((a, b) => getGbaPct(a) - getGbaPct(b));
    }
    return list;
  }, [passports, filterStatus, searchQuery, sortBy, gbaFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredPassports.length / PAGE_SIZE));
  const paginatedPassports = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredPassports.slice(start, start + PAGE_SIZE);
  }, [filteredPassports, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterStatus, sortBy, gbaFilter]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [totalPages, currentPage]);

  const totalCount = passports.length;
  const activeCount = passports.filter((p) => p.status === 'ACTIVE').length;
  const maintenanceCount = passports.filter((p) => p.status === 'MAINTENANCE' || p.status === 'ANALYSIS').length;
  const endOfLifeCount = passports.filter((p) => p.status === 'RECYCLING' || p.status === 'DISPOSED').length;
  const avgGba = passports.length ? Math.round(passports.reduce((acc, p) => acc + getGbaPct(p), 0) / passports.length) : 0;
  const vinPendingCount = passports.filter((p) => !p.vin).length;
  const reviewReadyCount = passports.filter((p) => getGbaPct(p) === 100 && !!p.vin).length;

  /* 분포 대시보드 데이터 */
  const statusDistSegments = useMemo(() => {
    const STATUS_KEYS = ['MANUFACTURED', 'ACTIVE', 'MAINTENANCE', 'ANALYSIS', 'RECYCLING', 'DISPOSED'];
    const STATUS_LABELS: Record<string, string> = {
      MANUFACTURED: '제조완료', ACTIVE: '운행중', MAINTENANCE: '정비중',
      ANALYSIS: '분석중', RECYCLING: '회수 검토', DISPOSED: '폐기',
    };
    return STATUS_KEYS
      .map((key) => ({
        label: STATUS_LABELS[key],
        value: passports.filter((p) => p.status === key).length,
        color: STATUS_COLORS[key],
      }))
      .filter((s) => s.value > 0);
  }, [passports]);

  const statusLegendItems = useMemo(() => {
    const STATUS_KEYS = ['MANUFACTURED', 'ACTIVE', 'MAINTENANCE', 'ANALYSIS', 'RECYCLING', 'DISPOSED'];
    const STATUS_LABELS: Record<string, string> = {
      MANUFACTURED: '제조완료', ACTIVE: '운행중', MAINTENANCE: '정비중',
      ANALYSIS: '분석중', RECYCLING: '회수 검토', DISPOSED: '폐기',
    };
    return STATUS_KEYS.map((key) => ({
      label: STATUS_LABELS[key],
      value: passports.filter((p) => p.status === key).length,
      color: STATUS_COLORS[key],
    }));
  }, [passports]);

  const manufacturerBarItems = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const p of passports) {
      const name = p.manufacturerName || '미등록';
      counts[name] = (counts[name] || 0) + 1;
    }
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([label, value]) => ({ label, value }));
  }, [passports]);

  const chemistryBarItems = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const p of passports) {
      const chem = p.chemistry || '기타';
      const key = ['NCM', 'LFP', 'NCA', 'LMO'].includes(chem) ? chem : '기타';
      counts[key] = (counts[key] || 0) + 1;
    }
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([label, value]) => ({ label, value, color: CHEMISTRY_COLORS[label] || '#94a3b8' }));
  }, [passports]);

  const registerScopeLabel = isManufacturer
    ? '제조사 등재 데스크'
    : isRegulator
      ? '규제기관 검토 데스크'
      : '공유 등록부 뷰';
  const registerSummary = isManufacturer
    ? '제조사는 신규 여권을 접수하고, 차량 연결과 GBA 21 문서 완성도를 같은 등록부에서 확인합니다.'
    : isRegulator
      ? '검증기관은 검토 대기 문서, 보완 필요 항목, 회수 전환 대상을 등록부 기준으로 확인합니다.'
      : '조직 권한 안에서 열람 가능한 배터리 여권과 상태 증빙을 등록부 기준으로 확인합니다.';

  const viewDetail = (id?: string) => id && navigate(`/passports/${id}`);
  const openIssueFlow = () => setShowCreateModal(true);
  const closeIssueFlow = () => setShowCreateModal(false);

  const submitCreate = async (data: PassportCreateFormData) => {
    setCreating(true);
    setSubmitError(null);
    try {
      const created = await api.post<{ passportId?: string }>('/passports', data);
      const nextPassportId = created.passportId || data.passportId;
      closeIssueFlow();
      navigate(`/passports/${nextPassportId}`);

      api.get<ListResponse<Passport> | Passport[]>('/passports')
        .then((refresh) => {
          const list = Array.isArray(refresh) ? refresh : refresh.records || [];
          setPassports(list);
        })
        .catch(() => {
          // 목록 새로고침 실패는 생성 성공/상세 이동을 막지 않는다.
        });
    } catch (err) {
      const { toast, debug, category } = toastFromError(err);
      console.warn('[passports] mutation failed', { category, debug });
      setSubmitError(toast);
    } finally {
      setCreating(false);
    }
  };

  const hasActiveFilters = Boolean(searchQuery || filterStatus || gbaFilter !== 'all');
  const showingFrom = filteredPassports.length ? (currentPage - 1) * PAGE_SIZE + 1 : 0;
  const showingTo = Math.min(currentPage * PAGE_SIZE, filteredPassports.length);

  if (loading) {
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

  return (
    <div data-page="passports" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <PageHead
        title="배터리 여권 등록부"
        subtitle={registerSummary}
        actions={isManufacturer ? (
          <button onClick={openIssueFlow} className="sn-btn sn-btn-accent" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            발급 접수
          </button>
        ) : undefined}
      />

      {submitError && (
        <div role="alert" style={{ padding: '0.9rem 1rem', borderRadius: '0.85rem', background: 'var(--color-danger-soft)', color: 'var(--color-danger)', border: '1px solid var(--color-border)' }}>
          <span style={{ fontSize: '0.9rem', lineHeight: 1.6 }}>{submitError}</span>
        </div>
      )}

      <PassportsSummaryCard registerScopeLabel={registerScopeLabel} totalCount={totalCount} activeCount={activeCount} maintenanceCount={maintenanceCount} endOfLifeCount={endOfLifeCount} avgGba={avgGba} reviewReadyCount={reviewReadyCount} vinPendingCount={vinPendingCount} />

      <section className="sn-section-card" style={{ padding: '20px 22px', maxWidth: 1080 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
          <div>
            <p className="sn-eyebrow" style={{ margin: '0 0 0.35rem', color: 'var(--color-text-3)' }}>등록부 구성</p>
            <h2 className="sn-heading" style={{ margin: 0, fontSize: '1.125rem' }}>상태와 제조 근거</h2>
          </div>
          <p className="sn-caption" style={{ margin: 0 }}>상태, 제조사, 화학계열 분포를 현재 조회 결과로 표시합니다.</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(17rem, auto) minmax(0, 1fr)', gap: 32, alignItems: 'start' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
            <DonutChart
              segments={statusDistSegments.length ? statusDistSegments : [{ label: '없음', value: 1, color: 'var(--color-border)' }]}
              size={150}
              thickness={18}
              centerLabel="register"
              centerValue={String(totalCount)}
            />
            <LegendStack items={statusLegendItems} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <p className="sn-eyebrow" style={{ margin: '0 0 12px', color: 'var(--color-text-3)' }}>제조사 파일 상위 5</p>
              {manufacturerBarItems.length > 0
                ? <BarRows items={manufacturerBarItems} />
                : <p className="sn-caption" style={{ margin: 0 }}>표시할 제조사 데이터가 없습니다.</p>}
            </div>
            <div>
              <p className="sn-eyebrow" style={{ margin: '0 0 12px', color: 'var(--color-text-3)' }}>화학계열 문서 분포</p>
              {chemistryBarItems.length > 0
                ? <BarRows items={chemistryBarItems} />
                : <p className="sn-caption" style={{ margin: 0 }}>표시할 화학계열 데이터가 없습니다.</p>}
            </div>
          </div>
        </div>
      </section>

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
            onChange={(e) => setSearchQuery(e.target.value)}
            type="text"
            placeholder="여권 ID, 배터리 ID, DID, 시리얼, 모델, 제조사, VIN으로 등록부 검색"
            className="sn-input"
            style={{ flex: 1, minWidth: 220 }}
          />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="sn-input"
            style={{ width: 'auto', minWidth: 140 }}
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <select
            value={gbaFilter}
            onChange={(e) => setGbaFilter(e.target.value as GbaFilter)}
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
                  onClick={() => setSortBy(s.v)}
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
          <span className="sn-detail-inline-stamp">검색 후보 {filteredPassports.length}</span>
          <span className="sn-detail-inline-stamp">필터 {hasActiveFilters ? '적용' : '전체'}</span>
          <span className="sn-detail-inline-stamp">페이지 {currentPage}/{totalPages}</span>
        </div>
      </section>

      <PassportsListCard
        filteredPassports={filteredPassports}
        paginatedPassports={paginatedPassports}
        showingFrom={showingFrom}
        showingTo={showingTo}
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        onView={viewDetail}
        hasActiveFilters={hasActiveFilters}
        isManufacturer={isManufacturer}
      />

      <PassportCreateModal
        open={showCreateModal}
        submitting={creating}
        onClose={closeIssueFlow}
        onSubmit={submitCreate}
      />
    </div>
  );
}
