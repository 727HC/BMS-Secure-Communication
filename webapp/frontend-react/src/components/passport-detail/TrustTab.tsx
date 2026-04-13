import { formatDate } from './helpers';
import type { Passport, Credential } from './types';

interface Props {
  passport: Passport;
  vcList: Credential[];
  onVerify: (credentialId: string) => void;
  onRevoke: (credentialId: string) => void;
}

export default function TrustTab({ passport, vcList, onVerify, onRevoke }: Props) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div className="sn-detail-section-head">
        <h2 className="sn-detail-section-title">증빙 / 검증 문서</h2>
      </div>

      <div className="sn-detail-dossier">
        <div className="sn-detail-dossier-head">
          <h3 className="sn-detail-dossier-title">DID</h3>
        </div>
        <div style={{ padding: 18 }}>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: 14, color: '#0f172a', wordBreak: 'break-all', margin: 0 }}>
            {passport.did || '미등록'}
          </p>
        </div>
      </div>

      <div className="sn-detail-dossier">
        <div className="sn-detail-dossier-head">
          <h3 className="sn-detail-dossier-title">VC 발급 이력 ({vcList.length}건)</h3>
        </div>
        <div>
          {vcList.length === 0 ? (
            <p className="sn-caption" style={{ padding: 18 }}>발급된 VC가 없습니다.</p>
          ) : (
            vcList.map((vc, idx) => (
              <div
                key={vc.credentialId || idx}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '140px minmax(0,1fr) auto',
                  gap: 14,
                  padding: '14px 18px',
                  borderBottom: '1px solid rgba(0,0,0,0.04)',
                }}
              >
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: '#94a3b8' }}>{formatDate(vc.issuedAt)}</div>
                <div>
                  <p style={{ margin: '0 0 4px', fontSize: 14, fontWeight: 600, color: '#0f172a' }}>{vc.credType || 'VC'}</p>
                  <p style={{ margin: 0, fontSize: 13, color: '#94a3b8', fontFamily: 'var(--font-mono)', wordBreak: 'break-all' }}>
                    {vc.credentialId}
                  </p>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
                  <span className="sn-detail-inline-stamp">{vc.status || 'ACTIVE'}</span>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button 
                      onClick={() => vc.credentialId && onVerify(vc.credentialId)} 
                      className="sn-btn sn-btn-ghost" 
                      style={{ padding: '4px 8px', fontSize: 12, minHeight: 'auto' }}
                      disabled={!vc.credentialId}
                    >
                      검증
                    </button>
                    {vc.status !== 'REVOKED' && (
                      <button 
                        onClick={() => vc.credentialId && onRevoke(vc.credentialId)} 
                        className="sn-btn sn-btn-danger" 
                        style={{ padding: '4px 8px', fontSize: 12, minHeight: 'auto' }}
                        disabled={!vc.credentialId}
                      >
                        폐기
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
