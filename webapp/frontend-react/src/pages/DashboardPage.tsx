import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { getStatusBadge } from '../lib/helpers';

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
  const totalCount = passports.length || 1;
  const statusRows = STATUS_BARS.map((row) => {
    const value = passports.filter((p) => p.status === row.key).length;
    return {
      ...row,
      value,
      pct: Math.round((value / totalCount) * 100),
    };
  });

  const goPP = (id?: string) => id && navigate(`/passports/${id}`);
  const goPassports = () => navigate('/passports');
  const goMaintenance = () => navigate('/maintenance');
  const goRecycling = () => navigate('/recycling');

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '52vh' }}>
        <div
          style={{
            width: 26,
            height: 26,
            border: '2.5px solid #dbe4f0',
            borderTopColor: '#1769e0',
            borderRadius: '50%',
            animation: 'spin .7s linear infinite',
          }}
        />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
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

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 18, alignItems: 'stretch' }}>
        <div className="sn-panel" style={{ borderRadius: 20, padding: '20px 22px', border: '1px solid var(--color-border)', background: 'linear-gradient(135deg, var(--color-surface) 0%, var(--color-surface-alt) 100%)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, marginBottom: 16 }}>
          <p className="sn-eyebrow" style={{ margin: 0, color: 'var(--color-text-3)' }}>작업 개요</p>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 10px', borderRadius: 999, background: 'var(--color-surface-accent)', color: 'var(--color-accent)', fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap' }}>
              지금 먼저 볼 항목
            </span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 12 }}>
            <button onClick={goPassports} style={{ padding: 20, borderRadius: 16, background: 'var(--color-surface-accent)', border: '1px solid rgba(23,105,224,0.12)', textAlign: 'left', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <p className="sn-caption" style={{ margin: 0, fontSize: 14 }}>VIN 연결 필요</p>
              <p style={{ fontFamily: 'var(--font-display)', fontSize: '2.5rem', fontWeight: 800, color: 'var(--color-text-1)', margin: 0, lineHeight: 1 }}>{bindPend}건</p>
              <p className="sn-caption" style={{ margin: 0 }}>차량 정보 연결이 아직 끝나지 않은 여권</p>
            </button>
            <button onClick={goMaintenance} style={{ padding: 20, borderRadius: 16, background: 'var(--color-surface-warm)', border: '1px solid rgba(245,158,11,0.16)', textAlign: 'left', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <p className="sn-caption" style={{ margin: 0, fontSize: 14 }}>정비·분석 확인</p>
              <p style={{ fontFamily: 'var(--font-display)', fontSize: '2.5rem', fontWeight: 800, color: 'var(--color-text-1)', margin: 0, lineHeight: 1 }}>{svcOpen}건</p>
              <p className="sn-caption" style={{ margin: 0 }}>결과 등록 또는 후속 검토가 필요한 항목</p>
            </button>
            <button onClick={goRecycling} style={{ padding: 20, borderRadius: 16, background: 'var(--color-surface-teal)', border: '1px solid rgba(13,148,136,0.16)', textAlign: 'left', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <p className="sn-caption" style={{ margin: 0, fontSize: 14 }}>회수 판단 확인</p>
              <p style={{ fontFamily: 'var(--font-display)', fontSize: '2.5rem', fontWeight: 800, color: 'var(--color-text-1)', margin: 0, lineHeight: 1 }}>{recycleN}건</p>
              <p className="sn-caption" style={{ margin: 0 }}>회수 또는 재활용 판단이 필요한 여권</p>
            </button>
          </div>
          <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid rgba(15,23,42,0.06)', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 4 }}>
              <span className="sn-caption" style={{ fontSize: 13, fontWeight: 600 }}>먼저 볼 목록</span>
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
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text-1)', marginBottom: 4 }}>{passport.passportId}</div>
                    <div className="sn-caption" style={{ marginBottom: 4 }}>다음 작업: {nextAction(passport)}</div>
                    <div className="sn-caption">{passport.model || passport.manufacturerName || '-'} · 최근 갱신 {formatShortDate(passport.updatedAt || passport.createdAt || passport.timestamp)}</div>
                  </div>
                  <span className="sn-detail-inline-stamp">
                    {getStatusBadge(passport.status || 'DISPOSED').label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="sn-panel" style={{ borderRadius: 20, padding: '20px 22px', border: '1px solid var(--color-border)', background: 'var(--color-surface)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, marginBottom: 16 }}>
            <div>
          <p className="sn-eyebrow" style={{ margin: 0, color: 'var(--color-text-3)' }}>상태 분포</p>
              <p className="sn-caption" style={{ marginTop: 6 }}>현재 등록된 여권이 어느 상태에 몰려 있는지 바로 비교합니다.</p>
            </div>
            <span className="sn-caption">총 {passports.length}건</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 14 }}>
            {statusRows.map((row) => (
              <button key={row.key} onClick={() => goStatusRoute(row.key, navigate)} style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '10px 12px', borderRadius: 14, background: 'var(--color-surface-alt)', border: '1px solid var(--color-border)', cursor: 'pointer', textAlign: 'left' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text-1)' }}>{row.label}</span>
                  <span className="sn-caption">{row.value}건</span>
                </div>
                <div style={{ height: 8, borderRadius: 999, background: 'var(--color-border)', overflow: 'hidden' }}>
                  <div style={{ width: `${row.pct}%`, height: '100%', background: row.color, borderRadius: 999 }} />
                </div>
                <span className="sn-caption">전체 대비 {row.pct}%</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
