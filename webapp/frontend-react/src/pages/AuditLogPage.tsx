import { useMemo, useState } from 'react';
import { PageHead, Skeleton, SkeletonRows } from '../components/ui';
import {
  ACTION_OPTIONS,
  METHOD_COLORS,
  isWithinHours,
} from '../components/audit-log/lib';
import AuditLogTable from '../components/audit-log/AuditLogTable';
import AuditDistributionCharts from '../components/audit-log/AuditDistributionCharts';
import AuditFilterBar from '../components/audit-log/AuditFilterBar';
import AuditSummaryCard from '../components/audit-log/AuditSummaryCard';
import { useAuditLogFetcher } from '../components/audit-log/useAuditLogFetcher';

export default function AuditLogPage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<10 | 25 | 50 | 100>(10);
  const [filterAction, setFilterAction] = useState('');
  const [filterWriteOnly, setFilterWriteOnly] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { logs, total, loading, errorMsg, fetchLogs } = useAuditLogFetcher({
    page,
    pageSize,
    filterAction,
    filterWriteOnly,
    autoRefresh,
  });

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const activeActionLabel = useMemo(() => {
    const found = ACTION_OPTIONS.find((item) => item.value === filterAction);
    return found ? found.label : '전체';
  }, [filterAction]);

  const actionDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const log of logs) {
      const key = log.action || 'OTHER';
      counts[key] = (counts[key] || 0) + 1;
    }
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([action, count]) => ({ action, count }));
  }, [logs]);

  const methodDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const log of logs) {
      const m = (log.method || 'OTHER').toUpperCase();
      counts[m] = (counts[m] || 0) + 1;
    }
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([method, value]) => ({ label: method, value, color: METHOD_COLORS[method] || 'var(--color-text-3)' }));
  }, [logs]);

  const statusDistribution = useMemo(() => {
    const buckets = [
      { key: '2xx', label: '2xx 성공', value: 0, color: 'var(--color-success)' },
      { key: '3xx', label: '3xx 전환', value: 0, color: 'var(--color-accent)' },
      { key: '4xx', label: '4xx 거절', value: 0, color: 'var(--color-warning)' },
      { key: '5xx', label: '5xx 오류', value: 0, color: 'var(--color-danger)' },
    ];
    for (const log of logs) {
      const code = log.statusCode;
      if (!code) continue;
      if (code < 300) buckets[0].value += 1;
      else if (code < 400) buckets[1].value += 1;
      else if (code < 500) buckets[2].value += 1;
      else buckets[3].value += 1;
    }
    return buckets.filter((bucket) => bucket.value > 0);
  }, [logs]);

  const timeSummary = useMemo(() => {
    const last24h = logs.filter((l) => isWithinHours(l.timestamp, 24)).length;
    const last7d = logs.filter((l) => isWithinHours(l.timestamp, 168)).length;
    return { last24h, last7d };
  }, [logs]);

  const statusSummary = useMemo(() => {
    const withCode = logs.filter((l) => l.statusCode);
    if (withCode.length === 0) return null;
    const success = withCode.filter((l) => (l.statusCode || 0) < 400).length;
    const fail = withCode.length - success;
    const successPct = Math.round((success / withCode.length) * 100);
    return { success, fail, successPct, total: withCode.length };
  }, [logs]);

  const pageStart = total > 0 ? (page - 1) * pageSize + 1 : 0;
  const pageEnd = Math.min(page * pageSize, total);
  const newestTimestamp = logs[0]?.timestamp;
  const ledgerScopeLabel = filterWriteOnly ? '쓰기 전용 원장' : '전체 감사 원장';
  const hasRecords = logs.length > 0;

  const toggleDetail = (id: string) => {
    setExpandedId((cur) => (cur === id ? null : id));
  };

  const handleActionChange = (nextAction: string) => {
    setPage(1);
    setFilterAction(nextAction);
  };

  const handleWriteOnlyChange = (nextWriteOnly: boolean) => {
    setPage(1);
    setFilterWriteOnly(nextWriteOnly);
  };

  return (
    <div data-page="audit-log" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <PageHead
        title="감사·원장"
        subtitle={`총 ${total}건의 API 행위와 응답 근거를 ledger/register 기준으로 확인합니다.`}
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
                <div style={{ width: 40, height: 22, borderRadius: 11, background: autoRefresh ? 'var(--color-accent)' : 'var(--color-border)', transition: 'background 0.2s' }} />
                <div style={{ position: 'absolute', top: 3, left: autoRefresh ? 21 : 3, width: 16, height: 16, borderRadius: '50%', background: 'var(--color-surface)', boxShadow: 'var(--shadow-card)', transition: 'left 0.2s' }} />
              </div>
              <span style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--color-text-2)' }}>Auto refresh</span>
              {autoRefresh && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-mono)', fontSize: '0.875rem', fontWeight: 700, color: 'var(--color-accent)' }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--color-accent)' }} />
                  5s
                </span>
              )}
            </label>
            <button onClick={fetchLogs} className="sn-btn sn-btn-ghost" style={{ flexShrink: 0 }}>
              새로고침
            </button>
          </>
        )}
      />

      <AuditSummaryCard
        ledgerScopeLabel={ledgerScopeLabel}
        page={page}
        totalPages={totalPages}
        total={total}
        filterWriteOnly={filterWriteOnly}
        activeActionLabel={activeActionLabel}
        autoRefresh={autoRefresh}
        newestTimestamp={newestTimestamp}
        timeSummary={timeSummary}
      />

      {hasRecords && (
        <AuditDistributionCharts
          logsCount={logs.length}
          methodDistribution={methodDistribution}
          actionDistribution={actionDistribution}
          statusDistribution={statusDistribution}
          statusSummary={statusSummary}
        />
      )}

      <AuditFilterBar
        filterAction={filterAction}
        onActionChange={handleActionChange}
        filterWriteOnly={filterWriteOnly}
        onWriteOnlyChange={handleWriteOnlyChange}
        total={total}
        logsCount={logs.length}
      />

      {loading && logs.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            {[0, 1, 2].map((i) => (
              <div key={i} className="sn-panel" style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                <Skeleton width="45%" height={12} />
                <Skeleton width="60%" height={28} />
                <Skeleton width="80%" height={12} />
              </div>
            ))}
          </div>
          <div className="sn-section-card" style={{ overflow: 'hidden' }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {Array.from({ length: 5 }, (_, i) => (
                <div key={i} style={{ padding: '0.85rem 1rem', borderBottom: '1px solid var(--color-border)', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <Skeleton width={8} height={8} radius={4} style={{ marginTop: 6, flexShrink: 0 }} />
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <SkeletonRows rows={2} height={13} gap={6} />
                  </div>
                  <Skeleton width={42} height={22} radius={6} />
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : errorMsg ? (
        <div className="sn-empty-dashed" style={{ minHeight: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', textAlign: 'center' }}>
          <p className="sn-heading" style={{ fontSize: '1.125rem', margin: '0 0 0.5rem' }}>Audit ledger를 열 수 없습니다.</p>
          <p className="sn-caption" style={{ margin: '0 0 0.9rem', maxWidth: '38rem' }}>
            서버가 반환한 메시지: {errorMsg}. 필터 조건을 유지한 채 새로고침할 수 있습니다.
          </p>
          <button onClick={fetchLogs} className="sn-btn sn-btn-ghost">다시 조회</button>
        </div>
      ) : logs.length === 0 ? (
        <div className="sn-empty-dashed" style={{ minHeight: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', textAlign: 'center' }}>
          <p className="sn-heading" style={{ fontSize: '1.125rem', margin: '0 0 0.5rem' }}>
            {filterAction ? `${activeActionLabel} 원장 항목이 없습니다.` : '표시할 감사 원장 항목이 없습니다.'}
          </p>
          <p className="sn-caption" style={{ margin: '0 0 0.9rem', maxWidth: '38rem' }}>
            {filterAction
              ? `현재 action 필터(${activeActionLabel})와 write-only 조건에 맞는 감사 증빙이 없습니다.`
              : '새로운 쓰기 작업이나 인증 이벤트가 기록되면 이 등록부에 표시됩니다.'}
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '0.5rem' }}>
            <span className="sn-detail-inline-stamp">{ledgerScopeLabel}</span>
            <span className="sn-detail-inline-stamp">fake rows 없음</span>
          </div>
        </div>
      ) : (
        <AuditLogTable logs={logs} expandedId={expandedId} onToggleDetail={toggleDetail} total={total} page={page} totalPages={totalPages} pageSize={pageSize} pageStart={pageStart} pageEnd={pageEnd} onPageChange={setPage} onPageSizeChange={(s) => { setPageSize(s); setPage(1); }} />
      )}
    </div>
  );
}
