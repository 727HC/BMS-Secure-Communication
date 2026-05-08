import { useCallback, useEffect, useState } from 'react';
import { api } from '../../lib/api';
import type { Passport, BmuRecord, Credential, IssuerCatalogItem } from './types';

const DETAIL_REFRESH_MS = 3000;

function errorMessage(reason: unknown) {
  return reason instanceof Error ? reason.message : '여권을 불러오지 못했습니다.';
}

interface Args {
  id: string | undefined;
  activeTab: string;
  org: string | null;
}

export function usePassportDetailData({ id, activeTab, org }: Args) {
  const [passport, setPassport] = useState<Passport | null>(null);
  const [loading, setLoading] = useState(true);
  const [bmuRecords, setBmuRecords] = useState<BmuRecord[]>([]);
  const [vcList, setVcList] = useState<Credential[]>([]);
  const [issuers, setIssuers] = useState<IssuerCatalogItem[]>([]);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const fetchAll = useCallback(async ({ silent = false }: { silent?: boolean } = {}) => {
    if (!id) {
      setPassport(null);
      setBmuRecords([]);
      setFetchError('요청한 여권 ID가 없습니다.');
      if (!silent) setLoading(false);
      return;
    }
    if (!silent) setLoading(true);
    setFetchError(null);
    try {
      const [p, bmu] = await Promise.allSettled([
        api.get<Passport>(`/realtime/passports/${encodeURIComponent(id)}`),
        api.get<{ records?: BmuRecord[] } | BmuRecord[]>(`/realtime/bmu/${encodeURIComponent(id)}`),
      ]);
      if (p.status === 'fulfilled') {
        setPassport(p.value);
      } else {
        setPassport(null);
        setFetchError(errorMessage(p.reason));
      }
      if (bmu.status === 'fulfilled') {
        const data = bmu.value;
        setBmuRecords(Array.isArray(data) ? data : data.records || []);
      } else {
        setBmuRecords([]);
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchAll();
    const intervalId = window.setInterval(() => {
      fetchAll({ silent: true });
    }, DETAIL_REFRESH_MS);
    return () => window.clearInterval(intervalId);
  }, [fetchAll]);

  useEffect(() => {
    if (!id || activeTab !== 'trust') return;
    let cancelled = false;
    (async () => {
      try {
        const data = await api.get<{ credentials?: Credential[] } | Credential[]>(`/vc/passport/${encodeURIComponent(id)}`);
        if (!cancelled) setVcList(Array.isArray(data) ? data : data.credentials || []);
      } catch {
        if (!cancelled) setVcList([]);
      }
      if (org === 'RegulatorMSP') {
        try {
          const issuerData = await api.get<{ issuers: string[] }>('/vc/issuers');
          const names = issuerData.issuers || [];
          const catalog = await Promise.all(names.map(async (issuerMsp) => {
            try {
              const typeData = await api.get<{ issuerMsp: string; types: string[] }>(`/vc/issuers/${encodeURIComponent(issuerMsp)}/types`);
              return { issuerMsp, types: typeData.types || [] };
            } catch {
              return { issuerMsp, types: [] };
            }
          }));
          if (!cancelled) setIssuers(catalog);
        } catch {
          if (!cancelled) setIssuers([]);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [activeTab, id, org]);

  return {
    passport,
    bmuRecords,
    vcList,
    issuers,
    loading,
    fetchError,
    refetch: fetchAll,
  };
}
