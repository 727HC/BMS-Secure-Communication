import * as React from 'react';
import { useEffect, useState } from 'react';
import BaseModal from '../BaseModal';

export interface PassportCreateFormData {
  passportId: string;
  batteryId: string;
  serialNumber: string;
  did: string;
  model: string;
  manufacturerName: string;
  manufactureCountry: string;
  cellManufacturer: string;
  cellManufactureCountry: string;
  manufactureDate: string;
  cellType: string;
  chemistry: string;
  cellCount: string;
  weight: string;
  totalEnergy: string;
  energyDensity: string;
  ratedCapacity: string;
  expectedLifespan: string;
  voltageRange: string;
  temperatureRange: string;
  carbonFootprint: string;
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
    manufactureCountry: '',
    cellManufacturer: '',
    cellManufactureCountry: '',
    manufactureDate: '',
    cellType: '',
    chemistry: '',
    cellCount: '',
    weight: '',
    totalEnergy: '',
    energyDensity: '',
    ratedCapacity: '',
    expectedLifespan: '',
    voltageRange: '',
    temperatureRange: '',
    carbonFootprint: '',
  };
}

const CHEMISTRY_OPTIONS = ['NCM', 'NCA', 'LFP', 'LMO', 'LTO', 'Solid-State', '기타'];
const CELL_TYPE_OPTIONS = ['Pouch', 'Cylindrical', 'Prismatic'];

