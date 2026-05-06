import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { usePassportDetailData } from './usePassportDetailData';

const ok = (body: unknown) => ({ ok: true, status: 200, json: async () => body });
const err = (status: number, error?: string) => ({ ok: false, status, json: async () => (error ? { error } : {}) });

describe('usePassportDetailData', () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  beforeEach(() => { fetchMock = vi.fn(); vi.stubGlobal('fetch', fetchMock); });
  afterEach(() => { vi.unstubAllGlobals(); });

  it("returns fetchError immediately when id is missing", async () => {
    const { result } = renderHook(() => usePassportDetailData({ id: undefined, activeTab: 'identity', org: null }));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.fetchError).toBe('요청한 여권 ID가 없습니다.');
    expect(result.current.passport).toBeNull();
  });

  it('fetches passport + bmu in parallel via Promise.allSettled', async () => {
    fetchMock.mockImplementation((url: string) => {
      if (url.includes('/realtime/passports/')) return Promise.resolve(ok({ passportId: 'P1', model: 'M' }));
      if (url.includes('/realtime/bmu/')) return Promise.resolve(ok({ records: [{ recordId: 'r1' }] }));
      return Promise.resolve(ok({}));
    });
    const { result } = renderHook(() => usePassportDetailData({ id: 'P1', activeTab: 'identity', org: null }));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.passport?.passportId).toBe('P1');
    expect(result.current.bmuRecords).toHaveLength(1);
    expect(result.current.fetchError).toBeNull();
  });

  it('keeps bmuRecords empty when bmu fetch fails but passport succeeds', async () => {
    fetchMock.mockImplementation((url: string) => {
      if (url.includes('/realtime/passports/')) return Promise.resolve(ok({ passportId: 'P1' }));
      if (url.includes('/realtime/bmu/')) return Promise.resolve(err(500, 'BMU down'));
      return Promise.resolve(ok({}));
    });
    const { result } = renderHook(() => usePassportDetailData({ id: 'P1', activeTab: 'identity', org: null }));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.passport?.passportId).toBe('P1');
    expect(result.current.bmuRecords).toEqual([]);
    expect(result.current.fetchError).toBeNull();
  });

  it('captures fetchError when passport request fails', async () => {
    fetchMock.mockImplementation((url: string) => {
      if (url.includes('/realtime/passports/')) return Promise.resolve(err(404, 'not found'));
      return Promise.resolve(ok({ records: [] }));
    });
    const { result } = renderHook(() => usePassportDetailData({ id: 'P1', activeTab: 'identity', org: null }));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.passport).toBeNull();
    expect(result.current.fetchError).toBe('not found');
  });

  it('fetches vc list only when activeTab=trust', async () => {
    fetchMock.mockResolvedValue(ok([]));
    const { result, rerender } = renderHook(
      ({ tab }: { tab: string }) => usePassportDetailData({ id: 'P1', activeTab: tab, org: null }),
      { initialProps: { tab: 'identity' } },
    );
    await waitFor(() => expect(result.current.loading).toBe(false));

    const initialCallCount = fetchMock.mock.calls.length;
    // change to trust → triggers /vc/passport/...
    rerender({ tab: 'trust' });
    await waitFor(() => {
      const vcFetched = fetchMock.mock.calls.some(([u]) => String(u).includes('/vc/passport/'));
      expect(vcFetched).toBe(true);
    });
    expect(fetchMock.mock.calls.length).toBeGreaterThan(initialCallCount);
  });

  it('skips vc fetch when id missing or tab is not trust', async () => {
    fetchMock.mockResolvedValue(ok({}));
    renderHook(() => usePassportDetailData({ id: undefined, activeTab: 'trust', org: null }));
    await new Promise((r) => setTimeout(r, 30));
    const vcFetched = fetchMock.mock.calls.some(([u]) => String(u).includes('/vc/passport/'));
    expect(vcFetched).toBe(false);
  });
});
