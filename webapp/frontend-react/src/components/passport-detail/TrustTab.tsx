import { formatDate } from './helpers';
import type { Passport, Credential, IssuerCatalogItem } from './types';

interface Props {
  passport: Passport;
  vcList: Credential[];
  onVerify: (credentialId: string) => void;
  onRevoke: (credentialId: string) => void;
  canRequest: boolean;
  canApproveOrReject: boolean;
  onRequest: () => void;
  onApprove: () => void;
  onReject: () => void;
  issuers: IssuerCatalogItem[];
}

export default function TrustTab({ passport, vcList, onVerify, onRevoke, canRequest, canApproveOrReject, onRequest, onApprove, onReject, issuers }: Props) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div className="sn-detail-section-head">
        <h2 className="sn-detail-section-title">증빙 / 검증 문서</h2>
      </div>

      {(canRequest || canApproveOrReject) && (
        <div className="sn-detail-dossier">
          <div className="sn-detail-dossier-head">
            <h3 className="sn-detail-dossier-title">VC 요청 / 승인 흐름</h3>
          </div>
          <div style={{ padding: 18, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {canRequest && <button onClick={onRequest} className="sn-btn sn-btn-accent">발급 요청</button>}
            {canApproveOrReject && <button onClick={onApprove} className="sn-btn sn-btn-ghost">요청 승인</button>}
            {canApproveOrReject && <button onClick={onReject} className="sn-btn sn-btn-danger">요청 거부</button>}
          </div>
        </div>
      )}

      {issuers.length > 0 && (
        <div className="sn-detail-dossier">
          <div className="sn-detail-dossier-head">
            <h3 className="sn-detail-dossier-title">발급기관 / Credential 타입</h3>
          </div>
          <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {issuers.map((issuer) => (
              <div key={issuer.issuerMsp} style={{ display: 'grid', gridTemplateColumns: '180px minmax(0,1fr)', gap: 12 }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--color-text-3)' }}>{issuer.issuerMsp}</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {issuer.types.map((type) => (
                    <span key={type} className="sn-detail-inline-stamp">{type}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="sn-detail-dossier">
        <div className="sn-detail-dossier-head">
          <h3 className="sn-detail-dossier-title">DID</h3>
        </div>
        <div style={{ padding: 18 }}>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: 14, color: 'var(--color-text-1)', wordBreak: 'break-all', margin: 0 }}>
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
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--color-text-3)' }}>{formatDate(vc.issuedAt)}</div>
                <div>
                  <p style={{ margin: '0 0 4px', fontSize: 14, fontWeight: 600, color: 'var(--color-text-1)' }}>{vc.credType || 'VC'}</p>
                  <p style={{ margin: 0, fontSize: 13, color: 'var(--color-text-3)', fontFamily: 'var(--font-mono)', wordBreak: 'break-all' }}>
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
