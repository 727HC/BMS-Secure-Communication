import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { toastFromError } from '../lib/chaincodeErrorMessages';
import { getStatusBadge, scaleSOC } from '../lib/helpers';
import { useAuth } from '../contexts/AuthContext';
import PassportCreateModal, { type PassportCreateFormData } from '../components/modals/passports/PassportCreateModal';
import { DonutChart, BarRows, LegendStack, PageHead, Skeleton, SkeletonTable } from '../components/ui';

interface Passport {
  passportId?: string;
  batteryId?: string;
  did?: string;
  model?: string;
  serialNumber?: string;
  manufacturerName?: string;
  chemistry?: string;
  vin?: string;
  status?: string;
  evManufacturer?: string;
  evAssemblyCountry?: string;
  manufactureCountry?: string;
  cellManufacturer?: string;
  cellManufactureCountry?: string;
  manufactureDate?: string;
  cellType?: string;
  cellCount?: number;
  weight?: number;
  totalEnergy?: number;
  energyDensity?: number;
  ratedCapacity?: number;
  expectedLifespan?: number;
  voltageRange?: string;
  temperatureRange?: string;
  currentSoc?: number;
  soc?: number;
  currentSoh?: number;
  recycleAvailable?: boolean;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
}

interface ListResponse<T> {
  records?: T[];
}

const PAGE_SIZE = 12;
type GbaFilter = 'all' | 'complete' | 'incomplete';

const STATUS_OPTIONS = [
  { value: '', label: '전체 상태' },
  { value: 'MANUFACTURED', label: '제조완료' },
  { value: 'ACTIVE', label: '운행중' },
  { value: 'MAINTENANCE', label: '정비중' },
  { value: 'ANALYSIS', label: '분석중' },
  { value: 'RECYCLING', label: '재활용' },
  { value: 'DISPOSED', label: '폐기' },
];

const STATUS_COLORS: Record<string, string> = {
  MANUFACTURED: '#1769e0',
  ACTIVE: '#0ea5e9',
  MAINTENANCE: '#f59e0b',
  ANALYSIS: '#8b5cf6',
  RECYCLING: '#0f766e',
  DISPOSED: '#94a3b8',
};

const CHEMISTRY_COLORS: Record<string, string> = {
  NCM: '#1769e0',
  LFP: '#0ea5e9',
  NCA: '#8b5cf6',
  LMO: '#f59e0b',
  기타: '#94a3b8',
};

const GBA_FIELDS: (keyof Passport)[] = [
  'passportId', 'model', 'serialNumber', 'status', 'evManufacturer', 'evAssemblyCountry',
  'manufacturerName', 'manufactureCountry', 'cellManufacturer', 'cellManufactureCountry',
  'manufactureDate', 'cellType', 'chemistry', 'cellCount', 'weight', 'totalEnergy',
  'energyDensity', 'ratedCapacity', 'expectedLifespan', 'voltageRange', 'temperatureRange',
];

