import { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../lib/api';
import { scaleSOC, scaleTemp } from '../lib/helpers';
import { BarRows, PageHead, Skeleton, SkeletonTable, Sparkline } from '../components/ui';

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
  blue:  { bg: 'var(--color-surface-accent)', color: 'var(--color-accent)', dot: 'var(--color-accent)' },
  green: { bg: 'var(--color-success-soft)', color: 'var(--color-success)', dot: 'var(--color-success)' },
  red:   { bg: 'var(--color-danger-soft)', color: 'var(--color-danger)', dot: 'var(--color-danger)' },
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

  // 스파크라인용 최근 15개 데이터 (오래된→최신 순)
  const recentSlice = useMemo(() => {
    const slice = sortedRecords.slice(0, 15).reverse();
    return {
      soc: slice.map((r) => scaleSOC(r.soc)),
      voltage: slice.map((r) => (r.voltage != null ? Number(r.voltage) : 0)),
      current: slice.map((r) => (r.current != null ? Number(r.current) : 0)),
      temperature: slice.map((r) => {
        const t = scaleTemp(r.temperature);
        return typeof t === 'number' ? t : parseFloat(String(t));
      }),
    };
  }, [sortedRecords]);

  // 이상 이벤트 분포 (BarRows용)
  const eventDistribution = useMemo(() => {
    if (sortedRecords.length === 0) return null;
    let normal = 0, charging = 0, balancing = 0, fault = 0, tempAbnormal = 0;
    for (const r of sortedRecords) {
      const num = typeof r.statusFlags === 'number' ? r.statusFlags : parseInt(String(r.statusFlags), 10);
      const temp = scaleTemp(r.temperature);
      const tempNum = typeof temp === 'number' ? temp : parseFloat(String(temp));
      const isTempAbnormal = !isNaN(tempNum) && (tempNum > 45 || tempNum < -10);
      if (!isNaN(num) && (num & 0x04)) { fault++; continue; }
      if (isTempAbnormal) { tempAbnormal++; continue; }
      if (!isNaN(num) && (num & 0x01)) { charging++; continue; }
      if (!isNaN(num) && (num & 0x02)) { balancing++; continue; }
      normal++;
    }
    return [
      { label: '정상', value: normal, color: 'var(--color-success)' },
      { label: '충전', value: charging, color: 'var(--color-accent)' },
      { label: '밸런싱', value: balancing, color: 'var(--color-success)' },
      { label: '결함', value: fault, color: 'var(--color-danger)' },
      { label: '온도 이상', value: tempAbnormal, color: 'var(--color-warning)' },
    ];
  }, [sortedRecords]);

  // 최신 센서 스냅샷 (첫 번째 레코드)
  const latestRecord = sortedRecords[0] ?? null;
  const requestPathLabel = hasSearched && passportId.trim()
    ? `/api/realtime/bmu/${passportId.trim()}`
    : '/api/realtime/bmu/:idOrDid';

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
        `/realtime/bmu/${encodeURIComponent(id)}`
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

      <section className="sn-section-card">
        <div className="sn-section-head">
          <div className="sn-section-head-row">
            <div>
              <p className="sn-eyebrow" style={{ margin: '0 0 0.4rem', color: 'var(--color-text-3)' }}>실시간 데이터 조회</p>
              <h2 className="sn-heading" style={{ margin: 0, fontSize: '1.25rem' }}>운영 판독 기준</h2>
              <p className="sn-caption" style={{ margin: '0.45rem 0 0', maxWidth: '48rem' }}>
                입력한 여권 ID를 그대로 BMU record endpoint에 전달합니다. 자동 새로고침을 켜면 기존 10초 주기로 같은 ID를 다시 조회합니다.
              </p>
            </div>
            <span className="sn-detail-inline-stamp">{autoRefresh ? `Live · ${countdown}s` : 'Manual pull'}</span>
          </div>
        </div>

        <div className="sn-toolbar" style={{ padding: '0.9rem 1.25rem', background: 'var(--color-surface)' }}>
          <div style={{ flex: 1, minWidth: 240 }}>
            <label className="sn-eyebrow" style={{ display: 'block', marginBottom: 8 }}>여권 ID 또는 DID</label>
            <input
              value={passportId}
              onChange={(e) => setPassportId(e.target.value)}
              onKeyUp={(e) => e.key === 'Enter' && handleSearch()}
              type="text"
              placeholder="조회할 배터리 여권 ID 또는 DID를 입력하세요"
              className="sn-input"
              style={{ fontFamily: 'var(--font-mono)', fontSize: '0.9375rem' }}
            />
          </div>
          <button
            onClick={handleSearch}
            disabled={!passportId.trim() || loading}
            className="sn-btn sn-btn-accent"
            style={{
              minHeight: 44,
              cursor: !passportId.trim() || loading ? 'not-allowed' : 'pointer',
              opacity: !passportId.trim() || loading ? 0.5 : 1,
            }}
          >
            {loading ? '조회 중...' : 'Live data 조회'}
          </button>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', padding: '0 1.25rem 1rem', background: 'var(--color-surface)' }}>
          <span className="sn-detail-inline-stamp">{requestPathLabel}</span>
          <span className="sn-detail-inline-stamp">최근 조회 {lastFetchedAt ? lastFetchedAt.toLocaleTimeString('ko-KR') : '대기 중'}</span>
          <span className="sn-detail-inline-stamp">{autoRefresh ? '10초 자동 갱신' : '수동 갱신'}</span>
        </div>
      </section>

      {/* STATES */}
      {loading && !autoRefresh ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* KPI 4 skeleton */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
            {[0, 1, 2, 3].map((i) => (
              <div key={i} style={{ padding: '14px 16px', background: 'var(--color-surface-alt)', borderRadius: 8, border: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: 10 }}>
                <Skeleton width="50%" height={12} />
                <Skeleton width="60%" height={28} />
                <Skeleton width="100%" height={40} radius={4} />
              </div>
            ))}
          </div>
          {/* 테이블 skeleton */}
          <SkeletonTable rows={5} cols={8} />
        </div>
      ) : !hasSearched && !loading ? (
        <div className="sn-panel" style={{ overflow: 'hidden' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem 1.5rem' }}>
            <div style={{ width: 56, height: 56, borderRadius: 12, background: 'var(--color-surface-alt)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
              <svg width="28" height="28" fill="none" stroke="var(--color-text-3)" strokeWidth="1.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--color-text-1)', margin: '0 0 8px' }}>
              여권 ID를 입력하여 데이터를 조회하세요
            </h3>
            <p style={{ fontSize: '0.9375rem', color: 'var(--color-text-3)', textAlign: 'center', maxWidth: '32rem', margin: '0 0 20px' }}>
              배터리 여권 ID를 입력하면 SOC, 전압, 전류, 온도 등 센서 데이터를 확인할 수 있습니다.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: '32rem', width: '100%', padding: '16px', background: 'var(--color-surface-alt)', borderRadius: 10, border: '1px solid var(--color-border)' }}>
              <p style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--color-text-2)', margin: 0 }}>물리적 이력 검증</p>
              <p style={{ fontSize: '0.9375rem', color: 'var(--color-text-3)', margin: 0, lineHeight: 1.6 }}>
                배터리 물리 이력(SOC 추이, 전압·전류·온도 패턴, 방전 사이클)을 블록체인에 기록하여 신뢰 가능한 상태 검증을 제공합니다.
                현장 점검 시 여권 ID 기반으로 실시간 센서 기록을 조회하고 이상 플래그를 즉시 확인할 수 있습니다.
              </p>
            </div>
          </div>
        </div>
      ) : hasSearched && errorMsg && accessDenied ? (
        <div className="sn-panel" style={{ overflow: 'hidden' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem 1.5rem', textAlign: 'center' }}>
            <div style={{ width: 56, height: 56, borderRadius: 12, background: 'var(--color-warning-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 18 }}>
              <svg width="26" height="26" fill="none" stroke="var(--color-warning)" strokeWidth="1.8" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--color-text-1)', margin: '0 0 8px' }}>
              현재 계정으로는 이 여권의 BMU 기록을 열 수 없습니다
            </h3>
            <p style={{ fontSize: '0.9375rem', color: 'var(--color-text-2)', maxWidth: '32rem', margin: '0 0 6px' }}>
              제조사 또는 접근 권한이 있는 계정으로 다시 조회해 주세요. 현재 메시지: {errorMsg}
            </p>
          </div>
        </div>
      ) : hasSearched && records.length === 0 && !loading ? (
        <div className="sn-panel" style={{ overflow: 'hidden' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem 1.5rem' }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--color-text-1)', margin: '0 0 8px' }}>데이터가 없습니다</h3>
            <p style={{ fontSize: '0.9375rem', color: 'var(--color-text-3)' }}>해당 여권에 대한 BMU 기록이 존재하지 않습니다.</p>
          </div>
        </div>
      ) : records.length > 0 ? (
        <>
          {/* 최신 센서 스냅샷 + Sparkline */}
          {latestRecord && (
            <section className="sn-section-card" style={{ padding: '16px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--color-text-1)' }}>Latest telemetry snapshot</span>
                  <span style={{ fontSize: '0.875rem', color: 'var(--color-text-3)', fontFamily: 'var(--font-mono)' }}>
                    {formatTimestamp(latestRecord.timestamp)}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {decodeStatusFlags(latestRecord.statusFlags).map((b) => {
                    const s = BADGE_STYLES[b.color];
                    return (
                      <span key={b.label} style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 10px', borderRadius: 20, fontSize: '0.875rem', fontWeight: 600, background: s.bg, color: s.color }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', marginRight: 6, background: s.dot }} />
                        {b.label}
                      </span>
                    );
                  })}
                  {decodeStatusFlags(latestRecord.statusFlags).length === 0 && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 10px', borderRadius: 20, fontSize: '0.875rem', fontWeight: 500, background: 'var(--color-surface-alt)', color: 'var(--color-text-2)', border: '1px solid var(--color-border)' }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', marginRight: 6, background: 'var(--color-success)' }} />
                      정상
                    </span>
                  )}
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                {/* SOC */}
                <div style={{ padding: '14px 16px', background: 'var(--color-surface-alt)', borderRadius: 8, border: '1px solid var(--color-border)' }}>
                  <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text-3)', margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>SOC</p>
                  <p className="sn-metric sn-metric-md" style={{ fontFamily: 'var(--font-mono)', color: (() => { const v = scaleSOC(latestRecord.soc); return v > 50 ? 'var(--color-text-1)' : v > 20 ? 'var(--color-warning)' : 'var(--color-danger)'; })(), margin: '0 0 4px' }}>
                    {scaleSOC(latestRecord.soc)}<span style={{ fontSize: '0.875rem', fontWeight: 500, marginLeft: 2 }}>%</span>
                  </p>
                  <div style={{ marginBottom: 8, height: 4, borderRadius: 999, background: 'var(--color-border)' }}>
                    <div style={{ height: '100%', borderRadius: 999, width: `${Math.min(scaleSOC(latestRecord.soc), 100)}%`, background: (() => { const v = scaleSOC(latestRecord.soc); return v > 50 ? 'var(--color-success)' : v > 20 ? 'var(--color-warning)' : 'var(--color-danger)'; })() }} />
                  </div>
                  {recentSlice.soc.length > 1 && (
                    <Sparkline values={recentSlice.soc} height={40} color={(() => { const v = scaleSOC(latestRecord.soc); return v > 50 ? 'var(--color-success)' : v > 20 ? 'var(--color-warning)' : 'var(--color-danger)'; })()} />
                  )}
                </div>
                {/* 전압 */}
                <div style={{ padding: '14px 16px', background: 'var(--color-surface-alt)', borderRadius: 8, border: '1px solid var(--color-border)' }}>
                  <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text-3)', margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>전압</p>
                  <p className="sn-metric sn-metric-md" style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-text-1)', margin: '0 0 12px' }}>
                    {formatNumber(latestRecord.voltage, 2)}<span style={{ fontSize: '0.875rem', fontWeight: 500, marginLeft: 2 }}>V</span>
                  </p>
                  {recentSlice.voltage.length > 1 && (
                    <Sparkline values={recentSlice.voltage} height={40} color="var(--color-accent)" />
                  )}
                </div>
                {/* 전류 */}
                <div style={{ padding: '14px 16px', background: 'var(--color-surface-alt)', borderRadius: 8, border: '1px solid var(--color-border)' }}>
                  <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text-3)', margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>전류</p>
                  <p className="sn-metric sn-metric-md" style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-text-1)', margin: '0 0 12px' }}>
                    {formatNumber(latestRecord.current, 2)}<span style={{ fontSize: '0.875rem', fontWeight: 500, marginLeft: 2 }}>A</span>
                  </p>
                  {recentSlice.current.length > 1 && (
                    <Sparkline values={recentSlice.current} height={40} color="var(--color-accent)" />
                  )}
                </div>
                {/* 온도 */}
                <div style={{ padding: '14px 16px', background: 'var(--color-surface-alt)', borderRadius: 8, border: '1px solid var(--color-border)' }}>
                  <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text-3)', margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>온도</p>
                  <p className="sn-metric sn-metric-md" style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-text-1)', margin: '0 0 12px' }}>
                    {scaleTemp(latestRecord.temperature)}<span style={{ fontSize: '0.875rem', fontWeight: 500, marginLeft: 2 }}>°C</span>
                  </p>
                  {recentSlice.temperature.length > 1 && (
                    <Sparkline values={recentSlice.temperature} height={40} color="var(--color-warning)" />
                  )}
                </div>
              </div>
            </section>
          )}

          {/* 이상 이벤트 분포 */}
          {eventDistribution && (
            <section className="sn-section-card" style={{ padding: '16px 20px', maxWidth: 1080 }}>
              <p className="sn-eyebrow" style={{ margin: '0 0 12px', color: 'var(--color-text-2)' }}>이상 이벤트 분포</p>
              <BarRows items={eventDistribution} />
            </section>
          )}

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
                            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: socColor }}>
                              {socVal}
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
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
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
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
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
        </>
      ) : null}
    </div>
  );
}
