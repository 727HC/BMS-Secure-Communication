import { Fragment, useEffect, useId, useMemo, useState, type KeyboardEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/api';
import { scaleSOC, scaleTemp } from '../lib/helpers';
import {
  AlertGlyph,
  ChevronDownIcon,
  ChevronRightIcon,
  ConnectorArrow,
  ExpandIcon,
  FleetGauge,
  KpiIcon,
  NodeGlyph,
  SecurityGlyph,
  TaskGlyph,
} from '../components/dashboard/Glyphs';
import KpiTrendSparkline from '../components/dashboard/KpiTrendSparkline';
import {
  AUDIT_ALLOWED_ORGS,
  AUDIT_REQUIRED_LABEL,
  DASHBOARD_AUDIT_PATH,
  FLEET_LEGEND,
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
  const batteryListboxId = useId();
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
  const [batteryMenuOpen, setBatteryMenuOpen] = useState(false);

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
    setBatteryMenuOpen(false);
  };

  const navigateDashboard = (route: DashboardRoute) => {
    navigate(route);
  };

  const handleBatteryTriggerKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      setBatteryMenuOpen(false);
    }
  };

  const handleBatteryOptionKeyDown = (event: KeyboardEvent<HTMLDivElement>, passportId: string) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      selectPassport(passportId);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      setBatteryMenuOpen(false);
    }
  };

  return (
    <div className="vk-dash" data-selected-passport-id={selectedPassportId || undefined}>
      <header className="vk-dash__head">
        <div>
          <h1 className="vk-dash__title">개요</h1>
          <p className="vk-dash__sub" title={dashboardDataSummary}>배터리 여권 시스템의 전체 현황을 한눈에 확인하세요.</p>
        </div>
      </header>

      <div className="vk-grid vk-grid--4">
        {kpiCards.map((k) => (
          <article key={k.label} className={`vk-card vk-kpi vk-kpi--${k.tone}`}>
            <div className="vk-kpi__top">
              <div className="vk-kpi__copy">
                <span className="vk-kpi__label">{k.label}</span>
                <div className="vk-kpi__value">{k.value}</div>
                <span className="vk-kpi__delta">{k.delta}</span>
              </div>
              <span className="vk-kpi__icon" aria-hidden="true">
                <KpiIcon name={k.icon} />
              </span>
            </div>
            <KpiTrendSparkline label={k.label} trend={k.visual.trend} />
          </article>
        ))}
      </div>

      <div className="vk-grid vk-grid--fleet">
        <article className="vk-card vk-fleet">
          <div className="vk-card__head">
            <div>
              <h2 className="vk-card__title">배터리 모니터</h2>
              <p className="vk-card__sub">Viewing: {selectedPassportLabel}</p>
            </div>
            <div
              className="vk-battery-select"
              onBlur={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget)) setBatteryMenuOpen(false);
              }}
            >
              <button
                type="button"
                className="vk-selectbtn"
                title={batterySelectorTitle}
                aria-label={`배터리 선택: ${batterySelectorTitle}`}
                aria-haspopup="listbox"
                aria-expanded={batteryMenuOpen}
                aria-controls={batteryMenuOpen ? batteryListboxId : undefined}
                disabled={batterySelectorDisabled}
                onClick={() => setBatteryMenuOpen((open) => !open)}
                onKeyDown={handleBatteryTriggerKeyDown}
              >
                <span>{batterySelectorButtonLabel}</span>
                <ChevronDownIcon />
              </button>
              {batteryMenuOpen ? (
                <div id={batteryListboxId} className="vk-battery-select__menu" role="listbox" aria-label="배터리 선택">
                  {passportOptions.map((option) => {
                    const selected = option.id === selectedPassportId;
                    return (
                      <div
                        key={option.id}
                        role="option"
                        aria-selected={selected}
                        tabIndex={0}
                        className={`vk-battery-option${selected ? ' vk-battery-option--selected' : ''}`}
                        onClick={() => selectPassport(option.id)}
                        onKeyDown={(event) => handleBatteryOptionKeyDown(event, option.id)}
                      >
                        <span className="vk-battery-option__label">{option.label}</span>
                        <span className="vk-battery-option__meta">{option.status}</span>
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </div>
          </div>
          <div className="vk-fleet__body">
            <div className="vk-fleet__visual" aria-hidden="true">
              <img className="vk-fleet__image" src="/dashboard-fleet-chassis-cutout.png" alt="" loading="eager" decoding="async" />
              <span className="vk-fleet__expand">
                <ExpandIcon />
              </span>
            </div>
            <div className="vk-fleet__gauges">
              {fleetGauges.map((g) => (
                <FleetGauge key={g.label} label={g.label} value={g.value} tone={g.tone} />
              ))}
            </div>
          </div>
          <div className="vk-fleet__legend" aria-label="Fleet status legend">
            {FLEET_LEGEND.map((item) => (
              <span key={item.label} className={`vk-fleet__legend-item vk-fleet__legend-item--${item.tone}`}>
                {item.label}
              </span>
            ))}
          </div>
        </article>

        <article className="vk-card vk-dataflow">
          <div className="vk-card__head">
            <div>
              <div className="vk-card__titleline">
                <h2 className="vk-card__title">데이터 파이프라인</h2>
              </div>
              <p className="vk-card__sub">기준 처리 단계</p>
            </div>
            <button type="button" className="vk-linkbtn vk-linkbtn--chevron" onClick={() => navigateDashboard('/bmu-data')}>
              <span>상세 보기</span>
              <ChevronRightIcon />
            </button>
          </div>
          <div className="vk-dataflow__nodes">
            {dataflowNodes.map((n, index) => (
              <Fragment key={n.key}>
                <div className="vk-dataflow__node">
                  <div className="vk-dataflow__badge"><NodeGlyph name={n.key} /></div>
                  <p className="vk-dataflow__label">{n.label}</p>
                  <p className="vk-dataflow__val">{n.action}</p>
                  <span className={`vk-dataflow__status vk-dataflow__status--${n.status.toLowerCase()}`}>{n.status}</span>
                </div>
                {index < dataflowNodes.length - 1 ? (
                  <span className="vk-dataflow__connector" aria-hidden="true">
                    <ConnectorArrow />
                  </span>
                ) : null}
              </Fragment>
            ))}
          </div>
        </article>
      </div>

      <div className="vk-grid vk-grid--2">
        <article className="vk-card">
          <div className="vk-card__head">
            <div>
              <div className="vk-card__titleline">
                <h2 className="vk-card__title">알림</h2>
                <span className="vk-card__count">{alertRows.length}</span>
              </div>
              <p className="vk-card__sub">우선 확인 알림</p>
            </div>
            <button
              type="button"
              className="vk-linkbtn vk-linkbtn--chevron"
              disabled={!canReadAudit}
              title={canReadAudit ? '감사 로그로 이동' : AUDIT_REQUIRED_LABEL}
              aria-label={canReadAudit ? '전체 알림 보기' : AUDIT_REQUIRED_LABEL}
              onClick={canReadAudit ? () => navigateDashboard('/audit-log') : undefined}
            >
              <span>{canReadAudit ? '전체 알림 보기' : AUDIT_REQUIRED_LABEL}</span>
              <ChevronRightIcon />
            </button>
          </div>
          <ul className="vk-alerts">
            {alertRows.length === 0 ? (
              <li className="vk-alerts__row">
                <span className="vk-alerts__msg" style={{ gridColumn: '1 / -1' }}>표시할 알림이 없습니다</span>
              </li>
            ) : alertRows.map((a) => {
              const severity = a.severity.toLowerCase();
              const navigateToPassport = () => {
                if (a.navigable && a.source) navigate(`/passports/${encodeURIComponent(a.source)}`);
              };
              return (
                <li
                  key={a.key}
                  className={`vk-alerts__row vk-alerts__row--${severity}`}
                  onClick={a.navigable ? navigateToPassport : undefined}
                  onKeyDown={(e) => { if (a.navigable && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); navigateToPassport(); } }}
                  role={a.navigable ? 'button' : undefined}
                  tabIndex={a.navigable ? 0 : undefined}
                  style={{ cursor: a.navigable ? 'pointer' : 'default' }}
                >
                  <span className={`vk-alerts__icon vk-alerts__icon--${severity}`} aria-hidden="true">
                    <AlertGlyph severity={a.severity} />
                  </span>
                  <span className="vk-alerts__msg">{a.message}</span>
                  <span className="vk-alerts__id">{a.source}</span>
                  <span className={`vk-alerts__status vk-alerts__status--${severity}`}>{a.severity}</span>
                  <span className="vk-alerts__time">{a.time}</span>
                  <span className="vk-alerts__chevron" aria-hidden="true">
                    <ChevronRightIcon />
                  </span>
                </li>
              );
            })}
          </ul>
        </article>

        <article className="vk-card">
          <div className="vk-card__head">
            <div>
              <h2 className="vk-card__title">보안 상태</h2>
              <p className="vk-card__sub">플랫폼 보안 기준값</p>
            </div>
            <button
              type="button"
              className="vk-linkbtn"
              disabled={!canReadAudit}
              title={canReadAudit ? '감사 로그로 이동' : AUDIT_REQUIRED_LABEL}
              aria-label={canReadAudit ? '보안 상태 상세 보기' : AUDIT_REQUIRED_LABEL}
              onClick={canReadAudit ? () => navigateDashboard('/audit-log') : undefined}
            >
              {canReadAudit ? '상세 보기' : AUDIT_REQUIRED_LABEL}
            </button>
          </div>
          <div className="vk-secbar" aria-label="보안 상태">
            {securityRows.map((s) => (
              <div key={s.label} className={`vk-sec vk-sec--${s.tone}`}>
                <div className="vk-sec__icon" aria-hidden="true"><SecurityGlyph name={s.icon} /></div>
                <div className="vk-sec__copy">
                  <p className="vk-sec__label">{s.label}</p>
                  <p className="vk-sec__value">{s.value}</p>
                </div>
              </div>
            ))}
          </div>
        </article>
      </div>

      <div className="vk-grid vk-grid--ledger">
        <article className="vk-card">
          <div className="vk-card__head">
            <div>
              <div className="vk-card__titleline">
                <h2 className="vk-card__title">작업 대기열</h2>
                <span className="vk-card__count">{totalTaskCount}</span>
              </div>
              <p className="vk-card__sub">우선 처리 대기열</p>
            </div>
            <button type="button" className="vk-linkbtn vk-linkbtn--chevron" onClick={() => navigateDashboard('/passports')}>
              <span>전체 보기</span>
              <ChevronRightIcon />
            </button>
          </div>
          <div className="vk-tasks">
            {totalTaskCount === 0 ? (
              <div className="vk-task vk-task--blue" style={{ gridColumn: '1 / -1', alignContent: 'center', textAlign: 'center' }}>
                <p className="vk-task__label">대기 중인 작업이 없습니다</p>
              </div>
            ) : taskRows.map((t) => (
              <button
                key={t.label}
                type="button"
                className={`vk-task vk-task--${t.tone}`}
                aria-label={`${t.label} ${t.value}${t.unit} 보기`}
                onClick={() => navigateDashboard(t.route)}
              >
                <div className="vk-task__top">
                  <div className="vk-task__icon" aria-hidden="true"><TaskGlyph name={t.icon} /></div>
                  <p className="vk-task__label">{t.label}</p>
                </div>
                <p className="vk-task__count">
                  <span className="vk-task__num">{t.value}</span>
                  <span className="vk-task__unit">{t.unit}</span>
                </p>
              </button>
            ))}
          </div>
        </article>

        <article className="vk-card">
          <div className="vk-card__head">
            <div>
              <h2 className="vk-card__title">블록체인 원장</h2>
              <p className="vk-card__sub">최근 커밋 트랜잭션</p>
            </div>
            <button
              type="button"
              className="vk-linkbtn vk-linkbtn--chevron"
              disabled={!canReadAudit}
              title={canReadAudit ? '감사 로그로 이동' : AUDIT_REQUIRED_LABEL}
              aria-label={canReadAudit ? 'Blockchain Ledger 전체 보기' : AUDIT_REQUIRED_LABEL}
              onClick={canReadAudit ? () => navigateDashboard('/audit-log') : undefined}
            >
              <span>{canReadAudit ? '전체 보기' : AUDIT_REQUIRED_LABEL}</span>
              <ChevronRightIcon />
            </button>
          </div>
          <table className="vk-ledger">
            <thead>
              <tr>
                <th>Tx Hash</th>
                <th>Block / Target</th>
                <th>Organization</th>
                <th>Event Type</th>
                <th>Timestamp</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {ledgerFallback ? (
                <tr>
                  <td colSpan={6} className="vk-ledger__time" style={{ padding: '18px 6px', textAlign: 'center' }}>{ledgerFallback}</td>
                </tr>
              ) : ledgerRows.map((r) => (
                <tr key={r.key}>
                  <td className="vk-ledger__hash">{r.tx}</td>
                  <td className="vk-ledger__time">{r.block}</td>
                  <td className="vk-ledger__org">{r.organization}</td>
                  <td className="vk-ledger__type">{r.eventType}</td>
                  <td className="vk-ledger__time">{r.timestamp}</td>
                  <td><span className="vk-ledger__status">{r.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </article>
      </div>

      <p className="vk-dash__foot">{dashboardDataSummary}</p>
    </div>
  );
}
