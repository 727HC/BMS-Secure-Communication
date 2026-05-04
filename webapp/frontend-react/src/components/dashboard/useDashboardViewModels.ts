import { useMemo } from 'react';
import { scaleSOC, scaleTemp } from '../../lib/helpers';
import {
  buildKpiSnapshot,
  buildKpiVisual,
  formatMetricNumber,
  formatPercent,
  isPassportNormal,
  isPassportVerified,
  normalizedStatus,
  passportSoc,
  passportSoh,
  type AlertRowViewModel,
  type DashboardBmuRecord,
  type DashboardPassport,
  type DashboardSourceState,
  type DashboardStatus,
  type DataflowNodeViewModel,
  type FleetGaugeViewModel,
  type KpiCardViewModel,
  type SecurityRowViewModel,
} from './lib';

interface Args {
  passports: DashboardPassport[];
  alertRows: AlertRowViewModel[];
  selectedPassport: DashboardPassport | null;
  selectedBmuRecord: DashboardBmuRecord | null;
  bmuRecords: DashboardBmuRecord[];
  platformStatus: DashboardStatus | null;
  passportSource: DashboardSourceState;
  statusSource: DashboardSourceState;
  bmuSource: DashboardSourceState;
  auditSource: DashboardSourceState;
  token: string | null;
}

export function useDashboardViewModels({
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
}: Args) {
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

  return { kpiCards, fleetGauges, dataflowNodes, securityRows };
}
