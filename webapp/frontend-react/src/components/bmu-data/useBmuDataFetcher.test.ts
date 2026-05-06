import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { useBmuDataFetcher } from './useBmuDataFetcher';

const ok = (body: unknown) => ({ ok: true, status: 200, json: async () => body });
const err = (status: number, message: string) => ({ ok: false, status, json: async () => ({ error: message }) });

describe('useBmuDataFetcher', () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  beforeEach(() => { fetchMock = vi.fn(); vi.stubGlobal('fetch', fetchMock); });
  afterEach(() => { vi.unstubAllGlobals(); });

  it('skips initial fetch when passportId is empty', async () => {
    const { result } = renderHook(() => useBmuDataFetcher({ passportId: '', autoRefresh: false }));
    await new Promise((r) => setTimeout(r, 30));
    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.current.records).toEqual([]);
    expect(result.current.hasSearched).toBe(false);
  });

  it('runs initial fetch when passportId is provided', async () => {
    fetchMock.mockResolvedValue(ok({ records: [{ recordId: 'r1' }] }));
    const { result } = renderHook(() => useBmuDataFetcher({ passportId: 'P1', autoRefresh: false }));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.records).toHaveLength(1);
    expect(result.current.hasSearched).toBe(true);
    expect(result.current.lastFetchedAt).toBeInstanceOf(Date);
  });

  it('captures errorMsg and flags accessDenied for permission keywords', async () => {
    fetchMock.mockResolvedValue(err(403, 'access denied'));
    const { result } = renderHook(() => useBmuDataFetcher({ passportId: 'P1', autoRefresh: false }));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.errorMsg).toBe('access denied');
    expect(result.current.accessDenied).toBe(true);
    expect(result.current.records).toEqual([]);
  });

  it('handles 권한 keyword as accessDenied', async () => {
    fetchMock.mockResolvedValue(err(403, '권한이 없습니다'));
    const { result } = renderHook(() => useBmuDataFetcher({ passportId: 'P1', autoRefresh: false }));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.accessDenied).toBe(true);
  });

  it('does not flag accessDenied for non-permission errors', async () => {
    fetchMock.mockResolvedValue(err(500, 'internal'));
    const { result } = renderHook(() => useBmuDataFetcher({ passportId: 'P1', autoRefresh: false }));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.accessDenied).toBe(false);
    expect(result.current.errorMsg).toBe('internal');
  });

  it('resetSearchState clears errorMsg/accessDenied/hasSearched', async () => {
    fetchMock.mockResolvedValue(err(403, 'access denied'));
    const { result } = renderHook(() => useBmuDataFetcher({ passportId: 'P1', autoRefresh: false }));
    await waitFor(() => expect(result.current.errorMsg).toBe('access denied'));

    act(() => { result.current.resetSearchState(); });
    expect(result.current.errorMsg).toBe('');
    expect(result.current.accessDenied).toBe(false);
    expect(result.current.hasSearched).toBe(false);
  });

  it('uses refreshing state when fetched in autoRefresh+not-loading mode', async () => {
    fetchMock.mockResolvedValue(ok({ records: [] }));
    const { result } = renderHook(() => useBmuDataFetcher({ passportId: 'P1', autoRefresh: false }));
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => { void result.current.fetchRecords(true, false); });
    await waitFor(() => expect(result.current.refreshing).toBe(false));
    // refreshing transitioned through true → false during the manual fetch
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('registers setInterval when autoRefresh + non-empty id, clears on unmount', async () => {
    fetchMock.mockResolvedValue(ok({ records: [] }));
    const setIntervalSpy = vi.spyOn(window, 'setInterval');
    const clearIntervalSpy = vi.spyOn(window, 'clearInterval');
    const { unmount } = renderHook(() => useBmuDataFetcher({ passportId: 'P1', autoRefresh: true }));
    await waitFor(() => expect(setIntervalSpy).toHaveBeenCalled());
    unmount();
    expect(clearIntervalSpy).toHaveBeenCalled();
  });
});