export default function PassportCreateModal({ open, submitting, onClose, onSubmit }: Props) {
  const [form, setForm] = useState<PassportCreateFormData>(emptyForm);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(emptyForm());
      setShowDetails(false);
    }
  }, [open]);

  const isValid = Boolean(form.passportId && form.batteryId && form.serialNumber && form.did);

  const handleSubmit = (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!isValid) return;
    const trimmed: PassportCreateFormData = Object.fromEntries(
      Object.entries(form).map(([k, v]) => [k, typeof v === 'string' ? v.trim() : v])
    ) as PassportCreateFormData;
    onSubmit(trimmed);
  };

  const update = <K extends keyof PassportCreateFormData>(key: K, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const eyebrow: React.CSSProperties = { display: 'block', marginBottom: 6 };
  const required = <span style={{ color: 'var(--color-danger)' }}>*</span>;

  return (
    <BaseModal open={open} onClose={onClose} title="배터리 여권 발급" maxWidth={720}>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <p className="sn-caption" style={{ margin: 0 }}>
          필수 필드를 입력하면 여권이 즉시 발급됩니다. 상세 사양은 함께 입력하거나 발급 후 상세 화면에서 데이터 정정으로 보완할 수 있습니다.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div>
            <label className="sn-eyebrow" style={eyebrow}>여권 ID {required}</label>
            <input className="sn-input" value={form.passportId} onChange={(e) => update('passportId', e.target.value)} />
          </div>
          <div>
            <label className="sn-eyebrow" style={eyebrow}>배터리 ID {required}</label>
            <input className="sn-input" value={form.batteryId} onChange={(e) => update('batteryId', e.target.value)} />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div>
            <label className="sn-eyebrow" style={eyebrow}>시리얼번호 {required}</label>
            <input className="sn-input" value={form.serialNumber} onChange={(e) => update('serialNumber', e.target.value)} placeholder="예: BMU-DEVICE-001" />
          </div>
          <div>
            <label className="sn-eyebrow" style={eyebrow}>DID {required}</label>
            <input className="sn-input" value={form.did} onChange={(e) => update('did', e.target.value)} placeholder="예: did:sov:abc123" />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div>
            <label className="sn-eyebrow" style={eyebrow}>모델명</label>
            <input className="sn-input" value={form.model} onChange={(e) => update('model', e.target.value)} placeholder="예: NCM 82kWh Pack" />
          </div>
          <div>
            <label className="sn-eyebrow" style={eyebrow}>제조사명</label>
            <input className="sn-input" value={form.manufacturerName} onChange={(e) => update('manufacturerName', e.target.value)} placeholder="예: Battery Corp" />
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowDetails((v) => !v)}
          className="sn-btn sn-btn-ghost"
          style={{ alignSelf: 'flex-start' }}
        >
          {showDetails ? '− 상세 사양 닫기' : '+ 상세 사양 입력 (GBA 필드)'}
        </button>

        {showDetails && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '14px 16px', borderRadius: 12, background: 'var(--color-surface-alt)', border: '1px solid var(--color-border)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div>
                <label className="sn-eyebrow" style={eyebrow}>제조국</label>
                <input className="sn-input" value={form.manufactureCountry} onChange={(e) => update('manufactureCountry', e.target.value)} placeholder="예: KR" />
              </div>
              <div>
                <label className="sn-eyebrow" style={eyebrow}>제조일</label>
                <input type="date" className="sn-input" value={form.manufactureDate} onChange={(e) => update('manufactureDate', e.target.value)} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div>
                <label className="sn-eyebrow" style={eyebrow}>셀 제조사</label>
                <input className="sn-input" value={form.cellManufacturer} onChange={(e) => update('cellManufacturer', e.target.value)} />
              </div>
              <div>
                <label className="sn-eyebrow" style={eyebrow}>셀 제조국</label>
                <input className="sn-input" value={form.cellManufactureCountry} onChange={(e) => update('cellManufactureCountry', e.target.value)} placeholder="예: CN" />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div>
                <label className="sn-eyebrow" style={eyebrow}>셀 타입</label>
                <select className="sn-input" value={form.cellType} onChange={(e) => update('cellType', e.target.value)}>
                  <option value="">— 선택 —</option>
                  {CELL_TYPE_OPTIONS.map((v) => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className="sn-eyebrow" style={eyebrow}>화학계열</label>
                <select className="sn-input" value={form.chemistry} onChange={(e) => update('chemistry', e.target.value)}>
                  <option value="">— 선택 —</option>
                  {CHEMISTRY_OPTIONS.map((v) => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
              <div>
                <label className="sn-eyebrow" style={eyebrow}>셀 개수</label>
                <input type="number" className="sn-input" value={form.cellCount} onChange={(e) => update('cellCount', e.target.value)} placeholder="예: 96" />
              </div>
              <div>
                <label className="sn-eyebrow" style={eyebrow}>무게 (kg)</label>
                <input type="number" step="0.1" className="sn-input" value={form.weight} onChange={(e) => update('weight', e.target.value)} placeholder="예: 450" />
              </div>
              <div>
                <label className="sn-eyebrow" style={eyebrow}>예상 수명 (사이클)</label>
                <input type="number" className="sn-input" value={form.expectedLifespan} onChange={(e) => update('expectedLifespan', e.target.value)} placeholder="예: 3000" />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
              <div>
                <label className="sn-eyebrow" style={eyebrow}>총 에너지 (kWh)</label>
                <input type="number" step="0.1" className="sn-input" value={form.totalEnergy} onChange={(e) => update('totalEnergy', e.target.value)} placeholder="예: 82" />
              </div>
              <div>
                <label className="sn-eyebrow" style={eyebrow}>에너지 밀도 (Wh/kg)</label>
                <input type="number" step="0.1" className="sn-input" value={form.energyDensity} onChange={(e) => update('energyDensity', e.target.value)} placeholder="예: 250" />
              </div>
              <div>
                <label className="sn-eyebrow" style={eyebrow}>정격 용량 (Ah)</label>
                <input type="number" step="0.1" className="sn-input" value={form.ratedCapacity} onChange={(e) => update('ratedCapacity', e.target.value)} placeholder="예: 200" />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
              <div>
                <label className="sn-eyebrow" style={eyebrow}>전압 범위</label>
                <input className="sn-input" value={form.voltageRange} onChange={(e) => update('voltageRange', e.target.value)} placeholder="예: 300-420V" />
              </div>
              <div>
                <label className="sn-eyebrow" style={eyebrow}>온도 범위</label>
                <input className="sn-input" value={form.temperatureRange} onChange={(e) => update('temperatureRange', e.target.value)} placeholder="예: -20~60°C" />
              </div>
              <div>
                <label className="sn-eyebrow" style={eyebrow}>탄소발자국 (kgCO₂e)</label>
                <input type="number" step="0.1" className="sn-input" value={form.carbonFootprint} onChange={(e) => update('carbonFootprint', e.target.value)} placeholder="예: 4500" />
              </div>
            </div>
          </div>
        )}

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
