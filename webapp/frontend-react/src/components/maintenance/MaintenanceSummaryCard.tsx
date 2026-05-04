interface ExtStats {
  totalMaintenance: number;
  totalAccident: number;
  urgentCount: number;
  pendingPassports: number;
  avgIntervalDays: number | null;
}

interface TabCounts {
  all: number;
  maintenance: number;
  accident: number;
}

interface Props {
  docketScopeLabel: string;
  docketSummary: string;
  extStats: ExtStats;
  tabCounts: TabCounts;
}

export default function MaintenanceSummaryCard({ docketScopeLabel, docketSummary, extStats, tabCounts }: Props) {
  return (
    <section className="sn-section-card">
      <div className="sn-section-head">
        <div className="sn-section-head-row">
          <div>
            <p className="sn-eyebrow" style={{ margin: '0 0 0.4rem', color: 'var(--color-text-3)' }}>{docketScopeLabel}</p>
            <h2 className="sn-heading" style={{ margin: 0, fontSize: '1.25rem' }}>작업 처리 요약</h2>
            <p className="sn-caption" style={{ margin: '0.45rem 0 0', maxWidth: '46rem' }}>
              여권 조회 결과를 service log, incident log, 접수 후보 기준으로 정리합니다.
            </p>
          </div>
        </div>
      </div>

      <div className="sn-info-grid sn-info-grid-auto">
        <div className="sn-info-tile">
          <p className="sn-eyebrow" style={{ margin: '0 0 0.5rem', color: 'var(--color-success)' }}>서비스 로그</p>
          <p className="sn-info-tile-value" style={{ color: 'var(--color-success)' }}>{extStats.totalMaintenance}</p>
          <p className="sn-stat-note">누적 정비 이력</p>
        </div>
        <div className="sn-info-tile">
          <p className="sn-eyebrow" style={{ margin: '0 0 0.5rem', color: 'var(--color-danger)' }}>사고 로그</p>
          <p className="sn-info-tile-value" style={{ color: 'var(--color-danger)' }}>{extStats.totalAccident}</p>
          <p className="sn-stat-note">누적 사고 기록</p>
        </div>
        <div className="sn-info-tile">
          <p className="sn-eyebrow" style={{ margin: '0 0 0.5rem', color: extStats.urgentCount > 0 ? 'var(--color-danger)' : 'var(--color-text-3)' }}>
            Overdue tasks
          </p>
          <p className="sn-info-tile-value" style={{ color: extStats.urgentCount > 0 ? 'var(--color-danger)' : 'var(--color-text-1)' }}>
            {extStats.urgentCount}
          </p>
          <p className="sn-stat-note">정비 접수 7일 초과</p>
        </div>
        <div className="sn-info-tile">
          <p className="sn-eyebrow" style={{ margin: '0 0 0.5rem', color: 'var(--color-warning)' }}>요청 후보</p>
          <p className="sn-info-tile-value" style={{ color: 'var(--color-warning)' }}>{extStats.pendingPassports}</p>
          <p className="sn-stat-note">ACTIVE + VIN, 정비 이력 없음</p>
        </div>
      </div>

      <div className="sn-summary-grid sn-summary-grid-3" style={{ borderTop: '1px solid var(--color-border)' }}>
        <div className="sn-summary-lead">
          <p className="sn-eyebrow sn-summary-title" style={{ margin: '0 0 0.4rem' }}>문서 상태</p>
          <p className="sn-summary-copy-strong" style={{ margin: 0, color: 'var(--color-text-1)' }}>접수 · 완료 · 사고 기록</p>
          <p className="sn-stat-note" style={{ margin: '0.35rem 0 0', lineHeight: 1.6 }}>{docketSummary}</p>
        </div>
        <div>
          <p className="sn-eyebrow sn-stat-card-title">서비스 작업 큐</p>
          <p className="sn-metric sn-metric-md sn-stat-count">{tabCounts.maintenance}</p>
          <p className="sn-stat-note">MAINTENANCE 또는 ANALYSIS 상태</p>
        </div>
        <div>
          <p className="sn-eyebrow sn-stat-card-title">사고 문서</p>
          <p className="sn-metric sn-metric-md sn-stat-count">{tabCounts.accident}</p>
          <p className="sn-stat-note">사고 기록이 있는 여권</p>
        </div>
      </div>
    </section>
  );
}
