import BaseModal from '../BaseModal';

export interface Material {
  materialId?: string;
  name?: string;
  origin?: string;
  supplier?: string;
  quantity?: number;
  unit?: string;
  certificationId?: string;
  createdAt?: string;
  creatorMsp?: string;
  creatorMSP?: string;
}

interface Props {
  open: boolean;
  material: Material | null;
  onClose: () => void;
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return '-';
  try { return new Date(dateStr).toLocaleString('ko-KR'); }
  catch { return dateStr; }
}

export default function MaterialDetailModal({ open, material, onClose }: Props) {
  if (!material) return null;

  return (
    <BaseModal open={open} onClose={onClose} title={material.name || '원자재 상세'}>
      <p style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: '0.8125rem', color: '#a3a3a3', margin: '2px 0 16px' }}>
        {material.materialId}
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div>
            <dt className="sn-eyebrow" style={{ marginBottom: 4 }}>원산지</dt>
            <dd style={{ fontSize: '0.875rem', fontWeight: 500, color: '#171717', margin: 0 }}>{material.origin}</dd>
          </div>
          <div>
            <dt className="sn-eyebrow" style={{ marginBottom: 4 }}>공급업체</dt>
            <dd style={{ fontSize: '0.875rem', fontWeight: 500, color: '#171717', margin: 0 }}>{material.supplier}</dd>
          </div>
          <div>
            <dt className="sn-eyebrow" style={{ marginBottom: 4 }}>수량</dt>
            <dd style={{ fontSize: '0.875rem', fontWeight: 500, color: '#171717', fontVariantNumeric: 'tabular-nums', margin: 0 }}>
              {material.quantity} {material.unit}
            </dd>
          </div>
          <div>
            <dt className="sn-eyebrow" style={{ marginBottom: 4 }}>등록일</dt>
            <dd style={{ fontSize: '0.875rem', color: '#525252', margin: 0 }}>{formatDate(material.createdAt)}</dd>
          </div>
        </div>

        {material.certificationId ? (
          <div style={{ background: '#f0fdf4', boxShadow: 'inset 0 0 0 1px rgba(22,163,74,0.2)', borderRadius: 10, padding: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <svg width="16" height="16" fill="none" stroke="#16a34a" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#16a34a' }}>인증 확인됨</span>
            </div>
            <p style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: '0.875rem', color: '#16a34a', margin: 0 }}>
              {material.certificationId}
            </p>
          </div>
        ) : (
          <div style={{ background: '#fafafa', boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.06)', borderRadius: 10, padding: 14, textAlign: 'center' }}>
            <p style={{ fontSize: '0.8125rem', color: '#a3a3a3', margin: 0 }}>인증 정보 없음</p>
          </div>
        )}

        <div>
          <dt className="sn-eyebrow" style={{ marginBottom: 4 }}>등록 기관</dt>
          <dd style={{ display: 'inline-flex', fontSize: '0.8125rem', fontWeight: 600, padding: '3px 10px', borderRadius: 6, background: '#f5f5f5', color: '#525252', margin: 0 }}>
            {material.creatorMsp || material.creatorMSP || '-'}
          </dd>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 18 }}>
        <button onClick={onClose} className="sn-btn sn-btn-ghost">닫기</button>
      </div>
    </BaseModal>
  );
}