function getGbaPct(p: Passport): number {
  let filled = 0;
  GBA_FIELDS.forEach((k) => {
    const v = p[k];
    if (v != null && v !== '' && v !== 0 && !(Array.isArray(v) && v.length === 0)) filled++;
  });
  return Math.round((filled / 21) * 100);
}

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
    ? 'Manufacturer filing desk'
    : isRegulator
      ? 'Regulator review desk'
      : 'Shared register view';
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
        eyebrow="여권 등록부"
        eyebrowColor="var(--color-accent)"
        title="Battery Passport Register"
        subtitle={registerSummary}
        actions={(
          <>
            <div className="sn-kpi-mini">
              <p className="sn-eyebrow" style={{ margin: '0 0 0.3rem' }}>현재 표시</p>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-text-1)', margin: 0 }}>{filteredPassports.length}</p>
            </div>
            {isManufacturer && (
              <button onClick={openIssueFlow} className="sn-btn sn-btn-accent" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                발급 접수
              </button>
            )}
          </>
        )}
      />

      {submitError && (
        <div role="alert" style={{ padding: '0.9rem 1rem', borderRadius: '0.85rem', background: 'var(--color-danger-soft)', color: 'var(--color-danger)', border: '1px solid var(--color-border)' }}>
          <span style={{ fontSize: '0.9rem', lineHeight: 1.6 }}>{submitError}</span>
        </div>
      )}

      <section className="sn-section-card">
        <div className="sn-section-head">
          <div className="sn-section-head-row">
            <div>
              <p className="sn-eyebrow" style={{ margin: '0 0 0.4rem', color: 'var(--color-text-3)' }}>{registerScopeLabel}</p>
              <h2 className="sn-heading" style={{ margin: 0, fontSize: '1.25rem' }}>등록 파일 요약</h2>
              <p className="sn-caption" style={{ margin: '0.45rem 0 0', maxWidth: '46rem' }}>
                실시간 조회 결과를 여권 파일, 운영 상태, 보완 필요 문서 기준으로 정리합니다.
              </p>
            </div>
          </div>
        </div>

        <div className="sn-info-grid sn-info-grid-auto">
          <div className="sn-info-tile">
            <p className="sn-eyebrow" style={{ margin: '0 0 0.5rem' }}>전체 등재</p>
            <p className="sn-info-tile-value">{totalCount}</p>
            <p className="sn-stat-note">등록부에 올라온 여권</p>
          </div>
          <div className="sn-info-tile">
            <p className="sn-eyebrow" style={{ margin: '0 0 0.5rem', color: 'var(--color-success)' }}>운행 등재</p>
            <p className="sn-info-tile-value">{activeCount}</p>
            <p className="sn-stat-note">ACTIVE 상태 파일</p>
          </div>
          <div className="sn-info-tile">
            <p className="sn-eyebrow" style={{ margin: '0 0 0.5rem', color: 'var(--color-warning)' }}>점검 문서</p>
            <p className="sn-info-tile-value">{maintenanceCount}</p>
            <p className="sn-stat-note">정비 또는 분석 중</p>
          </div>
          <div className="sn-info-tile">
            <p className="sn-eyebrow" style={{ margin: '0 0 0.5rem' }}>회수 파일</p>
            <p className="sn-info-tile-value">{endOfLifeCount}</p>
            <p className="sn-stat-note">재활용·폐기 상태</p>
          </div>
        </div>

        <div className="sn-summary-grid sn-summary-grid-3" style={{ borderBottom: '1px solid var(--color-border)' }}>
          <div className="sn-summary-lead">
            <p className="sn-eyebrow sn-summary-title" style={{ margin: '0 0 0.4rem' }}>Filing readiness</p>
            <p className="sn-summary-copy-strong" style={{ margin: 0, color: 'var(--color-text-1)' }}>GBA 21 · VIN · 검토 준비</p>
            <p className="sn-stat-note" style={{ margin: '0.35rem 0 0', lineHeight: 1.6 }}>
              모든 수치는 현재 등록부 조회 결과에서 계산합니다.
            </p>
          </div>
          <div>
            <p className="sn-eyebrow sn-stat-card-title">평균 GBA 21</p>
            <p className="sn-metric sn-metric-md sn-stat-count">{avgGba}<span className="sn-metric-unit">%</span></p>
            <p className="sn-stat-note">필수 필드 충족률</p>
          </div>
          <div>
            <p className="sn-eyebrow sn-stat-card-title">검토 가능</p>
            <p className="sn-metric sn-metric-md sn-stat-count">{reviewReadyCount}</p>
            <p className="sn-stat-note">GBA 완료 및 VIN 연결</p>
          </div>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', padding: '0.9rem 1.25rem', background: 'var(--color-surface-alt)' }}>
          <span className="sn-detail-inline-stamp">VIN 대기 {vinPendingCount}</span>
          <span className="sn-detail-inline-stamp">GBA 평균 {avgGba}%</span>
          <span className="sn-detail-inline-stamp">검토 가능 {reviewReadyCount}</span>
        </div>
      </section>

      <section className="sn-section-card" style={{ padding: '20px 22px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
          <div>
            <p className="sn-eyebrow" style={{ margin: '0 0 0.35rem', color: 'var(--color-text-3)' }}>Register composition</p>
            <h2 className="sn-heading" style={{ margin: 0, fontSize: '1.125rem' }}>상태와 제조 근거</h2>
          </div>
          <p className="sn-caption" style={{ margin: 0 }}>상태, 제조사, 화학계열 분포를 현재 조회 결과로 표시합니다.</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(17rem, auto) 1fr', gap: 32, alignItems: 'start' }}>
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

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 28 }}>
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
              <p className="sn-eyebrow" style={{ margin: '0 0 0.4rem', color: 'var(--color-text-3)' }}>Filing controls</p>
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

      {filteredPassports.length > 0 ? (
        <div className="sn-section-card">
          <div className="sn-section-head">
            <div className="sn-section-head-row">
              <div>
                <p className="sn-eyebrow" style={{ margin: '0 0 0.4rem', color: 'var(--color-text-3)' }}>Dossier ledger</p>
                <h2 className="sn-heading" style={{ margin: 0, fontSize: '1.25rem' }}>여권 파일</h2>
              </div>
              <p className="sn-caption" style={{ margin: 0 }}>
                {filteredPassports.length}개 중 {showingFrom}-{showingTo} 표시
              </p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.05fr) minmax(0, 1.25fr) minmax(0, 0.9fr) minmax(0, 0.95fr) minmax(0, 0.8fr)', gap: '1rem', padding: '0.9rem 1.1rem', borderBottom: '1px solid var(--color-border)', background: 'var(--color-surface-alt)' }}>
            <span className="sn-eyebrow">Filing reference</span>
            <span className="sn-eyebrow">Dossier summary</span>
            <span className="sn-eyebrow">Battery evidence</span>
            <span className="sn-eyebrow">GBA completeness</span>
            <span className="sn-eyebrow">Ledger update</span>
          </div>

          {paginatedPassports.map((p) => {
            const badge = getStatusBadge(p.status || 'DISPOSED');
            const gbaPct = getGbaPct(p);
            return (
              <div
                key={p.passportId}
                onClick={() => viewDetail(p.passportId)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    viewDetail(p.passportId);
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
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              >
                이전
              </button>
              <span className="sn-caption">{currentPage} / {totalPages}</span>
              <button
                className="sn-btn sn-btn-ghost"
                style={{ padding: '6px 10px', fontSize: 12 }}
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              >
                다음
              </button>
            </div>
          </div>
        </div>
      ) : (
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
      )}

      <PassportCreateModal
        open={showCreateModal}
        submitting={creating}
        onClose={closeIssueFlow}
        onSubmit={submitCreate}
      />
    </div>
  );
}
