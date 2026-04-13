import { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../lib/api';
import { scaleSOC, scaleTemp } from '../lib/helpers';
import Spinner from '../components/ui/Spinner';

interface BmuRecord {
  recordId?: string;
  timestamp?: string;
  soc?: number;
  voltage?: number;
  current?: number;
  temperature?: number;
  dischargeCycles?: number;
  statusFlags?: number;
  [key: string]: unknown;
}

interface StatusBadge {
  label: string;
  color: 'blue' | 'green' | 'red';
}

function decodeStatusFlags(flags?: number): StatusBadge[] {
  const num = typeof flags === 'number' ? flags : parseInt(String(flags), 10);
  if (isNaN(num)) return [];
  const badges: StatusBadge[] = [];
  if (num & 0x01) badges.push({ label: '충전중', color: 'blue' });
  if (num & 0x02) badges.push({ label: '밸런싱', color: 'green' });
  if (num & 0x04) badges.push({ label: '결함', color: 'red' });
  return badges;
}

const BADGE_STYLES: Record<string, { bg: string; color: string; dot: string }> = {
  blue:  { bg: 'rgba(59,130,246,0.1)',  color: '#2563eb', dot: '#60a5fa' },
  green: { bg: 'rgba(34,197,94,0.1)',   color: '#059669', dot: '#34d399' },
  red:   { bg: 'rgba(239,68,68,0.1)',   color: '#dc2626', dot: '#ef4444' },
};

function formatTimestamp(ts?: string): string {
  if (!ts) return '-';
  try { return new Date(ts).toLocaleString('ko-KR'); }
  catch { return ts; }
}

function formatNumber(val: unknown, decimals = 1): string {
  if (val == null) return '-';
  return Number(val).toFixed(decimals);
}

export default function BmuDataPage() {
  const [passportId, setPassportId] = useState('');
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
        `/bmu/records/${encodeURIComponent(id)}`
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
    if (passportId.trim()) {
      setHasSearched(false);
      setErrorMsg('');
      setAccessDenied(false);
      fetchRecords(autoRefresh, loading);
    }
  };

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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* HEADER */}
      <div className="sn-page-head">
        <div className="sn-page-head-main">
          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div>
              <p className="sn-eyebrow" style={{ margin: '0 0 0.35rem', color: '#0f766e' }}>현장 점검</p>
              <h1 className="sn-page-title">BMU 판독 콘솔</h1>
            </div>
            {autoRefresh && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.375rem',
                  padding: '0.25rem 0.625rem',
                  background: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  borderRadius: 9999,
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: '#16a34a',
                  marginLeft: '0.75rem',
                }}
              >
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#16a34a' }} />
                실시간
              </span>
            )}
          </div>
          <p className="sn-page-subtitle">현장 식별 후 센서 기록을 연속 판독하는 점검 화면입니다.</p>
        </div>

        <div className="sn-panel" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 16px' }}>
          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', userSelect: 'none', gap: 10 }}>
            <div style={{ position: 'relative' }}>
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }}
              />
              <div style={{ width: 40, height: 22, borderRadius: 11, background: autoRefresh ? '#059669' : '#e2e8f0', transition: 'background 0.2s' }} />
              <div style={{ position: 'absolute', top: 3, left: autoRefresh ? 21 : 3, width: 16, height: 16, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.2)', transition: 'left 0.2s' }} />
            </div>
            <span style={{ fontSize: '0.875rem', fontWeight: 500, color: '#374151' }}>자동 새로고침</span>
          </label>
          {autoRefresh && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 10px', borderRadius: 20, fontFamily: "'JetBrains Mono',monospace", fontSize: '0.8125rem', fontWeight: 600, color: '#059669', background: 'rgba(52,211,153,0.1)' }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#059669' }} />
              {countdown}s
            </span>
          )}
        </div>
      </div>

      <div className="sn-panel sn-summary-grid sn-summary-grid-3">
        <div className="sn-summary-lead">
          <p className="sn-eyebrow sn-summary-title">판독 요약</p>
          <p className="sn-summary-copy-strong">식별 → 라이브 판독 → 이상 플래그 확인</p>
          <p className="sn-stat-note" style={{ margin: 0, lineHeight: 1.6 }}>
            여권 ID를 기준으로 BMU 레코드를 불러오고 최신 행을 첫 점검 근거로 사용합니다.
          </p>
        </div>
        <div>
          <p className="sn-eyebrow sn-stat-card-title">조회 상태</p>
          <p className="sn-stat-count">{hasSearched ? sortedRecords.length : 0}</p>
          <p className="sn-stat-note">확인된 기록</p>
        </div>
        <div>
          <p className="sn-eyebrow sn-stat-card-title" style={{ color: '#059669' }}>최근 조회</p>
          <p className="sn-summary-copy-strong" style={{ margin: 0 }}>
            {lastFetchedAt ? lastFetchedAt.toLocaleTimeString('ko-KR') : '대기 중'}
          </p>
          <p className="sn-stat-note">{autoRefresh ? '실시간 확인 중' : '수동 조회'}</p>
        </div>
      </div>

      {/* SEARCH */}
      <div className="sn-panel sn-toolbar" style={{ padding: '12px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, width: '100%' }}>
          <div style={{ flex: 1 }}>
            <label className="sn-eyebrow" style={{ display: 'block', marginBottom: 8 }}>여권 ID</label>
            <input
              value={passportId}
              onChange={(e) => setPassportId(e.target.value)}
              onKeyUp={(e) => e.key === 'Enter' && handleSearch()}
              type="text"
              placeholder="조회할 배터리 여권 ID를 입력하세요"
              className="sn-input"
              style={{ width: '100%', fontFamily: "'JetBrains Mono',monospace", fontSize: '0.875rem' }}
            />
          </div>
          <button
            onClick={handleSearch}
            disabled={!passportId.trim() || loading}
            className="sn-btn sn-btn-accent"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              cursor: !passportId.trim() || loading ? 'not-allowed' : 'pointer',
              opacity: !passportId.trim() || loading ? 0.5 : 1,
            }}
          >
            <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>{loading ? '조회 중...' : '조회'}</span>
          </button>
        </div>
      </div>

      {/* STATES */}
      {loading && !autoRefresh ? (
        <Spinner />
      ) : !hasSearched && !loading ? (
        <div className="sn-panel" style={{ overflow: 'hidden' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 24px' }}>
            <div style={{ width: 56, height: 56, borderRadius: 12, background: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
              <svg width="28" height="28" fill="none" stroke="#a3a3a3" strokeWidth="1.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#171717', margin: '0 0 6px' }}>
              여권 ID를 입력하여 데이터를 조회하세요
            </h3>
              <p style={{ fontSize: '0.875rem', color: '#a3a3a3', textAlign: 'center', maxWidth: '28rem' }}>
              배터리 여권 ID를 입력하면 SOC, 전압, 전류, 온도 등 센서 데이터를 확인할 수 있습니다.
            </p>
          </div>
        </div>
      ) : hasSearched && errorMsg && accessDenied ? (
        <div className="sn-panel" style={{ overflow: 'hidden' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '72px 24px', textAlign: 'center' }}>
            <div style={{ width: 56, height: 56, borderRadius: 12, background: '#fff7ed', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 18 }}>
              <svg width="26" height="26" fill="none" stroke="#d97706" strokeWidth="1.8" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#171717', margin: '0 0 6px' }}>
              현재 계정으로는 이 여권의 BMU 기록을 열 수 없습니다
            </h3>
              <p style={{ fontSize: '0.875rem', color: '#6b7280', maxWidth: '32rem', margin: '0 0 6px' }}>
              제조사 또는 접근 권한이 있는 계정으로 다시 조회해 주세요. 현재 메시지: {errorMsg}
            </p>
          </div>
        </div>
      ) : hasSearched && records.length === 0 && !loading ? (
        <div className="sn-panel" style={{ overflow: 'hidden' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 24px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#171717', margin: '0 0 6px' }}>데이터가 없습니다</h3>
              <p style={{ fontSize: '0.875rem', color: '#a3a3a3' }}>해당 여권에 대한 BMU 기록이 존재하지 않습니다.</p>
          </div>
        </div>
      ) : records.length > 0 ? (
        <div className="sn-panel" style={{ overflow: 'hidden' }}>
          {/* TOP BAR */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <svg style={{ width: 16, height: 16, color: '#059669' }} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
              <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#374151' }}>판독 기록</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 8px', borderRadius: 20, fontFamily: "'JetBrains Mono',monospace", fontSize: '0.75rem', fontWeight: 600, color: '#059669', background: 'rgba(52,211,153,0.1)' }}>
                {records.length}건
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {refreshing && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', color: '#059669' }}>
                  갱신 중...
                </span>
              )}
          <span style={{ padding: '2px 8px', borderRadius: 6, fontFamily: "'JetBrains Mono',monospace", fontSize: '0.8125rem', color: '#6b7280', background: '#f1f5f9' }}>
                {passportId}
              </span>
            </div>
          </div>

          {/* TABLE */}
        <div style={{ overflowX: 'auto', fontSize: '0.875rem' }}>
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
                {sortedRecords.map((r, idx) => {
                  const socVal = scaleSOC(r.soc);
                  const socColor = socVal > 50 ? '#171717' : socVal > 20 ? '#f59e0b' : '#ef4444';
                  const badges = decodeStatusFlags(r.statusFlags);
                  return (
                    <tr key={r.recordId || idx}>
                      <td style={{ padding: 0, width: 4, position: 'relative' }}>
                        {idx === 0 && (
                          <div style={{ position: 'absolute', left: 0, top: 4, bottom: 4, width: 3, borderRadius: '0 3px 3px 0', background: '#171717' }} />
                        )}
                      </td>
                      <td style={{ whiteSpace: 'nowrap', fontSize: '0.85rem', color: '#525252' }}>{formatTimestamp(r.timestamp)}</td>
                      <td style={{ whiteSpace: 'nowrap', textAlign: 'right' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
                          <div style={{ width: 64, height: 6, borderRadius: 999, overflow: 'hidden', background: '#e5e5e5' }}>
                            <div style={{ height: '100%', borderRadius: 999, width: `${Math.min(socVal, 100)}%`, background: socColor, transition: 'all 0.3s' }} />
                          </div>
                          <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: '0.85rem', fontWeight: 700, color: socColor }}>
                            {socVal}
                          </span>
                        </div>
                      </td>
                      <td style={{ whiteSpace: 'nowrap', textAlign: 'right', fontFamily: "'JetBrains Mono',monospace", fontSize: '0.85rem', color: '#525252' }}>
                        {formatNumber(r.voltage, 2)}
                      </td>
                      <td style={{ whiteSpace: 'nowrap', textAlign: 'right', fontFamily: "'JetBrains Mono',monospace", fontSize: '0.85rem', color: '#525252' }}>
                        {formatNumber(r.current, 2)}
                      </td>
                      <td style={{ whiteSpace: 'nowrap', textAlign: 'right', fontFamily: "'JetBrains Mono',monospace", fontSize: '0.85rem', color: '#525252' }}>
                        {scaleTemp(r.temperature)}
                      </td>
                      <td style={{ whiteSpace: 'nowrap', textAlign: 'right', fontFamily: "'JetBrains Mono',monospace", fontSize: '0.85rem', color: '#525252' }}>
                        {r.dischargeCycles != null ? r.dischargeCycles : '-'}
                      </td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                          {badges.length === 0 ? (
        <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 10px', borderRadius: 20, fontSize: '0.875rem', fontWeight: 500, background: '#f5f5f5', color: '#525252', boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.06)' }}>
                              <span style={{ width: 6, height: 6, borderRadius: '50%', marginRight: 6, background: '#d4d4d4' }} />
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
                                    fontSize: '0.75rem',
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

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderTop: '1px solid rgba(0,0,0,0.06)' }}>
        <span style={{ fontSize: '0.8125rem', color: '#a3a3a3' }}>총 {records.length}개 레코드</span>
            {autoRefresh && (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: "'JetBrains Mono',monospace", fontSize: '0.75rem', color: '#a3a3a3' }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#171717' }} />
                실시간 모니터링 활성 · {countdown}s 후 갱신
              </span>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
