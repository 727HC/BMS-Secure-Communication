interface Props {
  registerScopeLabel: string;
  totalCount: number;
  activeCount: number;
  maintenanceCount: number;
  endOfLifeCount: number;
  avgGba: number;
  reviewReadyCount: number;
  vinPendingCount: number;
}

export default function PassportsSummaryCard({
  registerScopeLabel,
  totalCount,
  activeCount,
  maintenanceCount,
  endOfLifeCount,
  avgGba,
  reviewReadyCount,
  vinPendingCount,
}: Props) {
  return (
    <section className="sn-section-card">
      <div className="sn-section-head">
        <div className="sn-section-head-row">
          <div>
            <p className="sn-eyebrow" style={{ margin: '0 0 0.4rem', color: 'var(--color-text-3)' }}>{registerScopeLabel}</p>
            <h2 className="sn-heading" style={{ margin: 0, fontSize: '1.25rem' }}>등록 파일 요약</h2>
            <p className="sn-caption" style={{ margin: '0.45rem 0 0', maxWidth: '46rem' }}>
              실시간 조회 결과를 여권 파일, 운영 상태, 보완 필요 문서 기준으로 정리합니다.
            </p>
          </div>
        </div>
      </div>

      <div className="sn-info-grid sn-info-grid-auto">
        <div className="sn-info-tile">
          <p className="sn-eyebrow" style={{ margin: '0 0 0.5rem' }}>전체 등재</p>
          <p className="sn-info-tile-value">{totalCount}</p>
          <p className="sn-stat-note">등록부에 올라온 여권</p>
        </div>
        <div className="sn-info-tile">
          <p className="sn-eyebrow" style={{ margin: '0 0 0.5rem', color: 'var(--color-success)' }}>운행 등재</p>
          <p className="sn-info-tile-value">{activeCount}</p>
          <p className="sn-stat-note">ACTIVE 상태 파일</p>
        </div>
        <div className="sn-info-tile">
          <p className="sn-eyebrow" style={{ margin: '0 0 0.5rem', color: 'var(--color-warning)' }}>점검 문서</p>
          <p className="sn-info-tile-value">{maintenanceCount}</p>
          <p className="sn-stat-note">정비 또는 분석 중</p>
        </div>
        <div className="sn-info-tile">
          <p className="sn-eyebrow" style={{ margin: '0 0 0.5rem' }}>회수 파일</p>
          <p className="sn-info-tile-value">{endOfLifeCount}</p>
          <p className="sn-stat-note">재활용·폐기 상태</p>
        </div>
      </div>

      <div className="sn-summary-grid sn-summary-grid-3" style={{ borderBottom: '1px solid var(--color-border)' }}>
        <div className="sn-summary-lead">
          <p className="sn-eyebrow sn-summary-title" style={{ margin: '0 0 0.4rem' }}>등재 준비도</p>
          <p className="sn-summary-copy-strong" style={{ margin: 0, color: 'var(--color-text-1)' }}>GBA 21 · VIN · 검토 준비</p>
          <p className="sn-stat-note" style={{ margin: '0.35rem 0 0', lineHeight: 1.6 }}>
            모든 수치는 현재 등록부 조회 결과에서 계산합니다.
          </p>
        </div>
        <div>
          <p className="sn-eyebrow sn-stat-card-title">평균 GBA 21</p>
          <p className="sn-metric sn-metric-md sn-stat-count">{avgGba}<span className="sn-metric-unit">%</span></p>
          <p className="sn-stat-note">필수 필드 충족률</p>
        </div>
        <div>
          <p className="sn-eyebrow sn-stat-card-title">검토 가능</p>
          <p className="sn-metric sn-metric-md sn-stat-count">{reviewReadyCount}</p>
          <p className="sn-stat-note">GBA 완료 및 VIN 연결</p>
        </div>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', padding: '0.9rem 1.25rem', background: 'var(--color-surface-alt)' }}>
        <span className="sn-detail-inline-stamp">VIN 대기 {vinPendingCount}</span>
        <span className="sn-detail-inline-stamp">GBA 평균 {avgGba}%</span>
        <span className="sn-detail-inline-stamp">검토 가능 {reviewReadyCount}</span>
      </div>
    </section>
  );
}
