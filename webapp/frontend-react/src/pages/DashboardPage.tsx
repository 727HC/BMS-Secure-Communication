import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { getStatusBadge } from '../lib/helpers';
import { useCountUp } from '../lib/useCountUp';
import { DonutChart, LegendStack, Sparkline, BarRows, Skeleton, SkeletonCard } from '../components/ui';

interface Passport {
  passportId?: string;
  status?: string;
  vin?: string;
  model?: string;
  manufacturerName?: string;
  chemistry?: string;
  weight?: number;
  totalEnergy?: number;
  recycleAvailable?: boolean;
  createdAt?: string;
  updatedAt?: string;
  timestamp?: string;
  [key: string]: unknown;
}

interface ApiListResponse<T> {
  records?: T[];
}

function queuePriority(p: Passport): number {
  if (!p.vin) return 0;
  if (p.status === 'MAINTENANCE') return 1;
  if (p.status === 'ANALYSIS') return 2;
  if (p.recycleAvailable || p.status === 'RECYCLING') return 3;
  if (p.status === 'DISPOSED') return 4;
  return 5;
}

function nextAction(p: Passport): string {
  if (!p.vin) return 'VIN 연결 필요';
  if (p.status === 'MAINTENANCE') return '정비 완료';
  if (p.status === 'ANALYSIS') return '분석 등록';
  if (p.recycleAvailable) return '회수 검토';
  return '상세 보기';
}

function formatShortDate(value?: string): string {
  if (!value) return '-';
  try {
    return new Date(value).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' });
  } catch {
    return value;
  }
}

function goStatusRoute(statusKey: string, navigate: ReturnType<typeof useNavigate>) {
  if (statusKey === 'MAINTENANCE' || statusKey === 'ANALYSIS') return navigate('/maintenance');
  if (statusKey === 'RECYCLING' || statusKey === 'DISPOSED') return navigate('/recycling');
  return navigate('/passports');
}

const STATUS_BARS = [
  { key: 'MANUFACTURED', label: '제조완료', color: '#1769e0' },
  { key: 'ACTIVE', label: '운행중', color: '#0ea5e9' },
  { key: 'MAINTENANCE', label: '정비중', color: '#f59e0b' },
  { key: 'ANALYSIS', label: '분석중', color: '#8b5cf6' },
  { key: 'RECYCLING', label: '회수 검토', color: '#0f766e' },
  { key: 'DISPOSED', label: '폐기', color: '#94a3b8' },
];

