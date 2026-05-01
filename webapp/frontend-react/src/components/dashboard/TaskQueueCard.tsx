import { ChevronRightIcon, TaskGlyph } from './Glyphs';
import type { DashboardRoute, TaskRowViewModel } from './lib';

interface Props {
  taskRows: TaskRowViewModel[];
  totalTaskCount: number;
  onNavigate: (route: DashboardRoute) => void;
}

export default function TaskQueueCard({ taskRows, totalTaskCount, onNavigate }: Props) {
  return (
    <article className="vk-card">
      <div className="vk-card__head">
        <div>
          <div className="vk-card__titleline">
            <h2 className="vk-card__title">작업 대기열</h2>
            <span className="vk-card__count">{totalTaskCount}</span>
          </div>
          <p className="vk-card__sub">우선 처리 대기열</p>
        </div>
        <button type="button" className="vk-linkbtn vk-linkbtn--chevron" onClick={() => onNavigate('/passports')}>
          <span>전체 보기</span>
          <ChevronRightIcon />
        </button>
      </div>
      <div className="vk-tasks">
        {totalTaskCount === 0 ? (
          <div className="vk-task vk-task--blue" style={{ gridColumn: '1 / -1', alignContent: 'center', textAlign: 'center' }}>
            <p className="vk-task__label">대기 중인 작업이 없습니다</p>
          </div>
        ) : taskRows.map((t) => (
          <button
            key={t.label}
            type="button"
            className={`vk-task vk-task--${t.tone}`}
            aria-label={`${t.label} ${t.value}${t.unit} 보기`}
            onClick={() => onNavigate(t.route)}
          >
            <div className="vk-task__top">
              <div className="vk-task__icon" aria-hidden="true"><TaskGlyph name={t.icon} /></div>
              <p className="vk-task__label">{t.label}</p>
            </div>
            <p className="vk-task__count">
              <span className="vk-task__num">{t.value}</span>
              <span className="vk-task__unit">{t.unit}</span>
            </p>
          </button>
        ))}
      </div>
    </article>
  );
}
