import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { useMaintenanceMutations } from './useMaintenanceMutations';

const ok = (body: unknown = {}) => ({ ok: true, status: 200, json: async () => body });
const err = (status: number, error?: string) => ({ ok: false, status, json: async () => (error ? { error } : {}) });

describe('useMaintenanceMutations', () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  beforeEach(() => { fetchMock = vi.fn(); vi.stubGlobal('fetch', fetchMock); });
  afterEach(() => { vi.unstubAllGlobals(); });

  it('no-ops when selectedPassport is null', async () => {
    const onAfterSuccess = vi.fn();
    const onClose = vi.fn();
    const { result } = renderHook(() => useMaintenanceMutations({
      selectedPassport: null, onAfterSuccess, onClose,
    }));
    await act(async () => {
      await result.current.submitRequest({ maintenanceType: 'routine', description: '' });
    });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('submitRequest POSTs to /maintenance/:id/request and triggers onClose + onAfterSuccess', async () => {
    fetchMock.mockResolvedValue(ok());
    const onAfterSuccess = vi.fn();
    const onClose = vi.fn();
    const { result } = renderHook(() => useMaintenanceMutations({
      selectedPassport: { passportId: 'P1' }, onAfterSuccess, onClose,
    }));
    await act(async () => {
      await result.current.submitRequest({ maintenanceType: 'repair', description: 'desc' });
    });
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain('/maintenance/P1/request');
    expect((init as RequestInit).method).toBe('POST');
    expect(JSON.parse((init as { body: string }).body)).toEqual({ maintenanceType: 'repair', description: 'desc' });
    expect(onClose).toHaveBeenCalled();
    expect(onAfterSuccess).toHaveBeenCalled();
    expect(result.current.submitError).toBeNull();
  });

  it('submitLog POSTs to /maintenance/:id/log', async () => {
    fetchMock.mockResolvedValue(ok());
    const { result } = renderHook(() => useMaintenanceMutations({
      selectedPassport: { passportId: 'P2' },
      onAfterSuccess: vi.fn(), onClose: vi.fn(),
    }));
    await act(async () => {
      await result.current.submitLog({ maintenanceType: 'recall', description: 'd', technician: 't' });
    });
    expect(String(fetchMock.mock.calls[0][0])).toContain('/maintenance/P2/log');
  });

  it('submitAccident POSTs to /maintenance/:id/accident', async () => {
    fetchMock.mockResolvedValue(ok());
    const { result } = renderHook(() => useMaintenanceMutations({
      selectedPassport: { passportId: 'P3' },
      onAfterSuccess: vi.fn(), onClose: vi.fn(),
    }));
    await act(async () => {
      await result.current.submitAccident({ severity: 'high', description: 'desc', reporter: 'r' } as any);
    });
    expect(String(fetchMock.mock.calls[0][0])).toContain('/maintenance/P3/accident');
  });

  it('captures submitError and skips onClose on failure', async () => {
    fetchMock.mockResolvedValue(err(500, 'server-down'));
    const onClose = vi.fn();
    const { result } = renderHook(() => useMaintenanceMutations({
      selectedPassport: { passportId: 'P1' },
      onAfterSuccess: vi.fn(), onClose,
    }));
    await act(async () => {
      await result.current.submitRequest({ maintenanceType: 'routine', description: '' });
    });
    expect(onClose).not.toHaveBeenCalled();
    expect(result.current.submitError).toBeTruthy();
  });

  it('toggles submitting state across the call', async () => {
    let resolve!: (v: unknown) => void;
    fetchMock.mockReturnValue(new Promise<unknown>((r) => { resolve = r; }));
    const { result } = renderHook(() => useMaintenanceMutations({
      selectedPassport: { passportId: 'P1' },
      onAfterSuccess: vi.fn(), onClose: vi.fn(),
    }));
    act(() => { void result.current.submitRequest({ maintenanceType: 'routine', description: '' }); });
    await waitFor(() => expect(result.current.submitting).toBe(true));
    await act(async () => { resolve(ok()); await Promise.resolve(); });
    await waitFor(() => expect(result.current.submitting).toBe(false));
  });
});
