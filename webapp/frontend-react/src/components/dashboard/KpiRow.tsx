import { KpiIcon } from './Glyphs';
import KpiTrendSparkline from './KpiTrendSparkline';
import type { KpiCardViewModel } from './lib';

interface Props {
  kpiCards: KpiCardViewModel[];
}

export default function KpiRow({ kpiCards }: Props) {
  return (
    <div className="vk-grid vk-grid--4">
      {kpiCards.map((k) => (
        <article key={k.label} className={`vk-card vk-kpi vk-kpi--${k.tone}`}>
          <div className="vk-kpi__top">
            <div className="vk-kpi__copy">
              <span className="vk-kpi__label">{k.label}</span>
              <div className="vk-kpi__value">{k.value}</div>
              <span className="vk-kpi__delta">{k.delta}</span>
            </div>
            <span className="vk-kpi__icon" aria-hidden="true">
              <KpiIcon name={k.icon} />
            </span>
          </div>
          <KpiTrendSparkline label={k.label} trend={k.visual.trend} />
        </article>
      ))}
    </div>
  );
}
