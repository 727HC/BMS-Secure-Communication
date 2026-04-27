import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../lib/api';
import { BarRows, DonutChart, LegendStack, PageHead, Skeleton, SkeletonRows } from '../components/ui';

interface LogRecord {
  id: string;
  action?: string;
  timestamp?: string;
  userId?: string;
  orgMsp?: string;
  method?: string;
  path?: string;
  statusCode?: number;
  ip?: string;
  duration?: number;
  requestBody?: unknown;
}

interface LogsResponse {
  records?: LogRecord[];
  total?: number;
}

const ACTION_LABELS: Record<string, string> = {
  LOGIN: '로그인', REGISTER: '회원가입',
  CREATE_PASSPORT: '여권 생성', BIND_VEHICLE: 'VIN 바인딩',
  UPLOAD_IMAGE: '이미지 업로드', RECORD_BMU: 'BMU 데이터',
  REGISTER_MATERIAL: '원자재 등록',
  REQUEST_MAINTENANCE: '정비 요청', LOG_MAINTENANCE: '정비 기록',
  LOG_ACCIDENT: '사고 기록',
  REQUEST_ANALYSIS: '분석 요청', SUBMIT_ANALYSIS: '분석 결과',
  SET_RECYCLE: '재활용 판정', EXTRACT_MATERIALS: '원자재 추출',
  DISPOSE_BATTERY: '배터리 폐기',
  ISSUE_VC: 'VC 발급', REVOKE_VC: 'VC 폐기', VERIFY_VC: 'VC 검증',
  QUERY: '조회', OTHER: '기타',
};

const ACTION_OPTIONS = [
  { value: '', label: '전체' },
  { value: 'CREATE_PASSPORT', label: '여권 생성' },
  { value: 'BIND_VEHICLE', label: 'VIN 바인딩' },
  { value: 'RECORD_BMU', label: 'BMU 데이터' },
  { value: 'REGISTER_MATERIAL', label: '원자재 등록' },
  { value: 'REQUEST_MAINTENANCE', label: '정비 요청' },
  { value: 'LOG_MAINTENANCE', label: '정비 기록' },
  { value: 'LOG_ACCIDENT', label: '사고 기록' },
  { value: 'REQUEST_ANALYSIS', label: '분석 요청' },
  { value: 'SUBMIT_ANALYSIS', label: '분석 결과' },
  { value: 'DISPOSE_BATTERY', label: '배터리 폐기' },
  { value: 'ISSUE_VC', label: 'VC 발급' },
  { value: 'LOGIN', label: '로그인' },
];

const METHOD_COLORS: Record<string, string> = {
  GET: 'var(--color-accent)',
  POST: 'var(--color-success)',
  PUT: 'var(--color-warning)',
  DELETE: 'var(--color-danger)',
  PATCH: 'var(--color-text-2)',
};

function formatTime(ts?: string): string {
  if (!ts) return '-';
  try { return new Date(ts).toLocaleString('ko-KR'); }
  catch { return ts; }
}

