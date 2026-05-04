import { useMemo } from 'react';
import {
  buildAlertRows,
  buildLedgerRows,
  buildTaskRows,
  latestBmuRecord,
  passportOptionLabel,
  type DashboardAuditRecord,
  type DashboardBmuRecord,
  type DashboardPassport,
  type DashboardSourceState,
  type DashboardStatus,
  type PassportOptionViewModel,
} from './lib';

interface Args {
  passports: DashboardPassport[];
  bmuRecords: DashboardBmuRecord[];
  auditRecords: DashboardAuditRecord[];
  platformStatus: DashboardStatus | null;
  statusSource: DashboardSourceState;
  auditSource: DashboardSourceState;
  selectedPassportId: string | null;
  passportSource: DashboardSourceState;
}

export function useDashboardRows({
  passports,
  bmuRecords,
  auditRecords,
  platformStatus,
  statusSource,
  auditSource,
  selectedPassportId,
  passportSource,
}: Args) {
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

  return {
    selectedPassport,
    selectedPassportLabel,
    selectedBmuRecord,
    alertRows,
    taskRows,
    totalTaskCount,
    ledgerRows,
    passportOptions,
    ledgerFallback,
  };
}
