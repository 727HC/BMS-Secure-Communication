interface Props {
  filteredCount: number;
  certifiedCount: number;
  certifiedRatio: number;
  originUniqueCount: number;
}

export default function MaterialsSummaryCard({
  filteredCount,
  certifiedCount,
  certifiedRatio,
  originUniqueCount,
}: Props) {
  return (
    <section className="sn-section-card">
      <div className="sn-section-head">
        <div className="sn-section-head-row">
          <div>
            <p className="sn-eyebrow" style={{ margin: '0 0 0.4rem', color: 'var(--color-text-3)' }}>등록부 요약</p>
            <h2 className="sn-heading" style={{ margin: 0, fontSize: '1.25rem' }}>공급망 파일 요약</h2>
            <p className="sn-caption" style={{ margin: '0.45rem 0 0', maxWidth: '44rem' }}>
              현재 조회 결과를 등재 파일, 인증 근거, 원산지 범위 기준으로 정리합니다.
            </p>
          </div>
        </div>
      </div>

      <div className="sn-info-grid sn-info-grid-auto">
        <div className="sn-info-tile">
          <p className="sn-eyebrow" style={{ margin: '0 0 0.5rem' }}>등록 파일</p>
          <p className="sn-info-tile-value">{filteredCount}</p>
          <p className="sn-stat-note">검색 결과 기준</p>
        </div>
        <div className="sn-info-tile">
          <p className="sn-eyebrow" style={{ margin: '0 0 0.5rem', color: 'var(--color-success)' }}>인증 근거</p>
          <p className="sn-info-tile-value" style={{ color: 'var(--color-success)' }}>{certifiedCount}</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.65rem' }}>
            <div style={{ flex: 1, height: 4, background: 'var(--color-border)', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{ height: '100%', background: 'var(--color-success)', borderRadius: 2, width: `${certifiedRatio}%` }} />
            </div>
            <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-3)', whiteSpace: 'nowrap' }}>
              {certifiedRatio}%
            </span>
          </div>
        </div>
        <div className="sn-info-tile">
          <p className="sn-eyebrow" style={{ margin: '0 0 0.5rem', color: 'var(--color-accent)' }}>원산지 범위</p>
          <p className="sn-info-tile-value" style={{ color: 'var(--color-accent)' }}>{originUniqueCount}</p>
          <p className="sn-stat-note">고유 원산지 수</p>
        </div>
      </div>
    </section>
  );
}
