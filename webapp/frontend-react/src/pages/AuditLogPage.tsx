import { useEffect, useMemo, useRef, useState } from 'react';
import Spinner from '../components/ui/Spinner';
import { api } from '../lib/api';
import { Skeleton, SkeletonRows } from '../components/ui';
import { DonutChart, BarRows, LegendStack } from '../components/ui/Charts';

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

function getStatusStyle(code?: number): { color: string; bg: string } {
  if (!code) return { color: 'var(--color-text-2)', bg: 'transparent' };
  if (code < 300) return { color: '#34d399', bg: 'rgba(52,211,153,0.1)' };
  if (code < 400) return { color: '#60a5fa', bg: 'rgba(96,165,250,0.1)' };
  if (code < 500) return { color: '#fbbf24', bg: 'rgba(251,191,36,0.1)' };
  return { color: '#ef4444', bg: 'rgba(239,68,68,0.1)' };
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
  const intervalRef = useRef<number | null>(null);

  const totalPages = Math.max(1, Math.ceil(total / 50));

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '50' });
      if (filterAction) params.set('action', filterAction);
      if (filterWriteOnly) params.set('writeOnly', 'true');
      const data = await api.get<LogsResponse>(`/audit?${params.toString()}`);
      setLogs(data.records || []);
      setTotal(data.total || 0);
    } catch {
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, filterAction, filterWriteOnly]);

  useEffect(() => {
    setPage(1);
  }, [filterAction, filterWriteOnly]);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRefresh]);

  const activeActionLabel = useMemo(() => {
    const found = ACTION_OPTIONS.find((item) => item.value === filterAction);
    return found ? found.label : '전체';
  }, [filterAction]);

  // 활동 분류 분포 — 현재 페이지 기반 top 5
  const actionDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const log of logs) {
      const key = log.action || 'OTHER';
      counts[key] = (counts[key] || 0) + 1;
    }
    const sorted = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    const max = sorted[0]?.[1] || 1;
    return sorted.map(([action, count]) => ({ action, count, pct: Math.round((count / max) * 100) }));
  }, [logs]);

  // HTTP method 분포 — DonutChart용
  const METHOD_COLORS: Record<string, string> = {
    GET: '#60a5fa',
    POST: '#10b981',
    PUT: '#f59e0b',
    DELETE: '#ef4444',
    PATCH: '#a78bfa',
  };
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

  // 시간 요약
  const timeSummary = useMemo(() => {
    const last24h = logs.filter((l) => isWithinHours(l.timestamp, 24)).length;
    const last7d = logs.filter((l) => isWithinHours(l.timestamp, 168)).length;
    return { last24h, last7d };
  }, [logs]);

  // 성공/실패 비율
  const statusSummary = useMemo(() => {
    const withCode = logs.filter((l) => l.statusCode);
    if (withCode.length === 0) return null;
    const success = withCode.filter((l) => (l.statusCode || 0) < 400).length;
    const fail = withCode.length - success;
    const successPct = Math.round((success / withCode.length) * 100);
    return { success, fail, successPct, total: withCode.length };
  }, [logs]);

  const toggleDetail = (id: string) => {
    setExpandedId((cur) => (cur === id ? null : id));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* HEADER */}
      <div className="sn-page-head">
        <div className="sn-page-head-main">
          <p className="sn-eyebrow" style={{ margin: '0 0 0.35rem', color: 'var(--color-accent)' }}>감사 기록</p>
          <h1 className="sn-page-title">감사 기록</h1>
          <p className="sn-page-subtitle">총 {total}건의 작업 기록을 시간순으로 확인합니다.</p>
        </div>
        <div className="sn-page-actions">
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', userSelect: 'none' }}>
            <div style={{ position: 'relative' }}>
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }}
              />
              <div style={{ width: 36, height: 20, borderRadius: 10, background: autoRefresh ? 'var(--color-primary)' : 'var(--color-border)', transition: 'background 0.2s' }} />
              <div style={{ position: 'absolute', top: 2, left: autoRefresh ? 18 : 2, width: 16, height: 16, borderRadius: '50%', background: 'var(--color-surface)', boxShadow: 'var(--shadow-card)', transition: 'left 0.2s' }} />
            </div>
            <span style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-text-2)' }}>실시간</span>
          </label>
          <button onClick={fetchLogs} className="sn-btn sn-btn-ghost" style={{ fontSize: '0.875rem' }}>
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            새로고침
          </button>
        </div>
      </div>

      {/* SUMMARY */}
      <div className="sn-panel sn-summary-grid sn-summary-grid-3">
        <div className="sn-summary-lead">
          <p className="sn-eyebrow sn-summary-title">요약</p>
          <p className="sn-summary-copy-strong">행위 → 응답 → 요청 데이터</p>
          <p className="sn-summary-copy">필터로 필요한 기록만 추려 보고, 상세 패널에서 요청 내용을 확인할 수 있습니다.</p>
        </div>
        <div>
          <p className="sn-eyebrow sn-stat-card-title">현재 페이지</p>
          <p className="sn-stat-count">{logs.length}</p>
          <p className="sn-stat-note">표시 중인 기록</p>
        </div>
        <div>
          <p className="sn-eyebrow sn-stat-card-title" style={{ color: '#059669' }}>필터</p>
          <p className="sn-summary-copy-strong" style={{ margin: 0 }}>{filterWriteOnly ? '쓰기 작업만' : '전체 기록'}</p>
          <p className="sn-stat-note">{autoRefresh ? '실시간 확인' : '수동 새로고침'}</p>
        </div>
      </div>

      {/* 활동 요약 패널 — DonutChart(method 분포) + BarRows(action top5) */}
      {logs.length > 0 && (
        <div className="sn-panel" style={{ padding: '16px 20px', display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 28, alignItems: 'start' }}>
          {/* 좌: DonutChart — HTTP method 분포 */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
            <p className="sn-eyebrow" style={{ margin: 0 }}>메서드 분포</p>
            {methodDistribution.length > 0 ? (
              <>
                <DonutChart
                  segments={methodDistribution}
                  size={130}
                  thickness={18}
                  centerLabel="method"
                  centerValue={String(logs.length)}
                />
                <LegendStack items={methodDistribution.map((m) => ({ label: m.label, value: m.value, color: m.color }))} />
              </>
            ) : (
              <p style={{ fontSize: '0.875rem', color: 'var(--color-text-3)' }}>데이터 없음</p>
            )}
          </div>
          {/* 우: BarRows — action top 5 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <p className="sn-eyebrow" style={{ margin: 0 }}>활동 상위 {actionDistribution.length}</p>
            {actionDistribution.length > 0 ? (
              <BarRows
                items={actionDistribution.map(({ action, count }) => ({
                  label: ACTION_LABELS[action] || action,
                  value: count,
                  hint: '건',
                }))}
              />
            ) : (
              <p style={{ fontSize: '0.875rem', color: 'var(--color-text-3)' }}>데이터 없음</p>
            )}
          </div>
        </div>
      )}

      {/* TIME SUMMARY + STATUS BAR */}
      {logs.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {/* 시간별 요약 */}
          <div className="sn-panel" style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <p className="sn-eyebrow" style={{ margin: 0 }}>시간 기준 집계</p>
            <div style={{ display: 'flex', gap: 24 }}>
              <div>
                <p className="sn-metric sn-metric-md" style={{ margin: 0 }}>
                  {timeSummary.last24h}
                </p>
                <p style={{ fontSize: '0.875rem', color: 'var(--color-text-3)', margin: '2px 0 0' }}>지난 24시간</p>
              </div>
              <div style={{ width: 1, background: 'var(--color-border)', alignSelf: 'stretch' }} />
              <div>
                <p className="sn-metric sn-metric-md" style={{ margin: 0 }}>
                  {timeSummary.last7d}
                </p>
                <p style={{ fontSize: '0.875rem', color: 'var(--color-text-3)', margin: '2px 0 0' }}>지난 7일</p>
              </div>
            </div>
            <p style={{ fontSize: '0.875rem', color: 'var(--color-text-3)', margin: 0 }}>현재 페이지 기록 기준</p>
          </div>

          {/* 성공/실패 비율 */}
          <div className="sn-panel" style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <p className="sn-eyebrow" style={{ margin: 0 }}>응답 상태 비율</p>
            {statusSummary ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.9375rem', color: '#10b981', fontWeight: 600 }}>성공 {statusSummary.success}건</span>
                  <span style={{ fontSize: '0.9375rem', color: 'var(--color-text-3)' }}>{statusSummary.successPct}%</span>
                  <span style={{ fontSize: '0.9375rem', color: '#ef4444', fontWeight: 600 }}>실패 {statusSummary.fail}건</span>
                </div>
                <div style={{ height: 8, borderRadius: 4, background: 'var(--color-surface-alt)', overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%',
                      width: `${statusSummary.successPct}%`,
                      background: '#10b981',
                      borderRadius: 4,
                      transition: 'width 0.4s ease',
                    }}
                  />
                </div>
                <p style={{ fontSize: '0.875rem', color: 'var(--color-text-3)', margin: 0 }}>2xx 성공 / 4xx·5xx 실패</p>
              </>
            ) : (
              <p style={{ fontSize: '0.9375rem', color: 'var(--color-text-3)', margin: 0 }}>상태 코드 정보 없음</p>
            )}
          </div>
        </div>
      )}

      {/* FILTERS */}
      <div className="sn-panel sn-toolbar">
        <select
          value={filterAction}
          onChange={(e) => setFilterAction(e.target.value)}
          className="sn-input"
          style={{ minWidth: 140, fontSize: '0.9375rem' }}
        >
          {ACTION_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', userSelect: 'none' }}>
          <input
            type="checkbox"
            checked={filterWriteOnly}
            onChange={(e) => setFilterWriteOnly(e.target.checked)}
            style={{ width: 16, height: 16, accentColor: 'var(--color-text-1)', borderRadius: 4 }}
          />
          <span style={{ fontSize: '0.9375rem', color: 'var(--color-text-2)' }}>쓰기 작업만</span>
        </label>
          <span style={{ marginLeft: 'auto', fontFamily: "'JetBrains Mono',monospace", fontSize: '0.875rem', color: 'var(--color-text-3)' }}>
          총 {total}건
        </span>
      </div>

      {filterAction && (
        <div className="sn-panel" style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <p className="sn-eyebrow" style={{ margin: '0 0 4px' }}>활성 필터</p>
            <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: 'var(--color-text-1)' }}>{activeActionLabel}</p>
          </div>
          <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: '0.875rem', color: 'var(--color-text-2)' }}>{total}건</span>
        </div>
      )}

      {/* FEED / EMPTY / LOADING */}
      {loading && logs.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* 시간 요약 skeleton */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {[0, 1].map((i) => (
              <div key={i} className="sn-panel" style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                <Skeleton width="40%" height={12} />
                <div style={{ display: 'flex', gap: 24 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <Skeleton width={60} height={28} />
                    <Skeleton width={80} height={12} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <Skeleton width={60} height={28} />
                    <Skeleton width={80} height={12} />
                  </div>
                </div>
              </div>
            ))}
          </div>
          {/* 피드 5개 skeleton */}
          <div className="sn-panel" style={{ overflow: 'hidden' }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {Array.from({ length: 5 }, (_, i) => (
                <div key={i} style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--color-border)', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <Skeleton width={8} height={8} radius={4} style={{ marginTop: 6, flexShrink: 0 }} />
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <SkeletonRows rows={2} height={13} gap={6} />
                  </div>
                  <Skeleton width={32} height={20} radius={4} />
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : logs.length === 0 ? (
        <div style={{ padding: '2rem 1.5rem', textAlign: 'center', border: '1px dashed var(--color-border)', borderRadius: '0.5rem' }}>
          <div style={{ width: 44, height: 44, borderRadius: 10, background: 'var(--color-surface-alt)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
            <svg width="22" height="22" fill="none" stroke="var(--color-text-3)" strokeWidth="1.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <p style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--color-text-2)', margin: '0 0 6px' }}>
            {filterAction ? `${activeActionLabel} 작업 기록이 없습니다` : '아직 기록된 작업이 없습니다'}
          </p>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-text-3)', margin: 0 }}>
            {filterAction
              ? `현재 필터(${activeActionLabel})와 일치하는 감사 증빙이 없습니다. 필터를 해제하거나 다른 조건을 선택하세요.`
              : '체인 이벤트가 발생하면 여기에 표시됩니다. 실시간 모드를 켜 두면 자동으로 갱신됩니다.'}
          </p>
        </div>
      ) : (
        <div className="sn-panel" style={{ overflow: 'hidden' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1, background: 'rgba(0,0,0,0.03)' }}>
            {logs.map((log) => {
              const statusStyle = getStatusStyle(log.statusCode);
              const expanded = expandedId === log.id;
              return (
                <div key={log.id}>
                  <div
                    onClick={() => toggleDetail(log.id)}
                    style={{
                      background: expanded ? 'var(--color-surface-alt)' : 'var(--color-surface)',
                      padding: '0.75rem 1rem',
                      display: 'flex',
                      gap: '0.75rem',
                      alignItems: 'flex-start',
                      cursor: 'pointer',
                    }}
                  >
                    <div
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        marginTop: '0.375rem',
                        flexShrink: 0,
                        background: '#16a34a',
                      }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                        <span style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-text-1)' }}>
                          {ACTION_LABELS[log.action || 'OTHER'] || log.action}
                        </span>
                        <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-3)' }}>{relativeTime(log.timestamp)}</span>
                        <svg
                          style={{
                            width: 10,
                            height: 10,
                            color: 'var(--color-text-2)',
                            transition: 'transform 0.2s',
                            transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
                            marginLeft: 'auto',
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
                      <div style={{ fontSize: '0.9375rem', color: 'var(--color-text-3)' }}>
                        {log.userId || (log.action === 'RECORD_BMU' ? '시스템(BMU)' : '-')}
                        {log.path && (
                          <span style={{ fontFamily: "'JetBrains Mono',monospace" }}> · {log.method} {log.path}</span>
                        )}
                        <span style={{ fontFamily: "'JetBrains Mono',monospace" }}> · {formatTime(log.timestamp)}</span>
                      </div>
                    </div>
                    <span
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '0.8125rem',
                        padding: '0.125rem 0.375rem',
                        borderRadius: 3,
                        flexShrink: 0,
                        background: (log.statusCode || 0) < 400 ? '#f0fdf4' : '#fef2f2',
                        color: (log.statusCode || 0) < 400 ? '#16a34a' : '#dc2626',
                      }}
                    >
                      {log.statusCode || '—'}
                    </span>
                  </div>

                  {expanded && (
                    <div style={{ background: 'var(--color-surface-alt)', borderTop: '1px solid rgba(0,0,0,0.04)', padding: '12px 16px 16px' }}>
                      <div style={{ background: 'var(--color-surface)', boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.06)', borderRadius: 10, padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
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
                              <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-2)', textTransform: 'uppercase', margin: '0 0 2px' }}>{k}</p>
                              <p
                                style={{
                                  fontFamily: mono ? "'JetBrains Mono',monospace" : undefined,
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
                                fontFamily: "'JetBrains Mono',monospace",
                                fontSize: '0.875rem',
                                color: 'var(--color-text-2)',
                                background: 'var(--color-surface-alt)',
                                boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.06)',
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

          <div style={{ padding: '12px 20px', borderTop: '1px solid rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: '0.8125rem', color: 'var(--color-text-3)' }}>
              {total}건 중 {(page - 1) * 50 + 1}~{Math.min(page * 50, total)}
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
              <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: '0.8125rem', color: 'var(--color-text-3)', fontVariantNumeric: 'tabular-nums' }}>
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
        </div>
      )}
    </div>
  );
}
