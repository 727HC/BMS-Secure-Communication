import { useEffect, useMemo, useState } from 'react';
import Spinner from '../components/ui/Spinner';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { getStatusBadge } from '../lib/helpers';
import { SkeletonCard, SkeletonTable } from '../components/ui';
import BaseModal from '../components/modals/BaseModal';
import { AccidentLogModal, type AccidentFormData } from '../components/modals/maintenance';
import { DonutChart, BarRows, LegendStack } from '../components/ui';

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
      { label: '정기점검', value: counts.routine, color: '#10b981' },
      { label: '수리', value: counts.repair, color: 'var(--color-accent)' },
      { label: '리콜', value: counts.recall, color: '#f59e0b' },
      { label: '긴급', value: counts.emergency, color: '#ef4444' },
    ];
  }, [passports]);

  // 도넛 차트 데이터
  const donutSegments = useMemo(() => [
    { label: '정비 건수', value: extStats.totalMaintenance, color: '#10b981' },
    { label: '사고 건수', value: extStats.totalAccident, color: '#ef4444' },
    { label: '대기 여권', value: extStats.pendingPassports, color: '#f59e0b' },
  ], [extStats]);

  const donutTotal = extStats.totalMaintenance + extStats.totalAccident + extStats.pendingPassports;

  const tabs: { key: Tab; label: string }[] = [
    { key: 'all', label: '전체' },
    { key: 'maintenance', label: '정비·분석' },
    { key: 'accident', label: '사고기록' },
  ];

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
    try {
      await api.post(`/maintenance/${selectedPassport.passportId}/request`, requestForm);
      closeAll();
      await fetchPassports();
    } catch {
      // toast 생략
    } finally {
      setSubmitting(false);
    }
  };

  const submitLog = async () => {
    if (!selectedPassport?.passportId) return;
    setSubmitting(true);
    try {
      await api.post(`/maintenance/${selectedPassport.passportId}/log`, logForm);
      closeAll();
      await fetchPassports();
    } catch {
      // toast 생략
    } finally {
      setSubmitting(false);
    }
  };

  const submitAccident = async (data: AccidentFormData) => {
    if (!selectedPassport?.passportId) return;
    setSubmitting(true);
    try {
      await api.post(`/maintenance/${selectedPassport.passportId}/accident`, data);
      closeAll();
      await fetchPassports();
    } catch {
      // toast 생략
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="sn-page-head">
        <div className="sn-page-head-main">
          <p className="sn-eyebrow" style={{ margin: '0 0 0.35rem', color: 'var(--color-warning)' }}>정비 관리</p>
          <h1 className="sn-page-title">정비 관리</h1>
          <p className="sn-page-subtitle">정비 요청, 현장 처리, 사고 기록을 한 화면에서 관리합니다.</p>
        </div>
        <button onClick={fetchPassports} className="sn-btn sn-btn-ghost" style={{ flexShrink: 0 }}>
          새로고침
        </button>
      </div>

      {/* 정비 활동 구성 — 차트 2-col */}
      <div className="sn-panel" style={{ padding: '20px' }}>
        <p className="sn-eyebrow" style={{ margin: '0 0 16px', color: 'var(--color-text-2)' }}>정비 활동 구성</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          {/* 좌: 도넛 + 레전드 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <DonutChart
              segments={donutSegments}
              size={140}
              thickness={18}
              centerValue={String(donutTotal)}
              centerLabel="총계"
            />
            <LegendStack items={donutSegments} />
          </div>
          {/* 우: 정비 타입별 BarRows */}
          <div>
            <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text-3)', margin: '0 0 12px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              정비 유형별
            </p>
            <BarRows items={maintenanceTypeBreakdown} />
          </div>
        </div>
      </div>

      {/* 확장 summary grid */}
      <div className="sn-panel sn-summary-grid sn-summary-grid-4">
        <div className="sn-summary-lead">
          <p className="sn-eyebrow sn-summary-title">요약</p>
          <p className="sn-summary-copy-strong">정비와 사고 기록을 한곳에서 확인합니다</p>
          <p className="sn-summary-copy">
            {canRequestMaintenance && 'EV 제조사는 접수와 사고 기록을 올리고, '}
            {canLogMaintenance
              ? '정비 조직은 정비 완료와 이력 정리를 마감합니다.'
              : '정비 진행 상황과 사고 기록을 같은 화면에서 확인할 수 있습니다.'}
          </p>
        </div>
        <div>
          <p className="sn-eyebrow sn-stat-card-title">전체 정비 건수</p>
          <p className="sn-metric sn-metric-md sn-stat-count">{extStats.totalMaintenance}</p>
          <p className="sn-stat-note">누적 정비 이력</p>
        </div>
        <div>
          <p className="sn-eyebrow sn-stat-card-title" style={{ color: 'var(--color-danger)' }}>사고 건수</p>
          <p className="sn-metric sn-metric-md sn-stat-count" style={{ color: 'var(--color-danger)' }}>{extStats.totalAccident}</p>
          <p className="sn-stat-note">누적 사고 기록</p>
        </div>
        <div>
          <p className="sn-eyebrow sn-stat-card-title" style={{ color: extStats.urgentCount > 0 ? 'var(--color-danger)' : 'var(--color-text-3)' }}>
            긴급 대응 필요
          </p>
          <p className="sn-metric sn-metric-md sn-stat-count" style={{ color: extStats.urgentCount > 0 ? 'var(--color-danger)' : 'var(--color-text-2)' }}>
            {extStats.urgentCount}
          </p>
          <p className="sn-stat-note">정비 접수 7일 초과</p>
        </div>
      </div>

      {/* 평균 정비 간격 보조 행 */}
      {extStats.avgIntervalDays !== null && (
        <div className="sn-panel" style={{ padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--color-text-2)' }}>평균 정비 간격</span>
          <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: '0.9375rem', fontWeight: 700, color: 'var(--color-text-1)' }}>
            {extStats.avgIntervalDays}일
          </span>
          <span style={{ fontSize: '0.875rem', color: 'var(--color-text-3)' }}>여권 생성일 → 최신 정비 기준</span>
        </div>
      )}

      <div className="sn-filter-tabs" style={{ paddingBottom: 0 }}>
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
        <div className="sn-panel" style={{ overflow: 'hidden' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem 1.5rem' }}>
            <div style={{ width: 56, height: 56, borderRadius: 12, background: 'var(--color-surface-alt)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
              <svg width="28" height="28" fill="none" stroke="var(--color-text-3)" strokeWidth="1.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--color-text-1)', margin: '0 0 8px' }}>표시할 항목이 없습니다</h3>
            <p style={{ fontSize: '0.9375rem', color: 'var(--color-text-3)', textAlign: 'center', maxWidth: '28rem', margin: '0 0 20px' }}>
              현재 탭 조건에 해당하는 정비·사고 이력이 없습니다.
            </p>
            <div style={{ padding: '16px', background: 'var(--color-surface-alt)', borderRadius: 10, border: '1px solid var(--color-border)', maxWidth: '32rem', width: '100%' }}>
              <p style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--color-text-2)', margin: '0 0 6px' }}>정비·사고 이력 관리</p>
              <p style={{ fontSize: '0.9375rem', color: 'var(--color-text-3)', margin: 0, lineHeight: 1.6 }}>
                xEV 배터리 정비 및 사고 이력을 블록체인에 기록하여 불변의 감사 추적을 확보합니다.
                정비 요청부터 완료까지의 이력, 사고 발생 내역이 여기에 축적됩니다.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="sn-panel" style={{ overflow: 'hidden' }}>
          <table className="sn-table">
            <thead>
              <tr>
                <th>여권 ID</th>
                <th>모델</th>
                <th>제조사</th>
                <th>VIN</th>
                <th>상태</th>
                <th>이력</th>
                <th>최근 정비</th>
                <th style={{ textAlign: 'right' }}>조치</th>
              </tr>
            </thead>
            <tbody>
              {filteredPassports.map((p) => {
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
                      {mCount > 0 && <span>정비 {mCount}건 </span>}
                      {aCount > 0 && <span style={{ color: 'var(--color-danger)' }}>사고 {aCount}건</span>}
                      {mCount === 0 && aCount === 0 && <span style={{ color: 'var(--color-text-3)' }}>-</span>}
                    </td>
                    <td style={{ color: 'var(--color-text-3)', whiteSpace: 'nowrap', fontFamily: "'JetBrains Mono',monospace" }}>
                      {latestMaintenanceTimestamp(p.maintenanceLogs)}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: 6 }} onClick={(e) => e.stopPropagation()}>
                        {canRequestMaintenance && p.status === 'ACTIVE' && (
                          <button onClick={() => openMaintenanceRequest(p)} className="sn-btn-sm-secondary" style={{ minHeight: 36 }}>
                            요청
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
                            사고
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* REQUEST MODAL */}
      <BaseModal open={showRequest} onClose={closeAll} title="정비 요청">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label className="sn-eyebrow" style={{ display: 'block', marginBottom: 6 }}>정비 유형</label>
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
            <label className="sn-eyebrow" style={{ display: 'block', marginBottom: 6 }}>설명</label>
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
              {submitting ? '등록 중...' : '등록'}
            </button>
          </div>
        </div>
      </BaseModal>

      {/* LOG MODAL */}
      <BaseModal open={showLog} onClose={closeAll} title="정비 완료 기록">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label className="sn-eyebrow" style={{ display: 'block', marginBottom: 6 }}>정비 유형</label>
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
            <label className="sn-eyebrow" style={{ display: 'block', marginBottom: 6 }}>담당자</label>
            <input
              className="sn-input"
              value={logForm.technician}
              onChange={(e) => setLogForm({ ...logForm, technician: e.target.value })}
            />
          </div>
          <div>
            <label className="sn-eyebrow" style={{ display: 'block', marginBottom: 6 }}>설명</label>
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
