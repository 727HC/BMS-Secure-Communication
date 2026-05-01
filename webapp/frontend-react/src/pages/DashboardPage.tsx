import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/api';
import { scaleSOC, scaleTemp } from '../lib/helpers';
import AlertCard from '../components/dashboard/AlertCard';
import BatteryMonitor from '../components/dashboard/BatteryMonitor';
import DataflowCard from '../components/dashboard/DataflowCard';
import KpiRow from '../components/dashboard/KpiRow';
import LedgerCard from '../components/dashboard/LedgerCard';
import SecurityCard from '../components/dashboard/SecurityCard';
import TaskQueueCard from '../components/dashboard/TaskQueueCard';
import {
  AUDIT_ALLOWED_ORGS,
  DASHBOARD_AUDIT_PATH,
  SOURCE_IDLE,
  buildAlertRows,
  buildKpiSnapshot,
  buildKpiVisual,
  buildLedgerRows,
  buildTaskRows,
  errorMessage,
  formatMetricNumber,
  formatPercent,
  isPassportNormal,
  isPassportVerified,
  isPermissionError,
  latestBmuRecord,
  normalizeAuditRecord,
  normalizeBmuRecord,
  normalizeList,
  normalizePassport,
  normalizeStatus,
  normalizedStatus,
  passportOptionLabel,
  passportSoc,
  passportSoh,
  sourceError,
  sourceLoaded,
  sourceLoading,
  type DashboardAuditRecord,
  type DashboardBmuRecord,
  type DashboardPassport,
  type DashboardRoute,
  type DashboardSourceState,
  type DashboardStatus,
  type DataflowNodeViewModel,
  type FleetGaugeViewModel,
  type KpiCardViewModel,
  type PassportOptionViewModel,
  type SecurityRowViewModel,
} from '../components/dashboard/lib';

