import { useMemo } from 'react';
import {
  type DashboardAuditRecord,
  type DashboardBmuRecord,
  type DashboardPassport,
  type DashboardSourceState,
  type DashboardStatus,
  type PassportOptionViewModel,
} from './lib';

interface Args {
  hasDashboardAuth: boolean;
  org: string | null;
  userId: string | null;
  passports: DashboardPassport[];
  bmuRecords: DashboardBmuRecord[];
  auditRecords: DashboardAuditRecord[];
  platformStatus: DashboardStatus | null;
  passportSource: DashboardSourceState;
  statusSource: DashboardSourceState;
  bmuSource: DashboardSourceState;
  auditSource: DashboardSourceState;
  selectedPassport: DashboardPassport | null;
  selectedPassportId: string | null;
  selectedPassportLabel: string;
  passportOptions: PassportOptionViewModel[];
}

export function useDashboardLabels({
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
}: Args) {
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

  return {
    dashboardDataSummary,
    batterySelectorDisabled,
    batterySelectorTitle,
    batterySelectorButtonLabel,
  };
}
