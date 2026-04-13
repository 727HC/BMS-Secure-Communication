import { useState } from 'react';
import BaseModal from '../BaseModal';

export interface VcApproveFormData { requestId: string; }

interface Props {
  open: boolean;
  submitting: boolean;
  onClose: () => void;
  onSubmit: (data: VcApproveFormData) => void;
}

export default function VcApproveModal({ open, submitting, onClose, onSubmit }: Props) {
  const [requestId, setRequestId] = useState('');
  const handleClose = () => { setRequestId(''); onClose(); };
  return (
    <BaseModal open={open} onClose={handleClose} title="VC 발급 승인">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <input className="sn-input" placeholder="승인할 요청 ID" value={requestId} onChange={(e) => setRequestId(e.target.value)} />
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={handleClose} className="sn-btn sn-btn-ghost">취소</button>
          <button onClick={() => onSubmit({ requestId })} disabled={submitting || !requestId.trim()} className="sn-btn sn-btn-accent">{submitting ? '처리 중...' : '승인'}</button>
        </div>
      </div>
    </BaseModal>
  );
}
