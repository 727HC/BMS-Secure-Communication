import { AlertGlyph, ChevronRightIcon } from './Glyphs';
import { AUDIT_REQUIRED_LABEL, type AlertRowViewModel, type DashboardRoute } from './lib';

interface Props {
  alertRows: AlertRowViewModel[];
  canReadAudit: boolean;
  onNavigate: (route: DashboardRoute) => void;
  onPassportClick: (passportId: string) => void;
}

export default function AlertCard({ alertRows, canReadAudit, onNavigate, onPassportClick }: Props) {
  return (
    <article className="vk-card">
      <div className="vk-card__head">
        <div>
          <div className="vk-card__titleline">
            <h2 className="vk-card__title">알림</h2>
            <span className="vk-card__count">{alertRows.length}</span>
          </div>
          <p className="vk-card__sub">우선 확인 알림</p>
        </div>
        <button
          type="button"
          className="vk-linkbtn vk-linkbtn--chevron"
          disabled={!canReadAudit}
          title={canReadAudit ? '감사 로그로 이동' : AUDIT_REQUIRED_LABEL}
          aria-label={canReadAudit ? '전체 알림 보기' : AUDIT_REQUIRED_LABEL}
          onClick={canReadAudit ? () => onNavigate('/audit-log') : undefined}
        >
          <span>{canReadAudit ? '전체 알림 보기' : AUDIT_REQUIRED_LABEL}</span>
          <ChevronRightIcon />
        </button>
      </div>
      <ul className="vk-alerts">
        {alertRows.length === 0 ? (
          <li className="vk-alerts__row">
            <span className="vk-alerts__msg" style={{ gridColumn: '1 / -1' }}>표시할 알림이 없습니다</span>
          </li>
        ) : alertRows.map((a) => {
          const severity = a.severity.toLowerCase();
          const navigateToPassport = () => {
            if (a.navigable && a.source) onPassportClick(a.source);
          };
          return (
            <li
              key={a.key}
              className={`vk-alerts__row vk-alerts__row--${severity}`}
              onClick={a.navigable ? navigateToPassport : undefined}
              onKeyDown={(e) => { if (a.navigable && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); navigateToPassport(); } }}
              role={a.navigable ? 'button' : undefined}
              tabIndex={a.navigable ? 0 : undefined}
              style={{ cursor: a.navigable ? 'pointer' : 'default' }}
            >
              <span className={`vk-alerts__icon vk-alerts__icon--${severity}`} aria-hidden="true">
                <AlertGlyph severity={a.severity} />
              </span>
              <span className="vk-alerts__msg">{a.message}</span>
              <span className="vk-alerts__id">{a.source}</span>
              <span className={`vk-alerts__status vk-alerts__status--${severity}`}>{a.severity}</span>
              <span className="vk-alerts__time">{a.time}</span>
              <span className="vk-alerts__chevron" aria-hidden="true">
                <ChevronRightIcon />
              </span>
            </li>
          );
        })}
      </ul>
    </article>
  );
}
