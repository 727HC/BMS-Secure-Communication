import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render } from '@testing-library/react';
import QrScanInputPanel from './QrScanInputPanel';

function build(overrides: Partial<React.ComponentProps<typeof QrScanInputPanel>> = {}) {
  return {
    scanning: false,
    onStartScan: vi.fn(),
    onStopScan: vi.fn(),
    nfcScanning: false,
    onStartNfc: vi.fn(),
    onStopNfc: vi.fn(),
    manualId: '',
    onManualIdChange: vi.fn(),
    onManualSearch: vi.fn(),
    ...overrides,
  };
}

describe('QrScanInputPanel', () => {
  it('shows 카메라 열기 when not scanning, 카메라 닫기 when scanning', () => {
    const { getByText, queryByText, rerender } = render(<QrScanInputPanel {...build({ scanning: false })} />);
    expect(getByText('카메라 열기')).not.toBeNull();
    expect(queryByText('카메라 닫기')).toBeNull();
    rerender(<QrScanInputPanel {...build({ scanning: true })} />);
    expect(getByText('카메라 닫기')).not.toBeNull();
    expect(queryByText('카메라 열기')).toBeNull();
  });

  it('emits onStartScan/onStopScan on camera buttons', () => {
    const props = build({ scanning: false });
    const { getByText, rerender } = render(<QrScanInputPanel {...props} />);
    fireEvent.click(getByText('카메라 열기'));
    expect(props.onStartScan).toHaveBeenCalled();
    rerender(<QrScanInputPanel {...build({ scanning: true, onStopScan: props.onStopScan })} />);
    fireEvent.click(getByText('카메라 닫기'));
    expect(props.onStopScan).toHaveBeenCalled();
  });

  it('renders qr-reader div only while scanning', () => {
    const { container, rerender } = render(<QrScanInputPanel {...build({ scanning: false })} />);
    expect(container.querySelector('#qr-reader')).toBeNull();
    rerender(<QrScanInputPanel {...build({ scanning: true })} />);
    expect(container.querySelector('#qr-reader')).not.toBeNull();
  });

  it('renders FlowStep 1/2/3 when not scanning', () => {
    const { getByText } = render(<QrScanInputPanel {...build()} />);
    expect(getByText('스캔')).not.toBeNull();
    expect(getByText('인증')).not.toBeNull();
    expect(getByText('상세 이동')).not.toBeNull();
  });

  it('shows 미지원 NFC stamp in jsdom (no NDEFReader)', () => {
    const { getByText } = render(<QrScanInputPanel {...build()} />);
    expect(getByText('미지원')).not.toBeNull();
    expect(getByText(/Web NFC를 지원하지 않습니다/)).not.toBeNull();
  });

  it('disables 조회 button when manualId empty', () => {
    const { getByText } = render(<QrScanInputPanel {...build()} />);
    expect((getByText('조회') as HTMLButtonElement).disabled).toBe(true);
  });

  it('enables 조회 when manualId is non-empty and emits onManualSearch', () => {
    const props = build({ manualId: 'P-1' });
    const { getByText } = render(<QrScanInputPanel {...props} />);
    const btn = getByText('조회') as HTMLButtonElement;
    expect(btn.disabled).toBe(false);
    fireEvent.click(btn);
    expect(props.onManualSearch).toHaveBeenCalled();
  });

  it('emits onManualIdChange on input change', () => {
    const props = build();
    const { container } = render(<QrScanInputPanel {...props} />);
    fireEvent.change(container.querySelector('input') as HTMLInputElement, { target: { value: 'P-2' } });
    expect(props.onManualIdChange).toHaveBeenCalledWith('P-2');
  });

  it('emits onManualSearch on Enter keyup', () => {
    const props = build({ manualId: 'P-3' });
    const { container } = render(<QrScanInputPanel {...props} />);
    fireEvent.keyUp(container.querySelector('input') as HTMLInputElement, { key: 'Enter' });
    expect(props.onManualSearch).toHaveBeenCalled();
  });

  it('does not emit onManualSearch on non-Enter keyup', () => {
    const props = build({ manualId: 'P-3' });
    const { container } = render(<QrScanInputPanel {...props} />);
    fireEvent.keyUp(container.querySelector('input') as HTMLInputElement, { key: 'a' });
    expect(props.onManualSearch).not.toHaveBeenCalled();
  });
});
