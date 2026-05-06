import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useMaterialsData } from './useMaterialsData';

const okResponse = (body: unknown) => ({
  ok: true, status: 200, json: async () => body,
});

describe('useMaterialsData', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => { vi.unstubAllGlobals(); });

  it('fetches materials on mount and applies pagination', async () => {
    const list = Array.from({ length: 30 }, (_, i) => ({ materialId: `M${i}`, name: `material-${i}` }));
    fetchMock.mockResolvedValue(okResponse({ records: list }));
    const { result } = renderHook(() => useMaterialsData({ pageSize: 12, searchQuery: '' }));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.materials).toHaveLength(30);
    expect(result.current.totalPages).toBe(3);
    expect(result.current.paginatedMaterials).toHaveLength(12);
    expect(result.current.paginatedMaterials[0].materialId).toBe('M0');
  });

  it('reads list from materials.* fallback', async () => {
    fetchMock.mockResolvedValue(okResponse({ materials: [{ materialId: 'X', name: 'x' }] }));
    const { result } = renderHook(() => useMaterialsData({ pageSize: 12, searchQuery: '' }));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.materials).toHaveLength(1);
  });

  it('clears materials on fetch error', async () => {
    fetchMock.mockRejectedValue(new Error('down'));
    const { result } = renderHook(() => useMaterialsData({ pageSize: 12, searchQuery: '' }));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.materials).toEqual([]);
  });

  it('filters by case-insensitive substring across multiple fields', async () => {
    fetchMock.mockResolvedValue(okResponse({
      records: [
        { materialId: 'M1', name: 'Lithium Carbonate', supplier: 'A' },
        { materialId: 'M2', name: 'Cobalt Sulfate', supplier: 'B' },
        { materialId: 'M3', name: 'X', supplier: 'lith-supplier' },
      ],
    }));
    const { result, rerender } = renderHook(
      ({ q }: { q: string }) => useMaterialsData({ pageSize: 12, searchQuery: q }),
      { initialProps: { q: '' } },
    );
    await waitFor(() => expect(result.current.materials).toHaveLength(3));

    rerender({ q: 'lith' });
    expect(result.current.filteredMaterials.map((m) => m.materialId)).toEqual(['M1', 'M3']);
  });

  it('counts certified and unique origins', async () => {
    fetchMock.mockResolvedValue(okResponse({
      records: [
        { materialId: 'M1', name: 'a', origin: 'KR', certificationId: 'C1' },
        { materialId: 'M2', name: 'b', origin: 'KR' },
        { materialId: 'M3', name: 'c', origin: 'JP', certificationId: 'C2' },
      ],
    }));
    const { result } = renderHook(() => useMaterialsData({ pageSize: 12, searchQuery: '' }));
    await waitFor(() => expect(result.current.materials).toHaveLength(3));
    expect(result.current.certifiedCount).toBe(2);
    expect(result.current.originUniqueCount).toBe(2);
  });

  it('categorizes by name keyword and groups under 기타 for unknown', async () => {
    fetchMock.mockResolvedValue(okResponse({
      records: [
        { materialId: 'M1', name: 'Lithium oxide' },
        { materialId: 'M2', name: '코발트' },
        { materialId: 'M3', name: '망간 dioxide' },
        // CATEGORY_KEYWORDS includes 'co' for 코발트, 'ni' for 니켈, 'li' for 리튬,
        // 'mn' for 망간 — substrings happen, so use a name with no overlap.
        { materialId: 'M4', name: 'aluminum hydroxide' },
      ],
    }));
    const { result } = renderHook(() => useMaterialsData({ pageSize: 12, searchQuery: '' }));
    await waitFor(() => expect(result.current.materials).toHaveLength(4));
    expect(result.current.categoryDist['리튬']).toBe(1);
    expect(result.current.categoryDist['코발트']).toBe(1);
    expect(result.current.categoryDist['망간']).toBe(1);
    expect(result.current.categoryDist['기타']).toBe(1);
  });

  it('resets currentPage to 1 when searchQuery changes', async () => {
    fetchMock.mockResolvedValue(okResponse({
      records: Array.from({ length: 30 }, (_, i) => ({ materialId: `M${i}`, name: 'a' })),
    }));
    const { result, rerender } = renderHook(
      ({ q }: { q: string }) => useMaterialsData({ pageSize: 12, searchQuery: q }),
      { initialProps: { q: '' } },
    );
    await waitFor(() => expect(result.current.materials).toHaveLength(30));

    result.current.setCurrentPage(3);
    await waitFor(() => expect(result.current.currentPage).toBe(3));

    rerender({ q: 'a' });
    await waitFor(() => expect(result.current.currentPage).toBe(1));
  });
});
