interface TabCounts {
  all: number;
  recyclable: number;
  recycling: number;
  disposed: number;
}

interface LifecycleMetrics {
  lifecycleFiles: unknown[];
  analysisQueue: number;
  activeCandidates: number;
  extractionEvidence: number;
  readyRatio: number;
}

interface Props {
  deskLabel: string;
  tabCounts: TabCounts;
  avgSoh: number | null;
  avgRemaining: number | null;
  lifecycleMetrics: LifecycleMetrics;
}

export default function RecyclingSummaryCard({ deskLabel, tabCounts, avgSoh, avgRemaining, lifecycleMetrics }: Props) {
  return (
    <section className="sn-section-card">
      <div className="sn-section-head">
        <div className="sn-section-head-row">
          <div>
            <p className="sn-eyebrow" style={{ margin: '0 0 0.4rem', color: 'var(--color-text-3)' }}>{deskLabel}</p>
            <h2 className="sn-heading" style={{ margin: 0, fontSize: '1.25rem' }}>생애 주기 등재 요약</h2>
            <p className="sn-caption" style={{ margin: '0.45rem 0 0', maxWidth: '48rem' }}>
              여권 필드의 SOH, 잔존 수명, 회수 가능 판정, 원소별 추출률을 기준으로 ESG 회수 준비 상태를 계산합니다.
            </p>
          </div>
          <span className="sn-detail-inline-stamp">GET /api/passports</span>
        </div>
      </div>

      <div className="sn-info-grid sn-info-grid-auto">
        <div className="sn-info-tile">
          <p className="sn-eyebrow" style={{ margin: '0 0 0.5rem', color: 'var(--color-success)' }}>회수 가능</p>
          <p className="sn-info-tile-value" style={{ color: 'var(--color-success)' }}>{tabCounts.recyclable}</p>
          <p className="sn-stat-note">재활용 가능 판정 파일</p>
        </div>
        <div className="sn-info-tile">
          <p className="sn-eyebrow" style={{ margin: '0 0 0.5rem', color: 'var(--color-accent)' }}>재활용 진행</p>
          <p className="sn-info-tile-value" style={{ color: 'var(--color-accent)' }}>{tabCounts.recycling}</p>
          <p className="sn-stat-note">현재 회수·추출 상태</p>
        </div>
        <div className="sn-info-tile">
          <p className="sn-eyebrow" style={{ margin: '0 0 0.5rem' }}>평균 SOH</p>
          <p className="sn-info-tile-value">{avgSoh != null ? `${avgSoh}%` : '-'}</p>
          <p className="sn-stat-note">lifecycle 대상 기준</p>
        </div>
        <div className="sn-info-tile">
          <p className="sn-eyebrow" style={{ margin: '0 0 0.5rem' }}>평균 잔존수명</p>
          <p className="sn-info-tile-value">{avgRemaining != null ? `${avgRemaining.toLocaleString('ko-KR')}` : '-'}</p>
          <p className="sn-stat-note">cycle register value</p>
        </div>
      </div>

      <div className="sn-summary-grid sn-summary-grid-3" style={{ borderBottom: '1px solid var(--color-border)' }}>
        <div className="sn-summary-lead">
          <p className="sn-eyebrow sn-summary-title">회수 준비도</p>
          <p className="sn-summary-copy-strong" style={{ margin: 0 }}>회수 준비율 {lifecycleMetrics.readyRatio}%</p>
          <p className="sn-stat-note" style={{ marginTop: '0.45rem', lineHeight: 1.6 }}>
            전체 lifecycle 파일 중 재활용 가능 판정이 끝난 여권 비율입니다.
          </p>
        </div>
        <div>
          <p className="sn-eyebrow sn-stat-card-title">추출 근거</p>
          <p className="sn-summary-copy-strong" style={{ fontFamily: 'var(--font-mono)', margin: 0 }}>{lifecycleMetrics.extractionEvidence}</p>
          <p className="sn-stat-note">recyclingRates 보유 파일</p>
        </div>
        <div>
          <p className="sn-eyebrow sn-stat-card-title">폐기 승인</p>
          <p className="sn-summary-copy-strong" style={{ fontFamily: 'var(--font-mono)', margin: 0 }}>{tabCounts.disposed}</p>
          <p className="sn-stat-note">DISPOSED 상태 파일</p>
        </div>
      </div>
    </section>
  );
}
