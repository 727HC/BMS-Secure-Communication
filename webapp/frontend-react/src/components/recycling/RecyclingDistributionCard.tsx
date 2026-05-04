import { BarRows } from '../ui';

interface BreakdownItem {
  label: string;
  value: number;
  color: string;
}

interface AvgRate {
  element: string;
  avg: number;
}

interface Props {
  lifecycleBreakdown: BreakdownItem[];
  avgRates: AvgRate[];
}

export default function RecyclingDistributionCard({ lifecycleBreakdown, avgRates }: Props) {
  return (
    <>
      <section className="sn-section-card" style={{ padding: '20px 22px', maxWidth: 1080 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 0.85fr) minmax(260px, 1.15fr)', gap: '1.25rem', alignItems: 'start' }}>
          <div>
            <p className="sn-eyebrow" style={{ margin: '0 0 0.4rem', color: 'var(--color-text-3)' }}>ESG lifecycle distribution</p>
            <h2 className="sn-heading" style={{ margin: '0 0 0.55rem', fontSize: '1.125rem' }}>회수 단계 분포</h2>
            <p className="sn-caption" style={{ margin: 0 }}>
              상태값과 회수 판정 필드만 사용해 분석 요청 후보부터 폐기 승인까지의 등록부 흐름을 보여줍니다.
            </p>
          </div>
          <BarRows
            items={lifecycleBreakdown.map(({ label, value, color }) => ({ label, value, color }))}
            max={Math.max(...lifecycleBreakdown.map((item) => item.value), 1)}
          />
        </div>
      </section>

      {avgRates.length > 0 && (
        <section className="sn-section-card" style={{ padding: '20px 22px', maxWidth: 1080 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 0.85fr) minmax(260px, 1.15fr)', gap: '1.25rem', alignItems: 'start' }}>
            <div>
              <p className="sn-eyebrow" style={{ margin: '0 0 0.4rem', color: 'var(--color-text-3)' }}>추출 근거</p>
              <h2 className="sn-heading" style={{ margin: '0 0 0.55rem', fontSize: '1.125rem' }}>원소별 평균 회수율</h2>
              <p className="sn-caption" style={{ margin: 0 }}>
                Regulator 추출 기록의 `recyclingRates`를 원소별 평균으로 집계합니다.
              </p>
            </div>
            <BarRows
              items={avgRates.map(({ element, avg: rate }) => ({ label: element, value: rate, hint: '%' }))}
              max={100}
            />
          </div>
        </section>
      )}
    </>
  );
}
