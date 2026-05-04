import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../lib/api';
import { BarRows, DonutChart, LegendStack, PageHead, Skeleton, SkeletonRows } from '../components/ui';
import {
  ACTION_LABELS,
  ACTION_OPTIONS,
  METHOD_COLORS,
  formatTime,
  isWithinHours,
  type LogRecord,
  type LogsResponse,
} from '../components/audit-log/lib';
import AuditLogTable from '../components/audit-log/AuditLogTable';

export default function AuditLogPage() {
  const [logs, setLogs] = useState<LogRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<10 | 25 | 50 | 100>(10);
  const [filterAction, setFilterAction] = useState('');
  const [filterWriteOnly, setFilterWriteOnly] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const intervalRef = useRef<number | null>(null);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

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

      <section className="sn-section-card">
        <div className="sn-section-head">
          <div className="sn-section-head-row">
            <div>
              <p className="sn-eyebrow" style={{ margin: '0 0 0.4rem', color: 'var(--color-text-3)' }}>{ledgerScopeLabel}</p>
              <h2 className="sn-heading" style={{ margin: 0, fontSize: '1.25rem' }}>원장 등재 요약</h2>
              <p className="sn-caption" style={{ margin: '0.45rem 0 0', maxWidth: '48rem' }}>
                기존 audit endpoint의 페이지, action, writeOnly 조건을 그대로 사용해 기록을 좁히고, 펼친 행에서만 요청 데이터를 확인합니다.
              </p>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              <span className="sn-detail-inline-stamp">GET /api/audit</span>
              <span className="sn-detail-inline-stamp">limit 50</span>
              <span className="sn-detail-inline-stamp">page {page}/{totalPages}</span>
            </div>
          </div>
        </div>

        <div className="sn-info-grid sn-info-grid-auto">
          <div className="sn-info-tile">
            <p className="sn-eyebrow" style={{ margin: '0 0 0.5rem', color: 'var(--color-accent)' }}>원장 파일</p>
            <p className="sn-info-tile-value" style={{ color: 'var(--color-accent)' }}>{total}</p>
            <p className="sn-stat-note">현재 조건의 전체 건수</p>
          </div>
          <div className="sn-info-tile">
            <p className="sn-eyebrow" style={{ margin: '0 0 0.5rem', color: filterWriteOnly ? 'var(--color-success)' : 'var(--color-text-3)' }}>쓰기 범위</p>
            <p className="sn-info-tile-value" style={{ color: filterWriteOnly ? 'var(--color-success)' : 'var(--color-text-1)' }}>{filterWriteOnly ? 'ON' : 'ALL'}</p>
            <p className="sn-stat-note">{filterWriteOnly ? 'writeOnly=true 적용' : 'writeOnly 조건 해제'}</p>
          </div>
          <div className="sn-info-tile">
            <p className="sn-eyebrow" style={{ margin: '0 0 0.5rem' }}>작업 필터</p>
            <p className="sn-info-tile-value" style={{ fontSize: '1.35rem', lineHeight: 1.15 }}>{activeActionLabel}</p>
            <p className="sn-stat-note">기존 action label 유지</p>
          </div>
          <div className="sn-info-tile">
            <p className="sn-eyebrow" style={{ margin: '0 0 0.5rem', color: autoRefresh ? 'var(--color-accent)' : 'var(--color-text-3)' }}>새로고침</p>
            <p className="sn-info-tile-value" style={{ color: autoRefresh ? 'var(--color-accent)' : 'var(--color-text-1)' }}>{autoRefresh ? '5s' : 'Manual'}</p>
            <p className="sn-stat-note">최근 기록 {newestTimestamp ? formatTime(newestTimestamp) : '대기 중'}</p>
          </div>
        </div>

        <div className="sn-summary-grid sn-summary-grid-3" style={{ borderTop: '1px solid var(--color-border)' }}>
          <div className="sn-summary-lead">
            <p className="sn-eyebrow sn-summary-title" style={{ margin: '0 0 0.4rem' }}>등록부 상태</p>
            <p className="sn-summary-copy-strong" style={{ margin: 0, color: 'var(--color-text-1)' }}>행위 · 응답 · 증빙 상세</p>
            <p className="sn-stat-note" style={{ margin: '0.35rem 0 0', lineHeight: 1.6 }}>
              피드는 실제 audit log만 렌더링하며, 빈 상태나 오류 상태에서는 대체 행을 만들지 않습니다.
            </p>
          </div>
          <div>
            <p className="sn-eyebrow sn-stat-card-title">최근 24시간</p>
            <p className="sn-metric sn-metric-md sn-stat-count">{timeSummary.last24h}</p>
            <p className="sn-stat-note">현재 페이지 기록 기준</p>
          </div>
          <div>
            <p className="sn-eyebrow sn-stat-card-title">최근 7일</p>
            <p className="sn-metric sn-metric-md sn-stat-count">{timeSummary.last7d}</p>
            <p className="sn-stat-note">현재 페이지 기록 기준</p>
          </div>
        </div>
      </section>

      {hasRecords && (
        <section className="sn-section-card" style={{ padding: '20px 22px', maxWidth: 1080 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(18rem, auto) 1fr', gap: 32, alignItems: 'start' }}>
            <div>
              <p className="sn-eyebrow" style={{ margin: '0 0 0.4rem', color: 'var(--color-text-3)' }}>방식 분포</p>
              <h2 className="sn-heading" style={{ margin: '0 0 1rem', fontSize: '1.125rem' }}>HTTP 메서드 등록부</h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
                <DonutChart
                  segments={methodDistribution}
                  size={150}
                  thickness={18}
                  centerLabel="method"
                  centerValue={String(logs.length)}
                />
                <LegendStack items={methodDistribution} />
              </div>
            </div>
            <div>
              <p className="sn-eyebrow" style={{ margin: '0 0 0.4rem', color: 'var(--color-text-3)' }}>작업 원장</p>
              <h2 className="sn-heading" style={{ margin: '0 0 1rem', fontSize: '1.125rem' }}>상위 행위 분포</h2>
              <BarRows
                items={actionDistribution.map(({ action, count }) => ({
                  label: ACTION_LABELS[action] || action,
                  value: count,
                  hint: '건',
                }))}
              />
            </div>
          </div>
        </section>
      )}

      {hasRecords && (
        <section className="sn-section-card" style={{ padding: '18px 22px', maxWidth: 1080 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 0.9fr) minmax(260px, 1.1fr)', gap: '1.25rem', alignItems: 'start' }}>
            <div>
              <p className="sn-eyebrow" style={{ margin: '0 0 0.4rem', color: 'var(--color-text-3)' }}>상태 분포</p>
              <h2 className="sn-heading" style={{ margin: '0 0 0.55rem', fontSize: '1.125rem' }}>응답 상태 등록부</h2>
              <p className="sn-caption" style={{ margin: 0 }}>
                {statusSummary
                  ? `성공 ${statusSummary.success}건, 실패 ${statusSummary.fail}건 · 성공률 ${statusSummary.successPct}%`
                  : '상태 코드가 있는 로그가 없습니다.'}
              </p>
            </div>
            {statusDistribution.length > 0 ? (
              <BarRows items={statusDistribution} max={Math.max(...statusDistribution.map((item) => item.value), 1)} />
            ) : (
              <p className="sn-caption" style={{ margin: 0 }}>상태 코드 정보 없음</p>
            )}
          </div>
        </section>
      )}

      <section className="sn-section-card">
        <div className="sn-section-head">
          <div className="sn-section-head-row">
            <div>
              <p className="sn-eyebrow" style={{ margin: '0 0 0.4rem', color: 'var(--color-text-3)' }}>원장 제어</p>
              <h2 className="sn-heading" style={{ margin: 0, fontSize: '1.25rem' }}>감사 등록 필터</h2>
              <p className="sn-caption" style={{ margin: '0.45rem 0 0', maxWidth: '44rem' }}>
                Action 필터와 write-only 토글은 기존 `/audit` 쿼리 파라미터를 그대로 구성합니다.
              </p>
            </div>
          </div>
        </div>

        <div className="sn-toolbar" style={{ padding: '0.9rem 1.25rem', background: 'var(--color-surface)' }}>
          <div style={{ flex: 1, minWidth: 180 }}>
            <label className="sn-eyebrow" style={{ display: 'block', marginBottom: 8 }}>행위</label>
            <select
              value={filterAction}
              onChange={(e) => handleActionChange(e.target.value)}
              className="sn-input"
              style={{ minWidth: 180, fontSize: '0.9375rem' }}
            >
              {ACTION_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <label className="sn-panel" style={{ minHeight: 44, display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer', userSelect: 'none', padding: '0.55rem 0.9rem' }}>
            <input
              type="checkbox"
              checked={filterWriteOnly}
              onChange={(e) => handleWriteOnlyChange(e.target.checked)}
              style={{ width: 16, height: 16, accentColor: 'var(--color-text-1)', borderRadius: 4 }}
            />
            <span style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--color-text-2)' }}>쓰기 작업만</span>
          </label>
          <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)', fontSize: '0.875rem', color: 'var(--color-text-3)' }}>
            총 {total}건
          </span>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', padding: '0 1.25rem 1rem', background: 'var(--color-surface)' }}>
          <span className="sn-detail-inline-stamp">action {filterAction || 'ALL'}</span>
          <span className="sn-detail-inline-stamp">writeOnly {filterWriteOnly ? 'true' : 'false'}</span>
          <span className="sn-detail-inline-stamp">표시 {logs.length}</span>
        </div>
      </section>

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
