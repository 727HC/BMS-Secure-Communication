import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { PageDataLoadingSkeleton, PageHead } from '../components/ui';
import { AccidentLogModal, MaintenanceLogModal, MaintenanceRequestModal } from '../components/modals/maintenance';
import {
  type Passport,
  type Tab,
} from '../components/maintenance/lib';
import MaintenanceSummaryCard from '../components/maintenance/MaintenanceSummaryCard';
import MaintenanceTable from '../components/maintenance/MaintenanceTable';
import MaintenanceDistributionCard from '../components/maintenance/MaintenanceDistributionCard';
import { useMaintenanceMutations } from '../components/maintenance/useMaintenanceMutations';
import { useMaintenanceAnalytics } from '../components/maintenance/useMaintenanceAnalytics';
import { useMaintenanceData } from '../components/maintenance/useMaintenanceData';
import { useMaintenanceLabels } from '../components/maintenance/useMaintenanceLabels';

export default function MaintenancePage() {
  const { org, userId } = useAuth();
  const isEVManufacturer = org === 'EVManufacturerMSP';
  const isService = org === 'ServiceMSP';
  const canRequestMaintenance = isEVManufacturer;
  const canLogMaintenance = isService;
  const canLogAccident = isEVManufacturer || isService;

  const [activeTab, setActiveTab] = useState<Tab>('all');
  const [selectedPassport, setSelectedPassport] = useState<Passport | null>(null);
  const [showRequest, setShowRequest] = useState(false);
  const [showLog, setShowLog] = useState(false);
  const [showAccident, setShowAccident] = useState(false);

  const [requestForm, setRequestForm] = useState({ maintenanceType: 'routine', description: '' });
  const [logForm, setLogForm] = useState({ maintenanceType: 'routine', description: '', technician: '' });

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
  } = useMaintenanceData({ activeTab, isEVManufacturer });

  const { extStats, maintenanceTypeBreakdown, donutSegments, donutTotal } = useMaintenanceAnalytics(passports);

  const tabs: { key: Tab; label: string }[] = [
    { key: 'all', label: '전체' },
    { key: 'maintenance', label: '정비 작업' },
    { key: 'accident', label: '사고 기록' },
  ];

  const { docketScopeLabel, docketSummary } = useMaintenanceLabels({ isEVManufacturer, isService });

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

  const {
    submitting,
    submitError,
    submitRequest: submitRequestFn,
    submitLog: submitLogFn,
    submitAccident,
  } = useMaintenanceMutations({
    selectedPassport,
    onAfterSuccess: fetchPassports,
    onClose: closeAll,
  });

  const submitRequest = () => submitRequestFn(requestForm);
  const submitLog = () => submitLogFn(logForm);

  if (loading) {
    return (
      <PageDataLoadingSkeleton
        dataPage="maintenance"
        summaryCount={4}
        summaryGridStyle={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}
        tableRows={5}
        tableCols={8}
      />
    );
  }

  return (
    <div data-page="maintenance" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <PageHead
        title="작업 처리"
        subtitle={docketSummary}
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

      <MaintenanceSummaryCard docketScopeLabel={docketScopeLabel} docketSummary={docketSummary} extStats={extStats} tabCounts={tabCounts} />

      <MaintenanceDistributionCard
        donutSegments={donutSegments}
        donutTotal={donutTotal}
        maintenanceTypeBreakdown={maintenanceTypeBreakdown}
        avgIntervalDays={extStats.avgIntervalDays}
      />

      <MaintenanceTable
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
        docketScopeLabel={docketScopeLabel}
        canRequestMaintenance={canRequestMaintenance}
        canLogMaintenance={canLogMaintenance}
        canLogAccident={canLogAccident}
        onOpenMaintenanceRequest={openMaintenanceRequest}
        onOpenMaintenanceLog={openMaintenanceLog}
        onOpenAccident={openAccident}
      />

      <MaintenanceRequestModal
        open={showRequest}
        submitting={submitting}
        form={requestForm}
        onChange={setRequestForm}
        onClose={closeAll}
        onSubmit={submitRequest}
      />

      <MaintenanceLogModal
        open={showLog}
        submitting={submitting}
        form={logForm}
        onChange={setLogForm}
        onClose={closeAll}
        onSubmit={submitLog}
      />

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
