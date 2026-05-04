import { ACTION_OPTIONS } from './lib';

interface Props {
  filterAction: string;
  onActionChange: (value: string) => void;
  filterWriteOnly: boolean;
  onWriteOnlyChange: (value: boolean) => void;
  total: number;
  logsCount: number;
}

export default function AuditFilterBar({
  filterAction,
  onActionChange,
  filterWriteOnly,
  onWriteOnlyChange,
  total,
  logsCount,
}: Props) {
  return (
    <section className="sn-section-card">
      <div className="sn-section-head">
        <div className="sn-section-head-row">
          <div>
            <p className="sn-eyebrow" style={{ margin: '0 0 0.4rem', color: 'var(--color-text-3)' }}>원장 제어</p>
            <h2 className="sn-heading" style={{ margin: 0, fontSize: '1.25rem' }}>감사 등록 필터</h2>
            <p className="sn-caption" style={{ margin: '0.45rem 0 0', maxWidth: '44rem' }}>
              Action 필터와 write-only 토글은 기존 `/audit` 쿼리 파라미터를 그대로 구성합니다.
            </p>
          </div>
        </div>
      </div>

      <div className="sn-toolbar" style={{ padding: '0.9rem 1.25rem', background: 'var(--color-surface)' }}>
        <div style={{ flex: 1, minWidth: 180 }}>
          <label className="sn-eyebrow" style={{ display: 'block', marginBottom: 8 }}>행위</label>
          <select
            value={filterAction}
            onChange={(e) => onActionChange(e.target.value)}
            className="sn-input"
            style={{ minWidth: 180, fontSize: '0.9375rem' }}
          >
            {ACTION_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
        <label className="sn-panel" style={{ minHeight: 44, display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer', userSelect: 'none', padding: '0.55rem 0.9rem' }}>
          <input
            type="checkbox"
            checked={filterWriteOnly}
            onChange={(e) => onWriteOnlyChange(e.target.checked)}
            style={{ width: 16, height: 16, accentColor: 'var(--color-text-1)', borderRadius: 4 }}
          />
          <span style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--color-text-2)' }}>쓰기 작업만</span>
        </label>
        <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)', fontSize: '0.875rem', color: 'var(--color-text-3)' }}>
          총 {total}건
        </span>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', padding: '0 1.25rem 1rem', background: 'var(--color-surface)' }}>
        <span className="sn-detail-inline-stamp">action {filterAction || 'ALL'}</span>
        <span className="sn-detail-inline-stamp">writeOnly {filterWriteOnly ? 'true' : 'false'}</span>
        <span className="sn-detail-inline-stamp">표시 {logsCount}</span>
      </div>
    </section>
  );
}
