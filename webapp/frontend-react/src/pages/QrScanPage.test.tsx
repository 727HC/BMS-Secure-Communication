import { describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import QrScanPage from './QrScanPage';

vi.mock('../components/qr-scan/useQrScanner', () => ({
  useQrScanner: () => ({
    scanning: false,
    scanResult: null,
    passportData: null,
    loadingPassport: false,
    scanError: null,
    manualId: '',
    setManualId: vi.fn(),
    nfcScanning: false,
    startScan: vi.fn(),
    stopScan: vi.fn(),
    startNfc: vi.fn(),
    stopNfc: vi.fn(),
    handleManualSearch: vi.fn(),
    goToDetail: vi.fn(),
    retry: vi.fn(),
  }),
}));

describe('QrScanPage', () => {
  function renderPage() {
    return render(<MemoryRouter><QrScanPage /></MemoryRouter>);
  }

  it('renders root with data-page="qr-scan"', () => {
    const { container } = renderPage();
    expect(container.querySelector('[data-page="qr-scan"]')).not.toBeNull();
  });

  it('renders PageHead title and subtitle', () => {
    const { getByText } = renderPage();
    expect(getByText('현장 식별 조회')).not.toBeNull();
    expect(getByText(/QR, NFC, 수동 식별값/)).not.toBeNull();
  });

  it('renders summary card, input panel, and result panel', () => {
    const { getByText } = renderPage();
    // SummaryCard markers
    expect(getByText('식별 데스크')).not.toBeNull();
    // InputPanel markers
    expect(getByText('Camera QR identify')).not.toBeNull();
    expect(getByText('Manual passport lookup')).not.toBeNull();
    // ResultPanel empty state marker
    expect(getByText('식별값을 입력하거나 스캔해 조회를 시작하세요')).not.toBeNull();
  });
});
