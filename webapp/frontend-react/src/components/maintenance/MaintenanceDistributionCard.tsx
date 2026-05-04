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
  donutSegments: DonutSegment[];
  donutTotal: number;
  maintenanceTypeBreakdown: BarItem[];
  avgIntervalDays: number | null;
}

export default function MaintenanceDistributionCard({
  donutSegments,
  donutTotal,
  maintenanceTypeBreakdown,
  avgIntervalDays,
}: Props) {
  return (
    <>
      <section className="sn-section-card" style={{ padding: '20px 22px', maxWidth: 1080 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
          <div>
            <p className="sn-eyebrow" style={{ margin: '0 0 0.35rem', color: 'var(--color-text-3)' }}>문서 구성</p>
            <h2 className="sn-heading" style={{ margin: 0, fontSize: '1.125rem' }}>작업 유형과 기록 분포</h2>
          </div>
          <p className="sn-caption" style={{ margin: 0 }}>모든 수치는 현재 여권 조회 결과에서 계산합니다.</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(17rem, auto) 1fr', gap: 32, alignItems: 'start' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
            <DonutChart
              segments={donutSegments}
              size={150}
              thickness={18}
              centerValue={String(donutTotal)}
              centerLabel="docket"
            />
            <LegendStack items={donutSegments} />
          </div>
          <div>
            <p className="sn-eyebrow" style={{ margin: '0 0 12px', color: 'var(--color-text-3)' }}>
              Service type ledger
            </p>
            <BarRows items={maintenanceTypeBreakdown} />
          </div>
        </div>
      </section>

      {avgIntervalDays !== null && (
        <div className="sn-panel" style={{ padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--color-text-2)' }}>Average service interval</span>
          <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: '0.9375rem', fontWeight: 700, color: 'var(--color-text-1)' }}>
            {avgIntervalDays}일
          </span>
          <span style={{ fontSize: '0.875rem', color: 'var(--color-text-3)' }}>여권 생성일 → 최신 정비 기준</span>
        </div>
      )}
    </>
  );
}