export default function DashboardPage() {
  const { org, token, userId } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedPassportId = searchParams.get('passportId');
  const hasDashboardAuth = Boolean(token && userId);
  const canReadAudit = org ? AUDIT_ALLOWED_ORGS.has(org) : false;

  const [passports, setPassports] = useState<DashboardPassport[]>([]);
  const [platformStatus, setPlatformStatus] = useState<DashboardStatus | null>(null);
  const [bmuRecords, setBmuRecords] = useState<DashboardBmuRecord[]>([]);
  const [auditRecords, setAuditRecords] = useState<DashboardAuditRecord[]>([]);
  const [selectedPassportId, setSelectedPassportId] = useState<string | null>(null);
  const [passportSource, setPassportSource] = useState<DashboardSourceState>(SOURCE_IDLE);
  const [statusSource, setStatusSource] = useState<DashboardSourceState>(SOURCE_IDLE);
  const [bmuSource, setBmuSource] = useState<DashboardSourceState>(SOURCE_IDLE);
  const [auditSource, setAuditSource] = useState<DashboardSourceState>(SOURCE_IDLE);

  useEffect(() => {
    let cancelled = false;

    if (!hasDashboardAuth) {
      setPassports([]);
      setPassportSource(sourceError('인증 정보 없음', 'denied'));
      return () => { cancelled = true; };
    }

    setPassportSource(sourceLoading());
    api.get<unknown>('/realtime/passports')
      .then((data) => {
        if (cancelled) return;
        setPassports(normalizeList(data, normalizePassport));
        setPassportSource(sourceLoaded());
      })
      .catch((error) => {
        if (cancelled) return;
        setPassports([]);
        setPassportSource(sourceError(errorMessage(error, '여권 목록 조회 실패')));
      });

    return () => { cancelled = true; };
  }, [hasDashboardAuth, token, userId]);

  useEffect(() => {
    let cancelled = false;

    if (!hasDashboardAuth) {
      setPlatformStatus(null);
      setStatusSource(sourceError('인증 정보 없음', 'denied'));
      return () => { cancelled = true; };
    }

    setStatusSource(sourceLoading());
    api.get<unknown>('/status')
      .then((data) => {
        if (cancelled) return;
        setPlatformStatus(normalizeStatus(data));
        setStatusSource(sourceLoaded());
      })
      .catch((error) => {
        if (cancelled) return;
        setPlatformStatus(null);
        setStatusSource(sourceError(errorMessage(error, '플랫폼 상태 조회 실패')));
      });

    return () => { cancelled = true; };
  }, [hasDashboardAuth, token, userId]);

  useEffect(() => {
    if (passportSource.loading || passportSource.permission === 'unknown' || passportSource.error) return;

    const passportIds = passports.map((passport) => passport.passportId).filter((id): id is string => Boolean(id));
    const nextSelectedId = requestedPassportId && passportIds.includes(requestedPassportId)
      ? requestedPassportId
      : passportIds[0] ?? null;

    setSelectedPassportId((current) => (current === nextSelectedId ? current : nextSelectedId));

    if (nextSelectedId && requestedPassportId !== nextSelectedId) {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.set('passportId', nextSelectedId);
      setSearchParams(nextParams, { replace: true, preventScrollReset: true });
    } else if (!nextSelectedId && requestedPassportId) {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete('passportId');
      setSearchParams(nextParams, { replace: true, preventScrollReset: true });
    }
  }, [passportSource, passports, requestedPassportId, searchParams, setSearchParams]);

  useEffect(() => {
    let cancelled = false;

    if (!hasDashboardAuth) {
      setBmuRecords([]);
      setBmuSource(sourceError('인증 정보 없음', 'denied'));
      return () => { cancelled = true; };
    }

    if (!selectedPassportId) {
      setBmuRecords([]);
      setBmuSource({ loading: false, error: null, permission: 'unknown', loadedAt: null });
      return () => { cancelled = true; };
    }

    setBmuRecords([]);
    setBmuSource(sourceLoading());
    api.get<unknown>(`/realtime/bmu/${encodeURIComponent(selectedPassportId)}`)
      .then((data) => {
        if (cancelled) return;
        setBmuRecords(normalizeList(data, normalizeBmuRecord));
        setBmuSource(sourceLoaded());
      })
      .catch((error) => {
        if (cancelled) return;
        const message = errorMessage(error, 'BMU 기록 조회 실패');
        setBmuRecords([]);
        setBmuSource(sourceError(message, isPermissionError(message) ? 'denied' : 'allowed'));
      });

    return () => { cancelled = true; };
  }, [hasDashboardAuth, selectedPassportId, token, userId]);

  useEffect(() => {
    let cancelled = false;

    if (!hasDashboardAuth) {
      setAuditRecords([]);
      setAuditSource(sourceError('인증 정보 없음', 'denied'));
      return () => { cancelled = true; };
    }

    if (!canReadAudit) {
      setAuditRecords([]);
      setAuditSource({ loading: false, error: null, permission: 'denied', loadedAt: null });
      return () => { cancelled = true; };
    }

    setAuditSource(sourceLoading());
    api.get<unknown>(DASHBOARD_AUDIT_PATH)
      .then((data) => {
        if (cancelled) return;
        setAuditRecords(normalizeList(data, normalizeAuditRecord));
        setAuditSource(sourceLoaded());
      })
      .catch((error) => {
        if (cancelled) return;
        const message = errorMessage(error, '감사 기록 조회 실패');
        setAuditRecords([]);
        setAuditSource(sourceError(message, isPermissionError(message) ? 'denied' : 'allowed'));
      });

    return () => { cancelled = true; };
  }, [canReadAudit, hasDashboardAuth, org, token, userId]);

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

  const kpiCards = useMemo<KpiCardViewModel[]>(() => {
    const total = passports.length;
    const normal = passports.filter(isPassportNormal).length;
    const verified = passports.filter(isPassportVerified).length;
    const alerts = alertRows.length;

    const totalSnapshot = buildKpiSnapshot({ kind: 'total', value: total, total, alerts });
    const normalSnapshot = buildKpiSnapshot({ kind: 'normal', value: normal, total, alerts });
    const alertsSnapshot = buildKpiSnapshot({ kind: 'alerts', value: alerts, total, alerts });
    const verifiedSnapshot = buildKpiSnapshot({ kind: 'verified', value: verified, total, alerts });

    return [
      {
        label: '총 등록 배터리',
        value: String(total),
        delta: passportSource.loading ? '조회 중' : 'API 기준',
        visual: buildKpiVisual({ kind: 'total', snapshot: totalSnapshot, passports, total }),
        tone: 'blue',
        icon: 'battery',
      },
      {
        label: '정상 상태',
        value: String(normal),
        delta: formatPercent(normal, total),
        visual: buildKpiVisual({ kind: 'normal', snapshot: normalSnapshot, passports, total }),
        tone: 'green',
        icon: 'check',
      },
      {
        label: '알림 / 경고',
        value: String(alerts),
        delta: '상태 기반',
        visual: buildKpiVisual({ kind: 'alerts', snapshot: alertsSnapshot, passports, total }),
        tone: 'amber',
        icon: 'alert',
      },
      {
        label: '블록체인 검증 완료',
        value: String(verified),
        delta: formatPercent(verified, total),
        visual: buildKpiVisual({ kind: 'verified', snapshot: verifiedSnapshot, passports, total }),
        tone: 'purple',
        icon: 'chain',
      },
    ];
  }, [alertRows.length, passportSource.loading, passports]);

  const fleetGauges = useMemo<FleetGaugeViewModel[]>(() => {
    const soc = selectedBmuRecord?.soc ?? passportSoc(selectedPassport);
    const soh = passportSoh(selectedPassport);
    const temperature = selectedBmuRecord?.temperature;

    return [
      { label: 'SOC (선택)', value: soc != null ? `${formatMetricNumber(scaleSOC(soc))} %` : '— %', tone: 'green' },
      { label: 'SOH (선택)', value: soh != null ? `${formatMetricNumber(soh)} %` : '— %', tone: 'blue' },
      { label: 'Temperature (BMU)', value: temperature != null ? `${formatMetricNumber(scaleTemp(temperature))} ℃` : '— ℃', tone: 'amber' },
      { label: 'Health Score', value: soh != null ? `${formatMetricNumber(soh)} /100` : '— /100', tone: 'purple' },
    ];
  }, [selectedBmuRecord, selectedPassport]);

  const dataflowNodes = useMemo<DataflowNodeViewModel[]>(() => {
    const passportsLoaded = passportSource.permission === 'allowed' && !passportSource.loading && !passportSource.error && passportSource.loadedAt;
    const fabricSynced = normalizedStatus(platformStatus?.fabric) === 'CONNECTED';

    return [
      { key: 'cmu', label: 'CMU', action: '수집', status: 'Unknown' },
      { key: 'bmu', label: 'BMU', action: '전송', status: bmuRecords.length > 0 ? 'Data' : 'Unknown' },
      { key: 'agent', label: 'Agent', action: '검증', status: passportsLoaded ? 'Loaded' : 'Unknown' },
      { key: 'blockchain', label: 'Blockchain', action: '기록', status: fabricSynced ? 'Synced' : 'Unknown' },
      { key: 'passport', label: 'Passport', action: '발급', status: selectedPassport ? 'Loaded' : 'Unknown' },
    ];
  }, [bmuRecords.length, passportSource, platformStatus?.fabric, selectedPassport]);

  const securityRows = useMemo<SecurityRowViewModel[]>(() => {
    const statusReachable = Boolean(statusSource.loadedAt && !statusSource.error);
    let auditValue = '상태 확인 불가';
    let auditTone: SecurityRowViewModel['tone'] = 'neutral';

    if (auditSource.permission === 'denied') {
      auditValue = '감사 권한 필요';
      auditTone = 'amber';
    } else if (auditSource.loading) {
      auditValue = '확인 중';
    } else if (auditSource.error) {
      auditValue = '감사 확인 실패';
      auditTone = 'amber';
    } else if (auditSource.loadedAt) {
      auditValue = '감사 접근 가능';
      auditTone = 'green';
    }

    let cryptoValue = '상태 확인 불가';
    let cryptoTone: SecurityRowViewModel['tone'] = 'neutral';
    if (bmuSource.loading) {
      cryptoValue = '확인 중';
    } else if (bmuRecords.length === 0) {
      cryptoValue = 'BMU 데이터 미수신';
    } else {
      const signedRecords = bmuRecords.filter((r) => typeof r.signature === 'string' && r.signature && r.signature !== 'none');
      if (signedRecords.length === 0) {
        cryptoValue = '서명 미포함 레코드';
        cryptoTone = 'amber';
      } else {
        const now = Date.now();
        const recentSigned = signedRecords.filter((r) => {
          if (!r.timestamp) return false;
          const ts = new Date(r.timestamp).getTime();
          return Number.isFinite(ts) && now - ts <= 60_000;
        });
        if (recentSigned.length > 0) {
          cryptoValue = `BMU 서명 수신 (60초 ${recentSigned.length}건)`;
          cryptoTone = 'green';
        } else {
          cryptoValue = `최근 60초 신호 없음 (누적 ${signedRecords.length}건)`;
          cryptoTone = 'amber';
        }
      }
    }

    return [
      { label: '인증 토큰', value: token ? '토큰 확인됨' : '상태 확인 불가', tone: token ? 'green' : 'neutral', icon: 'lock' },
      { label: '상태 엔드포인트', value: statusReachable ? '상태 응답 수신' : statusSource.loading ? '확인 중' : '상태 확인 불가', tone: statusReachable ? 'green' : 'neutral', icon: 'shield' },
      { label: '감사 접근', value: auditValue, tone: auditTone, icon: 'shield' },
      { label: 'AES / CMAC / Ed25519', value: cryptoValue, tone: cryptoTone, icon: 'key' },
    ];
  }, [auditSource, bmuRecords, bmuSource, statusSource, token]);

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
