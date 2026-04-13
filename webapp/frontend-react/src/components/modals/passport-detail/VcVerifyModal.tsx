import { useEffect, useState } from 'react';
import BaseModal from '../BaseModal';
import { api } from '../../../lib/api';
import Spinner from '../../ui/Spinner';

interface VerifyResult {
  valid: boolean;
  reason?: string;
  revokedAt?: string;
  revocationReason?: string;
  credType?: string;
  issuedAt?: string;
  issuerMsp?: string;
}

interface Props {
  open: boolean;
  credentialId: string | null;
  onClose: () => void;
}

export default function VcVerifyModal({ open, credentialId, onClose }: Props) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && credentialId) {
      setLoading(true);
      setResult(null);
      setError(null);
      api.get<VerifyResult>(`/vc/verify/${encodeURIComponent(credentialId)}`)
        .then(res => setResult(res))
        .catch(err => setError(err.message || '검증 실패'))
        .finally(() => setLoading(false));
    }
  }, [open, credentialId]);

  return (
    <BaseModal open={open} onClose={onClose} title="VC 검증 결과">
      <div style={{ minHeight: 100, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        {loading && <Spinner />}
        {error && <p className="sn-caption" style={{ color: '#ef4444' }}>{error}</p>}
        {result && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 24 }}>{result.valid ? '✅' : '❌'}</span>
              <span style={{ fontSize: 16, fontWeight: 600, color: result.valid ? '#10b981' : '#ef4444' }}>
                {result.valid ? '유효한 증명서입니다' : '유효하지 않은 증명서입니다'}
              </span>
            </div>
            <div style={{ background: '#f8fafc', padding: 12, borderRadius: 8, fontSize: 13, color: '#475569' }}>
              <p style={{ margin: '0 0 4px' }}><strong>종류:</strong> {result.credType || '-'}</p>
              <p style={{ margin: '0 0 4px' }}><strong>발급일:</strong> {result.issuedAt ? new Date(result.issuedAt).toLocaleString() : '-'}</p>
              <p style={{ margin: '0 0 4px' }}><strong>발급기관:</strong> {result.issuerMsp || '-'}</p>
              {!result.valid && result.reason === 'revoked' && (
                <>
                  <p style={{ margin: '8px 0 4px', color: '#ef4444' }}><strong>폐기일:</strong> {result.revokedAt ? new Date(result.revokedAt).toLocaleString() : '-'}</p>
                  <p style={{ margin: 0, color: '#ef4444' }}><strong>폐기 사유:</strong> {result.revocationReason || '-'}</p>
                </>
              )}
            </div>
          </div>
        )}
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
        <button onClick={onClose} className="sn-btn sn-btn-accent">확인</button>
      </div>
    </BaseModal>
  );
}
