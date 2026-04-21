import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { getStatusBadge, scaleSOC } from '../lib/helpers';
import { useAuth } from '../contexts/AuthContext';
import PassportCreateModal, { type PassportCreateFormData } from '../components/modals/passports/PassportCreateModal';
import { DonutChart, BarRows, LegendStack, Skeleton, SkeletonTable } from '../components/ui';

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

  const registerEnglishTitle = isManufacturer ? '발급 목록' : isRegulator ? '검토 목록' : '배터리 여권';
  const registerSummary = isManufacturer
    ? '발급 대기, 차량 연결, 제출 준비 상태를 한눈에 확인합니다.'
    : isRegulator
    ? '검토 대기와 서류 보완, 재활용 전환 대상을 차례대로 확인합니다.'
    : '여권 상태와 정비 필요 여부를 목록에서 바로 확인합니다.';

  const viewDetail = (id?: string) => id && navigate(`/passports/${id}`);
  const openIssueFlow = () => setShowCreateModal(true);
  const closeIssueFlow = () => setShowCreateModal(false);

  const submitCreate = async (data: PassportCreateFormData) => {
    setCreating(true);
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
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* 커버 info-tile 4개 skeleton */}
        <div className="sn-section-card">
          <div className="sn-info-grid sn-info-grid-auto">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="sn-info-tile">
                <Skeleton width="60%" height={12} style={{ marginBottom: 10 }} />
                <Skeleton width="40%" height={28} />
              </div>
            ))}
          </div>
        </div>
        {/* 리스트 row 5개 skeleton */}
        <SkeletonTable rows={5} cols={5} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="sn-page-head">
        <div className="sn-page-head-main">
          <p className="sn-eyebrow" style={{ marginBottom: '0.5rem' }}>여권 목록</p>
          <h1 className="sn-page-title">배터리 여권</h1>
          <p className="sn-heading" style={{ fontSize: '1rem', marginTop: '0.375rem' }}>{registerEnglishTitle}</p>
          <p className="sn-caption" style={{ marginTop: '0.375rem', maxWidth: '42rem' }}>{registerSummary}</p>
        </div>
        <div className="sn-page-actions">
          <div className="sn-kpi-mini">
            <p className="sn-eyebrow" style={{ marginBottom: '0.3rem' }}>등록 현황</p>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-text-1)' }}>{filteredPassports.length}</p>
          </div>
          {isManufacturer && (
            <button onClick={openIssueFlow} className="sn-btn sn-btn-accent" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              여권 발급
            </button>
          )}
        </div>
      </div>

      {/* 분포 대시보드 패널 */}
      <section className="sn-section-card" style={{ padding: '20px 22px' }}>
        <p className="sn-eyebrow" style={{ margin: '0 0 16px', color: 'var(--color-text-3)' }}>분포 대시보드</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 32, alignItems: 'start' }}>
          {/* 좌: 도넛 + 범례 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <DonutChart
              segments={statusDistSegments.length ? statusDistSegments : [{ label: '없음', value: 1, color: 'var(--color-border)' }]}
              size={150}
              thickness={18}
              centerLabel="전체"
              centerValue={String(totalCount)}
            />
            <LegendStack items={statusLegendItems} />
          </div>

          {/* 우: 제조사 top5 + chemistry 분포 */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 28 }}>
            <div>
              <p className="sn-eyebrow" style={{ margin: '0 0 12px', color: 'var(--color-text-3)' }}>제조사 상위 5</p>
              {manufacturerBarItems.length > 0
                ? <BarRows items={manufacturerBarItems} />
                : <p className="sn-caption" style={{ margin: 0 }}>데이터 없음</p>}
            </div>
            <div>
              <p className="sn-eyebrow" style={{ margin: '0 0 12px', color: 'var(--color-text-3)' }}>화학 종류 분포</p>
              {chemistryBarItems.length > 0
                ? <BarRows items={chemistryBarItems} />
                : <p className="sn-caption" style={{ margin: 0 }}>데이터 없음</p>}
            </div>
          </div>
        </div>

        {/* 인라인 보조 지표 row */}
        <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap', marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--color-border)' }}>
          <div>
            <p className="sn-eyebrow" style={{ margin: '0 0 4px', color: 'var(--color-text-3)' }}>평균 GBA 21</p>
            <span className="sn-metric sn-metric-md">{avgGba}<span style={{ fontSize: '1rem', fontWeight: 600, marginLeft: 3 }}>%</span></span>
          </div>
          <div>
            <p className="sn-eyebrow" style={{ margin: '0 0 4px', color: 'var(--color-text-3)' }}>VIN 연결 대기</p>
            <span className="sn-metric sn-metric-md">{vinPendingCount}<span style={{ fontSize: '1rem', fontWeight: 600, marginLeft: 3 }}>건</span></span>
          </div>
          <div>
            <p className="sn-eyebrow" style={{ margin: '0 0 4px', color: 'var(--color-text-3)' }}>즉시 검토 가능</p>
            <span className="sn-metric sn-metric-md">{reviewReadyCount}<span style={{ fontSize: '1rem', fontWeight: 600, marginLeft: 3 }}>건</span></span>
          </div>
        </div>
      </section>

      {/* COVER — 4 info-tile */}
      <section className="sn-section-card">
        <div className="sn-info-grid sn-info-grid-auto">
          <div className="sn-info-tile">
            <p className="sn-eyebrow" style={{ marginBottom: '0.5rem' }}>전체 등록</p>
            <p className="sn-info-tile-value">{totalCount}</p>
          </div>
          <div className="sn-info-tile">
            <p className="sn-eyebrow" style={{ marginBottom: '0.5rem' }}>운행 중</p>
            <p className="sn-info-tile-value">{activeCount}</p>
          </div>
          <div className="sn-info-tile">
            <p className="sn-eyebrow" style={{ marginBottom: '0.5rem' }}>정비·분석 중</p>
            <p className="sn-info-tile-value">{maintenanceCount}</p>
          </div>
          <div className="sn-info-tile">
            <p className="sn-eyebrow" style={{ marginBottom: '0.5rem' }}>회수·폐기</p>
            <p className="sn-info-tile-value">{endOfLifeCount}</p>
          </div>
        </div>

        <div className="sn-toolbar" style={{ padding: '0.9rem 1.25rem', background: 'var(--color-surface)' }}>
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            type="text"
            placeholder="여권 ID, 배터리 ID, DID, 시리얼, 모델, 제조사, VIN 검색..."
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
            {([{ v: 'latest', l: '최신순' }, { v: 'gba', l: 'GBA' }] as const).map((s) => {
              const active = sortBy === s.v;
              return (
                <button
                  key={s.v}
                  onClick={() => setSortBy(s.v)}
                  type="button"
                  style={{
                    fontSize: '0.875rem',
                    padding: '0.3rem 0.55rem',
                    background: active ? 'rgba(0,0,0,0.04)' : 'none',
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
          <span className="sn-detail-inline-stamp">검색으로 후보 좁히기</span>
          <span className="sn-detail-inline-stamp">규제 준수 상태 먼저 확인</span>
          <span className="sn-detail-inline-stamp">VIN 연결 여부 검토</span>
        </div>
      </section>

      {/* LIST */}
      {filteredPassports.length > 0 ? (
        <div style={{ border: '1px solid var(--color-border)', borderRadius: '1.25rem', overflow: 'hidden', background: 'var(--color-surface)', boxShadow: 'var(--shadow-card)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.05fr) minmax(0, 1.25fr) minmax(0, 0.9fr) minmax(0, 0.95fr) minmax(0, 0.8fr)', gap: '1rem', padding: '0.9rem 1.1rem', borderBottom: '1px solid var(--color-border)', background: 'var(--color-surface-alt)' }}>
            <span className="sn-eyebrow">여권 ID</span>
            <span className="sn-eyebrow">모델 및 상태</span>
            <span className="sn-eyebrow">배터리 상태</span>
            <span className="sn-eyebrow">규제 준수</span>
            <span className="sn-eyebrow">최근 갱신</span>
          </div>

          {paginatedPassports.map((p) => {
            const badge = getStatusBadge(p.status || 'DISPOSED');
            return (
              <div
                key={p.passportId}
                onClick={() => viewDetail(p.passportId)}
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
                        <div style={{ height: '100%', width: `${getGbaPct(p)}%`, background: getGbaPct(p) === 100 ? '#10b981' : '#f59e0b' }} />
                      </div>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.9375rem', fontWeight: 600, color: 'var(--color-text-1)' }}>{getGbaPct(p)}%</span>
                    </div>
                    <p style={{ marginTop: '0.35rem', fontSize: '0.9375rem', color: 'var(--color-text-3)' }}>
                      {getGbaPct(p) === 100 ? '필수 항목 충족' : '문서 보완 필요'}
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
              {filteredPassports.length}개 중 {filteredPassports.length ? (currentPage - 1) * PAGE_SIZE + 1 : 0}-
              {Math.min(currentPage * PAGE_SIZE, filteredPassports.length)} 표시
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
        <div style={{ padding: '2rem', textAlign: 'center', border: '1px dashed var(--color-border)', borderRadius: '0.5rem' }}>
          <p style={{ fontSize: '1rem', color: 'var(--color-text-3)', marginBottom: '0.75rem' }}>
            {searchQuery || filterStatus
              ? '검색 조건에 맞는 여권이 없습니다. 검색어나 필터를 다시 확인하세요.'
              : '등록된 여권이 없습니다. 검색 조건을 변경하거나 새 여권을 발급하세요.'}
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
