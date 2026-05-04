interface Props {
  passportId: string;
  onPassportIdChange: (value: string) => void;
  onSearch: () => void;
  loading: boolean;
  autoRefresh: boolean;
  countdown: number;
  requestPathLabel: string;
  lastFetchedAt: Date | null;
}

export default function BmuSearchPanel({
  passportId,
  onPassportIdChange,
  onSearch,
  loading,
  autoRefresh,
  countdown,
  requestPathLabel,
  lastFetchedAt,
}: Props) {
  return (
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
            onChange={(e) => onPassportIdChange(e.target.value)}
            onKeyUp={(e) => e.key === 'Enter' && onSearch()}
            type="text"
            placeholder="조회할 배터리 여권 ID 또는 DID를 입력하세요"
            className="sn-input"
            style={{ fontFamily: 'var(--font-mono)', fontSize: '0.9375rem' }}
          />
        </div>
        <button
          onClick={onSearch}
          disabled={!passportId.trim() || loading}
          className="sn-btn sn-btn-accent"
          style={{
            minHeight: 44,
            alignSelf: 'flex-end',
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
  );
}
