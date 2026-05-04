import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../../lib/api';
import type { LogRecord, LogsResponse } from './lib';

interface Args {
  page: number;
  pageSize: 10 | 25 | 50 | 100;
  filterAction: string;
  filterWriteOnly: boolean;
  autoRefresh: boolean;
}

export function useAuditLogFetcher({ page, pageSize, filterAction, filterWriteOnly, autoRefresh }: Args) {
  const [logs, setLogs] = useState<LogRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const intervalRef = useRef<number | null>(null);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(pageSize) });
      if (filterAction) params.set('action', filterAction);
      if (filterWriteOnly) params.set('writeOnly', 'true');
      const data = await api.get<LogsResponse>(`/audit?${params.toString()}`);
      setLogs(data.records || []);
      setTotal(data.total || 0);
      setErrorMsg('');
    } catch (e: unknown) {
      setLogs([]);
      setTotal(0);
      setErrorMsg(e instanceof Error ? e.message : 'Audit ledger를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, [filterAction, filterWriteOnly, page, pageSize]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  useEffect(() => {
    if (autoRefresh) {
      intervalRef.current = window.setInterval(fetchLogs, 5000);
    } else if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    return () => {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [autoRefresh, fetchLogs]);

  return { logs, total, loading, errorMsg, fetchLogs };
}
