import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import IdentityTab from './IdentityTab';
import type { Passport } from './types';

const baseFields = {
  passportId: 'P1', batteryId: 'B1', serialNumber: 'SN', model: 'X100',
  manufacturerName: 'LG', manufactureDate: '2026-01-01', manufactureCountry: 'KR',
  ratedCapacity: 100, totalEnergy: 80, voltageRange: '3.0-3.7-4.2V',
  energyDensity: 250, cellCount: 96, expectedLifespan: 1500,
  temperatureRange: '-20 ~ 60°C', weight: 350, chemistry: 'NMC',
};

function buildPassport(extra: Record<string, unknown> = {}) {
  return { ...baseFields, ...extra } as unknown as Passport;
}

describe('IdentityTab', () => {
  it('renders battery spec section header with chemistry stamp', () => {
    const { getByText } = render(<IdentityTab passport={buildPassport()} />);
    expect(getByText('배터리 스펙')).not.toBeNull();
    expect(getByText('NMC')).not.toBeNull();
  });

  it('renders 미분류 chemistry stamp when missing', () => {
    const { getByText } = render(<IdentityTab passport={buildPassport({ chemistry: '' })} />);
    expect(getByText('미분류')).not.toBeNull();
  });

  it('renders parsed voltage nominal and range labels', () => {
    const { getByText } = render(<IdentityTab passport={buildPassport()} />);
    expect(getByText('3.7 V')).not.toBeNull();
    expect(getByText('3.0 ~ 4.2 V')).not.toBeNull();
  });

  it('renders parsed temperature range', () => {
    const { getByText } = render(<IdentityTab passport={buildPassport()} />);
    expect(getByText('-20°C ~ 60°C')).not.toBeNull();
  });

  it('renders 미등록 fallback for missing VIN/EV fields', () => {
    const { getAllByText } = render(<IdentityTab passport={buildPassport()} />);
    // vin/ev manufacturer/ev country/install date all missing
    expect(getAllByText('미등록').length).toBeGreaterThanOrEqual(4);
  });

  it('renders VIN value when present', () => {
    const { getByText } = render(<IdentityTab passport={buildPassport({ vin: 'V123' })} />);
    expect(getByText('V123')).not.toBeNull();
  });

  it('renders --% for missing SOC/SOH and 미수집 for missing SOCE', () => {
    const { getAllByText, getByText } = render(<IdentityTab passport={buildPassport()} />);
    expect(getAllByText('--%').length).toBeGreaterThanOrEqual(2);
    expect(getByText('미수집')).not.toBeNull();
  });

  it('formats SOH as N% when present', () => {
    const { getByText } = render(<IdentityTab passport={buildPassport({ currentSoh: 90 })} />);
    expect(getByText('90%')).not.toBeNull();
  });

  it('formats SOC via scaleSOC (≤100 passthrough)', () => {
    const { getByText } = render(<IdentityTab passport={buildPassport({ currentSoc: 75 })} />);
    expect(getByText('75%')).not.toBeNull();
  });

  it('hides default SOCE=0 as 미수집', () => {
    const { getByText } = render(<IdentityTab passport={buildPassport({ soce: 0 })} />);
    expect(getByText('미수집')).not.toBeNull();
  });

  it('renders 정보 없음 fallback for missing manufacturingProcess/disposalMethod', () => {
    const { getAllByText } = render(<IdentityTab passport={buildPassport()} />);
    expect(getAllByText('정보 없음').length).toBeGreaterThanOrEqual(2);
  });

  it('serializes object extra fields via JSON.stringify', () => {
    const carbon = { co2: 100, unit: 'kg' };
    const { container } = render(<IdentityTab passport={buildPassport({ carbonFootprint: carbon })} />);
    expect(container.textContent).toContain('"co2":100');
  });

  it('renders 누적 방전 N 사이클 when totalDischargeCycles present, dash otherwise', () => {
    const { getByText, rerender, container } = render(<IdentityTab passport={buildPassport({ totalDischargeCycles: 250 })} />);
    expect(getByText('250 사이클')).not.toBeNull();
    rerender(<IdentityTab passport={buildPassport()} />);
    expect(container.textContent).toContain('-');
  });

  it('renders 공정용량/총에너지 with -- placeholder when missing', () => {
    const { getByText } = render(<IdentityTab passport={buildPassport({ ratedCapacity: undefined, totalEnergy: undefined })} />);
    expect(getByText('-- Ah')).not.toBeNull();
    expect(getByText('-- kWh')).not.toBeNull();
  });
});
