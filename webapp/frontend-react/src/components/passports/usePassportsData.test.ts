import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { usePassportsData } from './usePassportsData';

const okResponse = (body: unknown) => ({ ok: true, status: 200, json: async () => body });

describe('usePassportsData', () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  beforeEach(() => { fetchMock = vi.fn(); vi.stubGlobal('fetch', fetchMock); });
  afterEach(() => { vi.unstubAllGlobals(); });

  it('fetches /passports on mount and accepts top-level array', async () => {
    fetchMock.mockResolvedValue(okResponse([{ passportId: 'P1' }, { passportId: 'P2' }]));
    const { result } = renderHook(() => usePassportsData({ searchQuery: '', filterStatus: '', gbaFilter: 'all', sortBy: 'latest' }));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.passports).toHaveLength(2);
  });

  it('filters by status', async () => {
    fetchMock.mockResolvedValue(okResponse({
      records: [
        { passportId: 'A', status: 'ACTIVE' },
        { passportId: 'B', status: 'MAINTENANCE' },
      ],
    }));
    const { result } = renderHook(() => usePassportsData({ searchQuery: '', filterStatus: 'ACTIVE', gbaFilter: 'all', sortBy: 'latest' }));
    await waitFor(() => expect(result.current.passports).toHaveLength(2));
    expect(result.current.filteredPassports.map((p) => p.passportId)).toEqual(['A']);
  });

  it('filters by case-insensitive search across multiple fields', async () => {
    fetchMock.mockResolvedValue(okResponse({
      records: [
        { passportId: 'P1', model: 'Tesla' },
        { passportId: 'P2', vin: 'TESLA1234' },
        { passportId: 'P3', manufacturerName: 'BMW' },
      ],
    }));
    const { result } = renderHook(() => usePassportsData({ searchQuery: 'tesla', filterStatus: '', gbaFilter: 'all', sortBy: 'latest' }));
    await waitFor(() => expect(result.current.passports).toHaveLength(3));
    expect(result.current.filteredPassports.map((p) => p.passportId).sort()).toEqual(['P1', 'P2']);
  });

  it('sorts by latest updatedAt/createdAt descending', async () => {
    fetchMock.mockResolvedValue(okResponse({
      records: [
        { passportId: 'old', updatedAt: '2026-01-01T00:00:00Z' },
        { passportId: 'new', updatedAt: '2026-05-01T00:00:00Z' },
        { passportId: 'mid', updatedAt: '2026-03-01T00:00:00Z' },
      ],
    }));
    const { result } = renderHook(() => usePassportsData({ searchQuery: '', filterStatus: '', gbaFilter: 'all', sortBy: 'latest' }));
    await waitFor(() => expect(result.current.passports).toHaveLength(3));
    expect(result.current.filteredPassports.map((p) => p.passportId)).toEqual(['new', 'mid', 'old']);
  });

  it('paginates with PAGE_SIZE=12', async () => {
    fetchMock.mockResolvedValue(okResponse({
      records: Array.from({ length: 25 }, (_, i) => ({ passportId: `P${i}` })),
    }));
    const { result } = renderHook(() => usePassportsData({ searchQuery: '', filterStatus: '', gbaFilter: 'all', sortBy: 'latest' }));
    await waitFor(() => expect(result.current.passports).toHaveLength(25));
    expect(result.current.totalPages).toBe(3);
    expect(result.current.paginatedPassports).toHaveLength(12);
  });
});
