import { useMemo } from 'react';
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
import {
  AUDIT_ALLOWED_ORGS,
  buildAlertRows,
  buildLedgerRows,
  buildTaskRows,
  latestBmuRecord,
  passportOptionLabel,
  type DashboardRoute,
  type PassportOptionViewModel,
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

  const selectedPassport = useMemo(
    () => passports.find((passport) => passport.passportId === selectedPassportId) ?? null,
    [passports, selectedPassportId]
  );

  const selectedPassportLabel = useMemo(() => {
    if (passportSource.loading) return '여권 조회 중';
    if (!selectedPassportId) return passports.length ? '배터리 선택 대기' : '등록된 배터리 없음';
    const detail = selectedPassport?.model || selectedPassport?.serialNumber || selectedPassport?.batteryId;
    return detail ? `${selectedPassportId} · ${detail}` : selectedPassportId;
  }, [passportSource.loading, passports.length, selectedPassport, selectedPassportId]);

  const selectedBmuRecord = useMemo(() => latestBmuRecord(bmuRecords), [bmuRecords]);
  const alertRows = useMemo(
    () => buildAlertRows(passports, platformStatus, statusSource, auditRecords, auditSource),
    [auditRecords, auditSource, passports, platformStatus, statusSource]
  );
  const taskRows = useMemo(() => buildTaskRows(passports), [passports]);
  const totalTaskCount = useMemo(
    () => taskRows.reduce((sum, row) => sum + Number(row.value), 0),
    [taskRows]
  );
  const ledgerRows = useMemo(() => buildLedgerRows(auditRecords), [auditRecords]);
  const passportOptions = useMemo<PassportOptionViewModel[]>(() => passports.flatMap((passport, index) => {
    if (!passport.passportId) return [];
    return [{
      id: passport.passportId,
      label: passportOptionLabel(passport, index),
      status: passport.status || '상태 없음',
    }];
  }), [passports]);
  const ledgerFallback = auditSource.permission === 'denied'
    ? '권한 필요'
    : auditSource.loading
      ? '감사 조회 중'
      : auditSource.error
        ? '감사 기록 조회 실패'
        : ledgerRows.length === 0
          ? '원장 로그가 없습니다'
          : null;

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

  const dashboardDataSummary = useMemo(() => {
    const authSummary = hasDashboardAuth ? `${org || 'UnknownMSP'} / ${userId}` : '인증 정보 없음';
    const passportSummary = passportSource.loading
      ? '여권 조회 중'
      : passportSource.error
        ? `여권 오류: ${passportSource.error}`
        : `여권 ${passports.length}건`;
    const statusSummary = statusSource.loading
      ? '상태 조회 중'
      : statusSource.error
        ? `상태 오류: ${statusSource.error}`
        : `Fabric ${platformStatus?.fabric || 'unknown'}`;
    const bmuSummary = bmuSource.loading
      ? 'BMU 조회 중'
      : bmuSource.error
        ? `BMU 오류: ${bmuSource.error}`
        : selectedPassportId
          ? `BMU ${bmuRecords.length}건`
          : 'BMU 선택 대기';
    const auditSummary = auditSource.permission === 'denied'
      ? '감사 권한 필요'
      : auditSource.loading
        ? '감사 조회 중'
        : auditSource.error
          ? `감사 오류: ${auditSource.error}`
          : `감사 ${auditRecords.length}건`;

    return `${authSummary} · ${passportSummary} · ${statusSummary} · ${bmuSummary} · ${auditSummary}`;
  }, [
    auditRecords.length,
    auditSource,
    bmuRecords.length,
    bmuSource,
    hasDashboardAuth,
    org,
    passportSource,
    passports.length,
    platformStatus?.fabric,
    selectedPassportId,
    statusSource,
    userId,
  ]);

  const batterySelectorDisabled = passportSource.loading || passportOptions.length === 0;
  const batterySelectorTitle = passportSource.loading
    ? '여권 조회 중'
    : passportOptions.length === 0
      ? '선택 가능한 배터리 없음'
      : selectedPassportLabel;
  const batterySelectorButtonLabel = passportSource.loading
    ? '조회 중'
    : passportOptions.length === 0
      ? '배터리 없음'
      : (selectedPassport?.model || selectedPassportId || '배터리 선택');

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
