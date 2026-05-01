import { SecurityGlyph } from './Glyphs';
import { AUDIT_REQUIRED_LABEL, type DashboardRoute, type SecurityRowViewModel } from './lib';

interface Props {
  securityRows: SecurityRowViewModel[];
  canReadAudit: boolean;
  onNavigate: (route: DashboardRoute) => void;
}

export default function SecurityCard({ securityRows, canReadAudit, onNavigate }: Props) {
  return (
    <article className="vk-card">
      <div className="vk-card__head">
        <div>
          <h2 className="vk-card__title">보안 상태</h2>
          <p className="vk-card__sub">플랫폼 보안 기준값</p>
        </div>
        <button
          type="button"
          className="vk-linkbtn"
          disabled={!canReadAudit}
          title={canReadAudit ? '감사 로그로 이동' : AUDIT_REQUIRED_LABEL}
          aria-label={canReadAudit ? '보안 상태 상세 보기' : AUDIT_REQUIRED_LABEL}
          onClick={canReadAudit ? () => onNavigate('/audit-log') : undefined}
        >
          {canReadAudit ? '상세 보기' : AUDIT_REQUIRED_LABEL}
        </button>
      </div>
      <div className="vk-secbar" aria-label="보안 상태">
        {securityRows.map((s) => (
          <div key={s.label} className={`vk-sec vk-sec--${s.tone}`}>
            <div className="vk-sec__icon" aria-hidden="true"><SecurityGlyph name={s.icon} /></div>
            <div className="vk-sec__copy">
              <p className="vk-sec__label">{s.label}</p>
              <p className="vk-sec__value">{s.value}</p>
            </div>
          </div>
        ))}
      </div>
    </article>
  );
}
