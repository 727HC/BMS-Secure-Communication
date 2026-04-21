import SpecRow from '../ui/SpecRow';
import { formatDate } from './helpers';
import type { GbaCompliance, GbaField, Credential, Passport } from './types';

interface Props {
  passport: Passport;
  gbaCompliance: GbaCompliance;
  complianceGrade: 'A' | 'B' | 'C' | 'D';
  vcList: Credential[];
  canUpdateRegulatory: boolean;
  onUpdateRegulatory: () => void;
}

export default function ComplianceTab({ passport, gbaCompliance, complianceGrade, vcList, canUpdateRegulatory, onUpdateRegulatory }: Props) {
  const missingFields: GbaField[] = gbaCompliance.groups
    .flatMap((g) => g.fields.filter((f) => !f.filled))
    .slice(0, 6);

  const activeVcCount = vcList.filter(vc => vc.status === 'ACTIVE').length;
  const isFullyVerified = gbaCompliance.pct === 100 && activeVcCount > 0;
  const latestVc = vcList.length > 0
    ? vcList.reduce((a, b) => ((a.issuedAt || '') > (b.issuedAt || '') ? a : b))
    : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div className="sn-detail-section-head">
        <h2 className="sn-detail-section-title">규제 / 원자재 증빙</h2>
      </div>

      <div className="sn-detail-dossier">
        <div className="sn-detail-dossier-head">
          <h3 className="sn-detail-dossier-title">규제 증빙 (VC) 검증 상태</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className={`bp-stamp ${isFullyVerified ? 'bp-status-active' : (activeVcCount > 0 ? 'bp-status-maintenance' : 'bp-status-disposed')}`}>
              {passport.regulatoryVerificationStatus || (isFullyVerified ? '검증 완료' : (activeVcCount > 0 ? '부분 검증' : <em style={{ fontStyle: 'italic' }}>증빙 없음</em>))}
            </span>
            {canUpdateRegulatory && (
              <button onClick={onUpdateRegulatory} className="sn-btn sn-btn-ghost" style={{ padding: '4px 10px', minHeight: 32 }}>
                상태 갱신
              </button>
            )}
          </div>
        </div>
        <div className="sn-detail-spec-sheet">
          <div className="sn-detail-spec-row">
            <SpecRow k="발급된 증빙(VC)" v={`${vcList.length}건`} />
            <SpecRow k="유효한 증빙" v={`${activeVcCount}건`} />
            <SpecRow k="최근 증빙 발급일" v={latestVc ? formatDate(latestVc.issuedAt) : '-'} />
          </div>
          <div className="sn-detail-spec-row">
            <SpecRow k="규제 요건 충족 여부" v={isFullyVerified ? '충족 (Verified)' : '미달 (Pending/Missing)'} />
            <SpecRow k="백엔드 검증 상태" v={passport.regulatoryVerificationStatus || '-'} />
            <SpecRow k="검증 담당" v={passport.regulatoryVerifier || '-'} />
          </div>
        </div>
      </div>

      <div className="sn-detail-dossier">
        <div className="sn-detail-dossier-head">
          <h3 className="sn-detail-dossier-title">우선 보완 항목</h3>
          <span className="sn-caption">상위 6개</span>
        </div>
        <div style={{ padding: '14px 18px 16px', display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {missingFields.length === 0 ? (
            <span className="bp-stamp bp-status-active">모든 핵심 항목이 채워졌습니다</span>
          ) : (
            missingFields.map((f) => (
              <span key={f.idx} className="bp-stamp bp-status-maintenance">
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'currentColor', flexShrink: 0 }} />
                {f.label}
              </span>
            ))
          )}
        </div>
      </div>

      <div className="sn-detail-dossier">
        <div className="sn-detail-dossier-head">
          <h3 className="sn-detail-dossier-title">규제 인증 기록</h3>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'baseline',
              gap: 8,
              padding: '6px 10px',
              borderRadius: 10,
              background: 'var(--color-surface-alt)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text-1)',
            }}
          >
            <span className="sn-eyebrow" style={{ color: 'var(--color-text-2)' }}>규제 등급</span>
            <strong className="sn-metric-sm">{complianceGrade}</strong>
          </span>
        </div>
        <div className="sn-detail-spec-sheet">
          <div className="sn-detail-spec-row">
            <SpecRow k="평가 기준" v="Battery 21 기술 항목" />
            <SpecRow k="범위" v="핵심 21개 항목" />
            <SpecRow k="GBA 준수율" v={`${gbaCompliance.pct}%`} />
          </div>
          <div className="sn-detail-spec-row">
            <SpecRow k="완료 항목" v={`${gbaCompliance.filled}개`} />
            <SpecRow k="미완료 항목" v={`${21 - gbaCompliance.filled}개`} />
          </div>
        </div>
        <div style={{ padding: '0 18px 16px' }}>
          {gbaCompliance.groups.map((group) => (
            <div
              key={group.name}
              style={{
                display: 'grid',
                gridTemplateColumns: '110px minmax(0,1fr) auto',
                gap: 12,
                alignItems: 'start',
                padding: '12px 0',
                borderBottom: '1px solid var(--color-border)',
              }}
            >
              <div className="sn-mono" style={{ color: 'var(--color-text-3)', fontSize: '0.8125rem' }}>{group.name}</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {group.fields.map((f) => (
                  <span
                    key={f.idx}
                    className={`bp-stamp ${f.filled ? 'bp-status-active' : 'bp-status-disposed'}`}
                  >
                    {f.label}
                  </span>
                ))}
              </div>
              <span className="sn-detail-inline-stamp">
                {group.fields.filter((f) => f.filled).length}/{group.fields.length}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
