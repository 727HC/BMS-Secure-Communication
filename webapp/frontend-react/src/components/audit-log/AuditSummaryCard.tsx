import { formatTime } from './lib';

interface TimeSummary {
  last24h: number;
  last7d: number;
}

interface Props {
  ledgerScopeLabel: string;
  page: number;
  totalPages: number;
  total: number;
  filterWriteOnly: boolean;
  activeActionLabel: string;
  autoRefresh: boolean;
  newestTimestamp?: string;
  timeSummary: TimeSummary;
}

export default function AuditSummaryCard({
  ledgerScopeLabel,
  page,
  totalPages,
  total,
  filterWriteOnly,
  activeActionLabel,
  autoRefresh,
  newestTimestamp,
  timeSummary,
}: Props) {
  return (
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
  );
}
