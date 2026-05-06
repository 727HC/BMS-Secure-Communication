import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import { useQrScanner } from './useQrScanner';

const apiGetMock = vi.fn();
vi.mock('../../lib/api', () => ({
  api: { get: (path: string) => apiGetMock(path) },
}));

let lastPath = '';
function NavSpy() {
  const loc = useLocation();
  lastPath = loc.pathname;
  return null;
}

function wrapper({ children }: { children: React.ReactNode }) {
  return (
    <MemoryRouter initialEntries={['/qr-scan']}>
      <Routes>
        <Route path="*" element={<>{children}<NavSpy /></>} />
      </Routes>
    </MemoryRouter>
  );
}

describe('useQrScanner', () => {
  beforeEach(() => {
    apiGetMock.mockReset();
    lastPath = '';
  });

  afterEach(() => vi.clearAllMocks());

  it('initial state is idle (all null/false)', () => {
    const { result } = renderHook(() => useQrScanner(), { wrapper });
    expect(result.current.scanning).toBe(false);
    expect(result.current.scanResult).toBeNull();
    expect(result.current.passportData).toBeNull();
    expect(result.current.loadingPassport).toBe(false);
    expect(result.current.scanError).toBeNull();
    expect(result.current.manualId).toBe('');
    expect(result.current.nfcScanning).toBe(false);
  });

  it('setManualId updates manualId', () => {
    const { result } = renderHook(() => useQrScanner(), { wrapper });
    act(() => result.current.setManualId('P-1'));
    expect(result.current.manualId).toBe('P-1');
  });

  it('handleManualSearch with empty/whitespace ID is a no-op', () => {
    const { result } = renderHook(() => useQrScanner(), { wrapper });
    act(() => result.current.setManualId('   '));
    act(() => result.current.handleManualSearch());
    expect(apiGetMock).not.toHaveBeenCalled();
  });

  it('handleManualSearch fetches passport and stores data on success', async () => {
    apiGetMock.mockResolvedValue({ passportId: 'P-1', model: 'X' });
    const { result } = renderHook(() => useQrScanner(), { wrapper });
    act(() => result.current.setManualId('P-1'));
    act(() => result.current.handleManualSearch());
    await waitFor(() => expect(result.current.passportData?.passportId).toBe('P-1'));
    expect(apiGetMock).toHaveBeenCalledWith('/passports/P-1');
    expect(result.current.scanResult).toBe('P-1');
    expect(result.current.scanError).toBeNull();
  });

  it('encodes special characters in passport id', async () => {
    apiGetMock.mockResolvedValue({});
    const { result } = renderHook(() => useQrScanner(), { wrapper });
    act(() => result.current.setManualId('P/X'));
    act(() => result.current.handleManualSearch());
    await waitFor(() => expect(apiGetMock).toHaveBeenCalled());
    expect(apiGetMock).toHaveBeenCalledWith('/passports/P%2FX');
  });

  it('sets scanError when api lookup throws', async () => {
    apiGetMock.mockImplementation(() => Promise.reject(new Error('not found')));
    const { result } = renderHook(() => useQrScanner(), { wrapper });
    act(() => result.current.setManualId('P-X'));
    act(() => result.current.handleManualSearch());
    await waitFor(() => expect(result.current.scanError).toMatch(/P-X/));
    expect(result.current.passportData).toBeNull();
  });

  it('retry clears scanError + scanResult', () => {
    const { result } = renderHook(() => useQrScanner(), { wrapper });
    act(() => {
      // Simulate a previous error
      result.current.setManualId('X');
    });
    act(() => result.current.retry());
    expect(result.current.scanError).toBeNull();
    expect(result.current.scanResult).toBeNull();
  });

  it('goToDetail navigates to /passports/:id when passportData is set', async () => {
    apiGetMock.mockResolvedValue({ passportId: 'P-99' });
    const { result } = renderHook(() => useQrScanner(), { wrapper });
    act(() => result.current.setManualId('P-99'));
    act(() => result.current.handleManualSearch());
    await waitFor(() => expect(result.current.passportData?.passportId).toBe('P-99'));
    act(() => result.current.goToDetail());
    expect(lastPath).toBe('/passports/P-99');
  });

  it('goToDetail is a no-op when no passportData', () => {
    const { result } = renderHook(() => useQrScanner(), { wrapper });
    act(() => result.current.goToDetail());
    expect(lastPath).toBe('/qr-scan');
  });

  it('stopNfc resets nfcScanning to false', () => {
    const { result } = renderHook(() => useQrScanner(), { wrapper });
    act(() => result.current.stopNfc());
    expect(result.current.nfcScanning).toBe(false);
  });

  it('startNfc returns early in jsdom (no NDEFReader) without setting state', () => {
    const { result } = renderHook(() => useQrScanner(), { wrapper });
    act(() => { result.current.startNfc(); });
    expect(result.current.nfcScanning).toBe(false);
    expect(result.current.scanError).toBeNull();
  });

  it('stopScan toggles scanning false even when no scanner active', async () => {
    const { result } = renderHook(() => useQrScanner(), { wrapper });
    await act(async () => { await result.current.stopScan(); });
    expect(result.current.scanning).toBe(false);
  });
});
