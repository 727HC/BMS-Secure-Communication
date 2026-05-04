import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { PageDataLoadingSkeleton, PageHead } from '../components/ui';
import { AnalysisResultModal, DisposeConfirmModal, ExtractModal, RecycleToggleModal } from '../components/modals/recycling';
import {
  type Passport,
  type Tab,
} from '../components/recycling/lib';
import RecyclingSummaryCard from '../components/recycling/RecyclingSummaryCard';
import RecyclingTable from '../components/recycling/RecyclingTable';
import RecyclingDistributionCard from '../components/recycling/RecyclingDistributionCard';
import { useRecyclingMutations } from '../components/recycling/useRecyclingMutations';
import { useRecyclingAnalytics } from '../components/recycling/useRecyclingAnalytics';
import { useRecyclingData } from '../components/recycling/useRecyclingData';
import { useRecyclingLabels } from '../components/recycling/useRecyclingLabels';
import { useRecyclingPermissions } from '../components/recycling/useRecyclingPermissions';

export default function RecyclingPage() {
  const { org } = useAuth();
  const {
    isEVManufacturer,
    isService,
    isRegulator,
    canRequestAnalysis,
    canSubmitAnalysis,
    canToggleRecycle,
    canExtract,
    canDispose,
  } = useRecyclingPermissions(org);

  const [activeTab, setActiveTab] = useState<Tab>('all');
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

  const {
    passports,
    filteredPassports,
    pagedPassports,
    loading,
    currentPage,
    setCurrentPage,
    totalPages,
    showingFrom,
    showingTo,
    tabCounts,
    fetchPassports,
  } = useRecyclingData({ activeTab });

  const tabs: { key: Tab; label: string; hint: string }[] = [
    { key: 'all', label: '전체', hint: 'lifecycle files' },
    { key: 'recyclable', label: '재활용가능', hint: 'ready' },
    { key: 'recycling', label: '재활용중', hint: 'in recovery' },
    { key: 'disposed', label: '폐기완료', hint: 'authorized' },
  ];

  const { avgSoh, avgRemaining, avgRates, lifecycleMetrics, lifecycleBreakdown } = useRecyclingAnalytics(passports, tabCounts);

  const { deskLabel, pageSummary } = useRecyclingLabels({ isEVManufacturer, isService, isRegulator });

  const closeAll = () => {
    setShowAnalysis(false);
    setShowToggle(false);
    setShowExtract(false);
    setShowDispose(false);
    setSelectedPassport(null);
  };

  const {
    submitting,
    submitError,
    requestAnalysis,
    submitAnalysisResult: submitAnalysisResultFn,
    submitRecycleToggle,
    submitExtract,
    submitDispose,
  } = useRecyclingMutations({
    selectedPassport,
    onAfterSuccess: fetchPassports,
    onClose: closeAll,
  });

  const openAnalysisResult = (p: Passport) => {
    setSelectedPassport(p);
    setAnalysisForm({ soh: '', soce: '', remainingLifeCycle: '', recycleAvailable: false });
    setShowAnalysis(true);
  };

  const submitAnalysisResult = () => submitAnalysisResultFn(analysisForm);

  const openRecycleToggle = (p: Passport) => {
    setSelectedPassport(p);
    setRecycleToggleInitialValue(p.recycleAvailable || false);
    setShowToggle(true);
  };

  const openExtract = (p: Passport) => {
    setSelectedPassport(p);
    setShowExtract(true);
  };

  const openDispose = (p: Passport) => {
    setSelectedPassport(p);
    setShowDispose(true);
  };

  if (loading) {
    return (
      <PageDataLoadingSkeleton
        dataPage="recycling"
        summaryCount={5}
        summaryGridStyle={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.75rem' }}
        tableRows={5}
        tableCols={7}
      />
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
