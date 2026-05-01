import { Fragment } from 'react';
import { ChevronRightIcon, ConnectorArrow, NodeGlyph } from './Glyphs';
import type { DashboardRoute, DataflowNodeViewModel } from './lib';

interface Props {
  dataflowNodes: DataflowNodeViewModel[];
  onNavigate: (route: DashboardRoute) => void;
}

export default function DataflowCard({ dataflowNodes, onNavigate }: Props) {
  return (
    <article className="vk-card vk-dataflow">
      <div className="vk-card__head">
        <div>
          <div className="vk-card__titleline">
            <h2 className="vk-card__title">데이터 파이프라인</h2>
          </div>
          <p className="vk-card__sub">기준 처리 단계</p>
        </div>
        <button type="button" className="vk-linkbtn vk-linkbtn--chevron" onClick={() => onNavigate('/bmu-data')}>
          <span>상세 보기</span>
          <ChevronRightIcon />
        </button>
      </div>
      <div className="vk-dataflow__nodes">
        {dataflowNodes.map((n, index) => (
          <Fragment key={n.key}>
            <div className="vk-dataflow__node">
              <div className="vk-dataflow__badge"><NodeGlyph name={n.key} /></div>
              <p className="vk-dataflow__label">{n.label}</p>
              <p className="vk-dataflow__val">{n.action}</p>
              <span className={`vk-dataflow__status vk-dataflow__status--${n.status.toLowerCase()}`}>{n.status}</span>
            </div>
            {index < dataflowNodes.length - 1 ? (
              <span className="vk-dataflow__connector" aria-hidden="true">
                <ConnectorArrow />
              </span>
            ) : null}
          </Fragment>
        ))}
      </div>
    </article>
  );
}
