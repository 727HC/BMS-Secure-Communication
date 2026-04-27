import { useEffect, useMemo, useState } from 'react';

const PAGE_SIZE = 12;
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { toastFromError } from '../lib/chaincodeErrorMessages';
import { useAuth } from '../contexts/AuthContext';
import { getStatusBadge } from '../lib/helpers';
import { BarRows, DonutChart, LegendStack, PageHead, SkeletonCard, SkeletonTable } from '../components/ui';
import BaseModal from '../components/modals/BaseModal';
import { AccidentLogModal, type AccidentFormData } from '../components/modals/maintenance';

interface MaintenanceLog {
  timestamp?: string;
  maintenanceType?: string;
  description?: string;
  technician?: string;
}

interface AccidentLog {
  timestamp?: string;
  severity?: string;
  description?: string;
  reporter?: string;
}

interface Passport {
  passportId?: string;
  status?: string;
  vin?: string;
  model?: string;
  manufacturerName?: string;
  createdAt?: string;
  maintenanceLogs?: MaintenanceLog[];
  accidentLogs?: AccidentLog[];
  [key: string]: unknown;
}

type Tab = 'all' | 'maintenance' | 'accident';

const MAINTENANCE_TYPES = [
  { value: 'routine', label: '정기점검' },
  { value: 'repair', label: '수리' },
  { value: 'recall', label: '리콜' },
  { value: 'emergency', label: '긴급' },
];

function formatTimestamp(ts?: string): string {
  if (!ts) return '-';
  try { return new Date(ts).toLocaleString('ko-KR'); }
  catch { return ts; }
}

function latestMaintenanceTimestamp(logs?: MaintenanceLog[]): string {
  if (!logs || logs.length === 0) return '-';
  const sorted = [...logs].sort((a, b) => {
    const tA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
    const tB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
    return tB - tA;
  });
  return formatTimestamp(sorted[0].timestamp);
}

