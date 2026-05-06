import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useMaintenanceData } from './useMaintenanceData';

const okResponse = (body: unknown) => ({ ok: true, status: 200, json: async () => body });

describe('useMaintenanceData', () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  beforeEach(() => { fetchMock = vi.fn(); vi.stubGlobal('fetch', fetchMock); });
  afterEach(() => { vi.unstubAllGlobals(); });

  it('fetches /passports and exposes tabCounts', async () => {
    fetchMock.mockResolvedValue(okResponse({
      records: [
        { passportId: 'A', status: 'MAINTENANCE' },
        { passportId: 'B', status: 'ACTIVE', vin: 'V', accidentLogs: [{}] },
        { passportId: 'C', status: 'ACTIVE', vin: 'V' },
      ],
    }));
    const { result } = renderHook(() => useMaintenanceData({ activeTab: 'all', isEVManufacturer: true }));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.passports).toHaveLength(3);
    expect(result.current.tabCounts.maintenance).toBe(1);
    expect(result.current.tabCounts.accident).toBe(1);
  });

  it('filters by activeTab=maintenance', async () => {
    fetchMock.mockResolvedValue(okResponse({
      records: [
        { passportId: 'A', status: 'MAINTENANCE' },
        { passportId: 'B', status: 'ANALYSIS' },
        { passportId: 'C', status: 'ACTIVE' },
      ],
    }));
    const { result } = renderHook(() => useMaintenanceData({ activeTab: 'maintenance', isEVManufacturer: false }));
    await waitFor(() => expect(result.current.passports).toHaveLength(3));
    expect(result.current.filteredPassports.map((p) => p.passportId).sort()).toEqual(['A', 'B']);
  });

  it('filters by activeTab=accident only when accidentLogs present', async () => {
    fetchMock.mockResolvedValue(okResponse({
      records: [
        { passportId: 'A', accidentLogs: [{}] },
        { passportId: 'B', accidentLogs: [] },
        { passportId: 'C' },
      ],
    }));
    const { result } = renderHook(() => useMaintenanceData({ activeTab: 'accident', isEVManufacturer: false }));
    await waitFor(() => expect(result.current.passports).toHaveLength(3));
    expect(result.current.filteredPassports.map((p) => p.passportId)).toEqual(['A']);
  });

  it('isWorkbenchItem includes EVMfg ACTIVE+VIN candidates only when isEVManufacturer is true', async () => {
    fetchMock.mockResolvedValue(okResponse({
      records: [
        { passportId: 'A', status: 'ACTIVE', vin: 'V' },
      ],
    }));
    const { result: ev } = renderHook(() => useMaintenanceData({ activeTab: 'all', isEVManufacturer: true }));
    await waitFor(() => expect(ev.current.passports).toHaveLength(1));
    expect(ev.current.tabCounts.all).toBe(1);

    const { result: nonEv } = renderHook(() => useMaintenanceData({ activeTab: 'all', isEVManufacturer: false }));
    await waitFor(() => expect(nonEv.current.passports).toHaveLength(1));
    expect(nonEv.current.tabCounts.all).toBe(0);
  });
});
