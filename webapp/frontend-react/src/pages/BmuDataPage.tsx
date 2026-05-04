import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../lib/api';
import { scaleSOC, scaleTemp } from '../lib/helpers';
import { BarRows, PageHead } from '../components/ui';
import { type BmuRecord } from '../components/bmu-data/lib';
import BmuRecordsTable from '../components/bmu-data/BmuRecordsTable';
import BmuSnapshotCard from '../components/bmu-data/BmuSnapshotCard';
import BmuSearchPanel from '../components/bmu-data/BmuSearchPanel';
import BmuStateView from '../components/bmu-data/BmuStateView';

export default function BmuDataPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [passportId, setPassportId] = useState(() => searchParams.get('id') || '');
  const [records, setRecords] = useState<BmuRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [accessDenied, setAccessDenied] = useState(false);
  const [lastFetchedAt, setLastFetchedAt] = useState<Date | null>(null);
  const [countdown, setCountdown] = useState(10);
  const intervalRef = useRef<number | null>(null);
  const countdownRef = useRef<number | null>(null);

  const sortedRecords = useMemo(
    () =>
      [...records].sort((a, b) => {
        const tA = new Date(a.timestamp || 0).getTime() || 0;
        const tB = new Date(b.timestamp || 0).getTime() || 0;
        return tB - tA;
      }),
    [records]
  );

  const RECORDS_PAGE_SIZE = 25;
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(sortedRecords.length / RECORDS_PAGE_SIZE));
  const pagedRecords = useMemo(() => {
    const start = (currentPage - 1) * RECORDS_PAGE_SIZE;
    return sortedRecords.slice(start, start + RECORDS_PAGE_SIZE);
  }, [sortedRecords, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [passportId]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [totalPages, currentPage]);

  const showingFrom = sortedRecords.length ? (currentPage - 1) * RECORDS_PAGE_SIZE + 1 : 0;
  const showingTo = Math.min(currentPage * RECORDS_PAGE_SIZE, sortedRecords.length);

  // 스파크라인용 최근 15개 데이터 (오래된→최신 순)
  const recentSlice = useMemo(() => {
    const slice = sortedRecords.slice(0, 60).reverse();
    return {
      soc: slice.map((r) => scaleSOC(r.soc)),
      voltage: slice.map((r) => (r.voltage != null ? Number(r.voltage) : 0)),
      current: slice.map((r) => (r.current != null ? Number(r.current) : 0)),
      temperature: slice.map((r) => {
        const t = scaleTemp(r.temperature);
        return typeof t === 'number' ? t : parseFloat(String(t));
      }),
    };
  }, [sortedRecords]);

  // 이상 이벤트 분포 (BarRows용)
  const eventDistribution = useMemo(() => {
    if (sortedRecords.length === 0) return null;
    let normal = 0, charging = 0, balancing = 0, fault = 0, tempAbnormal = 0;
    for (const r of sortedRecords) {
      const num = typeof r.statusFlags === 'number' ? r.statusFlags : parseInt(String(r.statusFlags), 10);
      const temp = scaleTemp(r.temperature);
      const tempNum = typeof temp === 'number' ? temp : parseFloat(String(temp));
      const isTempAbnormal = !isNaN(tempNum) && (tempNum > 45 || tempNum < -10);
      if (!isNaN(num) && (num & 0x04)) { fault++; continue; }
      if (isTempAbnormal) { tempAbnormal++; continue; }
      if (!isNaN(num) && (num & 0x01)) { charging++; continue; }
      if (!isNaN(num) && (num & 0x02)) { balancing++; continue; }
      normal++;
    }
    return [
      { label: '정상', value: normal, color: 'var(--color-success)' },
      { label: '충전', value: charging, color: 'var(--color-accent)' },
      { label: '밸런싱', value: balancing, color: 'var(--color-success)' },
      { label: '결함', value: fault, color: 'var(--color-danger)' },
      { label: '온도 이상', value: tempAbnormal, color: 'var(--color-warning)' },
    ];
  }, [sortedRecords]);

  // 최신 센서 스냅샷 (첫 번째 레코드)
  const latestRecord = sortedRecords[0] ?? null;
  const requestPathLabel = hasSearched && passportId.trim()
    ? `/api/realtime/bmu/${passportId.trim()}`
    : '/api/realtime/bmu/:idOrDid';

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

  const handleSearch = () => {
    const id = passportId.trim();
    if (id) {
      const next = new URLSearchParams(searchParams);
      if (next.get('id') !== id) {
        next.set('id', id);
        setSearchParams(next, { replace: true });
      }
      setHasSearched(false);
      setErrorMsg('');
      setAccessDenied(false);
      fetchRecords(autoRefresh, loading);
    }
  };

  // F5 / 직접 URL 진입 시 ?id=... 파라미터로 자동 조회
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

  return (
    <div data-page="bmu-data" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <PageHead
        title="BMS 실시간 데이터"
        subtitle="배터리 여권 ID로 BMU 원장 기록을 조회하고 최신 센서 판독값, 이상 플래그, 갱신 상태를 한 화면에서 확인합니다."
        actions={(
          <>
            <label className="sn-panel" style={{ minHeight: 44, display: 'inline-flex', alignItems: 'center', cursor: 'pointer', userSelect: 'none', gap: 10, padding: '0.55rem 0.9rem' }}>
              <div style={{ position: 'relative' }}>
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }}
                />
                <div style={{ width: 40, height: 22, borderRadius: 11, background: autoRefresh ? 'var(--color-success)' : 'var(--color-border)', transition: 'background 0.2s' }} />
                <div style={{ position: 'absolute', top: 3, left: autoRefresh ? 21 : 3, width: 16, height: 16, borderRadius: '50%', background: 'var(--color-surface)', boxShadow: 'var(--shadow-card)', transition: 'left 0.2s' }} />
              </div>
              <span style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--color-text-2)' }}>Auto refresh</span>
              {autoRefresh && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-mono)', fontSize: '0.875rem', fontWeight: 700, color: 'var(--color-success)' }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--color-success)' }} />
                  {countdown}s
                </span>
              )}
            </label>
          </>
        )}
      />

      <BmuSearchPanel
        passportId={passportId}
        onPassportIdChange={setPassportId}
        onSearch={handleSearch}
        loading={loading}
        autoRefresh={autoRefresh}
        countdown={countdown}
        requestPathLabel={requestPathLabel}
        lastFetchedAt={lastFetchedAt}
      />

      <BmuStateView
        loading={loading}
        autoRefresh={autoRefresh}
        hasSearched={hasSearched}
        errorMsg={errorMsg}
        accessDenied={accessDenied}
        recordsCount={records.length}
      />

      {(!loading || autoRefresh) && records.length > 0 && (
        <>
          {latestRecord && (
            <BmuSnapshotCard latestRecord={latestRecord} recentSlice={recentSlice} />
          )}
          {eventDistribution && (
            <section className="sn-section-card" style={{ padding: '16px 20px', maxWidth: 1080 }}>
              <p className="sn-eyebrow" style={{ margin: '0 0 12px', color: 'var(--color-text-2)' }}>이상 이벤트 분포</p>
              <BarRows items={eventDistribution} />
            </section>
          )}
          <BmuRecordsTable
            records={records}
            pagedRecords={pagedRecords}
            passportId={passportId}
            refreshing={refreshing}
            autoRefresh={autoRefresh}
            countdown={countdown}
            currentPage={currentPage}
            totalPages={totalPages}
            showingFrom={showingFrom}
            showingTo={showingTo}
            onPageChange={setCurrentPage}
          />
        </>
      )}
    </div>
  );
}
