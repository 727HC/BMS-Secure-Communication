import BaseModal from '../BaseModal';

interface Props {
  open: boolean;
  submitting: boolean;
  onClose: () => void;
  onSubmit: () => void;
}

export default function DisposeConfirmModal({ open, submitting, onClose, onSubmit }: Props) {
  return (
    <BaseModal open={open} onClose={onClose} title="폐기 처리 확인">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <p style={{ fontSize: 15, color: 'var(--color-text-2)' }}>
          이 여권을 폐기 상태로 전환합니다. 이 작업은 되돌릴 수 없습니다.
        </p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={onClose} className="sn-btn sn-btn-ghost">취소</button>
          <button onClick={onSubmit} disabled={submitting} className="sn-btn sn-btn-danger">
            {submitting ? '처리 중...' : '폐기 확정'}
          </button>
        </div>
      </div>
    </BaseModal>
  );
}
