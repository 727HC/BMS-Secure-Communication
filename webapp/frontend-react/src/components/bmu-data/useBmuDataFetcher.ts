import { useEffect, useRef, useState } from 'react';
import { api } from '../../lib/api';
import type { BmuRecord } from './lib';

interface Args {
  passportId: string;
  autoRefresh: boolean;
}

export function useBmuDataFetcher({ passportId, autoRefresh }: Args) {
  const [records, setRecords] = useState<BmuRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [accessDenied, setAccessDenied] = useState(false);
  const [lastFetchedAt, setLastFetchedAt] = useState<Date | null>(null);
  const [countdown, setCountdown] = useState(10);
  const intervalRef = useRef<number | null>(null);
  const countdownRef = useRef<number | null>(null);

  const fetchRecords = async (currentAutoRefresh: boolean, currentLoading: boolean) => {
    const id = passportId.trim();
    if (!id) return;
    if (currentAutoRefresh && !currentLoading) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    try {
      const data = await api.get<BmuRecord[] | { records?: BmuRecord[] }>(
        `/realtime/bmu/${encodeURIComponent(id)}`
      );
      const list = Array.isArray(data) ? data : data.records || [];
      setRecords(list);
      setHasSearched(true);
      setLastFetchedAt(new Date());
      setErrorMsg('');
      setAccessDenied(false);
    } catch (e: unknown) {
      setRecords([]);
      setHasSearched(true);
      setLastFetchedAt(null);
      const msg = e instanceof Error ? e.message : 'BMU 데이터 조회 실패';
      setErrorMsg(msg);
      setAccessDenied(/access denied|권한/i.test(msg));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const resetSearchState = () => {
    setHasSearched(false);
    setErrorMsg('');
    setAccessDenied(false);
  };

  useEffect(() => {
    if (passportId.trim() && !hasSearched && !loading) {
      fetchRecords(false, false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (autoRefresh && passportId.trim()) {
      intervalRef.current = window.setInterval(() => {
        fetchRecords(true, false);
      }, 10000);
      countdownRef.current = window.setInterval(() => {
        setCountdown((c) => (c <= 1 ? 10 : c - 1));
      }, 1000);
      setCountdown(10);
    }
    return () => {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (countdownRef.current !== null) {
        clearInterval(countdownRef.current);
        countdownRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRefresh, passportId]);

  return {
    records,
    loading,
    refreshing,
    hasSearched,
    errorMsg,
    accessDenied,
    lastFetchedAt,
    countdown,
    fetchRecords,
    resetSearchState,
  };
}
