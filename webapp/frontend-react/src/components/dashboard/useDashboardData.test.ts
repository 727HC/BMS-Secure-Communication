import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useDashboardData } from './useDashboardData';

const ok = (body: unknown) => ({ ok: true, status: 200, json: async () => body });
const err = (status: number, error?: string) => ({ ok: false, status, json: async () => (error ? { error } : {}) });

interface Args {
  hasDashboardAuth: boolean;
  org: string | null;
  token: string | null;
  userId: string | null;
  requestedPassportId: string | null;
}

function buildArgs(overrides: Partial<Args> = {}) {
  return {
    hasDashboardAuth: true,
    org: 'ManufacturerMSP',
    token: 'tk',
    userId: 'op1',
    requestedPassportId: null,
    searchParams: new URLSearchParams(),
    setSearchParams: vi.fn(),
    ...overrides,
  };
}

describe('useDashboardData', () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  beforeEach(() => { fetchMock = vi.fn(); vi.stubGlobal('fetch', fetchMock); });
  afterEach(() => { vi.unstubAllGlobals(); });

  it('marks all sources as denied when not authenticated', async () => {
    const { result } = renderHook(() => useDashboardData(buildArgs({ hasDashboardAuth: false, token: null })));
    await waitFor(() => expect(result.current.passportSource.error).toBe('인증 정보 없음'));
    expect(result.current.passportSource.permission).toBe('denied');
    expect(result.current.statusSource.permission).toBe('denied');
    expect(result.current.bmuSource.permission).toBe('denied');
    expect(result.current.auditSource.permission).toBe('denied');
    // no fetch should be issued
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('fetches /realtime/passports + /status on mount', async () => {
    fetchMock.mockImplementation((url: string) => {
      if (url.includes('/realtime/passports')) return Promise.resolve(ok({ records: [{ passportId: 'P1' }] }));
      if (url.includes('/status')) return Promise.resolve(ok({ fabric: 'CONNECTED' }));
      return Promise.resolve(ok({}));
    });
    const { result } = renderHook(() => useDashboardData(buildArgs()));
    await waitFor(() => expect(result.current.passports).toHaveLength(1));
    expect(result.current.platformStatus?.fabric).toBe('CONNECTED');
    expect(result.current.passportSource.error).toBeNull();
    expect(result.current.statusSource.error).toBeNull();
  });

  it('captures errorMessage on passport fetch failure', async () => {
    fetchMock.mockImplementation((url: string) => {
      if (url.includes('/realtime/passports')) return Promise.resolve(err(500, 'down'));
      return Promise.resolve(ok({ fabric: 'CONNECTED' }));
    });
    const { result } = renderHook(() => useDashboardData(buildArgs()));
    await waitFor(() => expect(result.current.passportSource.error).toBe('down'));
    expect(result.current.passports).toEqual([]);
  });

  it('auto-selects first passport when requestedPassportId is null', async () => {
    fetchMock.mockImplementation((url: string) => {
      if (url.includes('/realtime/passports')) return Promise.resolve(ok({ records: [{ passportId: 'P1' }, { passportId: 'P2' }] }));
      if (url.includes('/realtime/bmu/')) return Promise.resolve(ok({ records: [] }));
      return Promise.resolve(ok({}));
    });
    const args = buildArgs();
    const { result } = renderHook(() => useDashboardData(args));
    await waitFor(() => expect(result.current.selectedPassportId).toBe('P1'));
    // setSearchParams should have been called to write passportId=P1 to URL
    expect(args.setSearchParams).toHaveBeenCalled();
  });

  it('honors requestedPassportId when present in passport list', async () => {
    fetchMock.mockImplementation((url: string) => {
      if (url.includes('/realtime/passports')) return Promise.resolve(ok({ records: [{ passportId: 'P1' }, { passportId: 'P2' }] }));
      if (url.includes('/realtime/bmu/')) return Promise.resolve(ok({ records: [] }));
      return Promise.resolve(ok({}));
    });
    const { result } = renderHook(() => useDashboardData(buildArgs({ requestedPassportId: 'P2' })));
    await waitFor(() => expect(result.current.selectedPassportId).toBe('P2'));
  });

  it('marks audit source as denied for non-allowed orgs', async () => {
    fetchMock.mockResolvedValue(ok({ records: [] }));
    const { result } = renderHook(() => useDashboardData(buildArgs({ org: 'EVManufacturerMSP' })));
    await waitFor(() => expect(result.current.auditSource.permission).toBe('denied'));
    // /audit endpoint should not be called
    const auditCalled = fetchMock.mock.calls.some(([u]) => String(u).includes('/audit'));
    expect(auditCalled).toBe(false);
  });

  it('fetches /audit when org is in AUDIT_ALLOWED_ORGS', async () => {
    fetchMock.mockImplementation((url: string) => {
      if (url.includes('/audit')) return Promise.resolve(ok({ records: [{ id: 'a1' }] }));
      if (url.includes('/realtime/passports')) return Promise.resolve(ok({ records: [] }));
      return Promise.resolve(ok({}));
    });
    const { result } = renderHook(() => useDashboardData(buildArgs({ org: 'RegulatorMSP' })));
    await waitFor(() => expect(result.current.auditRecords).toHaveLength(1));
    expect(result.current.auditSource.error).toBeNull();
  });

  it('flags bmuSource as denied for permission errors when fetch fails', async () => {
    fetchMock.mockImplementation((url: string) => {
      if (url.includes('/realtime/passports')) return Promise.resolve(ok({ records: [{ passportId: 'P1' }] }));
      if (url.includes('/realtime/bmu/')) return Promise.resolve(err(403, 'permission denied'));
      return Promise.resolve(ok({}));
    });
    const { result } = renderHook(() => useDashboardData(buildArgs()));
    await waitFor(() => expect(result.current.bmuSource.error).toBe('permission denied'));
    expect(result.current.bmuSource.permission).toBe('denied');
  });
});
