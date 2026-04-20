import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { getStatusBadge } from '../lib/helpers';
import Spinner from '../components/ui/Spinner';
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

  if (loading) return <Spinner />;

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
          <p className="sn-eyebrow sn-stat-card-title">접수 포함</p>
          <p className="sn-stat-count">{tabCounts.all}</p>
          <p className="sn-stat-note">확인할 항목</p>
        </div>
        <div>
          <p className="sn-eyebrow sn-stat-card-title" style={{ color: 'var(--color-warning)' }}>정비·분석</p>
          <p className="sn-stat-count" style={{ color: 'var(--color-warning)' }}>{tabCounts.maintenance}</p>
          <p className="sn-stat-note">현재 확인 대상</p>
        </div>
        <div>
          <p className="sn-eyebrow sn-stat-card-title" style={{ color: 'var(--color-danger)' }}>사고기록</p>
          <p className="sn-stat-count" style={{ color: 'var(--color-danger)' }}>{tabCounts.accident}</p>
          <p className="sn-stat-note">사고 기록</p>
        </div>
      </div>

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
              }}
            >
              {tab.label}
              <span className="sn-filter-tab-chip">{tabCounts[tab.key]}</span>
            </button>
          );
        })}
      </div>

      {filteredPassports.length === 0 ? (
        <div className="sn-empty-dashed">
          <p className="sn-caption">표시할 항목이 없습니다.</p>
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
                      <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: '0.8125rem', color: 'var(--color-text-2)' }}>
                        {p.passportId}
                      </span>
                    </td>
                    <td>{p.model || '-'}</td>
                    <td style={{ color: 'var(--color-text-3)' }}>{p.manufacturerName || '-'}</td>
                    <td>
                      <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: '0.8125rem', color: 'var(--color-text-3)' }}>
                        {p.vin || '미바인딩'}
                      </span>
                    </td>
                    <td>
                      <span className={`bp-stamp ${badge.bg} ${badge.text} ${badge.border}`}>{badge.label}</span>
                    </td>
                    <td style={{ fontSize: '0.8125rem', color: 'var(--color-text-2)' }}>
                      {mCount > 0 && <span>정비 {mCount}건 </span>}
                      {aCount > 0 && <span style={{ color: 'var(--color-danger)' }}>사고 {aCount}건</span>}
                      {mCount === 0 && aCount === 0 && <span style={{ color: 'var(--color-text-3)' }}>-</span>}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: 6 }} onClick={(e) => e.stopPropagation()}>
                        {canRequestMaintenance && p.status === 'ACTIVE' && (
                          <button onClick={() => openMaintenanceRequest(p)} className="sn-btn-sm-secondary">
                            요청
                          </button>
                        )}
                        {canLogMaintenance && p.status === 'MAINTENANCE' && (
                          <button onClick={() => openMaintenanceLog(p)} className="sn-btn-sm-primary">
                            완료 기록
                          </button>
                        )}
                        {canLogAccident && (
                          <button
                            onClick={() => openAccident(p)}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '6px 10px', fontSize: 13, fontWeight: 700, background: 'var(--color-danger-soft)', color: 'var(--color-danger)', border: 'none', borderRadius: 8, cursor: 'pointer' }}
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
