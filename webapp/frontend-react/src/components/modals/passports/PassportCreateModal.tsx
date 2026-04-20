import { useEffect, useState, type FormEvent } from 'react';
import BaseModal from '../BaseModal';

export interface PassportCreateFormData {
  passportId: string;
  batteryId: string;
  serialNumber: string;
  did: string;
  model: string;
  manufacturerName: string;
}

interface Props {
  open: boolean;
  submitting: boolean;
  onClose: () => void;
  onSubmit: (data: PassportCreateFormData) => void;
}

function emptyForm(): PassportCreateFormData {
  const stamp = Date.now();
  return {
    passportId: `PASSPORT-${stamp}`,
    batteryId: `BATTERY-${stamp}`,
    serialNumber: '',
    did: '',
    model: '',
    manufacturerName: '',
  };
}

export default function PassportCreateModal({ open, submitting, onClose, onSubmit }: Props) {
  const [form, setForm] = useState<PassportCreateFormData>(emptyForm);

  useEffect(() => {
    if (open) setForm(emptyForm());
  }, [open]);

  const isValid = Boolean(form.passportId && form.batteryId && form.serialNumber && form.did);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!isValid) return;
    onSubmit({
      ...form,
      passportId: form.passportId.trim(),
      batteryId: form.batteryId.trim(),
      serialNumber: form.serialNumber.trim(),
      did: form.did.trim(),
      model: form.model.trim(),
      manufacturerName: form.manufacturerName.trim(),
    });
  };

  return (
    <BaseModal open={open} onClose={onClose} title="배터리 여권 발급" maxWidth={620}>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <p className="sn-caption" style={{ margin: 0 }}>
          여권 발급에 필요한 최소 필드만 입력합니다. 생성 후 상세 화면에서 나머지 항목을 이어서 보완할 수 있습니다.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div>
            <label className="sn-eyebrow" style={{ display: 'block', marginBottom: 6 }}>여권 ID <span style={{ color: 'var(--color-danger)' }}>*</span></label>
            <input className="sn-input" value={form.passportId} onChange={(e) => setForm({ ...form, passportId: e.target.value })} />
          </div>
          <div>
            <label className="sn-eyebrow" style={{ display: 'block', marginBottom: 6 }}>배터리 ID <span style={{ color: 'var(--color-danger)' }}>*</span></label>
            <input className="sn-input" value={form.batteryId} onChange={(e) => setForm({ ...form, batteryId: e.target.value })} />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div>
            <label className="sn-eyebrow" style={{ display: 'block', marginBottom: 6 }}>시리얼번호 <span style={{ color: 'var(--color-danger)' }}>*</span></label>
            <input className="sn-input" value={form.serialNumber} onChange={(e) => setForm({ ...form, serialNumber: e.target.value })} placeholder="예: BMU-DEVICE-001" />
          </div>
          <div>
            <label className="sn-eyebrow" style={{ display: 'block', marginBottom: 6 }}>DID <span style={{ color: 'var(--color-danger)' }}>*</span></label>
            <input className="sn-input" value={form.did} onChange={(e) => setForm({ ...form, did: e.target.value })} placeholder="예: did:sov:abc123" />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div>
            <label className="sn-eyebrow" style={{ display: 'block', marginBottom: 6 }}>모델명</label>
            <input className="sn-input" value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} placeholder="예: NCM 82kWh Pack" />
          </div>
          <div>
            <label className="sn-eyebrow" style={{ display: 'block', marginBottom: 6 }}>제조사명</label>
            <input className="sn-input" value={form.manufacturerName} onChange={(e) => setForm({ ...form, manufacturerName: e.target.value })} placeholder="예: Battery Corp" />
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button type="button" onClick={onClose} className="sn-btn sn-btn-ghost">취소</button>
          <button
            type="submit"
            disabled={!isValid || submitting}
            className="sn-btn sn-btn-accent"
            style={{ opacity: !isValid || submitting ? 0.45 : 1, cursor: !isValid || submitting ? 'not-allowed' : 'pointer' }}
          >
            {submitting ? '발급 중...' : '여권 발급'}
          </button>
        </div>
      </form>
    </BaseModal>
  );
}
