import { useEffect, useState } from 'react';
import type { SetURLSearchParams } from 'react-router-dom';
import { api } from '../../lib/api';
import {
  AUDIT_ALLOWED_ORGS,
  DASHBOARD_AUDIT_PATH,
  SOURCE_IDLE,
  errorMessage,
  isPermissionError,
  normalizeAuditRecord,
  normalizeBmuRecord,
  normalizeList,
  normalizePassport,
  normalizeStatus,
  sourceError,
  sourceLoaded,
  sourceLoading,
  type DashboardAuditRecord,
  type DashboardBmuRecord,
  type DashboardPassport,
  type DashboardSourceState,
  type DashboardStatus,
} from './lib';

interface Args {
  hasDashboardAuth: boolean;
  org: string | null;
  token: string | null;
  userId: string | null;
  requestedPassportId: string | null;
  searchParams: URLSearchParams;
  setSearchParams: SetURLSearchParams;
}

interface Return {
  passports: DashboardPassport[];
  platformStatus: DashboardStatus | null;
  bmuRecords: DashboardBmuRecord[];
  auditRecords: DashboardAuditRecord[];
  selectedPassportId: string | null;
  passportSource: DashboardSourceState;
  statusSource: DashboardSourceState;
  bmuSource: DashboardSourceState;
  auditSource: DashboardSourceState;
}

export function useDashboardData({
  hasDashboardAuth,
  org,
  token,
  userId,
  requestedPassportId,
  searchParams,
  setSearchParams,
}: Args): Return {
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

  return {
    passports,
    platformStatus,
    bmuRecords,
    auditRecords,
    selectedPassportId,
    passportSource,
    statusSource,
    bmuSource,
    auditSource,
  };
}
