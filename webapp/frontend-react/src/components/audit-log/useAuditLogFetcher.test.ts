import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useAuditLogFetcher } from './useAuditLogFetcher';

const okResponse = (body: unknown) => ({
  ok: true,
  status: 200,
  json: async () => body,
});

const errResponse = (status: number, error?: string) => ({
  ok: false,
  status,
  json: async () => (error ? { error } : {}),
});

describe('useAuditLogFetcher', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('fetches logs on mount and exposes records/total', async () => {
    fetchMock.mockResolvedValueOnce(okResponse({ records: [{ id: 'a1' }], total: 1 }));
    const { result } = renderHook(() =>
      useAuditLogFetcher({ page: 1, pageSize: 10, filterAction: '', filterWriteOnly: false, autoRefresh: false }),
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(result.current.logs).toEqual([{ id: 'a1' }]);
    expect(result.current.total).toBe(1);
    expect(result.current.errorMsg).toBe('');

    const calledUrl = String(fetchMock.mock.calls[0][0]);
    expect(calledUrl).toContain('/audit?');
    expect(calledUrl).toContain('page=1');
    expect(calledUrl).toContain('limit=10');
  });

  it('appends action and writeOnly query params when set', async () => {
    fetchMock.mockResolvedValue(okResponse({ records: [], total: 0 }));
    renderHook(() =>
      useAuditLogFetcher({ page: 2, pageSize: 25, filterAction: 'CREATE_PASSPORT', filterWriteOnly: true, autoRefresh: false }),
    );

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
    });
    const calledUrl = String(fetchMock.mock.calls[0][0]);
    expect(calledUrl).toContain('action=CREATE_PASSPORT');
    expect(calledUrl).toContain('writeOnly=true');
    expect(calledUrl).toContain('page=2');
    expect(calledUrl).toContain('limit=25');
  });

  it('captures errorMsg and clears records on failure', async () => {
    fetchMock.mockResolvedValue(errResponse(500, 'Internal Error'));
    const { result } = renderHook(() =>
      useAuditLogFetcher({ page: 1, pageSize: 10, filterAction: '', filterWriteOnly: false, autoRefresh: false }),
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(result.current.logs).toEqual([]);
    expect(result.current.total).toBe(0);
    expect(result.current.errorMsg).toBe('Internal Error');
  });

  it('refetches on filterAction/page change', async () => {
    fetchMock.mockResolvedValue(okResponse({ records: [], total: 0 }));
    const { rerender } = renderHook(
      ({ page, filterAction }: { page: number; filterAction: string }) =>
        useAuditLogFetcher({ page, pageSize: 10, filterAction, filterWriteOnly: false, autoRefresh: false }),
      { initialProps: { page: 1, filterAction: '' } },
    );

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

    rerender({ page: 2, filterAction: 'LOGIN' });
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));

    const lastCall = String(fetchMock.mock.calls[1][0]);
    expect(lastCall).toContain('page=2');
    expect(lastCall).toContain('action=LOGIN');
  });

  it('toggles auto-refresh interval registration without schedule leak', async () => {
    fetchMock.mockResolvedValue(okResponse({ records: [], total: 0 }));
    const setIntervalSpy = vi.spyOn(window, 'setInterval');
    const clearIntervalSpy = vi.spyOn(window, 'clearInterval');
    const { unmount } = renderHook(() =>
      useAuditLogFetcher({ page: 1, pageSize: 10, filterAction: '', filterWriteOnly: false, autoRefresh: true }),
    );

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(setIntervalSpy).toHaveBeenCalled();

    unmount();
    expect(clearIntervalSpy).toHaveBeenCalled();
  });
});
