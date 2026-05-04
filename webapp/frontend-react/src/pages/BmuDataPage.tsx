import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { BarRows, PageHead } from '../components/ui';
import BmuRecordsTable from '../components/bmu-data/BmuRecordsTable';
import BmuSnapshotCard from '../components/bmu-data/BmuSnapshotCard';
import BmuSearchPanel from '../components/bmu-data/BmuSearchPanel';
import BmuStateView from '../components/bmu-data/BmuStateView';
import { useBmuDataFetcher } from '../components/bmu-data/useBmuDataFetcher';
import { useBmuAnalytics } from '../components/bmu-data/useBmuAnalytics';

export default function BmuDataPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [passportId, setPassportId] = useState(() => searchParams.get('id') || '');
  const [autoRefresh, setAutoRefresh] = useState(false);

  const {
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
  } = useBmuDataFetcher({ passportId, autoRefresh });

  const { sortedRecords, recentSlice, eventDistribution, latestRecord } = useBmuAnalytics(records);

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

  const requestPathLabel = hasSearched && passportId.trim()
    ? `/api/realtime/bmu/${passportId.trim()}`
    : '/api/realtime/bmu/:idOrDid';

  const handleSearch = () => {
    const id = passportId.trim();
    if (id) {
      const next = new URLSearchParams(searchParams);
      if (next.get('id') !== id) {
        next.set('id', id);
        setSearchParams(next, { replace: true });
      }
      resetSearchState();
      fetchRecords(autoRefresh, loading);
    }
  };

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
