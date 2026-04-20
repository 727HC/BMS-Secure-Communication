import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { getStatusBadge } from '../lib/helpers';
import Spinner from '../components/ui/Spinner';
import BaseModal from '../components/modals/BaseModal';
import { ExtractModal, RecycleToggleModal, type ExtractEntry } from '../components/modals/recycling';

interface Passport {
  passportId?: string;
  status?: string;
  model?: string;
  manufacturerName?: string;
  vin?: string;
  recycleAvailable?: boolean;
  soh?: number;
  soce?: number;
  remainingLifeCycle?: number;
  recyclingRates?: Record<string, number>;
  [key: string]: unknown;
}

type Tab = 'all' | 'recyclable' | 'recycling' | 'disposed';

function isRecyclingRelated(p: Passport): boolean {
  return (
    p.recycleAvailable === true ||
    p.status === 'ACTIVE' ||
    p.status === 'ANALYSIS' ||
    p.status === 'RECYCLING' ||
    p.status === 'DISPOSED' ||
    (p.recyclingRates != null && Object.keys(p.recyclingRates).length > 0)
  );
}

function avg(nums: number[]): number | null {
  if (nums.length === 0) return null;
  return Math.round(nums.reduce((a, b) => a + b, 0) / nums.length);
}

export default function RecyclingPage() {
  const navigate = useNavigate();
  const { org } = useAuth();
  const isEVManufacturer = org === 'EVManufacturerMSP';
  const isService = org === 'ServiceMSP';
  const isRegulator = org === 'RegulatorMSP';
  const canRequestAnalysis = isEVManufacturer;
  const canSubmitAnalysis = isService;
  const canToggleRecycle = isService || isRegulator;
  const canExtract = isRegulator;
  const canDispose = isRegulator;

  const [passports, setPassports] = useState<Passport[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('all');
  const [submitting, setSubmitting] = useState(false);
  const [selectedPassport, setSelectedPassport] = useState<Passport | null>(null);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [showToggle, setShowToggle] = useState(false);
  const [showExtract, setShowExtract] = useState(false);
  const [showDispose, setShowDispose] = useState(false);

  const [analysisForm, setAnalysisForm] = useState({
    soh: '',
    soce: '',
    remainingLifeCycle: '',
    recycleAvailable: false,
  });
  const [recycleToggleInitialValue, setRecycleToggleInitialValue] = useState(false);

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

  const filteredPassports = useMemo(() => {
    if (activeTab === 'recyclable') return passports.filter((p) => p.recycleAvailable === true);
    if (activeTab === 'recycling') return passports.filter((p) => p.status === 'RECYCLING');
    if (activeTab === 'disposed') return passports.filter((p) => p.status === 'DISPOSED');
    return passports.filter(isRecyclingRelated);
  }, [passports, activeTab]);

  const tabCounts = {
    all: passports.filter(isRecyclingRelated).length,
    recyclable: passports.filter((p) => p.recycleAvailable === true).length,
    recycling: passports.filter((p) => p.status === 'RECYCLING').length,
    disposed: passports.filter((p) => p.status === 'DISPOSED').length,
  };

  const tabs: { key: Tab; label: string }[] = [
    { key: 'all', label: '전체' },
    { key: 'recyclable', label: '재활용가능' },
    { key: 'recycling', label: '재활용중' },
    { key: 'disposed', label: '폐기완료' },
  ];

  // 평균 SOH / 잔존수명
  const avgSoh = useMemo(() => {
    const vals = passports.filter(isRecyclingRelated).map((p) => p.soh).filter((v): v is number => v != null);
    return avg(vals);
  }, [passports]);

  const avgRemaining = useMemo(() => {
    const vals = passports.filter(isRecyclingRelated).map((p) => p.remainingLifeCycle).filter((v): v is number => v != null);
    return avg(vals);
  }, [passports]);

  // 전체 recyclingRates 원소별 평균
  const avgRates = useMemo(() => {
    const totals: Record<string, number[]> = {};
    for (const p of passports) {
      if (!p.recyclingRates) continue;
      for (const [k, v] of Object.entries(p.recyclingRates)) {
        if (!totals[k]) totals[k] = [];
        totals[k].push(v);
      }
    }
    return Object.entries(totals)
      .map(([k, vs]) => ({ element: k, avg: Math.round(vs.reduce((a, b) => a + b, 0) / vs.length) }))
      .sort((a, b) => b.avg - a.avg);
  }, [passports]);

  const closeAll = () => {
    setShowAnalysis(false);
    setShowToggle(false);
    setShowExtract(false);
    setShowDispose(false);
    setSelectedPassport(null);
  };

  const requestAnalysis = async (passport: Passport) => {
    if (!passport.passportId) return;
    try {
      await api.post(`/analysis/${passport.passportId}/request`, {});
      await fetchPassports();
    } catch { /* toast 생략 */ }
  };

  const openAnalysisResult = (p: Passport) => {
    setSelectedPassport(p);
    setAnalysisForm({ soh: '', soce: '', remainingLifeCycle: '', recycleAvailable: false });
    setShowAnalysis(true);
  };

  const submitAnalysisResult = async () => {
    if (!selectedPassport?.passportId) return;
    setSubmitting(true);
    try {
      await api.post(`/analysis/${selectedPassport.passportId}/result`, {
        soh: Number(analysisForm.soh),
        soce: Number(analysisForm.soce),
        remainingLifeCycle: Number(analysisForm.remainingLifeCycle),
        recycleAvailable: analysisForm.recycleAvailable,
      });
      closeAll();
      await fetchPassports();
    } catch { /* noop */ }
    finally { setSubmitting(false); }
  };

  const openRecycleToggle = (p: Passport) => {
    setSelectedPassport(p);
    setRecycleToggleInitialValue(p.recycleAvailable || false);
    setShowToggle(true);
  };

  const submitRecycleToggle = async (available: boolean) => {
    if (!selectedPassport?.passportId) return;
    setSubmitting(true);
    try {
      await api.put(`/recycling/${selectedPassport.passportId}/availability`, { available });
      closeAll();
      await fetchPassports();
    } catch { /* noop */ }
    finally { setSubmitting(false); }
  };

  const openExtract = (p: Passport) => {
    setSelectedPassport(p);
    setShowExtract(true);
  };

  const submitExtract = async (entries: ExtractEntry[]) => {
    if (!selectedPassport?.passportId) return;
    setSubmitting(true);
    try {
      const recyclingRates: Record<string, number> = {};
      entries.forEach((e) => {
        if (e.key.trim()) recyclingRates[e.key.trim()] = Number(e.value);
      });
      await api.post(`/recycling/${selectedPassport.passportId}/extract`, { recyclingRates });
      closeAll();
      await fetchPassports();
    } catch { /* noop */ }
    finally { setSubmitting(false); }
  };

  const openDispose = (p: Passport) => {
    setSelectedPassport(p);
    setShowDispose(true);
  };

  const submitDispose = async () => {
    if (!selectedPassport?.passportId) return;
    setSubmitting(true);
    try {
      await api.post(`/recycling/${selectedPassport.passportId}/dispose`, {});
      closeAll();
      await fetchPassports();
    } catch { /* noop */ }
    finally { setSubmitting(false); }
  };

  if (loading) return <Spinner />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="sn-page-head">
        <div className="sn-page-head-main">
          <p className="sn-eyebrow" style={{ margin: '0.5rem 0 0.35rem', color: 'var(--color-accent)' }}>재활용 처리</p>
          <h1 className="sn-page-title">재활용 처리</h1>
          <p className="sn-page-subtitle">분석 요청부터 추출·폐기까지 단계별로 관리합니다.</p>
        </div>
        <button onClick={fetchPassports} className="sn-btn sn-btn-ghost" style={{ fontSize: '0.875rem', flexShrink: 0 }}>
          새로고침
        </button>
      </div>

      {/* 확장 summary grid: 5 카드 */}
      <div className="sn-panel" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.75rem', padding: '0.9rem 1rem' }}>
        <div style={{ padding: '0.75rem', background: 'var(--color-surface-alt)', borderRadius: '0.5rem' }}>
          <p className="sn-eyebrow sn-stat-card-title" style={{ margin: '0 0 0.25rem' }}>재활용 가능</p>
          <p className="sn-stat-count" style={{ color: 'var(--color-success)' }}>{tabCounts.recyclable}</p>
          <p className="sn-stat-note">판정 완료</p>
        </div>
        <div style={{ padding: '0.75rem', background: 'var(--color-surface-alt)', borderRadius: '0.5rem' }}>
          <p className="sn-eyebrow sn-stat-card-title" style={{ margin: '0 0 0.25rem', color: 'var(--color-accent)' }}>재활용 중</p>
          <p className="sn-stat-count" style={{ color: 'var(--color-accent)' }}>{tabCounts.recycling}</p>
          <p className="sn-stat-note">현재 처리 중</p>
        </div>
        <div style={{ padding: '0.75rem', background: 'var(--color-surface-alt)', borderRadius: '0.5rem' }}>
          <p className="sn-eyebrow sn-stat-card-title" style={{ margin: '0 0 0.25rem', color: 'var(--color-text-2)' }}>폐기 완료</p>
          <p className="sn-stat-count" style={{ color: 'var(--color-text-2)' }}>{tabCounts.disposed}</p>
          <p className="sn-stat-note">누적</p>
        </div>
        <div style={{ padding: '0.75rem', background: 'var(--color-surface-alt)', borderRadius: '0.5rem' }}>
          <p className="sn-eyebrow sn-stat-card-title" style={{ margin: '0 0 0.25rem' }}>평균 SOH</p>
          <p className="sn-stat-count">{avgSoh != null ? `${avgSoh}%` : '-'}</p>
          <p className="sn-stat-note">관리 대상 기준</p>
        </div>
        <div style={{ padding: '0.75rem', background: 'var(--color-surface-alt)', borderRadius: '0.5rem' }}>
          <p className="sn-eyebrow sn-stat-card-title" style={{ margin: '0 0 0.25rem' }}>평균 잔존수명</p>
          <p className="sn-stat-count">{avgRemaining != null ? `${avgRemaining}사이클` : '-'}</p>
          <p className="sn-stat-note">관리 대상 기준</p>
        </div>
      </div>

      {/* 재활용률 구성 분석 */}
      {avgRates.length > 0 && (
        <div className="sn-panel" style={{ padding: '0.9rem 1rem' }}>
          <p className="sn-eyebrow" style={{ margin: '0 0 0.6rem' }}>재활용률 구성 분석 — 전체 여권 원소별 평균</p>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
            {avgRates.map(({ element, avg: rate }) => (
              <span
                key={element}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '4px 12px',
                  borderRadius: 20,
                  background: 'var(--color-surface-alt)',
                  border: '1px solid var(--color-border)',
                  fontSize: '0.8125rem',
                  color: 'var(--color-text-1)',
                  fontWeight: 600,
                }}
              >
                {element}
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-3)', fontWeight: 400 }}>{rate}%</span>
              </span>
            ))}
          </div>
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
                <th>상태</th>
                <th style={{ textAlign: 'right' }}>SOH</th>
                <th>재활용</th>
                <th>재활용률</th>
                <th style={{ textAlign: 'right' }}>조치</th>
              </tr>
            </thead>
            <tbody>
              {filteredPassports.map((p) => {
                const badge = getStatusBadge(p.status || 'DISPOSED');
                const sohColor = p.soh == null ? 'var(--color-text-3)' : p.soh > 80 ? '#059669' : p.soh >= 50 ? '#d97706' : '#dc2626';
                const rateEntries = p.recyclingRates ? Object.entries(p.recyclingRates).slice(0, 4) : [];
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
                    <td>
                      <span className={`bp-stamp ${badge.bg} ${badge.text} ${badge.border}`}>{badge.label}</span>
                    </td>
                    <td style={{ textAlign: 'right', fontFamily: "'JetBrains Mono',monospace", fontSize: '0.8125rem', color: sohColor, fontWeight: 700 }}>
                      {p.soh != null ? `${p.soh}%` : '-'}
                    </td>
                    <td>
                      {p.recycleAvailable ? (
                        <span className="bp-stamp bp-status-recycling">가능</span>
                      ) : (
                        <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-3)' }}>미판정</span>
                      )}
                    </td>
                    <td>
                      {rateEntries.length > 0 ? (
                        <span style={{ display: 'inline-flex', flexWrap: 'wrap', gap: 4 }}>
                          {rateEntries.map(([el, rate]) => (
                            <span
                              key={el}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 2,
                                padding: '2px 7px',
                                borderRadius: 12,
                                background: 'var(--color-surface-alt)',
                                border: '1px solid var(--color-border)',
                                fontSize: '0.75rem',
                                color: 'var(--color-text-2)',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              <span style={{ fontWeight: 600, color: 'var(--color-text-1)' }}>{el}</span>
                              {rate}%
                            </span>
                          ))}
                        </span>
                      ) : (
                        <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-3)' }}>-</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: 6 }} onClick={(e) => e.stopPropagation()}>
                        {canRequestAnalysis && p.status === 'ACTIVE' && (
                          <button onClick={() => requestAnalysis(p)} className="sn-btn-sm-secondary">분석 요청</button>
                        )}
                        {canSubmitAnalysis && p.status === 'ANALYSIS' && (
                          <button onClick={() => openAnalysisResult(p)} className="sn-btn-sm-primary">결과 제출</button>
                        )}
                        {canToggleRecycle && (
                          <button onClick={() => openRecycleToggle(p)} className="sn-btn-sm-secondary">재활용 판정</button>
                        )}
                        {canExtract && p.recycleAvailable && p.status !== 'DISPOSED' && (
                          <button onClick={() => openExtract(p)} className="sn-btn-sm-secondary">추출</button>
                        )}
                        {canDispose && p.status !== 'DISPOSED' && (
                          <button
                            onClick={() => openDispose(p)}
                            style={{ display: 'inline-flex', padding: '6px 10px', fontSize: 13, fontWeight: 700, background: 'var(--color-danger-soft)', color: 'var(--color-danger)', border: 'none', borderRadius: 8, cursor: 'pointer' }}
                          >
                            폐기
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

      {/* Analysis Result Modal */}
      <BaseModal open={showAnalysis} onClose={closeAll} title="분석 결과 제출">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label className="sn-eyebrow" style={{ display: 'block', marginBottom: 6 }}>SOH (%)</label>
              <input
                type="number"
                value={analysisForm.soh}
                onChange={(e) => setAnalysisForm({ ...analysisForm, soh: e.target.value })}
                className="sn-input"
              />
            </div>
            <div>
              <label className="sn-eyebrow" style={{ display: 'block', marginBottom: 6 }}>SOCE (%)</label>
              <input
                type="number"
                value={analysisForm.soce}
                onChange={(e) => setAnalysisForm({ ...analysisForm, soce: e.target.value })}
                className="sn-input"
              />
            </div>
          </div>
          <div>
            <label className="sn-eyebrow" style={{ display: 'block', marginBottom: 6 }}>잔여 사이클</label>
            <input
              type="number"
              value={analysisForm.remainingLifeCycle}
              onChange={(e) => setAnalysisForm({ ...analysisForm, remainingLifeCycle: e.target.value })}
              className="sn-input"
            />
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: 'var(--color-text-2)' }}>
            <input
              type="checkbox"
              checked={analysisForm.recycleAvailable}
              onChange={(e) => setAnalysisForm({ ...analysisForm, recycleAvailable: e.target.checked })}
            />
            재활용 가능 판정
          </label>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button onClick={closeAll} className="sn-btn sn-btn-ghost">취소</button>
            <button onClick={submitAnalysisResult} disabled={submitting} className="sn-btn sn-btn-accent">
              {submitting ? '제출 중...' : '제출'}
            </button>
          </div>
        </div>
      </BaseModal>

      {/* Recycle Toggle Modal */}
      <RecycleToggleModal
        open={showToggle}
        initialValue={recycleToggleInitialValue}
        submitting={submitting}
        onClose={closeAll}
        onSubmit={submitRecycleToggle}
      />

      {/* Extract Modal */}
      <ExtractModal
        open={showExtract}
        submitting={submitting}
        onClose={closeAll}
        onSubmit={submitExtract}
      />

      {/* Dispose Confirm Modal */}
      <BaseModal open={showDispose} onClose={closeAll} title="폐기 처리 확인">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <p style={{ fontSize: 15, color: 'var(--color-text-2)' }}>
            이 여권을 폐기 상태로 전환합니다. 이 작업은 되돌릴 수 없습니다.
          </p>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button onClick={closeAll} className="sn-btn sn-btn-ghost">취소</button>
            <button onClick={submitDispose} disabled={submitting} className="sn-btn sn-btn-danger">
              {submitting ? '처리 중...' : '폐기 확정'}
            </button>
          </div>
        </div>
      </BaseModal>
    </div>
  );
}