function relativeTime(ts?: string): string {
  if (!ts) return '';
  const diff = Date.now() - new Date(ts).getTime();
  if (diff < 0) return '방금';
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return `${seconds}초 전`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}일 전`;
  return '';
}

function getStatusStyle(code?: number): { color: string; bg: string; label: string } {
  if (!code) return { color: 'var(--color-text-3)', bg: 'var(--color-surface-alt)', label: '상태 없음' };
  if (code < 300) return { color: 'var(--color-success)', bg: 'var(--color-success-soft)', label: '성공' };
  if (code < 400) return { color: 'var(--color-accent)', bg: 'var(--color-surface-accent)', label: '전환' };
  if (code < 500) return { color: 'var(--color-warning)', bg: 'var(--color-warning-soft)', label: '클라이언트 오류' };
  return { color: 'var(--color-danger)', bg: 'var(--color-danger-soft)', label: '서버 오류' };
}

function isWithinHours(ts: string | undefined, hours: number): boolean {
  if (!ts) return false;
  return Date.now() - new Date(ts).getTime() < hours * 3600 * 1000;
}

export default function AuditLogPage() {
  const [logs, setLogs] = useState<LogRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [filterAction, setFilterAction] = useState('');
  const [filterWriteOnly, setFilterWriteOnly] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const intervalRef = useRef<number | null>(null);

  const totalPages = Math.max(1, Math.ceil(total / 50));

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '50' });
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
  }, [filterAction, filterWriteOnly, page]);

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

  const pageStart = total > 0 ? (page - 1) * 50 + 1 : 0;
  const pageEnd = Math.min(page * 50, total);
  const newestTimestamp = logs[0]?.timestamp;
  const ledgerScopeLabel = filterWriteOnly ? 'Write-only ledger' : 'Full audit ledger';
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
        eyebrow="Audit register"
        eyebrowColor="var(--color-accent)"
        title="Audit / Ledger"
        subtitle={`총 ${total}건의 API 행위와 응답 근거를 ledger/register 기준으로 확인합니다.`}
        actions={(
          <>
            <div className="sn-kpi-mini">
              <p className="sn-eyebrow" style={{ margin: '0 0 0.3rem' }}>현재 페이지</p>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-text-1)', margin: 0 }}>
                {logs.length}
              </p>
            </div>
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
              <h2 className="sn-heading" style={{ margin: 0, fontSize: '1.25rem' }}>Ledger filing summary</h2>
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
            <p className="sn-eyebrow" style={{ margin: '0 0 0.5rem', color: 'var(--color-accent)' }}>Ledger files</p>
            <p className="sn-info-tile-value" style={{ color: 'var(--color-accent)' }}>{total}</p>
            <p className="sn-stat-note">현재 조건의 전체 건수</p>
          </div>
          <div className="sn-info-tile">
            <p className="sn-eyebrow" style={{ margin: '0 0 0.5rem', color: filterWriteOnly ? 'var(--color-success)' : 'var(--color-text-3)' }}>Write scope</p>
            <p className="sn-info-tile-value" style={{ color: filterWriteOnly ? 'var(--color-success)' : 'var(--color-text-1)' }}>{filterWriteOnly ? 'ON' : 'ALL'}</p>
            <p className="sn-stat-note">{filterWriteOnly ? 'writeOnly=true 적용' : 'writeOnly 조건 해제'}</p>
          </div>
          <div className="sn-info-tile">
            <p className="sn-eyebrow" style={{ margin: '0 0 0.5rem' }}>Action filter</p>
            <p className="sn-info-tile-value" style={{ fontSize: '1.35rem', lineHeight: 1.15 }}>{activeActionLabel}</p>
            <p className="sn-stat-note">기존 action label 유지</p>
          </div>
          <div className="sn-info-tile">
            <p className="sn-eyebrow" style={{ margin: '0 0 0.5rem', color: autoRefresh ? 'var(--color-accent)' : 'var(--color-text-3)' }}>Refresh</p>
            <p className="sn-info-tile-value" style={{ color: autoRefresh ? 'var(--color-accent)' : 'var(--color-text-1)' }}>{autoRefresh ? '5s' : 'Manual'}</p>
            <p className="sn-stat-note">최근 기록 {newestTimestamp ? formatTime(newestTimestamp) : '대기 중'}</p>
          </div>
        </div>

        <div className="sn-summary-grid sn-summary-grid-3" style={{ borderTop: '1px solid var(--color-border)' }}>
          <div className="sn-summary-lead">
            <p className="sn-eyebrow sn-summary-title" style={{ margin: '0 0 0.4rem' }}>Register posture</p>
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
        <section className="sn-section-card" style={{ padding: '20px 22px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(18rem, auto) 1fr', gap: 32, alignItems: 'start' }}>
            <div>
              <p className="sn-eyebrow" style={{ margin: '0 0 0.4rem', color: 'var(--color-text-3)' }}>Method distribution</p>
              <h2 className="sn-heading" style={{ margin: '0 0 1rem', fontSize: '1.125rem' }}>HTTP method register</h2>
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
              <p className="sn-eyebrow" style={{ margin: '0 0 0.4rem', color: 'var(--color-text-3)' }}>Action ledger</p>
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
        <section className="sn-section-card" style={{ padding: '18px 22px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 0.9fr) minmax(260px, 1.1fr)', gap: '1.25rem', alignItems: 'start' }}>
            <div>
              <p className="sn-eyebrow" style={{ margin: '0 0 0.4rem', color: 'var(--color-text-3)' }}>Status distribution</p>
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
              <p className="sn-eyebrow" style={{ margin: '0 0 0.4rem', color: 'var(--color-text-3)' }}>Ledger controls</p>
              <h2 className="sn-heading" style={{ margin: 0, fontSize: '1.25rem' }}>Audit register filters</h2>
              <p className="sn-caption" style={{ margin: '0.45rem 0 0', maxWidth: '44rem' }}>
                Action 필터와 write-only 토글은 기존 `/audit` 쿼리 파라미터를 그대로 구성합니다.
              </p>
            </div>
          </div>
        </div>

        <div className="sn-toolbar" style={{ padding: '0.9rem 1.25rem', background: 'var(--color-surface)' }}>
          <div style={{ flex: 1, minWidth: 180 }}>
            <label className="sn-eyebrow" style={{ display: 'block', marginBottom: 8 }}>Action</label>
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
            {filterAction ? `${activeActionLabel} ledger 항목이 없습니다.` : '표시할 audit ledger 항목이 없습니다.'}
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
        <section className="sn-section-card" style={{ overflow: 'hidden' }}>
          <div className="sn-section-head">
            <div className="sn-section-head-row">
              <div>
                <p className="sn-eyebrow" style={{ margin: '0 0 0.4rem', color: 'var(--color-text-3)' }}>Audit feed</p>
                <h2 className="sn-heading" style={{ margin: 0, fontSize: '1.25rem' }}>Ledger entries</h2>
                <p className="sn-caption" style={{ margin: '0.45rem 0 0' }}>행을 선택하면 기존 상세 필드와 요청 데이터 영역을 펼칩니다.</p>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                <span className="sn-detail-inline-stamp">{pageStart}-{pageEnd}</span>
                <span className="sn-detail-inline-stamp">total {total}</span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', background: 'var(--color-border)', gap: 1 }}>
            {logs.map((log) => {
              const statusStyle = getStatusStyle(log.statusCode);
              const expanded = expandedId === log.id;
              return (
                <div key={log.id}>
                  <div
                    onClick={() => toggleDetail(log.id)}
                    style={{
                      background: expanded ? 'var(--color-surface-alt)' : 'var(--color-surface)',
                      padding: '0.9rem 1rem',
                      display: 'grid',
                      gridTemplateColumns: 'auto minmax(0, 1fr) auto',
                      gap: '0.85rem',
                      alignItems: 'flex-start',
                      cursor: 'pointer',
                    }}
                  >
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        marginTop: '0.45rem',
                        flexShrink: 0,
                        background: statusStyle.color,
                      }}
                    />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--color-text-1)' }}>
                          {ACTION_LABELS[log.action || 'OTHER'] || log.action}
                        </span>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8125rem', color: 'var(--color-text-3)' }}>{relativeTime(log.timestamp)}</span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 8px', borderRadius: 999, background: statusStyle.bg, color: statusStyle.color, fontSize: '0.8125rem', fontWeight: 700 }}>
                          {statusStyle.label}
                        </span>
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem', fontSize: '0.9375rem', color: 'var(--color-text-3)' }}>
                        <span>{log.userId || (log.action === 'RECORD_BMU' ? '시스템(BMU)' : '-')}</span>
                        {log.orgMsp && <span>· {log.orgMsp}</span>}
                        {log.path && (
                          <span style={{ fontFamily: 'var(--font-mono)' }}>· {log.method} {log.path}</span>
                        )}
                        <span style={{ fontFamily: 'var(--font-mono)' }}>· {formatTime(log.timestamp)}</span>
                      </div>
                    </div>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
                      <span
                        style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: '0.8125rem',
                          padding: '0.2rem 0.45rem',
                          borderRadius: 8,
                          flexShrink: 0,
                          background: statusStyle.bg,
                          color: statusStyle.color,
                          fontWeight: 700,
                        }}
                      >
                        {log.statusCode || '—'}
                      </span>
                      <svg
                        style={{
                          width: 12,
                          height: 12,
                          color: 'var(--color-text-2)',
                          transition: 'transform 0.2s',
                          transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
                          flexShrink: 0,
                        }}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth="2.5"
                      >
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                    </div>
                  </div>

                  {expanded && (
                    <div style={{ background: 'var(--color-surface-alt)', borderTop: '1px solid var(--color-border)', padding: '12px 16px 16px' }}>
                      <div style={{ background: 'var(--color-surface)', boxShadow: 'inset 0 0 0 1px var(--color-border)', borderRadius: 12, padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
                          {[
                            { k: '로그 ID', v: log.id, mono: true },
                            { k: 'HTTP 메서드', v: log.method, mono: true },
                            { k: '경로', v: log.path, mono: true },
                            { k: '상태 코드', v: log.statusCode, mono: true, color: statusStyle.color },
                            { k: 'IP', v: log.ip || '-', mono: true },
                            { k: '응답 시간', v: `${log.duration ?? '-'}ms`, mono: true },
                            { k: '사용자', v: log.userId || '(미인증)', mono: false },
                            { k: '조직', v: log.orgMsp || '(없음)', mono: false },
                          ].map(({ k, v, mono, color }) => (
                            <div key={k}>
                              <p className="sn-eyebrow" style={{ margin: '0 0 0.2rem', color: 'var(--color-text-3)' }}>{k}</p>
                              <p
                                style={{
                                  fontFamily: mono ? 'var(--font-mono)' : undefined,
                                  fontSize: '0.875rem',
                                  color: color || 'var(--color-text-2)',
                                  wordBreak: 'break-all',
                                  margin: 0,
                                }}
                              >
                                {v || '-'}
                              </p>
                            </div>
                          ))}
                        </div>
                        {log.requestBody !== undefined && log.requestBody !== null && (
                          <div>
                            <p className="sn-eyebrow" style={{ margin: '0 0 6px' }}>요청 데이터</p>
                            <pre
                              style={{
                                fontFamily: 'var(--font-mono)',
                                fontSize: '0.875rem',
                                color: 'var(--color-text-2)',
                                background: 'var(--color-surface-alt)',
                                boxShadow: 'inset 0 0 0 1px var(--color-border)',
                                borderRadius: 8,
                                padding: 12,
                                overflowX: 'auto',
                                maxHeight: 160,
                                margin: 0,
                              }}
                            >
                              {JSON.stringify(log.requestBody, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div style={{ padding: '12px 20px', borderTop: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8125rem', color: 'var(--color-text-3)' }}>
              {total}건 중 {pageStart}~{pageEnd}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button
                onClick={() => page > 1 && setPage(page - 1)}
                disabled={page <= 1}
                className="sn-btn sn-btn-ghost"
                style={{ fontSize: '0.8125rem', padding: '6px 12px', opacity: page <= 1 ? 0.3 : 1, cursor: page <= 1 ? 'not-allowed' : 'pointer' }}
              >
                이전
              </button>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8125rem', color: 'var(--color-text-3)', fontVariantNumeric: 'tabular-nums' }}>
                {page} / {totalPages}
              </span>
              <button
                onClick={() => page < totalPages && setPage(page + 1)}
                disabled={page >= totalPages}
                className="sn-btn sn-btn-ghost"
                style={{ fontSize: '0.8125rem', padding: '6px 12px', opacity: page >= totalPages ? 0.3 : 1, cursor: page >= totalPages ? 'not-allowed' : 'pointer' }}
              >
                다음
              </button>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
