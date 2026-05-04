import { Spinner } from '../ui';
import { getStatusBadge, STATUS_LABELS } from '../../lib/helpers';

export interface QrPassport {
  passportId?: string;
  status?: string;
  model?: string;
  serialNumber?: string;
  manufacturerName?: string;
  chemistry?: string;
  totalEnergy?: number;
  vin?: string;
  did?: string;
  [key: string]: unknown;
}

interface Props {
  loadingPassport: boolean;
  passportData: QrPassport | null;
  scanError: string | null;
  onGoToDetail: () => void;
  onRetry: () => void;
}

export default function QrScanResultPanel({
  loadingPassport,
  passportData,
  scanError,
  onGoToDetail,
  onRetry,
}: Props) {
  if (loadingPassport) {
    return <Spinner />;
  }

  if (passportData) {
    const badge = getStatusBadge(passportData.status || 'DISPOSED');
    return (
      <section className="sn-section-card" style={{ overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--color-success)', display: 'inline-block' }} />
          <span style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--color-success)' }}>식별 결과 확인됨</span>
        </div>
        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--color-text-1)', margin: 0 }}>{passportData.model || '-'}</h3>
            <span className={`bp-stamp ${badge.bg} ${badge.text} ${badge.border}`}>
              {STATUS_LABELS[passportData.status || 'DISPOSED'] || passportData.status}
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {[
              { k: '제조사', v: passportData.manufacturerName || '-', mono: false },
              { k: '화학물질', v: passportData.chemistry || '-', mono: false },
              { k: '총 에너지', v: passportData.totalEnergy ? `${passportData.totalEnergy} kWh` : '-', mono: false },
              { k: 'VIN', v: passportData.vin || '미바인딩', mono: true },
            ].map(({ k, v, mono }) => (
              <div key={k} style={{ background: 'var(--color-surface-alt)', boxShadow: 'inset 0 0 0 1px var(--color-border)', borderRadius: 8, padding: '8px 10px' }}>
                <p className="sn-eyebrow" style={{ margin: 0 }}>{k}</p>
                <p
                  style={{
                    fontFamily: mono ? 'var(--font-mono)' : undefined,
                    fontSize: mono ? '0.8125rem' : '0.9375rem',
                    fontWeight: 500,
                    color: 'var(--color-text-2)',
                    margin: '3px 0 0',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {v}
                </p>
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {[
              { k: '여권 ID', v: passportData.passportId, metric: true },
              { k: '시리얼번호', v: passportData.serialNumber || '-', metric: false },
            ].map(({ k, v, metric }) => (
              <div key={k} style={{ background: 'var(--color-surface-alt)', boxShadow: 'inset 0 0 0 1px var(--color-border)', borderRadius: 8, padding: '8px 10px' }}>
                <p className="sn-eyebrow" style={{ margin: 0 }}>{k}</p>
                {metric ? (
                  <p className="sn-metric sn-metric-md" style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-text-2)', margin: '3px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {v}
                  </p>
                ) : (
                  <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-text-2)', margin: '3px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {v}
                  </p>
                )}
              </div>
            ))}
          </div>

          {passportData.did && (
            <div style={{ background: 'var(--color-success-soft)', boxShadow: 'inset 0 0 0 1px var(--color-border)', borderRadius: 8, padding: '10px 12px' }}>
              <p className="sn-eyebrow" style={{ color: 'var(--color-success)', margin: 0 }}>DID</p>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8125rem', color: 'var(--color-success)', margin: '4px 0 0', wordBreak: 'break-all' }}>
                {passportData.did}
              </p>
            </div>
          )}

          <button
            onClick={onGoToDetail}
            className="sn-btn sn-btn-accent"
            style={{ width: '100%', padding: 12, fontSize: '0.875rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
          >
            여권 상세 보기 →
          </button>
        </div>
      </section>
    );
  }

  if (scanError) {
    return (
      <section className="sn-section-card" style={{ padding: '28px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
        <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--color-danger-soft)', border: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
          <svg width="22" height="22" fill="none" stroke="var(--color-danger)" strokeWidth="1.5" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <p style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--color-danger)', margin: '0 0 6px' }}>조회 실패</p>
        <p style={{ fontSize: '0.9375rem', color: 'var(--color-text-3)', margin: '0 0 16px', lineHeight: 1.6 }}>{scanError}</p>
        <button
          onClick={onRetry}
          className="sn-btn sn-btn-ghost"
          style={{ fontSize: '0.8125rem' }}
        >
          다시 시도
        </button>
      </section>
    );
  }

  return (
    <section className="sn-section-card" style={{ padding: 48, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
      <div style={{ width: 56, height: 56, borderRadius: 12, background: 'var(--color-surface-alt)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
        <svg width="28" height="28" fill="none" stroke="var(--color-text-3)" strokeWidth="1.5" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>
      <p style={{ fontSize: '0.9375rem', fontWeight: 500, color: 'var(--color-text-2)', margin: '0 0 6px' }}>식별값을 입력하거나 스캔해 조회를 시작하세요</p>
      <p style={{ fontSize: '0.9375rem', color: 'var(--color-text-3)' }}>조회 결과가 여기에 표시됩니다</p>
    </section>
  );
}
