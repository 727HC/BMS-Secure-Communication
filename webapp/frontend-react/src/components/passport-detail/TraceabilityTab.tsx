import SpecRow from '../ui/SpecRow';
import { formatDate } from './helpers';
import type { Passport, BmuRecord } from './types';

export default function TraceabilityTab({ passport, bmuRecords, canVerifyPhysical, onVerifyPhysical }: { passport: Passport; bmuRecords: BmuRecord[]; canVerifyPhysical: boolean; onVerifyPhysical: () => void; }) {
  const maintenanceLogs = passport.maintenanceLogs || [];
  const accidentLogs = passport.accidentLogs || [];
  const recyclingRates = passport.recyclingRates;

  const latestBmu = bmuRecords && bmuRecords.length > 0
    ? bmuRecords.reduce((a, b) => ((a.timestamp || '') > (b.timestamp || '') ? a : b))
    : null;

  const isSocMatched = latestBmu && passport.currentSoc != null
    ? latestBmu.soc === passport.currentSoc
    : false;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div className="sn-detail-section-head">
        <h2 className="sn-detail-section-title">운영 이력</h2>
      </div>

      <div className="sn-detail-dossier">
        <div className="sn-detail-dossier-head">
          <h3 className="sn-detail-dossier-title">물리적 이력 검증 (BMU)</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className={`bp-stamp ${latestBmu ? 'bp-status-active' : 'bp-status-disposed'}`}>
              {passport.physicalHistoryVerification?.status || (latestBmu ? '수집 중' : <em style={{ fontStyle: 'italic' }}>수집 이력 없음</em>)}
            </span>
            {canVerifyPhysical && (
              <button onClick={onVerifyPhysical} className="sn-btn sn-btn-ghost" style={{ padding: '4px 10px', minHeight: 32 }}>
                검증 저장
              </button>
            )}
          </div>
        </div>
        <div className="sn-detail-spec-sheet">
          <div className="sn-detail-spec-row">
            <SpecRow k="수집된 BMU 레코드" v={`${bmuRecords?.length || 0}건`} />
            <SpecRow k="최근 수집일" v={latestBmu ? formatDate(latestBmu.timestamp) : '-'} />
            <SpecRow k="누적 방전 사이클" v={latestBmu?.dischargeCycles != null ? `${latestBmu.dischargeCycles}회` : '-'} />
          </div>
          <div className="sn-detail-spec-row">
            <SpecRow
              k="현재 SOC 일치 여부"
              v={latestBmu ? (isSocMatched ? '일치 (Verified)' : '불일치 (Pending)') : '-'}
            />
            <SpecRow k="백엔드 검증 상태" v={passport.physicalHistoryVerification?.status || '-'} />
            <SpecRow k="검증 시각" v={passport.physicalHistoryVerification?.verifiedAt ? formatDate(passport.physicalHistoryVerification.verifiedAt) : '-'} />
          </div>
        </div>
      </div>

      <div className="sn-detail-dossier">
        <div className="sn-detail-dossier-head">
          <h3 className="sn-detail-dossier-title">정비 이력 ({maintenanceLogs.length}건)</h3>
        </div>
        <div>
          {maintenanceLogs.length === 0 ? (
            <p className="sn-caption" style={{ padding: '16px 20px', margin: 0, fontStyle: 'italic', color: 'var(--color-text-3)' }}>정비 이력이 없습니다.</p>
          ) : (
            maintenanceLogs.map((log, idx) => (
              <div
                key={idx}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '120px minmax(0,1fr)',
                  gap: 14,
                  padding: '12px 20px',
                  borderBottom: '1px solid var(--color-border)',
                }}
              >
                <div className="sn-mono" style={{ fontSize: '0.8125rem', color: 'var(--color-text-3)' }}>{formatDate(log.timestamp)}</div>
                <div>
                  <p style={{ margin: '0 0 3px', fontSize: '0.9375rem', fontWeight: 600, color: 'var(--color-text-1)' }}>{log.maintenanceType || '-'}</p>
                  <p style={{ margin: 0, fontSize: '0.9375rem', color: 'var(--color-text-2)' }}>{log.description}</p>
                  {log.technician && (
                    <p style={{ margin: '3px 0 0', fontSize: '0.875rem', color: 'var(--color-text-3)' }}>담당: {log.technician}</p>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="sn-detail-dossier">
        <div className="sn-detail-dossier-head">
          <h3 className="sn-detail-dossier-title">사고 기록 ({accidentLogs.length}건)</h3>
        </div>
        <div>
          {accidentLogs.length === 0 ? (
            <p className="sn-caption" style={{ padding: '16px 20px', margin: 0, fontStyle: 'italic', color: 'var(--color-text-3)' }}>사고 기록이 없습니다.</p>
          ) : (
            accidentLogs.map((log, idx) => (
              <div
                key={idx}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '120px minmax(0,1fr)',
                  gap: 14,
                  padding: '12px 20px',
                  borderBottom: '1px solid var(--color-border)',
                }}
              >
                <div className="sn-mono" style={{ fontSize: '0.8125rem', color: 'var(--color-danger)' }}>{formatDate(log.timestamp)}</div>
                <div>
                  <p style={{ margin: '0 0 3px', fontSize: '0.9375rem', fontWeight: 600, color: 'var(--color-danger)' }}>{log.severity || '-'}</p>
                  <p style={{ margin: 0, fontSize: '0.9375rem', color: 'var(--color-text-2)' }}>{log.description}</p>
                  {log.reporter && (
                    <p style={{ margin: '3px 0 0', fontSize: '0.875rem', color: 'var(--color-text-3)' }}>보고: {log.reporter}</p>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {recyclingRates && Object.keys(recyclingRates).length > 0 && (
        <div className="sn-detail-dossier">
          <div className="sn-detail-dossier-head">
            <h3 className="sn-detail-dossier-title">재활용 원자재 회수율</h3>
          </div>
          <div style={{ padding: '14px 20px 16px' }}>
            {Object.entries(recyclingRates).map(([key, value]) => (
              <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                <span style={{ width: 96, fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text-2)', flexShrink: 0 }}>{key}</span>
                <div style={{ flex: 1, height: 6, background: 'var(--color-surface-alt)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ width: `${value}%`, height: '100%', background: 'var(--color-success)' }} />
                </div>
                <span className="sn-mono" style={{ width: 40, textAlign: 'right', fontSize: '0.875rem' }}>{value}%</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
