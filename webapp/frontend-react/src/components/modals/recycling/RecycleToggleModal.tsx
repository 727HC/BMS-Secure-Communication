import { useState, useEffect } from 'react';
import BaseModal from '../BaseModal';

interface Props {
  open: boolean;
  initialValue: boolean;
  submitting: boolean;
  onClose: () => void;
  onSubmit: (available: boolean) => void;
}

export default function RecycleToggleModal({ open, initialValue, submitting, onClose, onSubmit }: Props) {
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    if (open) setValue(initialValue);
  }, [open, initialValue]);

  return (
    <BaseModal open={open} onClose={onClose} title="재활용 가능 여부">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
          <input
            type="checkbox"
            checked={value}
            onChange={(e) => setValue(e.target.checked)}
          />
          재활용 가능으로 판정
        </label>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={onClose} className="sn-btn sn-btn-ghost">취소</button>
          <button onClick={() => onSubmit(value)} disabled={submitting} className="sn-btn sn-btn-accent">
            {submitting ? '저장 중...' : '저장'}
          </button>
        </div>
      </div>
    </BaseModal>
  );
}
