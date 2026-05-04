import { useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';
import { toastFromError } from '../lib/chaincodeErrorMessages';
import { useAuth } from '../contexts/AuthContext';
import { PageHead, SkeletonCard, SkeletonTable } from '../components/ui';
import { AnalysisResultModal, DisposeConfirmModal, ExtractModal, RecycleToggleModal, type ExtractEntry } from '../components/modals/recycling';
import {
  PAGE_SIZE,
  avg,
  hasRecoveryRates,
  isRecyclingRelated,
  type Passport,
  type Tab,
} from '../components/recycling/lib';
import RecyclingSummaryCard from '../components/recycling/RecyclingSummaryCard';
import RecyclingTable from '../components/recycling/RecyclingTable';
import RecyclingDistributionCard from '../components/recycling/RecyclingDistributionCard';

export default function RecyclingPage() {
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
  const [submitError, setSubmitError] = useState<string | null>(null);
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
    ? 'EV제조사 분석 요청 데스크'
    : isService
      ? '서비스 분석 데스크'
      : isRegulator
        ? '규제기관 회수 권한'
        : '생애 주기 등록부';

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
    setSubmitError(null);
    try {
      await api.post(`/analysis/${passport.passportId}/request`, {});
      await fetchPassports();
    } catch (err) {
      const { toast, debug, category } = toastFromError(err);
      console.warn('[recycling] mutation failed', { category, debug });
      setSubmitError(toast);
    }
  };

  const openAnalysisResult = (p: Passport) => {
    setSelectedPassport(p);
    setAnalysisForm({ soh: '', soce: '', remainingLifeCycle: '', recycleAvailable: false });
    setShowAnalysis(true);
  };

  const submitAnalysisResult = async () => {
    if (!selectedPassport?.passportId) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      await api.post(`/analysis/${selectedPassport.passportId}/result`, {
        soh: Number(analysisForm.soh),
        soce: Number(analysisForm.soce),
        remainingLifeCycle: Number(analysisForm.remainingLifeCycle),
        recycleAvailable: analysisForm.recycleAvailable,
      });
      closeAll();
      await fetchPassports();
    } catch (err) {
      const { toast, debug, category } = toastFromError(err);
      console.warn('[recycling] mutation failed', { category, debug });
      setSubmitError(toast);
    }
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
    setSubmitError(null);
    try {
      await api.put(`/recycling/${selectedPassport.passportId}/availability`, { available });
      closeAll();
      await fetchPassports();
    } catch (err) {
      const { toast, debug, category } = toastFromError(err);
      console.warn('[recycling] mutation failed', { category, debug });
      setSubmitError(toast);
    }
    finally { setSubmitting(false); }
  };

  const openExtract = (p: Passport) => {
    setSelectedPassport(p);
    setShowExtract(true);
  };

  const submitExtract = async (entries: ExtractEntry[]) => {
    if (!selectedPassport?.passportId) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const recyclingRates: Record<string, number> = {};
      entries.forEach((e) => {
        if (e.key.trim()) recyclingRates[e.key.trim()] = Number(e.value);
      });
      await api.post(`/recycling/${selectedPassport.passportId}/extract`, { recyclingRates });
      closeAll();
      await fetchPassports();
    } catch (err) {
      const { toast, debug, category } = toastFromError(err);
      console.warn('[recycling] mutation failed', { category, debug });
      setSubmitError(toast);
    }
    finally { setSubmitting(false); }
  };

  const openDispose = (p: Passport) => {
    setSelectedPassport(p);
    setShowDispose(true);
  };

  const submitDispose = async () => {
    if (!selectedPassport?.passportId) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      await api.post(`/recycling/${selectedPassport.passportId}/dispose`, {});
      closeAll();
      await fetchPassports();
    } catch (err) {
      const { toast, debug, category } = toastFromError(err);
      console.warn('[recycling] mutation failed', { category, debug });
      setSubmitError(toast);
    }
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
        title="재활용·ESG"
        subtitle={pageSummary}
        actions={(
          <button onClick={fetchPassports} className="sn-btn sn-btn-ghost" style={{ flexShrink: 0 }}>
            새로고침
          </button>
        )}
      />

      {submitError && (
        <div role="alert" style={{ padding: '0.9rem 1rem', borderRadius: '0.85rem', background: 'var(--color-danger-soft)', color: 'var(--color-danger)', border: '1px solid var(--color-border)' }}>
          <span style={{ fontSize: '0.9rem', lineHeight: 1.6 }}>{submitError}</span>
        </div>
      )}

      <RecyclingSummaryCard deskLabel={deskLabel} tabCounts={tabCounts} avgSoh={avgSoh} avgRemaining={avgRemaining} lifecycleMetrics={lifecycleMetrics} />

      <RecyclingDistributionCard lifecycleBreakdown={lifecycleBreakdown} avgRates={avgRates} />

      <RecyclingTable
        org={org}
        tabs={tabs}
        tabCounts={tabCounts}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        filteredPassports={filteredPassports}
        pagedPassports={pagedPassports}
        currentPage={currentPage}
        totalPages={totalPages}
        showingFrom={showingFrom}
        showingTo={showingTo}
        onPageChange={setCurrentPage}
        canRequestAnalysis={canRequestAnalysis}
        canSubmitAnalysis={canSubmitAnalysis}
        canToggleRecycle={canToggleRecycle}
        canExtract={canExtract}
        canDispose={canDispose}
        onRequestAnalysis={requestAnalysis}
        onOpenAnalysisResult={openAnalysisResult}
        onOpenRecycleToggle={openRecycleToggle}
        onOpenExtract={openExtract}
        onOpenDispose={openDispose}
      />

      <AnalysisResultModal
        open={showAnalysis}
        submitting={submitting}
        form={analysisForm}
        onChange={setAnalysisForm}
        onClose={closeAll}
        onSubmit={submitAnalysisResult}
      />

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


      <DisposeConfirmModal
        open={showDispose}
        submitting={submitting}
        onClose={closeAll}
        onSubmit={submitDispose}
      />
    </div>
  );
}
