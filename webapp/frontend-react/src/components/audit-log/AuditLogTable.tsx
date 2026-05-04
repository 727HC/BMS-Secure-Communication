import { ACTION_LABELS, formatTime, getStatusStyle, relativeTime, type LogRecord } from './lib';

interface Props {
  logs: LogRecord[];
  expandedId: string | null;
  onToggleDetail: (id: string) => void;
  total: number;
  page: number;
  totalPages: number;
  pageSize: 10 | 25 | 50 | 100;
  pageStart: number;
  pageEnd: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: 10 | 25 | 50 | 100) => void;
}

export default function AuditLogTable({
  logs,
  expandedId,
  onToggleDetail,
  total,
  page,
  totalPages,
  pageSize,
  pageStart,
  pageEnd,
  onPageChange,
  onPageSizeChange,
}: Props) {
  return (
    <section className="sn-section-card" style={{ overflow: 'hidden' }}>
      <div className="sn-section-head">
        <div className="sn-section-head-row">
          <div>
            <p className="sn-eyebrow" style={{ margin: '0 0 0.4rem', color: 'var(--color-text-3)' }}>감사 피드</p>
            <h2 className="sn-heading" style={{ margin: 0, fontSize: '1.25rem' }}>원장 항목</h2>
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
                onClick={() => onToggleDetail(log.id)}
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

      <div style={{ padding: '12px 20px', borderTop: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, position: 'sticky', bottom: 0, background: 'var(--color-surface)', zIndex: 5 }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8125rem', color: 'var(--color-text-3)' }}>
          {total}건 중 {pageStart}~{pageEnd}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <label style={{ fontSize: '0.8125rem', color: 'var(--color-text-3)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            페이지당
            <select
              value={pageSize}
              onChange={(e) => { onPageSizeChange(Number(e.target.value) as 10 | 25 | 50 | 100); }}
              style={{ height: 28, padding: '0 8px', borderRadius: 6, border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text-1)', fontSize: '0.8125rem' }}
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </label>
          <button
            onClick={() => page > 1 && onPageChange(page - 1)}
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
            onClick={() => page < totalPages && onPageChange(page + 1)}
            disabled={page >= totalPages}
            className="sn-btn sn-btn-ghost"
            style={{ fontSize: '0.8125rem', padding: '6px 12px', opacity: page >= totalPages ? 0.3 : 1, cursor: page >= totalPages ? 'not-allowed' : 'pointer' }}
          >
            다음
          </button>
        </div>
      </div>
    </section>
  );
}
