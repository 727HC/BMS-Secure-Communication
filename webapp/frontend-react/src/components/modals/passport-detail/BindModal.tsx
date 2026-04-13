import { useState } from 'react';
import BaseModal from '../BaseModal';

export interface BindFormData {
  vin: string;
  installDate: string;
  evManufacturer: string;
  evAssemblyCountry: string;
}

interface Props {
  open: boolean;
  submitting: boolean;
  onClose: () => void;
  onSubmit: (data: BindFormData) => void;
}

const EMPTY: BindFormData = { vin: '', installDate: '', evManufacturer: '', evAssemblyCountry: '' };

export default function BindModal({ open, submitting, onClose, onSubmit }: Props) {
  const [form, setForm] = useState<BindFormData>(EMPTY);

  const handleClose = () => {
    setForm(EMPTY);
    onClose();
  };

  return (
    <BaseModal open={open} onClose={handleClose} title="차대번호 연결">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <input
          className="sn-input"
          placeholder="VIN"
          value={form.vin}
          onChange={(e) => setForm({ ...form, vin: e.target.value })}
        />
        <input
          className="sn-input"
          type="date"
          value={form.installDate}
          onChange={(e) => setForm({ ...form, installDate: e.target.value })}
        />
        <input
          className="sn-input"
          placeholder="EV 제조사"
          value={form.evManufacturer}
          onChange={(e) => setForm({ ...form, evManufacturer: e.target.value })}
        />
        <input
          className="sn-input"
          placeholder="조립 국가"
          value={form.evAssemblyCountry}
          onChange={(e) => setForm({ ...form, evAssemblyCountry: e.target.value })}
        />
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={handleClose} className="sn-btn sn-btn-ghost">취소</button>
          <button
            onClick={() => onSubmit(form)}
            disabled={submitting}
            className="sn-btn sn-btn-accent"
          >
            {submitting ? '처리 중...' : '연결'}
          </button>
        </div>
      </div>
    </BaseModal>
  );
}
