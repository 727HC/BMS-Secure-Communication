import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useRecyclingData } from './useRecyclingData';

const okResponse = (body: unknown) => ({ ok: true, status: 200, json: async () => body });

describe('useRecyclingData', () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  beforeEach(() => { fetchMock = vi.fn(); vi.stubGlobal('fetch', fetchMock); });
  afterEach(() => { vi.unstubAllGlobals(); });

  it('fetches and exposes tabCounts and lifecycle filters', async () => {
    fetchMock.mockResolvedValue(okResponse({
      records: [
        { passportId: 'A', status: 'ACTIVE' },                     // recycling-related (ACTIVE)
        { passportId: 'B', recycleAvailable: true },               // recyclable
        { passportId: 'C', status: 'RECYCLING' },                  // recycling
        { passportId: 'D', status: 'DISPOSED' },                   // disposed
        { passportId: 'E', status: 'MANUFACTURED' },               // not in scope
      ],
    }));
    const { result } = renderHook(() => useRecyclingData({ activeTab: 'all' }));
    await waitFor(() => expect(result.current.passports).toHaveLength(5));
    expect(result.current.tabCounts).toEqual({
      all: 4,        // A/B/C/D (E is not recycling-related)
      recyclable: 1, // B
      recycling: 1,  // C
      disposed: 1,   // D
    });
  });

  it('filters by activeTab=recyclable to recycleAvailable=true', async () => {
    fetchMock.mockResolvedValue(okResponse({
      records: [
        { passportId: 'X', recycleAvailable: true },
        { passportId: 'Y', status: 'ACTIVE' },
      ],
    }));
    const { result } = renderHook(() => useRecyclingData({ activeTab: 'recyclable' }));
    await waitFor(() => expect(result.current.passports).toHaveLength(2));
    expect(result.current.filteredPassports.map((p) => p.passportId)).toEqual(['X']);
  });

  it('filters by activeTab=disposed', async () => {
    fetchMock.mockResolvedValue(okResponse({
      records: [
        { passportId: 'A', status: 'DISPOSED' },
        { passportId: 'B', status: 'ACTIVE' },
      ],
    }));
    const { result } = renderHook(() => useRecyclingData({ activeTab: 'disposed' }));
    await waitFor(() => expect(result.current.passports).toHaveLength(2));
    expect(result.current.filteredPassports.map((p) => p.passportId)).toEqual(['A']);
  });

  it('paginates with PAGE_SIZE=12', async () => {
    fetchMock.mockResolvedValue(okResponse({
      records: Array.from({ length: 25 }, (_, i) => ({ passportId: `P${i}`, status: 'ACTIVE' })),
    }));
    const { result } = renderHook(() => useRecyclingData({ activeTab: 'all' }));
    await waitFor(() => expect(result.current.passports).toHaveLength(25));
    expect(result.current.totalPages).toBe(3);
    expect(result.current.pagedPassports).toHaveLength(12);
  });

  it('clamps currentPage when total pages drops', async () => {
    fetchMock.mockResolvedValue(okResponse({
      records: Array.from({ length: 25 }, (_, i) => ({ passportId: `P${i}`, status: 'ACTIVE' })),
    }));
    type Tab = 'all' | 'recyclable' | 'recycling' | 'disposed';
    const { result, rerender } = renderHook(
      ({ tab }: { tab: Tab }) => useRecyclingData({ activeTab: tab }),
      { initialProps: { tab: 'all' as Tab } },
    );
    await waitFor(() => expect(result.current.totalPages).toBe(3));
    result.current.setCurrentPage(3);
    await waitFor(() => expect(result.current.currentPage).toBe(3));
    rerender({ tab: 'recyclable' });
    // recyclable filter empties; totalPages=1; effect clamps currentPage to 1
    await waitFor(() => expect(result.current.currentPage).toBe(1));
  });
});
