import { BarRows, DonutChart, LegendStack } from '../ui';
import { ACTION_LABELS } from './lib';

interface MethodDist {
  label: string;
  value: number;
  color: string;
}

interface ActionDist {
  action: string;
  count: number;
}

interface StatusBucket {
  key: string;
  label: string;
  value: number;
  color: string;
}

interface StatusSummary {
  success: number;
  fail: number;
  successPct: number;
  total: number;
}

interface Props {
  logsCount: number;
  methodDistribution: MethodDist[];
  actionDistribution: ActionDist[];
  statusDistribution: StatusBucket[];
  statusSummary: StatusSummary | null;
}

export default function AuditDistributionCharts({
  logsCount,
  methodDistribution,
  actionDistribution,
  statusDistribution,
  statusSummary,
}: Props) {
  return (
    <>
      <section className="sn-section-card" style={{ padding: '20px 22px', maxWidth: 1080 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(18rem, auto) 1fr', gap: 32, alignItems: 'start' }}>
          <div>
            <p className="sn-eyebrow" style={{ margin: '0 0 0.4rem', color: 'var(--color-text-3)' }}>방식 분포</p>
            <h2 className="sn-heading" style={{ margin: '0 0 1rem', fontSize: '1.125rem' }}>HTTP 메서드 등록부</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
              <DonutChart
                segments={methodDistribution}
                size={150}
                thickness={18}
                centerLabel="method"
                centerValue={String(logsCount)}
              />
              <LegendStack items={methodDistribution} />
            </div>
          </div>
          <div>
            <p className="sn-eyebrow" style={{ margin: '0 0 0.4rem', color: 'var(--color-text-3)' }}>작업 원장</p>
            <h2 className="sn-heading" style={{ margin: '0 0 1rem', fontSize: '1.125rem' }}>상위 행위 분포</h2>
            <BarRows
              items={actionDistribution.map(({ action, count }) => ({
                label: ACTION_LABELS[action] || action,
                value: count,
                hint: '건',
              }))}
            />
          </div>
        </div>
      </section>

      <section className="sn-section-card" style={{ padding: '18px 22px', maxWidth: 1080 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 0.9fr) minmax(260px, 1.1fr)', gap: '1.25rem', alignItems: 'start' }}>
          <div>
            <p className="sn-eyebrow" style={{ margin: '0 0 0.4rem', color: 'var(--color-text-3)' }}>상태 분포</p>
            <h2 className="sn-heading" style={{ margin: '0 0 0.55rem', fontSize: '1.125rem' }}>응답 상태 등록부</h2>
            <p className="sn-caption" style={{ margin: 0 }}>
              {statusSummary
                ? `성공 ${statusSummary.success}건, 실패 ${statusSummary.fail}건 · 성공률 ${statusSummary.successPct}%`
                : '상태 코드가 있는 로그가 없습니다.'}
            </p>
          </div>
          {statusDistribution.length > 0 ? (
            <BarRows items={statusDistribution} max={Math.max(...statusDistribution.map((item) => item.value), 1)} />
          ) : (
            <p className="sn-caption" style={{ margin: 0 }}>상태 코드 정보 없음</p>
          )}
        </div>
      </section>
    </>
  );
}
