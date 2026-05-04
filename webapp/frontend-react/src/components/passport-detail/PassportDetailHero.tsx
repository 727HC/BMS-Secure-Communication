import { scaleSOC } from '../../lib/helpers';
import { ArcGauge } from '../ui/BatteryGauge';
import type { Passport } from './types';

type HeroModalKey =
  | 'bind'
  | 'mRequest'
  | 'mLog'
  | 'aRequest'
  | 'aResult'
  | 'dispose'
  | 'correct'
  | 'vcIssue';

interface GbaCompliance {
  pct: number;
  filled: number;
}

interface Props {
  passport: Passport;
  gbaCompliance: GbaCompliance;
  grade: string;
  lifecycleLabel: string;
  vinLabel: string;
  bmuRecordLabel: string;
  warningMessages: string[];
  roleDeskLabel: string;
  dossierSummary: string;
  filingStateLabel: string;
  actionContext: string;
  isManufacturer: boolean;
  isEV: boolean;
  isService: boolean;
  isRegulator: boolean;
  onOpenModal: (key: HeroModalKey) => void;
}

export default function PassportDetailHero({
  passport,
  gbaCompliance,
  grade,
  lifecycleLabel,
  vinLabel,
  bmuRecordLabel,
  warningMessages,
  roleDeskLabel,
  dossierSummary,
  filingStateLabel,
  actionContext,
  isManufacturer,
  isEV,
  isService,
  isRegulator,
  onOpenModal,
}: Props) {
  return (
    <section className="sn-detail-hero" aria-label="여권 dossier 요약">
      <div className="sn-detail-dossier-head" style={{ padding: '0 0 14px', marginBottom: 16 }}>
        <div>
          <p className="sn-eyebrow" style={{ margin: '0 0 0.35rem', color: 'var(--color-text-3)' }}>{roleDeskLabel}</p>
          <h2 className="sn-detail-dossier-title">Dossier control sheet</h2>
          <p className="sn-caption" style={{ margin: '0.45rem 0 0', maxWidth: '48rem', lineHeight: 1.7 }}>{dossierSummary}</p>
        </div>
        <span className="sn-detail-inline-stamp">{filingStateLabel}</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(18rem, 0.45fr)', gap: '1rem', alignItems: 'stretch' }}>
        <div className="sn-detail-dossier" style={{ background: 'var(--color-surface)', boxShadow: 'none' }}>
          <div className="sn-detail-dossier-head">
            <h3 className="sn-detail-dossier-title">상태 계기판</h3>
            <span className="sn-caption">SOH · SOC · GBA · lifecycle</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '1rem', alignItems: 'center', padding: '18px 20px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              {passport.currentSoh != null ? (
                <ArcGauge
                  value={passport.currentSoh}
                  label="SOH · 상태"
                  sublabel={passport.currentSoh < 80 ? '요주의' : undefined}
                  size={120}
                  strokeWidth={12}
                  warningThreshold={80}
                />
              ) : (
                <>
                  <p className="sn-eyebrow" style={{ marginBottom: '0.45rem' }}>SOH · 상태</p>
                  <p className="sn-metric sn-metric-md">--</p>
                </>
              )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              {passport.currentSoc != null ? (
                <ArcGauge
                  value={scaleSOC(passport.currentSoc)}
                  label="SOC · 충전"
                  size={120}
                  strokeWidth={12}
                  warningThreshold={20}
                />
              ) : (
                <>
                  <p className="sn-eyebrow" style={{ marginBottom: '0.45rem' }}>SOC · 충전</p>
                  <p className="sn-metric sn-metric-md">--</p>
                </>
              )}
            </div>
            <div>
              <p className="sn-eyebrow" style={{ marginBottom: '0.45rem' }}>GBA 21</p>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.6rem', flexWrap: 'wrap' }}>
                <p className="sn-metric sn-metric-md" style={{ color: gbaCompliance.pct === 100 ? 'var(--color-success)' : 'var(--color-warning)' }}>
                  {gbaCompliance.pct}
                  <span className="sn-metric-unit">%</span>
                </p>
                <span className="sn-detail-inline-stamp">Grade {grade}</span>
              </div>
              <p className="sn-stat-note" style={{ margin: '0.35rem 0 0' }}>{gbaCompliance.filled}/21 fields filed</p>
            </div>
            <div>
              <p className="sn-eyebrow" style={{ marginBottom: '0.45rem' }}>생애 주기</p>
              <p style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-text-1)', margin: 0, lineHeight: 1.2 }}>
                {lifecycleLabel}
              </p>
              <p className="sn-stat-note" style={{ margin: '0.35rem 0 0' }}>{passport.status || '상태 미등록'}</p>
            </div>
          </div>
        </div>

        <div className="sn-detail-dossier" style={{ background: 'var(--color-surface)', boxShadow: 'none' }}>
          <div className="sn-detail-dossier-head">
            <h3 className="sn-detail-dossier-title">권한별 작업</h3>
          </div>
          <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <p className="sn-caption" style={{ margin: 0, lineHeight: 1.7 }}>{actionContext}</p>
            <div className="sn-detail-action-row">
              {isManufacturer && (
                <button onClick={() => onOpenModal('correct')} className="sn-btn sn-btn-ghost">데이터 정정</button>
              )}
              {isEV && !passport.vin && (
                <button onClick={() => onOpenModal('bind')} className="sn-btn sn-btn-accent">차량 연결</button>
              )}
              {isEV && passport.status === 'ACTIVE' && (
                <>
                  <button onClick={() => onOpenModal('mRequest')} className="sn-btn sn-btn-ghost">정비 요청</button>
                  <button onClick={() => onOpenModal('aRequest')} className="sn-btn sn-btn-ghost">분석 요청</button>
                </>
              )}
              {isService && passport.status === 'MAINTENANCE' && (
                <button onClick={() => onOpenModal('mLog')} className="sn-btn sn-btn-accent">정비 완료</button>
              )}
              {isService && passport.status === 'ANALYSIS' && (
                <button onClick={() => onOpenModal('aResult')} className="sn-btn sn-btn-accent">분석 결과</button>
              )}
              {isRegulator && passport.status !== 'DISPOSED' && (
                <button onClick={() => onOpenModal('dispose')} className="sn-btn sn-btn-danger">폐기</button>
              )}
              {(isManufacturer || isRegulator) && (
                <button onClick={() => onOpenModal('vcIssue')} className="sn-btn sn-btn-ghost">VC 발급</button>
              )}
            </div>
          </div>
        </div>
      </div>

      {warningMessages.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', marginTop: 16, paddingTop: '1rem', borderTop: '1px solid var(--color-border)' }}>
          {warningMessages.map((message) => (
            <div key={message} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', padding: '0.9rem 1.1rem', borderRadius: '0.85rem', background: 'var(--color-warning-soft)', color: 'var(--color-warning)', border: '1px solid var(--color-border)' }}>
              <span style={{ fontSize: '1rem', fontWeight: 800, lineHeight: 1.4 }}>!</span>
              <span style={{ fontSize: '0.9375rem', lineHeight: 1.6 }}>{message}</span>
            </div>
          ))}
        </div>
      )}

      <div className="sn-detail-cover-meta">
        <div className="sn-detail-cover-meta-item">
          <span className="sn-detail-cover-meta-key">제조사</span>
          <span className="sn-detail-cover-meta-value">{passport.manufacturerName || '-'}</span>
        </div>
        <div className="sn-detail-cover-meta-item">
          <span className="sn-detail-cover-meta-key">화학계열</span>
          <span className="sn-detail-cover-meta-value">{passport.chemistry || '-'}</span>
        </div>
        <div className="sn-detail-cover-meta-item">
          <span className="sn-detail-cover-meta-key">총 에너지</span>
          <span className="sn-detail-cover-meta-value">{passport.totalEnergy ? `${passport.totalEnergy} kWh` : '-'}</span>
        </div>
        <div className="sn-detail-cover-meta-item">
          <span className="sn-detail-cover-meta-key">차대번호</span>
          <span className="sn-detail-cover-meta-value">{vinLabel}</span>
        </div>
        <div className="sn-detail-cover-meta-item">
          <span className="sn-detail-cover-meta-key">BMU 원장</span>
          <span className="sn-detail-cover-meta-value">{bmuRecordLabel}</span>
        </div>
      </div>
    </section>
  );
}
