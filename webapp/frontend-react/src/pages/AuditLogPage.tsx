import { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../lib/api';
import Spinner from '../components/ui/Spinner';

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
  if (!code) return { color: '#6b7280', bg: 'transparent' };
  if (code < 300) return { color: '#34d399', bg: 'rgba(52,211,153,0.1)' };
  if (code < 400) return { color: '#60a5fa', bg: 'rgba(96,165,250,0.1)' };
  if (code < 500) return { color: '#fbbf24', bg: 'rgba(251,191,36,0.1)' };
  return { color: '#ef4444', bg: 'rgba(239,68,68,0.1)' };
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

  const toggleDetail = (id: string) => {
    setExpandedId((cur) => (cur === id ? null : id));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* HEADER */}
      <div className="sn-page-head">
        <div className="sn-page-head-main">
          <p className="sn-eyebrow" style={{ margin: '0 0 0.35rem', color: '#4338ca' }}>감사 기록</p>
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
              <div style={{ width: 36, height: 20, borderRadius: 10, background: autoRefresh ? '#171717' : '#e5e5e5', transition: 'background 0.2s' }} />
              <div style={{ position: 'absolute', top: 2, left: autoRefresh ? 18 : 2, width: 16, height: 16, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.2)', transition: 'left 0.2s' }} />
            </div>
            <span style={{ fontSize: '0.8125rem', fontWeight: 500, color: '#525252' }}>실시간</span>
          </label>
          <button onClick={fetchLogs} className="sn-btn sn-btn-ghost" style={{ fontSize: '0.8125rem' }}>
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

      {/* FILTERS */}
      <div className="sn-panel sn-toolbar">
        <select
          value={filterAction}
          onChange={(e) => setFilterAction(e.target.value)}
          className="sn-input"
          style={{ minWidth: 140, fontSize: '0.875rem' }}
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
            style={{ width: 16, height: 16, accentColor: '#171717', borderRadius: 4 }}
          />
          <span style={{ fontSize: '0.875rem', color: '#525252' }}>쓰기 작업만</span>
        </label>
          <span style={{ marginLeft: 'auto', fontFamily: "'JetBrains Mono',monospace", fontSize: '0.8125rem', color: '#a3a3a3' }}>
          총 {total}건
        </span>
      </div>

      {filterAction && (
        <div className="sn-panel" style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <p className="sn-eyebrow" style={{ margin: '0 0 4px' }}>활성 필터</p>
            <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: '#171717' }}>{activeActionLabel}</p>
          </div>
          <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: '0.8125rem', color: '#6b7280' }}>{total}건</span>
        </div>
      )}

      {/* FEED / EMPTY / LOADING */}
      {loading && logs.length === 0 ? (
        <Spinner />
      ) : logs.length === 0 ? (
        <div style={{ padding: '3rem', textAlign: 'center', border: '1px dashed var(--color-border)', borderRadius: '0.5rem' }}>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-text-3)', margin: 0 }}>
            {filterAction ? `${activeActionLabel} 필터에 해당하는 증빙이 없습니다.` : '표시할 증빙 항목이 없습니다.'}
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
                      background: expanded ? '#fafafa' : '#fff',
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
                            color: '#6b7280',
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
                      <div style={{ fontSize: '0.875rem', color: 'var(--color-text-3)' }}>
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
                    <div style={{ background: '#fafafa', borderTop: '1px solid rgba(0,0,0,0.04)', padding: '12px 16px 16px' }}>
                      <div style={{ background: '#fff', boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.06)', borderRadius: 10, padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
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
                              <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', margin: '0 0 2px' }}>{k}</p>
                              <p
                                style={{
                                  fontFamily: mono ? "'JetBrains Mono',monospace" : undefined,
                                  fontSize: '0.875rem',
                                  color: color || '#374151',
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
                                color: '#525252',
                                background: '#fafafa',
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
            <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: '0.8125rem', color: '#a3a3a3' }}>
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
              <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: '0.8125rem', color: '#a3a3a3', fontVariantNumeric: 'tabular-nums' }}>
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