export default function MaintenancePage() {
  const navigate = useNavigate();
  const { org, userId } = useAuth();
  const isEVManufacturer = org === 'EVManufacturerMSP';
  const isService = org === 'ServiceMSP';
  const canRequestMaintenance = isEVManufacturer;
  const canLogMaintenance = isService;
  const canLogAccident = isEVManufacturer || isService;

  const [passports, setPassports] = useState<Passport[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('all');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [selectedPassport, setSelectedPassport] = useState<Passport | null>(null);
  const [showRequest, setShowRequest] = useState(false);
  const [showLog, setShowLog] = useState(false);
  const [showAccident, setShowAccident] = useState(false);

  const [requestForm, setRequestForm] = useState({ maintenanceType: 'routine', description: '' });
  const [logForm, setLogForm] = useState({ maintenanceType: 'routine', description: '', technician: '' });

  const fetchPassports = async () => {
    setLoading(true);
    try {
      const data = await api.get<Passport[] | { records?: Passport[] }>('/passports');
      const list = Array.isArray(data) ? data : data.records || [];
      setPassports(list);
    } catch {
      setPassports([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPassports();
  }, []);

  const isWorkbenchItem = (p: Passport): boolean => {
    const hasHistory = (p.maintenanceLogs && p.maintenanceLogs.length > 0) ||
      (p.accidentLogs && p.accidentLogs.length > 0);
    const canRequest = isEVManufacturer && p.status === 'ACTIVE' && p.vin;
    return p.status === 'MAINTENANCE' || p.status === 'ANALYSIS' || Boolean(hasHistory) || Boolean(canRequest);
  };

  const filteredPassports = useMemo(() => {
    if (activeTab === 'maintenance') return passports.filter((p) => p.status === 'MAINTENANCE' || p.status === 'ANALYSIS');
    if (activeTab === 'accident') return passports.filter((p) => (p.accidentLogs?.length ?? 0) > 0);
    return passports.filter(isWorkbenchItem);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [passports, activeTab, isEVManufacturer]);

  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(filteredPassports.length / PAGE_SIZE));
  const pagedPassports = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredPassports.slice(start, start + PAGE_SIZE);
  }, [filteredPassports, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [totalPages, currentPage]);

  const showingFrom = filteredPassports.length ? (currentPage - 1) * PAGE_SIZE + 1 : 0;
  const showingTo = Math.min(currentPage * PAGE_SIZE, filteredPassports.length);

  const tabCounts = {
    all: passports.filter(isWorkbenchItem).length,
    maintenance: passports.filter((p) => p.status === 'MAINTENANCE' || p.status === 'ANALYSIS').length,
    accident: passports.filter((p) => (p.accidentLogs?.length ?? 0) > 0).length,
  };

  // 확장 통계 계산
  const extStats = useMemo(() => {
    const totalMaintenance = passports.reduce((sum, p) => sum + (p.maintenanceLogs?.length ?? 0), 0);
    const totalAccident = passports.reduce((sum, p) => sum + (p.accidentLogs?.length ?? 0), 0);

    // 긴급 대응 필요: status === 'MAINTENANCE' 이면서 요청 후 7일 이상
    const now = Date.now();
    const urgentCount = passports.filter((p) => {
      if (p.status !== 'MAINTENANCE') return false;
      const logs = p.maintenanceLogs ?? [];
      if (logs.length === 0) return false;
      const latest = logs.reduce((a, b) => {
        const tA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
        const tB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
        return tA > tB ? a : b;
      });
      if (!latest.timestamp) return false;
      const diffDays = (now - new Date(latest.timestamp).getTime()) / (1000 * 60 * 60 * 24);
      return diffDays >= 7;
    }).length;

    // 평균 정비 간격: createdAt vs 최신 정비 timestamp
    const intervals: number[] = [];
    for (const p of passports) {
      if (!p.createdAt || !p.maintenanceLogs?.length) continue;
      const created = new Date(p.createdAt).getTime();
      if (isNaN(created)) continue;
      const latestLog = p.maintenanceLogs.reduce((a, b) => {
        const tA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
        const tB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
        return tA > tB ? a : b;
      });
      if (!latestLog.timestamp) continue;
      const latestTime = new Date(latestLog.timestamp).getTime();
      if (isNaN(latestTime) || latestTime <= created) continue;
      const days = (latestTime - created) / (1000 * 60 * 60 * 24);
      if (days > 0) intervals.push(days);
    }
    const avgIntervalDays = intervals.length > 0
      ? Math.round(intervals.reduce((a, b) => a + b, 0) / intervals.length)
      : null;

    // 대기 여권 수 (status ACTIVE with VIN but no maintenance yet)
    const pendingPassports = passports.filter((p) => p.status === 'ACTIVE' && p.vin && !(p.maintenanceLogs?.length)).length;

    return { totalMaintenance, totalAccident, urgentCount, avgIntervalDays, pendingPassports };
  }, [passports]);

  // 정비 타입별 집계 (BarRows용)
  const maintenanceTypeBreakdown = useMemo(() => {
    const counts: Record<string, number> = { routine: 0, repair: 0, recall: 0, emergency: 0 };
    for (const p of passports) {
      for (const log of p.maintenanceLogs ?? []) {
        const t = log.maintenanceType ?? 'routine';
        if (t in counts) counts[t]++;
      }
    }
    return [
      { label: '정기점검', value: counts.routine, color: 'var(--color-success)' },
      { label: '수리', value: counts.repair, color: 'var(--color-accent)' },
      { label: '리콜', value: counts.recall, color: 'var(--color-warning)' },
      { label: '긴급', value: counts.emergency, color: 'var(--color-danger)' },
    ];
  }, [passports]);

  // 도넛 차트 데이터
  const donutSegments = useMemo(() => [
    { label: 'Service logs', value: extStats.totalMaintenance, color: 'var(--color-success)' },
    { label: 'Incident logs', value: extStats.totalAccident, color: 'var(--color-danger)' },
    { label: 'Request candidates', value: extStats.pendingPassports, color: 'var(--color-warning)' },
  ], [extStats]);

  const donutTotal = extStats.totalMaintenance + extStats.totalAccident + extStats.pendingPassports;

  const tabs: { key: Tab; label: string }[] = [
    { key: 'all', label: 'All docket' },
    { key: 'maintenance', label: 'Service tasks' },
    { key: 'accident', label: 'Incident logs' },
  ];

  const docketScopeLabel = isEVManufacturer
    ? 'EV manufacturer service desk'
    : isService
      ? 'Service completion desk'
      : 'Read-only docket view';
  const docketSummary = isEVManufacturer
    ? 'EV 제조사는 운행 중인 VIN 파일을 service task로 접수하고 사고 기록을 docket에 남깁니다.'
    : isService
      ? '정비 조직은 접수된 service task를 완료 기록으로 마감하고 사고 기록을 docket에 남깁니다.'
      : '현재 권한에서는 task docket을 열람하며 접수, 완료, 사고 기록 조치는 숨겨집니다.';

  const openMaintenanceRequest = (p: Passport) => {
    setSelectedPassport(p);
    setRequestForm({ maintenanceType: 'routine', description: '' });
    setShowRequest(true);
  };

  const openMaintenanceLog = (p: Passport) => {
    setSelectedPassport(p);
    setLogForm({ maintenanceType: 'routine', description: '', technician: '' });
    setShowLog(true);
  };

  const openAccident = (p: Passport) => {
    setSelectedPassport(p);
    setShowAccident(true);
  };

  const closeAll = () => {
    setShowRequest(false);
    setShowLog(false);
    setShowAccident(false);
    setSelectedPassport(null);
  };

  const submitRequest = async () => {
    if (!selectedPassport?.passportId) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      await api.post(`/maintenance/${selectedPassport.passportId}/request`, requestForm);
      closeAll();
      await fetchPassports();
    } catch (err) {
      const { toast, debug, category } = toastFromError(err);
      console.warn('[maintenance] mutation failed', { category, debug });
      setSubmitError(toast);
    } finally {
      setSubmitting(false);
    }
  };

  const submitLog = async () => {
    if (!selectedPassport?.passportId) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      await api.post(`/maintenance/${selectedPassport.passportId}/log`, logForm);
      closeAll();
      await fetchPassports();
    } catch (err) {
      const { toast, debug, category } = toastFromError(err);
      console.warn('[maintenance] mutation failed', { category, debug });
      setSubmitError(toast);
    } finally {
      setSubmitting(false);
    }
  };

  const submitAccident = async (data: AccidentFormData) => {
    if (!selectedPassport?.passportId) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      await api.post(`/maintenance/${selectedPassport.passportId}/accident`, data);
      closeAll();
      await fetchPassports();
    } catch (err) {
      const { toast, debug, category } = toastFromError(err);
      console.warn('[maintenance] mutation failed', { category, debug });
      setSubmitError(toast);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div data-page="maintenance" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* summary grid skeleton */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
          {[0, 1, 2, 3].map((i) => (
            <SkeletonCard key={i} lines={2} showTitle />
          ))}
        </div>
        {/* 테이블 skeleton */}
        <SkeletonTable rows={5} cols={8} />
      </div>
    );
  }

  return (
    <div data-page="maintenance" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <PageHead
        eyebrow="Service docket"
        eyebrowColor="var(--color-warning)"
        title="Tasks Docket"
        subtitle={docketSummary}
        actions={(
          <>
            <div className="sn-kpi-mini">
              <p className="sn-eyebrow" style={{ margin: '0 0 0.3rem' }}>현재 표시</p>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-text-1)', margin: 0 }}>{filteredPassports.length}</p>
            </div>
            <button onClick={fetchPassports} className="sn-btn sn-btn-ghost" style={{ flexShrink: 0 }}>
              새로고침
            </button>
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
              <p className="sn-eyebrow" style={{ margin: '0 0 0.4rem', color: 'var(--color-text-3)' }}>{docketScopeLabel}</p>
              <h2 className="sn-heading" style={{ margin: 0, fontSize: '1.25rem' }}>Task docket summary</h2>
              <p className="sn-caption" style={{ margin: '0.45rem 0 0', maxWidth: '46rem' }}>
                여권 조회 결과를 service log, incident log, 접수 후보 기준으로 정리합니다.
              </p>
            </div>
          </div>
        </div>

        <div className="sn-info-grid sn-info-grid-auto">
          <div className="sn-info-tile">
            <p className="sn-eyebrow" style={{ margin: '0 0 0.5rem', color: 'var(--color-success)' }}>Service logs</p>
            <p className="sn-info-tile-value" style={{ color: 'var(--color-success)' }}>{extStats.totalMaintenance}</p>
            <p className="sn-stat-note">누적 정비 이력</p>
          </div>
          <div className="sn-info-tile">
            <p className="sn-eyebrow" style={{ margin: '0 0 0.5rem', color: 'var(--color-danger)' }}>Incident logs</p>
            <p className="sn-info-tile-value" style={{ color: 'var(--color-danger)' }}>{extStats.totalAccident}</p>
            <p className="sn-stat-note">누적 사고 기록</p>
          </div>
          <div className="sn-info-tile">
            <p className="sn-eyebrow" style={{ margin: '0 0 0.5rem', color: extStats.urgentCount > 0 ? 'var(--color-danger)' : 'var(--color-text-3)' }}>
              Overdue tasks
            </p>
            <p className="sn-info-tile-value" style={{ color: extStats.urgentCount > 0 ? 'var(--color-danger)' : 'var(--color-text-1)' }}>
              {extStats.urgentCount}
            </p>
            <p className="sn-stat-note">정비 접수 7일 초과</p>
          </div>
          <div className="sn-info-tile">
            <p className="sn-eyebrow" style={{ margin: '0 0 0.5rem', color: 'var(--color-warning)' }}>Request candidates</p>
            <p className="sn-info-tile-value" style={{ color: 'var(--color-warning)' }}>{extStats.pendingPassports}</p>
            <p className="sn-stat-note">ACTIVE + VIN, 정비 이력 없음</p>
          </div>
        </div>

        <div className="sn-summary-grid sn-summary-grid-3" style={{ borderTop: '1px solid var(--color-border)' }}>
          <div className="sn-summary-lead">
            <p className="sn-eyebrow sn-summary-title" style={{ margin: '0 0 0.4rem' }}>Docket posture</p>
            <p className="sn-summary-copy-strong" style={{ margin: 0, color: 'var(--color-text-1)' }}>접수 · 완료 · 사고 기록</p>
            <p className="sn-stat-note" style={{ margin: '0.35rem 0 0', lineHeight: 1.6 }}>{docketSummary}</p>
          </div>
          <div>
            <p className="sn-eyebrow sn-stat-card-title">Service task queue</p>
            <p className="sn-metric sn-metric-md sn-stat-count">{tabCounts.maintenance}</p>
            <p className="sn-stat-note">MAINTENANCE 또는 ANALYSIS 상태</p>
          </div>
          <div>
            <p className="sn-eyebrow sn-stat-card-title">Incident docket</p>
            <p className="sn-metric sn-metric-md sn-stat-count">{tabCounts.accident}</p>
            <p className="sn-stat-note">사고 기록이 있는 여권</p>
          </div>
        </div>
      </section>

      <section className="sn-section-card" style={{ padding: '20px 22px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
          <div>
            <p className="sn-eyebrow" style={{ margin: '0 0 0.35rem', color: 'var(--color-text-3)' }}>Docket composition</p>
            <h2 className="sn-heading" style={{ margin: 0, fontSize: '1.125rem' }}>작업 유형과 기록 분포</h2>
          </div>
          <p className="sn-caption" style={{ margin: 0 }}>모든 수치는 현재 여권 조회 결과에서 계산합니다.</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(17rem, auto) 1fr', gap: 32, alignItems: 'start' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
            <DonutChart
              segments={donutSegments}
              size={150}
              thickness={18}
              centerValue={String(donutTotal)}
              centerLabel="docket"
            />
            <LegendStack items={donutSegments} />
          </div>
          <div>
            <p className="sn-eyebrow" style={{ margin: '0 0 12px', color: 'var(--color-text-3)' }}>
              Service type ledger
            </p>
            <BarRows items={maintenanceTypeBreakdown} />
          </div>
        </div>
      </section>

      {/* 평균 정비 간격 보조 행 */}
      {extStats.avgIntervalDays !== null && (
        <div className="sn-panel" style={{ padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--color-text-2)' }}>Average service interval</span>
          <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: '0.9375rem', fontWeight: 700, color: 'var(--color-text-1)' }}>
            {extStats.avgIntervalDays}일
          </span>
          <span style={{ fontSize: '0.875rem', color: 'var(--color-text-3)' }}>여권 생성일 → 최신 정비 기준</span>
        </div>
      )}

      <section className="sn-section-card">
        <div className="sn-section-head">
          <div className="sn-section-head-row">
            <div>
              <p className="sn-eyebrow" style={{ margin: '0 0 0.4rem', color: 'var(--color-text-3)' }}>Task queue</p>
              <h2 className="sn-heading" style={{ margin: 0, fontSize: '1.25rem' }}>Service docket files</h2>
              <p className="sn-caption" style={{ margin: '0.45rem 0 0', maxWidth: '44rem' }}>
                탭은 기존 상태 규칙 그대로 all, maintenance, accident docket을 나눕니다.
              </p>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              <span className="sn-detail-inline-stamp">표시 {filteredPassports.length}</span>
              <span className="sn-detail-inline-stamp">전체 docket {tabCounts.all}</span>
            </div>
          </div>
        </div>

        <div className="sn-filter-tabs" style={{ padding: '0 1.25rem' }}>
          {tabs.map((tab) => {
            const active = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className="sn-filter-tab"
                style={{
                  color: active ? 'var(--color-text-1)' : 'var(--color-text-3)',
                  borderBottomColor: active ? 'var(--color-text-1)' : 'transparent',
                  minHeight: 36,
                }}
              >
                {tab.label}
                <span className="sn-filter-tab-chip">{tabCounts[tab.key]}</span>
              </button>
            );
          })}
        </div>

        {filteredPassports.length === 0 ? (
          <div className="sn-empty-dashed" style={{ minHeight: 240, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
            <p className="sn-heading" style={{ fontSize: '1.125rem', margin: '0 0 0.5rem' }}>표시할 task docket 항목이 없습니다.</p>
            <p className="sn-caption" style={{ margin: '0 0 0.9rem', maxWidth: '38rem', textAlign: 'center' }}>
              현재 탭 조건에 해당하는 service task 또는 incident log가 없습니다.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '0.5rem' }}>
              <span className="sn-detail-inline-stamp">{docketScopeLabel}</span>
              <span className="sn-detail-inline-stamp">GET /api/passports</span>
            </div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="sn-table">
              <thead>
                <tr>
                  <th>Docket file</th>
                  <th>Model</th>
                  <th>Owner</th>
                  <th>VIN</th>
                  <th>Task state</th>
                  <th>Ledger evidence</th>
                  <th>Last service</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pagedPassports.map((p) => {
                  const badge = getStatusBadge(p.status || 'DISPOSED');
                  const mCount = p.maintenanceLogs?.length ?? 0;
                  const aCount = p.accidentLogs?.length ?? 0;
                  return (
                    <tr
                      key={p.passportId}
                      onClick={() => p.passportId && navigate(`/passports/${p.passportId}`)}
                      style={{ cursor: 'pointer' }}
                    >
                      <td>
                        <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: '0.875rem', color: 'var(--color-text-2)' }}>
                          {p.passportId}
                        </span>
                      </td>
                      <td>{p.model || '-'}</td>
                      <td style={{ color: 'var(--color-text-3)' }}>{p.manufacturerName || '-'}</td>
                      <td>
                        <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: '0.875rem', color: 'var(--color-text-3)' }}>
                          {p.vin || '미바인딩'}
                        </span>
                      </td>
                      <td>
                        <span className={`bp-stamp ${badge.bg} ${badge.text} ${badge.border}`}>{badge.label}</span>
                      </td>
                      <td style={{ color: 'var(--color-text-2)' }}>
                        {mCount > 0 && <span>Service {mCount}건 </span>}
                        {aCount > 0 && <span style={{ color: 'var(--color-danger)' }}>Incident {aCount}건</span>}
                        {mCount === 0 && aCount === 0 && <span style={{ color: 'var(--color-text-3)' }}>-</span>}
                      </td>
                      <td style={{ color: 'var(--color-text-3)', whiteSpace: 'nowrap', fontFamily: "'JetBrains Mono',monospace" }}>
                        {latestMaintenanceTimestamp(p.maintenanceLogs)}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: 6 }} onClick={(e) => e.stopPropagation()}>
                          {canRequestMaintenance && p.status === 'ACTIVE' && (
                            <button onClick={() => openMaintenanceRequest(p)} className="sn-btn-sm-secondary" style={{ minHeight: 36 }}>
                              작업 접수
                            </button>
                          )}
                          {canLogMaintenance && p.status === 'MAINTENANCE' && (
                            <button onClick={() => openMaintenanceLog(p)} className="sn-btn-sm-primary" style={{ minHeight: 36 }}>
                              완료 기록
                            </button>
                          )}
                          {canLogAccident && (
                            <button
                              onClick={() => openAccident(p)}
                              style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '6px 10px', minHeight: 36, fontSize: '0.9375rem', fontWeight: 700, background: 'var(--color-danger-soft)', color: 'var(--color-danger)', border: 'none', borderRadius: 8, cursor: 'pointer' }}
                            >
                              Incident
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

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
        )}
      </section>

      {/* REQUEST MODAL */}
      <BaseModal open={showRequest} onClose={closeAll} title="Service task 접수">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label className="sn-eyebrow" style={{ display: 'block', marginBottom: 6 }}>Task 유형</label>
            <select
              className="sn-input"
              value={requestForm.maintenanceType}
              onChange={(e) => setRequestForm({ ...requestForm, maintenanceType: e.target.value })}
            >
              {MAINTENANCE_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="sn-eyebrow" style={{ display: 'block', marginBottom: 6 }}>Task 설명</label>
            <textarea
              className="sn-input"
              rows={4}
              value={requestForm.description}
              onChange={(e) => setRequestForm({ ...requestForm, description: e.target.value })}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button onClick={closeAll} className="sn-btn sn-btn-ghost">취소</button>
            <button onClick={submitRequest} disabled={submitting} className="sn-btn sn-btn-accent">
              {submitting ? '등록 중...' : '접수 등록'}
            </button>
          </div>
        </div>
      </BaseModal>

      {/* LOG MODAL */}
      <BaseModal open={showLog} onClose={closeAll} title="Service task 완료 기록">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label className="sn-eyebrow" style={{ display: 'block', marginBottom: 6 }}>Task 유형</label>
            <select
              className="sn-input"
              value={logForm.maintenanceType}
              onChange={(e) => setLogForm({ ...logForm, maintenanceType: e.target.value })}
            >
              {MAINTENANCE_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="sn-eyebrow" style={{ display: 'block', marginBottom: 6 }}>Service 담당자</label>
            <input
              className="sn-input"
              value={logForm.technician}
              onChange={(e) => setLogForm({ ...logForm, technician: e.target.value })}
            />
          </div>
          <div>
            <label className="sn-eyebrow" style={{ display: 'block', marginBottom: 6 }}>완료 설명</label>
            <textarea
              className="sn-input"
              rows={4}
              value={logForm.description}
              onChange={(e) => setLogForm({ ...logForm, description: e.target.value })}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button onClick={closeAll} className="sn-btn sn-btn-ghost">취소</button>
            <button onClick={submitLog} disabled={submitting} className="sn-btn sn-btn-accent">
              {submitting ? '등록 중...' : '완료 기록'}
            </button>
          </div>
        </div>
      </BaseModal>

      {/* ACCIDENT MODAL */}
      <AccidentLogModal
        open={showAccident}
        submitting={submitting}
        initialReporter={userId || ''}
        onClose={closeAll}
        onSubmit={submitAccident}
      />
    </div>
  );
}
