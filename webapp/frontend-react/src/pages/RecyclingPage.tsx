import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { getStatusBadge } from '../lib/helpers';
import { BarRows, PageHead, SkeletonCard, SkeletonTable } from '../components/ui';
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

function hasRecoveryRates(p: Passport): boolean {
  return p.recyclingRates != null && Object.keys(p.recyclingRates).length > 0;
}

function getLifecycleStage(p: Passport): string {
  if (p.status === 'DISPOSED') return '폐기 승인 완료';
  if (p.status === 'RECYCLING') return '회수·추출 진행';
  if (hasRecoveryRates(p)) return '추출 근거 기록';
  if (p.recycleAvailable) return '회수 가능 판정';
  if (p.status === 'ANALYSIS') return '분석 결과 대기';
  if (p.status === 'ACTIVE') return '분석 요청 가능';
  return '전주기 감시';
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

  const tabs: { key: Tab; label: string; hint: string }[] = [
    { key: 'all', label: '전체', hint: 'lifecycle files' },
    { key: 'recyclable', label: '재활용가능', hint: 'ready' },
    { key: 'recycling', label: '재활용중', hint: 'in recovery' },
    { key: 'disposed', label: '폐기완료', hint: 'authorized' },
  ];

  const avgSoh = useMemo(() => {
    const vals = passports.filter(isRecyclingRelated).map((p) => p.soh).filter((v): v is number => v != null);
    return avg(vals);
  }, [passports]);

  const avgRemaining = useMemo(() => {
    const vals = passports.filter(isRecyclingRelated).map((p) => p.remainingLifeCycle).filter((v): v is number => v != null);
    return avg(vals);
  }, [passports]);

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

  const lifecycleMetrics = useMemo(() => {
    const lifecycleFiles = passports.filter(isRecyclingRelated);
    const analysisQueue = passports.filter((p) => p.status === 'ANALYSIS').length;
    const activeCandidates = passports.filter((p) => p.status === 'ACTIVE').length;
    const extractionEvidence = passports.filter(hasRecoveryRates).length;
    const readyRatio = lifecycleFiles.length > 0 ? Math.round((tabCounts.recyclable / lifecycleFiles.length) * 100) : 0;
    return { lifecycleFiles, analysisQueue, activeCandidates, extractionEvidence, readyRatio };
  }, [passports, tabCounts.recyclable]);

  const lifecycleBreakdown = [
    { label: '분석 요청 후보', value: lifecycleMetrics.activeCandidates, color: 'var(--color-warning)' },
    { label: '분석 결과 대기', value: lifecycleMetrics.analysisQueue, color: 'var(--color-accent)' },
    { label: '회수 가능 판정', value: tabCounts.recyclable, color: 'var(--color-success)' },
    { label: '재활용 진행', value: tabCounts.recycling, color: 'var(--color-accent)' },
    { label: '폐기 승인 완료', value: tabCounts.disposed, color: 'var(--color-text-3)' },
  ];

  const deskLabel = isEVManufacturer
    ? 'EV manufacturer analysis request desk'
    : isService
      ? 'Service analysis desk'
      : isRegulator
        ? 'Regulator recovery authority'
        : 'Lifecycle register view';

  const pageSummary = isEVManufacturer
    ? 'EV 제조사는 운행 중인 여권을 분석 요청으로 넘기고 회수 준비 상태를 같은 ESG 등록부에서 확인합니다.'
    : isService
      ? '정비·분석 조직은 분석 결과와 재활용 가능 판정을 제출해 회수 준비 근거를 남깁니다.'
      : isRegulator
        ? '검증기관은 회수 가능 여권의 소재 추출 근거와 폐기 승인을 lifecycle register 기준으로 관리합니다.'
        : '조직 권한 안에서 전주기 회수 준비도, 추출 근거, 폐기 승인 상태를 확인합니다.';

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

  if (loading) {
    return (
      <div data-page="recycling" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.75rem' }}>
          {[0, 1, 2, 3, 4].map((i) => (
            <SkeletonCard key={i} lines={2} showTitle />
          ))}
        </div>
        <SkeletonTable rows={5} cols={7} />
      </div>
    );
  }

  return (
    <div data-page="recycling" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <PageHead
        eyebrow="Lifecycle register"
        eyebrowColor="var(--color-success)"
        title="Recycling & ESG"
        subtitle={pageSummary}
        actions={(
          <>
            <div className="sn-kpi-mini">
              <p className="sn-eyebrow" style={{ margin: '0 0 0.3rem' }}>현재 표시</p>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-text-1)', margin: 0 }}>
                {filteredPassports.length}
              </p>
            </div>
            <button onClick={fetchPassports} className="sn-btn sn-btn-ghost" style={{ flexShrink: 0 }}>
              새로고침
            </button>
          </>
        )}
      />

      <section className="sn-section-card">
        <div className="sn-section-head">
          <div className="sn-section-head-row">
            <div>
              <p className="sn-eyebrow" style={{ margin: '0 0 0.4rem', color: 'var(--color-text-3)' }}>{deskLabel}</p>
              <h2 className="sn-heading" style={{ margin: 0, fontSize: '1.25rem' }}>Lifecycle filing summary</h2>
              <p className="sn-caption" style={{ margin: '0.45rem 0 0', maxWidth: '48rem' }}>
                여권 필드의 SOH, 잔존 수명, 회수 가능 판정, 원소별 추출률을 기준으로 ESG 회수 준비 상태를 계산합니다.
              </p>
            </div>
            <span className="sn-detail-inline-stamp">GET /api/passports</span>
          </div>
        </div>

        <div className="sn-info-grid sn-info-grid-auto">
          <div className="sn-info-tile">
            <p className="sn-eyebrow" style={{ margin: '0 0 0.5rem', color: 'var(--color-success)' }}>회수 가능</p>
            <p className="sn-info-tile-value" style={{ color: 'var(--color-success)' }}>{tabCounts.recyclable}</p>
            <p className="sn-stat-note">재활용 가능 판정 파일</p>
          </div>
          <div className="sn-info-tile">
            <p className="sn-eyebrow" style={{ margin: '0 0 0.5rem', color: 'var(--color-accent)' }}>재활용 진행</p>
            <p className="sn-info-tile-value" style={{ color: 'var(--color-accent)' }}>{tabCounts.recycling}</p>
            <p className="sn-stat-note">현재 회수·추출 상태</p>
          </div>
          <div className="sn-info-tile">
            <p className="sn-eyebrow" style={{ margin: '0 0 0.5rem' }}>평균 SOH</p>
            <p className="sn-info-tile-value">{avgSoh != null ? `${avgSoh}%` : '-'}</p>
            <p className="sn-stat-note">lifecycle 대상 기준</p>
          </div>
          <div className="sn-info-tile">
            <p className="sn-eyebrow" style={{ margin: '0 0 0.5rem' }}>평균 잔존수명</p>
            <p className="sn-info-tile-value">{avgRemaining != null ? `${avgRemaining.toLocaleString('ko-KR')}` : '-'}</p>
            <p className="sn-stat-note">cycle register value</p>
          </div>
        </div>

        <div className="sn-summary-grid sn-summary-grid-3" style={{ borderBottom: '1px solid var(--color-border)' }}>
          <div className="sn-summary-lead">
            <p className="sn-eyebrow sn-summary-title">Recovery readiness</p>
            <p className="sn-summary-copy-strong" style={{ margin: 0 }}>회수 준비율 {lifecycleMetrics.readyRatio}%</p>
            <p className="sn-stat-note" style={{ marginTop: '0.45rem', lineHeight: 1.6 }}>
              전체 lifecycle 파일 중 재활용 가능 판정이 끝난 여권 비율입니다.
            </p>
          </div>
          <div>
            <p className="sn-eyebrow sn-stat-card-title">추출 근거</p>
            <p className="sn-summary-copy-strong" style={{ fontFamily: 'var(--font-mono)', margin: 0 }}>{lifecycleMetrics.extractionEvidence}</p>
            <p className="sn-stat-note">recyclingRates 보유 파일</p>
          </div>
          <div>
            <p className="sn-eyebrow sn-stat-card-title">폐기 승인</p>
            <p className="sn-summary-copy-strong" style={{ fontFamily: 'var(--font-mono)', margin: 0 }}>{tabCounts.disposed}</p>
            <p className="sn-stat-note">DISPOSED 상태 파일</p>
          </div>
        </div>
      </section>

      <section className="sn-section-card" style={{ padding: '20px 22px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 0.85fr) minmax(260px, 1.15fr)', gap: '1.25rem', alignItems: 'start' }}>
          <div>
            <p className="sn-eyebrow" style={{ margin: '0 0 0.4rem', color: 'var(--color-text-3)' }}>ESG lifecycle distribution</p>
            <h2 className="sn-heading" style={{ margin: '0 0 0.55rem', fontSize: '1.125rem' }}>회수 단계 분포</h2>
            <p className="sn-caption" style={{ margin: 0 }}>
              상태값과 회수 판정 필드만 사용해 분석 요청 후보부터 폐기 승인까지의 등록부 흐름을 보여줍니다.
            </p>
          </div>
          <BarRows
            items={lifecycleBreakdown.map(({ label, value, color }) => ({ label, value, color }))}
            max={Math.max(...lifecycleBreakdown.map((item) => item.value), 1)}
          />
        </div>
      </section>

      {avgRates.length > 0 && (
        <section className="sn-section-card" style={{ padding: '20px 22px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 0.85fr) minmax(260px, 1.15fr)', gap: '1.25rem', alignItems: 'start' }}>
            <div>
              <p className="sn-eyebrow" style={{ margin: '0 0 0.4rem', color: 'var(--color-text-3)' }}>Extraction evidence</p>
              <h2 className="sn-heading" style={{ margin: '0 0 0.55rem', fontSize: '1.125rem' }}>원소별 평균 회수율</h2>
              <p className="sn-caption" style={{ margin: 0 }}>
                Regulator 추출 기록의 `recyclingRates`를 원소별 평균으로 집계합니다.
              </p>
            </div>
            <BarRows
              items={avgRates.map(({ element, avg: rate }) => ({ label: element, value: rate, hint: '%' }))}
              max={100}
            />
          </div>
        </section>
      )}

      <section className="sn-section-card">
        <div className="sn-section-head">
          <div className="sn-section-head-row">
            <div>
              <p className="sn-eyebrow" style={{ margin: '0 0 0.4rem', color: 'var(--color-text-3)' }}>Lifecycle tabs</p>
              <h2 className="sn-heading" style={{ margin: 0, fontSize: '1.25rem' }}>ESG 회수 등록부</h2>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              <span className="sn-detail-inline-stamp">표시 {filteredPassports.length}</span>
              <span className="sn-detail-inline-stamp">전체 {tabCounts.all}</span>
              <span className="sn-detail-inline-stamp">권한 {org || 'unknown'}</span>
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
                }}
              >
                <span>{tab.label}</span>
                <span className="sn-filter-tab-chip">{tabCounts[tab.key]}</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-3)', textTransform: 'none', letterSpacing: 0 }}>{tab.hint}</span>
              </button>
            );
          })}
        </div>

        {filteredPassports.length === 0 ? (
          <div className="sn-empty-dashed" style={{ minHeight: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
            <p className="sn-heading" style={{ fontSize: '1.125rem', margin: '0 0 0.5rem' }}>표시할 lifecycle 파일이 없습니다.</p>
            <p className="sn-caption" style={{ margin: 0, maxWidth: '38rem' }}>
              분석, 회수 가능 판정, 추출 근거, 폐기 승인 상태가 기록되면 이 등록부에 표시됩니다.
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto', fontSize: '0.875rem' }}>
            <table className="sn-table">
              <thead>
                <tr>
                  <th>여권 ID</th>
                  <th>Lifecycle state</th>
                  <th>상태</th>
                  <th style={{ textAlign: 'right' }}>SOH</th>
                  <th style={{ textAlign: 'right' }}>잔존수명</th>
                  <th>추출 근거</th>
                  <th style={{ textAlign: 'right' }}>조치</th>
                </tr>
              </thead>
              <tbody>
                {filteredPassports.map((p) => {
                  const badge = getStatusBadge(p.status || 'DISPOSED');
                  const rateEntries = p.recyclingRates ? Object.entries(p.recyclingRates).slice(0, 4) : [];
                  const sohTone = p.soh == null
                    ? 'var(--color-text-3)'
                    : p.soh > 80
                      ? 'var(--color-success)'
                      : p.soh >= 50
                        ? 'var(--color-warning)'
                        : 'var(--color-danger)';
                  return (
                    <tr
                      key={p.passportId}
                      onClick={() => p.passportId && navigate(`/passports/${p.passportId}`)}
                      style={{ cursor: 'pointer' }}
                    >
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          <span className="sn-mono" style={{ color: 'var(--color-text-1)', fontWeight: 700 }}>{p.passportId}</span>
                          <span style={{ fontSize: '0.875rem', color: 'var(--color-text-3)' }}>{p.model || p.manufacturerName || '모델 정보 없음'}</span>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          <span style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--color-text-1)' }}>{getLifecycleStage(p)}</span>
                          <span style={{ fontSize: '0.875rem', color: 'var(--color-text-3)' }}>
                            {p.vin ? `VIN ${p.vin}` : 'VIN 미연결'} · {p.recycleAvailable ? '회수 가능' : '회수 미판정'}
                          </span>
                        </div>
                      </td>
                      <td>
                        <span className={`bp-stamp ${badge.bg} ${badge.text} ${badge.border}`}>{badge.label}</span>
                      </td>
                      <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: '0.9375rem', color: sohTone, fontWeight: 700 }}>
                        {p.soh != null ? `${p.soh}%` : '-'}
                      </td>
                      <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: '0.9375rem', color: 'var(--color-text-1)', fontWeight: 700 }}>
                        {p.remainingLifeCycle != null ? p.remainingLifeCycle.toLocaleString('ko-KR') : '-'}
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
                                  gap: 4,
                                  padding: '3px 8px',
                                  borderRadius: 999,
                                  background: 'var(--color-surface-alt)',
                                  border: '1px solid var(--color-border)',
                                  fontSize: '0.8125rem',
                                  color: 'var(--color-text-2)',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                <span style={{ fontWeight: 700, color: 'var(--color-text-1)' }}>{el}</span>
                                {rate}%
                              </span>
                            ))}
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.875rem', color: 'var(--color-text-3)' }}>근거 없음</span>
                        )}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 6 }} onClick={(e) => e.stopPropagation()}>
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
                              style={{ display: 'inline-flex', alignItems: 'center', padding: '7px 12px', fontSize: 13, fontWeight: 700, background: 'var(--color-danger-soft)', color: 'var(--color-danger)', border: 'none', borderRadius: 10, cursor: 'pointer' }}
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
      </section>

      <BaseModal open={showAnalysis} onClose={closeAll} title="분석 결과 제출">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <p className="sn-caption" style={{ margin: 0 }}>
            분석 결과는 여권의 SOH, SOCE, 잔존 수명, 회수 가능 판정 필드로 기록됩니다.
          </p>
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

      <RecycleToggleModal
        open={showToggle}
        initialValue={recycleToggleInitialValue}
        submitting={submitting}
        onClose={closeAll}
        onSubmit={submitRecycleToggle}
      />

      <ExtractModal
        open={showExtract}
        submitting={submitting}
        onClose={closeAll}
        onSubmit={submitExtract}
      />

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
