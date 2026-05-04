import { scaleSOC, scaleTemp } from '../../lib/helpers';
import { BADGE_STYLES, decodeStatusFlags, formatNumber, formatTimestamp, type BmuRecord } from './lib';

interface Props {
  records: BmuRecord[];
  pagedRecords: BmuRecord[];
  passportId: string;
  refreshing: boolean;
  autoRefresh: boolean;
  countdown: number;
  currentPage: number;
  totalPages: number;
  showingFrom: number;
  showingTo: number;
  onPageChange: (page: number) => void;
}

export default function BmuRecordsTable({
  records,
  pagedRecords,
  passportId,
  refreshing,
  autoRefresh,
  countdown,
  currentPage,
  totalPages,
  showingFrom,
  showingTo,
  onPageChange,
}: Props) {
  return (
    <section className="sn-section-card" style={{ overflow: 'hidden' }}>
      {/* TOP BAR */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderBottom: '1px solid var(--color-border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <svg style={{ width: 16, height: 16, color: 'var(--color-success)' }} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
          </svg>
          <span style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--color-text-2)' }}>판독 기록</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 8px', borderRadius: 20, fontFamily: 'var(--font-mono)', fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-success)', background: 'var(--color-success-soft)' }}>
            {records.length}건
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {refreshing && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.875rem', color: 'var(--color-success)' }}>
              갱신 중...
            </span>
          )}
          <span style={{ padding: '2px 8px', borderRadius: 6, fontFamily: 'var(--font-mono)', fontSize: '0.875rem', color: 'var(--color-text-3)', background: 'var(--color-surface-alt)' }}>
            {passportId}
          </span>
        </div>
      </div>

      {/* TABLE */}
      <div style={{ overflowX: 'auto' }}>
        <table className="sn-table">
          <thead>
            <tr>
              <th style={{ width: 16 }}></th>
              <th>시간</th>
              <th style={{ textAlign: 'right' }}>SOC (%)</th>
              <th style={{ textAlign: 'right' }}>전압 (V)</th>
              <th style={{ textAlign: 'right' }}>전류 (A)</th>
              <th style={{ textAlign: 'right' }}>온도 (°C)</th>
              <th style={{ textAlign: 'right' }}>사이클</th>
              <th>상태</th>
            </tr>
          </thead>
          <tbody>
            {pagedRecords.map((r, idx) => {
              const socVal = scaleSOC(r.soc);
              const socColor = socVal > 50 ? 'var(--color-text-1)' : socVal > 20 ? 'var(--color-warning)' : 'var(--color-danger)';
              const badges = decodeStatusFlags(r.statusFlags);
              return (
                <tr key={r.recordId || idx}>
                  <td style={{ padding: 0, width: 4, position: 'relative' }}>
                    {idx === 0 && (
                      <div style={{ position: 'absolute', left: 0, top: 4, bottom: 4, width: 3, borderRadius: '0 3px 3px 0', background: 'var(--color-text-1)' }} />
                    )}
                  </td>
                  <td style={{ whiteSpace: 'nowrap', color: 'var(--color-text-2)' }}>{formatTimestamp(r.timestamp)}</td>
                  <td style={{ whiteSpace: 'nowrap', textAlign: 'right' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
                      <div style={{ width: 64, height: 6, borderRadius: 999, overflow: 'hidden', background: 'var(--color-border)' }}>
                        <div style={{ height: '100%', borderRadius: 999, width: `${Math.min(socVal, 100)}%`, background: socColor, transition: 'all 0.3s' }} />
                      </div>
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: socColor, fontVariantNumeric: 'tabular-nums' }}>
                        {socVal.toFixed(1)}
                      </span>
                    </div>
                  </td>
                  <td style={{ whiteSpace: 'nowrap', textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--color-text-2)' }}>
                    {formatNumber(r.voltage, 2)}
                  </td>
                  <td style={{ whiteSpace: 'nowrap', textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--color-text-2)' }}>
                    {formatNumber(r.current, 2)}
                  </td>
                  <td style={{ whiteSpace: 'nowrap', textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--color-text-2)' }}>
                    {scaleTemp(r.temperature)}
                  </td>
                  <td style={{ whiteSpace: 'nowrap', textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--color-text-2)' }}>
                    {r.dischargeCycles != null ? r.dischargeCycles : '-'}
                  </td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {badges.length === 0 ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 10px', borderRadius: 20, fontSize: '0.875rem', fontWeight: 500, background: 'var(--color-surface-alt)', color: 'var(--color-text-2)', border: '1px solid var(--color-border)' }}>
                          <span style={{ width: 6, height: 6, borderRadius: '50%', marginRight: 6, background: 'var(--color-border)' }} />
                          정상
                        </span>
                      ) : (
                        badges.map((b) => {
                          const s = BADGE_STYLES[b.color];
                          return (
                            <span
                              key={b.label}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                padding: '2px 10px',
                                borderRadius: 20,
                                fontSize: '0.875rem',
                                fontWeight: 600,
                                background: s.bg,
                                color: s.color,
                              }}
                            >
                              <span style={{ width: 6, height: 6, borderRadius: '50%', marginRight: 6, background: s.dot }} />
                              {b.label}
                            </span>
                          );
                        })
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderTop: '1px solid var(--color-border)' }}>
        <span style={{ fontSize: '0.875rem', color: 'var(--color-text-3)' }}>
          총 {records.length}개 레코드 · {showingFrom}-{showingTo} 표시
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginRight: 12 }}>
          <button
            className="sn-btn sn-btn-ghost"
            style={{ padding: '6px 10px', fontSize: 12 }}
            disabled={currentPage === 1}
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          >
            이전
          </button>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8125rem', color: 'var(--color-text-3)' }}>
            {currentPage} / {totalPages}
          </span>
          <button
            className="sn-btn sn-btn-ghost"
            style={{ padding: '6px 10px', fontSize: 12 }}
            disabled={currentPage === totalPages}
            onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          >
            다음
          </button>
        </div>
        {autoRefresh && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-mono)', fontSize: '0.875rem', color: 'var(--color-text-3)' }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--color-text-1)' }} />
            실시간 모니터링 활성 · {countdown}s 후 갱신
          </span>
        )}
      </div>
    </section>
  );
}