/** createdAt 기준으로 최근 7일 bucket 집계 (오늘 포함) */
function buildSparkline(passports: Passport[]): number[] {
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  const buckets = Array(7).fill(0);
  for (const p of passports) {
    const raw = p.createdAt || p.timestamp;
    if (!raw) continue;
    const d = new Date(raw as string);
    if (isNaN(d.getTime())) continue;
    const diffMs = today.getTime() - d.getTime();
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffDays >= 0 && diffDays < 7) {
      buckets[6 - diffDays]++;
    }
  }
  return buckets;
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const [passports, setPassports] = useState<Passport[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await api.get<ApiListResponse<Passport> | Passport[]>('/passports');
        const list = Array.isArray(data) ? data : data.records || [];
        if (!cancelled) setPassports(list);
      } catch {
        if (!cancelled) setPassports([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const svcOpen = useMemo(
    () => passports.filter((p) => p.status === 'MAINTENANCE' || p.status === 'ANALYSIS').length,
    [passports]
  );
  const recycleN = useMemo(
    () => passports.filter((p) => p.recycleAvailable && p.status !== 'DISPOSED').length,
    [passports]
  );
  const bindPend = useMemo(() => passports.filter((p) => !p.vin).length, [passports]);

  const recent = useMemo(() => {
    return [...passports].sort((a, b) => {
      const pa = queuePriority(a);
      const pb = queuePriority(b);
      if (pa !== pb) return pa - pb;
      return String(b.updatedAt || b.createdAt || b.timestamp || '').localeCompare(
        String(a.updatedAt || a.createdAt || a.timestamp || '')
      );
    });
  }, [passports]);

  const urgentQueue = recent.slice(0, 8);
  const totalCount = passports.length;

  const statusRows = STATUS_BARS.map((row) => {
    const value = passports.filter((p) => p.status === row.key).length;
    return { ...row, value };
  });

  const donutSegments = statusRows.filter((r) => r.value > 0).map((r) => ({
    label: r.label,
    value: r.value,
    color: r.color,
  }));

  const legendItems = statusRows.map((r) => ({
    label: r.label,
    value: r.value,
    color: r.color,
  }));

  const sparkValues = useMemo(() => buildSparkline(passports), [passports]);
  const hasSparkData = sparkValues.some((v) => v > 0);

  /* count-up 애니메이션 값 */
  const bindPendAnim = useCountUp(loading ? 0 : bindPend);
  const svcOpenAnim = useCountUp(loading ? 0 : svcOpen);
  const recycleNAnim = useCountUp(loading ? 0 : recycleN);
  const sparkSum = sparkValues.reduce((s, v) => s + v, 0);
  const sparkAvg = sparkValues.reduce((s, v) => s + v, 0) / 7;
  const sparkMax = Math.max(...sparkValues, 0);
  const sparkSumAnim = useCountUp(loading ? 0 : sparkSum);
  const sparkAvgAnim = useCountUp(loading ? 0 : sparkAvg);
  const sparkMaxAnim = useCountUp(loading ? 0 : sparkMax);

  /* 하단 분포 요약 — 화학계열 + 제조국 */
  const chemistryBars = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const p of passports) {
      const k = (p.chemistry as string) || '미분류';
      counts[k] = (counts[k] || 0) + 1;
    }
    return Object.entries(counts)
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [passports]);

  const countryBars = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const p of passports) {
      const k = (p.manufactureCountry as string) || '미입력';
      counts[k] = (counts[k] || 0) + 1;
    }
    return Object.entries(counts)
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [passports]);

  const goPP = (id?: string) => id && navigate(`/passports/${id}`);
  const goPassports = () => navigate('/passports');
  const goMaintenance = () => navigate('/maintenance');
  const goRecycling = () => navigate('/recycling');

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {/* KPI 3카드 skeleton */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 18 }}>
          <div style={{ borderRadius: 20, padding: 20, border: '1px solid var(--color-border)', background: 'var(--color-surface)', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Skeleton width="50%" height={14} />
            <Skeleton width="100%" height={140} radius={12} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
            {[0, 1, 2].map((i) => (
              <SkeletonCard key={i} lines={2} showTitle />
            ))}
          </div>
        </div>
        {/* 먼저 볼 목록 skeleton — 2열 x 3행 */}
        <div style={{ borderRadius: 20, padding: '20px 22px', border: '1px solid var(--color-border)', background: 'var(--color-surface)' }}>
          <Skeleton width="30%" height={14} style={{ marginBottom: 16 }} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
            {Array.from({ length: 6 }, (_, i) => (
              <SkeletonCard key={i} lines={2} showTitle />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* 페이지 헤드 */}
      <div
        className="sn-page-head"
        style={{ marginBottom: 0, borderBottom: 'none', paddingBottom: 0, flexWrap: 'wrap' }}
      >
        <div className="sn-page-head-main">
          <p className="sn-eyebrow" style={{ margin: '0 0 6px', color: 'var(--color-text-3)' }}>한눈에 보기</p>
          <h1 className="sn-page-title" style={{ margin: '0 0 6px' }}>대시보드</h1>
          <p className="sn-body" style={{ margin: 0, maxWidth: '44rem' }}>
            지금 처리해야 할 여권과 대기 항목을 먼저 보고 바로 이동합니다.
          </p>
        </div>
        <div className="sn-page-actions" style={{ gap: 10 }}>
          <button
            onClick={goPassports}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '11px 18px', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 12, fontSize: 14, fontWeight: 600, color: 'var(--color-text-2)', cursor: 'pointer' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12h18"/><path d="M12 3v18"/></svg>
            VIN 연결 대기
          </button>
          <button
            onClick={goMaintenance}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '11px 18px', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 12, fontSize: 14, fontWeight: 600, color: 'var(--color-text-2)', cursor: 'pointer' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/></svg>
            정비·분석 확인
          </button>
          <button
            onClick={goPassports}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 18px', background: 'var(--color-accent)', color: '#fff', border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: 'pointer', boxShadow: 'var(--shadow-card)' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            여권 만들기
          </button>
        </div>
      </div>

      {/* 히어로 row — 도넛 + KPI 3카드 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 18 }}>
        {/* 좌: 도넛 + 범례 */}
        <div className="sn-panel" style={{ borderRadius: 20, padding: 20, border: '1px solid var(--color-border)', background: 'var(--color-surface)', display: 'flex', flexDirection: 'column', gap: 20 }}>
          <p className="sn-eyebrow" style={{ margin: 0, color: 'var(--color-text-3)' }}>상태 분포</p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 24, flexWrap: 'wrap' }}>
            <DonutChart
              segments={donutSegments.length ? donutSegments : [{ label: '없음', value: 1, color: 'var(--color-border)' }]}
              size={160}
              thickness={20}
              centerLabel="전체"
              centerValue={String(totalCount)}
              animate={false}
            />
            <LegendStack items={legendItems} />
          </div>
        </div>

        {/* 우: KPI 3카드 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
          <button
            onClick={goPassports}
            style={{ padding: 20, borderRadius: 16, background: 'var(--color-surface-accent)', border: '1px solid rgba(23,105,224,0.12)', textAlign: 'left', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 10 }}
          >
            <p className="sn-caption" style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: 'var(--color-text-2)' }}>VIN 연결 필요</p>
            <p className="sn-metric" style={{ margin: 0, fontSize: '3rem', fontWeight: 700, lineHeight: 1.1 }}>
              {bindPendAnim}
              <span className="sn-metric-unit" style={{ fontSize: '1.125rem', fontWeight: 600, marginLeft: 5 }}>건</span>
            </p>
            <p className="sn-caption" style={{ margin: 0, fontSize: '1rem' }}>차량 정보 연결이 아직 끝나지 않은 여권</p>
          </button>
          <button
            onClick={goMaintenance}
            style={{ padding: 20, borderRadius: 16, background: 'var(--color-surface-warm)', border: '1px solid rgba(245,158,11,0.16)', textAlign: 'left', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 10 }}
          >
            <p className="sn-caption" style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: 'var(--color-text-2)' }}>정비·분석 확인</p>
            <p className="sn-metric" style={{ margin: 0, fontSize: '3rem', fontWeight: 700, lineHeight: 1.1 }}>
              {svcOpenAnim}
              <span className="sn-metric-unit" style={{ fontSize: '1.125rem', fontWeight: 600, marginLeft: 5 }}>건</span>
            </p>
            <p className="sn-caption" style={{ margin: 0, fontSize: '1rem' }}>결과 등록 또는 후속 검토가 필요한 항목</p>
          </button>
          <button
            onClick={goRecycling}
            style={{ padding: 20, borderRadius: 16, background: 'var(--color-surface-teal)', border: '1px solid rgba(13,148,136,0.16)', textAlign: 'left', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 10 }}
          >
            <p className="sn-caption" style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: 'var(--color-text-2)' }}>회수 판단 확인</p>
            <p className="sn-metric" style={{ margin: 0, fontSize: '3rem', fontWeight: 700, lineHeight: 1.1 }}>
              {recycleNAnim}
              <span className="sn-metric-unit" style={{ fontSize: '1.125rem', fontWeight: 600, marginLeft: 5 }}>건</span>
            </p>
            <p className="sn-caption" style={{ margin: 0, fontSize: '1rem' }}>회수 또는 재활용 판단이 필요한 여권</p>
          </button>
        </div>
      </div>

      {/* 먼저 볼 목록 + 최근 7일 등록 추세 */}
      <div style={{ display: 'grid', gridTemplateColumns: hasSparkData ? '2fr 1fr' : '1fr', gap: 18 }}>
        {/* 먼저 볼 목록 */}
        <div className="sn-panel" style={{ borderRadius: 20, padding: '20px 22px', border: '1px solid var(--color-border)', background: 'var(--color-surface)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 16 }}>
            <p className="sn-eyebrow" style={{ margin: 0, color: 'var(--color-text-3)' }}>먼저 볼 목록</p>
            <span className="sn-caption">상위 {urgentQueue.length}개</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
            {urgentQueue.map((passport) => (
              <button
                key={passport.passportId}
                onClick={() => goPP(passport.passportId)}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '14px 16px', borderRadius: 12, background: 'var(--color-surface)', border: '1px solid var(--color-border)', textAlign: 'left', cursor: 'pointer', boxShadow: 'var(--shadow-card)' }}
              >
                <div>
                  <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-text-1)', marginBottom: 4 }}>{passport.passportId}</div>
                  <div className="sn-caption" style={{ fontSize: '0.9375rem', marginBottom: 4 }}>다음 작업: {nextAction(passport)}</div>
                  <div className="sn-caption" style={{ fontSize: '0.9375rem' }}>{passport.model || passport.manufacturerName || '-'} · {formatShortDate(passport.updatedAt || passport.createdAt || passport.timestamp)}</div>
                </div>
                <span className="sn-detail-inline-stamp">
                  {getStatusBadge(passport.status || 'DISPOSED').label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* 최근 7일 등록 추세 — 데이터 있을 때만 표시 */}
        {hasSparkData && (
          <div className="sn-panel" style={{ borderRadius: 20, padding: '20px 22px', border: '1px solid var(--color-border)', background: 'var(--color-surface)', display: 'flex', flexDirection: 'column', gap: 16, minHeight: 0, alignSelf: 'stretch' }}>
            <div>
              <p className="sn-eyebrow" style={{ margin: '0 0 4px', color: 'var(--color-text-3)' }}>최근 7일 등록 추세</p>
              <p className="sn-caption" style={{ margin: 0 }}>등록일 기준 일별 신규 여권 수</p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
              <div style={{ padding: '12px 14px', borderRadius: 12, background: 'var(--color-surface-alt)', border: '1px solid var(--color-border)' }}>
                <p className="sn-caption" style={{ margin: '0 0 4px', color: 'var(--color-text-3)', fontSize: '0.8125rem' }}>7일 합계</p>
                <p style={{ margin: 0, fontSize: '1.75rem', fontWeight: 800, color: 'var(--color-text-1)', lineHeight: 1 }}>
                  {sparkSumAnim}
                  <span style={{ fontSize: '0.9375rem', fontWeight: 600, marginLeft: 4, color: 'var(--color-text-3)' }}>건</span>
                </p>
              </div>
              <div style={{ padding: '12px 14px', borderRadius: 12, background: 'var(--color-surface-alt)', border: '1px solid var(--color-border)' }}>
                <p className="sn-caption" style={{ margin: '0 0 4px', color: 'var(--color-text-3)', fontSize: '0.8125rem' }}>일 평균</p>
                <p style={{ margin: 0, fontSize: '1.75rem', fontWeight: 800, color: 'var(--color-text-1)', lineHeight: 1 }}>
                  {sparkAvgAnim.toFixed(1)}
                  <span style={{ fontSize: '0.9375rem', fontWeight: 600, marginLeft: 4, color: 'var(--color-text-3)' }}>건</span>
                </p>
              </div>
              <div style={{ padding: '12px 14px', borderRadius: 12, background: 'var(--color-surface-alt)', border: '1px solid var(--color-border)' }}>
                <p className="sn-caption" style={{ margin: '0 0 4px', color: 'var(--color-text-3)', fontSize: '0.8125rem' }}>최대 1일</p>
                <p style={{ margin: 0, fontSize: '1.75rem', fontWeight: 800, color: 'var(--color-text-1)', lineHeight: 1 }}>
                  {Math.max(...sparkValues)}
                  <span style={{ fontSize: '0.9375rem', fontWeight: 600, marginLeft: 4, color: 'var(--color-text-3)' }}>건</span>
                </p>
              </div>
            </div>
            <div style={{ flex: 1, minHeight: 110 }}>
              <Sparkline values={sparkValues} height={110} color="var(--color-accent)" fillOpacity={0.14} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span className="sn-caption">7일 전</span>
              <span className="sn-caption">오늘</span>
            </div>
          </div>
        )}
      </div>

      {/* 하단: 포트폴리오 요약 — 화학계열 + 제조국 */}
      {passports.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 18 }}>
          <div className="sn-panel" style={{ borderRadius: 20, padding: '22px 24px', border: '1px solid var(--color-border)', background: 'var(--color-surface)', display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
              <div>
                <p className="sn-eyebrow" style={{ margin: '0 0 6px', color: 'var(--color-text-3)' }}>포트폴리오 · 화학계열</p>
                <p style={{ fontSize: '1rem', color: 'var(--color-text-2)', margin: 0 }}>등록된 배터리의 셀 chemistry 분포</p>
              </div>
              <span className="sn-caption">{chemistryBars.length}종</span>
            </div>
            <BarRows items={chemistryBars} barColor="var(--color-accent)" />
          </div>
          <div className="sn-panel" style={{ borderRadius: 20, padding: '22px 24px', border: '1px solid var(--color-border)', background: 'var(--color-surface)', display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
              <div>
                <p className="sn-eyebrow" style={{ margin: '0 0 6px', color: 'var(--color-text-3)' }}>포트폴리오 · 제조국</p>
                <p style={{ fontSize: '1rem', color: 'var(--color-text-2)', margin: 0 }}>제조사 본사 기준 상위 6개국</p>
              </div>
              <span className="sn-caption">{countryBars.length}국</span>
            </div>
            <BarRows items={countryBars} barColor="var(--color-success)" />
          </div>
        </div>
      )}
    </div>
  );
}
