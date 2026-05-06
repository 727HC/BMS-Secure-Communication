import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useRecyclingMutations } from './useRecyclingMutations';

const ok = (body: unknown = {}) => ({ ok: true, status: 200, json: async () => body });
const err = (status: number, error?: string) => ({ ok: false, status, json: async () => (error ? { error } : {}) });

describe('useRecyclingMutations', () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  beforeEach(() => { fetchMock = vi.fn(); vi.stubGlobal('fetch', fetchMock); });
  afterEach(() => { vi.unstubAllGlobals(); });

  it('requestAnalysis POSTs to /analysis/:id/request and runs onAfterSuccess (no onClose)', async () => {
    fetchMock.mockResolvedValue(ok());
    const onAfterSuccess = vi.fn();
    const onClose = vi.fn();
    const { result } = renderHook(() => useRecyclingMutations({
      selectedPassport: null, onAfterSuccess, onClose,
    }));
    await act(async () => {
      await result.current.requestAnalysis({ passportId: 'P1' });
    });
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain('/analysis/P1/request');
    expect((init as RequestInit).method).toBe('POST');
    expect(onAfterSuccess).toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled(); // requestAnalysis does NOT close any modal
  });

  it('requestAnalysis no-ops when passport has no passportId', async () => {
    const onAfterSuccess = vi.fn();
    const { result } = renderHook(() => useRecyclingMutations({
      selectedPassport: null, onAfterSuccess, onClose: vi.fn(),
    }));
    await act(async () => { await result.current.requestAnalysis({}); });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('submitAnalysisResult coerces form numbers to Number()', async () => {
    fetchMock.mockResolvedValue(ok());
    const { result } = renderHook(() => useRecyclingMutations({
      selectedPassport: { passportId: 'P1' },
      onAfterSuccess: vi.fn(), onClose: vi.fn(),
    }));
    await act(async () => {
      await result.current.submitAnalysisResult({
        soh: '85', soce: '90', remainingLifeCycle: '500', recycleAvailable: true,
      });
    });
    const init = fetchMock.mock.calls[0][1] as { body: string };
    expect(JSON.parse(init.body)).toEqual({
      soh: 85, soce: 90, remainingLifeCycle: 500, recycleAvailable: true,
    });
  });

  it('submitRecycleToggle PUTs to /recycling/:id/availability', async () => {
    fetchMock.mockResolvedValue(ok());
    const { result } = renderHook(() => useRecyclingMutations({
      selectedPassport: { passportId: 'P1' },
      onAfterSuccess: vi.fn(), onClose: vi.fn(),
    }));
    await act(async () => { await result.current.submitRecycleToggle(true); });
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain('/recycling/P1/availability');
    expect((init as RequestInit).method).toBe('PUT');
    expect(JSON.parse((init as { body: string }).body)).toEqual({ available: true });
  });

  it('submitExtract collects ExtractEntry into recyclingRates and ignores empty keys', async () => {
    fetchMock.mockResolvedValue(ok());
    const { result } = renderHook(() => useRecyclingMutations({
      selectedPassport: { passportId: 'P1' },
      onAfterSuccess: vi.fn(), onClose: vi.fn(),
    }));
    await act(async () => {
      await result.current.submitExtract([
        { key: 'Li', value: '95' },
        { key: '  ', value: '50' },
        { key: 'Co', value: '80' },
      ]);
    });
    const body = JSON.parse((fetchMock.mock.calls[0][1] as { body: string }).body);
    expect(body).toEqual({ recyclingRates: { Li: 95, Co: 80 } });
  });

  it('submitDispose POSTs to /recycling/:id/dispose', async () => {
    fetchMock.mockResolvedValue(ok());
    const { result } = renderHook(() => useRecyclingMutations({
      selectedPassport: { passportId: 'P1' },
      onAfterSuccess: vi.fn(), onClose: vi.fn(),
    }));
    await act(async () => { await result.current.submitDispose(); });
    expect(String(fetchMock.mock.calls[0][0])).toContain('/recycling/P1/dispose');
  });

  it('captures submitError on failure', async () => {
    fetchMock.mockResolvedValue(err(500, 'down'));
    const onClose = vi.fn();
    const { result } = renderHook(() => useRecyclingMutations({
      selectedPassport: { passportId: 'P1' },
      onAfterSuccess: vi.fn(), onClose,
    }));
    await act(async () => { await result.current.submitDispose(); });
    expect(onClose).not.toHaveBeenCalled();
    expect(result.current.submitError).toBeTruthy();
  });
});
