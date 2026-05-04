import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import AlertCard from '../components/dashboard/AlertCard';
import BatteryMonitor from '../components/dashboard/BatteryMonitor';
import DataflowCard from '../components/dashboard/DataflowCard';
import KpiRow from '../components/dashboard/KpiRow';
import LedgerCard from '../components/dashboard/LedgerCard';
import SecurityCard from '../components/dashboard/SecurityCard';
import TaskQueueCard from '../components/dashboard/TaskQueueCard';
import { useDashboardData } from '../components/dashboard/useDashboardData';
import { useDashboardViewModels } from '../components/dashboard/useDashboardViewModels';
import { useDashboardRows } from '../components/dashboard/useDashboardRows';
import { useDashboardLabels } from '../components/dashboard/useDashboardLabels';
import {
  AUDIT_ALLOWED_ORGS,
  type DashboardRoute,
} from '../components/dashboard/lib';

export default function DashboardPage() {
  const { org, token, userId } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedPassportId = searchParams.get('passportId');
  const hasDashboardAuth = Boolean(token && userId);
  const canReadAudit = org ? AUDIT_ALLOWED_ORGS.has(org) : false;

  const {
    passports,
    platformStatus,
    bmuRecords,
    auditRecords,
    selectedPassportId,
    passportSource,
    statusSource,
    bmuSource,
    auditSource,
  } = useDashboardData({
    hasDashboardAuth,
    org,
    token,
    userId,
    requestedPassportId,
    searchParams,
    setSearchParams,
  });

  const {
    selectedPassport,
    selectedPassportLabel,
    selectedBmuRecord,
    alertRows,
    taskRows,
    totalTaskCount,
    ledgerRows,
    passportOptions,
    ledgerFallback,
  } = useDashboardRows({
    passports,
    bmuRecords,
    auditRecords,
    platformStatus,
    statusSource,
    auditSource,
    selectedPassportId,
    passportSource,
  });

  const { kpiCards, fleetGauges, dataflowNodes, securityRows } = useDashboardViewModels({
    passports,
    alertRows,
    selectedPassport,
    selectedBmuRecord,
    bmuRecords,
    platformStatus,
    passportSource,
    statusSource,
    bmuSource,
    auditSource,
    token,
  });

  const {
    dashboardDataSummary,
    batterySelectorDisabled,
    batterySelectorTitle,
    batterySelectorButtonLabel,
  } = useDashboardLabels({
    hasDashboardAuth,
    org,
    userId,
    passports,
    bmuRecords,
    auditRecords,
    platformStatus,
    passportSource,
    statusSource,
    bmuSource,
    auditSource,
    selectedPassport,
    selectedPassportId,
    selectedPassportLabel,
    passportOptions,
  });

  const selectPassport = (passportId: string) => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('passportId', passportId);
    setSearchParams(nextParams, { preventScrollReset: true });
  };

  const navigateDashboard = (route: DashboardRoute) => {
    navigate(route);
  };

  return (
    <div className="vk-dash" data-selected-passport-id={selectedPassportId || undefined}>
      <header className="vk-dash__head">
        <div>
          <h1 className="vk-dash__title">개요</h1>
          <p className="vk-dash__sub" title={dashboardDataSummary}>배터리 여권 시스템의 전체 현황을 한눈에 확인하세요.</p>
        </div>
      </header>

      <KpiRow kpiCards={kpiCards} />

      <div className="vk-grid vk-grid--fleet">
        <BatteryMonitor
          selectedPassportLabel={selectedPassportLabel}
          selectedPassportId={selectedPassportId}
          selectorTitle={batterySelectorTitle}
          selectorButtonLabel={batterySelectorButtonLabel}
          selectorDisabled={batterySelectorDisabled}
          passportOptions={passportOptions}
          onPassportSelect={selectPassport}
          fleetGauges={fleetGauges}
        />

        <DataflowCard dataflowNodes={dataflowNodes} onNavigate={navigateDashboard} />
      </div>

      <div className="vk-grid vk-grid--2">
        <AlertCard
          alertRows={alertRows}
          canReadAudit={canReadAudit}
          onNavigate={navigateDashboard}
          onPassportClick={(id: string) => navigate(`/passports/${encodeURIComponent(id)}`)}
        />

        <SecurityCard securityRows={securityRows} canReadAudit={canReadAudit} onNavigate={navigateDashboard} />
      </div>

      <div className="vk-grid vk-grid--ledger">
        <TaskQueueCard taskRows={taskRows} totalTaskCount={totalTaskCount} onNavigate={navigateDashboard} />

        <LedgerCard ledgerRows={ledgerRows} ledgerFallback={ledgerFallback} canReadAudit={canReadAudit} onNavigate={navigateDashboard} />
      </div>

      <p className="vk-dash__foot">{dashboardDataSummary}</p>
    </div>
  );
}
