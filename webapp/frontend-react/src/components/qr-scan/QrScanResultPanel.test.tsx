import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render } from '@testing-library/react';
import QrScanResultPanel, { type QrPassport } from './QrScanResultPanel';

const samplePassport: QrPassport = {
  passportId: 'P1',
  status: 'ACTIVE',
  model: 'X100',
  serialNumber: 'SN-1',
  manufacturerName: 'LG',
  chemistry: 'NMC',
  totalEnergy: 80,
  vin: 'V1',
  did: 'did:web:bms:P1',
};

describe('QrScanResultPanel', () => {
  it('renders Spinner while loading', () => {
    const { container } = render(<QrScanResultPanel loadingPassport={true} passportData={null} scanError={null} onGoToDetail={vi.fn()} onRetry={vi.fn()} />);
    expect(container.querySelector('div[style*="animation"]')).not.toBeNull();
  });

  it('renders empty initial panel when no data and no error', () => {
    const { getByText } = render(<QrScanResultPanel loadingPassport={false} passportData={null} scanError={null} onGoToDetail={vi.fn()} onRetry={vi.fn()} />);
    expect(getByText('식별값을 입력하거나 스캔해 조회를 시작하세요')).not.toBeNull();
  });

  it('renders error panel with message and retry callback', () => {
    const onRetry = vi.fn();
    const { getByText } = render(<QrScanResultPanel loadingPassport={false} passportData={null} scanError="조회 실패: 네트워크" onGoToDetail={vi.fn()} onRetry={onRetry} />);
    expect(getByText('조회 실패')).not.toBeNull();
    expect(getByText('조회 실패: 네트워크')).not.toBeNull();
    fireEvent.click(getByText('다시 시도'));
    expect(onRetry).toHaveBeenCalled();
  });

  it('renders passport result with model + status badge label', () => {
    const { getByText } = render(<QrScanResultPanel loadingPassport={false} passportData={samplePassport} scanError={null} onGoToDetail={vi.fn()} onRetry={vi.fn()} />);
    expect(getByText('식별 결과 확인됨')).not.toBeNull();
    expect(getByText('X100')).not.toBeNull();
    expect(getByText('운행중')).not.toBeNull();
  });

  it('renders 4 spec tiles with manufacturer/chemistry/energy/VIN', () => {
    const { getByText } = render(<QrScanResultPanel loadingPassport={false} passportData={samplePassport} scanError={null} onGoToDetail={vi.fn()} onRetry={vi.fn()} />);
    expect(getByText('LG')).not.toBeNull();
    expect(getByText('NMC')).not.toBeNull();
    expect(getByText('80 kWh')).not.toBeNull();
    expect(getByText('V1')).not.toBeNull();
  });

  it('renders 미바인딩 fallback when VIN missing', () => {
    const { getByText } = render(<QrScanResultPanel loadingPassport={false} passportData={{ ...samplePassport, vin: '' }} scanError={null} onGoToDetail={vi.fn()} onRetry={vi.fn()} />);
    expect(getByText('미바인딩')).not.toBeNull();
  });

  it('renders DID block only when did is present', () => {
    const { getByText, queryByText, rerender } = render(<QrScanResultPanel loadingPassport={false} passportData={samplePassport} scanError={null} onGoToDetail={vi.fn()} onRetry={vi.fn()} />);
    expect(getByText('did:web:bms:P1')).not.toBeNull();
    rerender(<QrScanResultPanel loadingPassport={false} passportData={{ ...samplePassport, did: '' }} scanError={null} onGoToDetail={vi.fn()} onRetry={vi.fn()} />);
    expect(queryByText('did:web:bms:P1')).toBeNull();
  });

  it('emits onGoToDetail when 여권 상세 보기 button clicked', () => {
    const onGo = vi.fn();
    const { getByText } = render(<QrScanResultPanel loadingPassport={false} passportData={samplePassport} scanError={null} onGoToDetail={onGo} onRetry={vi.fn()} />);
    fireEvent.click(getByText(/여권 상세 보기/));
    expect(onGo).toHaveBeenCalled();
  });
});
