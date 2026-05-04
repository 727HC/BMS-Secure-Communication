import { BarRows, DonutChart, LegendStack } from '../ui';

interface DonutSegment {
  label: string;
  value: number;
  color: string;
}

interface BarItem {
  label: string;
  value: number;
  hint?: string;
}

interface Props {
  totalCount: number;
  statusDistSegments: DonutSegment[];
  statusLegendItems: DonutSegment[];
  manufacturerBarItems: BarItem[];
  chemistryBarItems: BarItem[];
}

export default function PassportsDistributionCard({
  totalCount,
  statusDistSegments,
  statusLegendItems,
  manufacturerBarItems,
  chemistryBarItems,
}: Props) {
  return (
    <section className="sn-section-card" style={{ padding: '20px 22px', maxWidth: 1080 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
        <div>
          <p className="sn-eyebrow" style={{ margin: '0 0 0.35rem', color: 'var(--color-text-3)' }}>등록부 구성</p>
          <h2 className="sn-heading" style={{ margin: 0, fontSize: '1.125rem' }}>상태와 제조 근거</h2>
        </div>
        <p className="sn-caption" style={{ margin: 0 }}>상태, 제조사, 화학계열 분포를 현재 조회 결과로 표시합니다.</p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(17rem, auto) minmax(0, 1fr)', gap: 32, alignItems: 'start' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
          <DonutChart
            segments={statusDistSegments.length ? statusDistSegments : [{ label: '없음', value: 1, color: 'var(--color-border)' }]}
            size={150}
            thickness={18}
            centerLabel="register"
            centerValue={String(totalCount)}
          />
          <LegendStack items={statusLegendItems} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div>
            <p className="sn-eyebrow" style={{ margin: '0 0 12px', color: 'var(--color-text-3)' }}>제조사 파일 상위 5</p>
            {manufacturerBarItems.length > 0
              ? <BarRows items={manufacturerBarItems} />
              : <p className="sn-caption" style={{ margin: 0 }}>표시할 제조사 데이터가 없습니다.</p>}
          </div>
          <div>
            <p className="sn-eyebrow" style={{ margin: '0 0 12px', color: 'var(--color-text-3)' }}>화학계열 문서 분포</p>
            {chemistryBarItems.length > 0
              ? <BarRows items={chemistryBarItems} />
              : <p className="sn-caption" style={{ margin: 0 }}>표시할 화학계열 데이터가 없습니다.</p>}
          </div>
        </div>
      </div>
    </section>
  );
}
