import { useState } from 'react';
import { PageHead, Skeleton, SkeletonRows } from '../components/ui';
import AuditLogTable from '../components/audit-log/AuditLogTable';
import AuditDistributionCharts from '../components/audit-log/AuditDistributionCharts';
import AuditFilterBar from '../components/audit-log/AuditFilterBar';
import AuditSummaryCard from '../components/audit-log/AuditSummaryCard';
import { useAuditLogFetcher } from '../components/audit-log/useAuditLogFetcher';
import { useAuditLogAnalytics } from '../components/audit-log/useAuditLogAnalytics';

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

  const {
    activeActionLabel,
    actionDistribution,
    methodDistribution,
    statusDistribution,
    timeSummary,
    statusSummary,
  } = useAuditLogAnalytics(logs, filterAction);

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
