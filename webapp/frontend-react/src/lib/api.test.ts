import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, MSP, MSP_LABELS, api } from './api';

describe('api', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    sessionStorage.clear();
    localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function ok(body: unknown) {
    return { ok: true, status: 200, json: async () => body };
  }
  function err(status: number, body: unknown = null) {
    return { ok: false, status, json: async () => body };
  }

  it('GET prefixes path with /api and parses JSON', async () => {
    fetchMock.mockResolvedValue(ok({ ping: 'pong' }));
    const res = await api.get<{ ping: string }>('/health');
    expect(res.ping).toBe('pong');
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url).endsWith('/api/health')).toBe(true);
    expect((init as RequestInit).method).toBe('GET');
    expect((init as RequestInit).body).toBeUndefined();
  });

  it('POST sends JSON body with Content-Type header', async () => {
    fetchMock.mockResolvedValue(ok({ created: true }));
    await api.post('/things', { a: 1 });
    const [, init] = fetchMock.mock.calls[0];
    const headers = (init as RequestInit).headers as Record<string, string>;
    expect(headers['Content-Type']).toBe('application/json');
    expect((init as RequestInit).method).toBe('POST');
    expect((init as RequestInit).body).toBe(JSON.stringify({ a: 1 }));
  });

  it('PUT and DELETE both invoke fetch with corresponding method', async () => {
    fetchMock.mockResolvedValue(ok({}));
    await api.put('/x', { y: 1 });
    await api.delete('/x');
    expect((fetchMock.mock.calls[0][1] as RequestInit).method).toBe('PUT');
    expect((fetchMock.mock.calls[1][1] as RequestInit).method).toBe('DELETE');
  });

  it('attaches Bearer token from sessionStorage when present', async () => {
    sessionStorage.setItem('auth_token', 'sess-token');
    fetchMock.mockResolvedValue(ok({}));
    await api.get('/x');
    const headers = (fetchMock.mock.calls[0][1] as RequestInit).headers as Record<string, string>;
    expect(headers['Authorization']).toBe('Bearer sess-token');
  });

  it('falls back to localStorage token when sessionStorage empty', async () => {
    localStorage.setItem('auth_token', 'local-token');
    fetchMock.mockResolvedValue(ok({}));
    await api.get('/x');
    const headers = (fetchMock.mock.calls[0][1] as RequestInit).headers as Record<string, string>;
    expect(headers['Authorization']).toBe('Bearer local-token');
  });

  it('omits Authorization header when no token stored', async () => {
    fetchMock.mockResolvedValue(ok({}));
    await api.get('/x');
    const headers = (fetchMock.mock.calls[0][1] as RequestInit).headers as Record<string, string>;
    expect(headers['Authorization']).toBeUndefined();
  });

  it('returns undefined for 204 No Content', async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 204, json: async () => null });
    const res = await api.delete('/x');
    expect(res).toBeUndefined();
  });

  it('throws ApiError on non-2xx with error+category from body', async () => {
    fetchMock.mockResolvedValue(err(403, { error: '권한 없음', category: 'AUTHZ' }));
    await expect(api.get('/x')).rejects.toMatchObject({
      name: 'ApiError', status: 403, message: '권한 없음', category: 'AUTHZ',
    });
  });

  it('falls back to "HTTP {status}" when error body is missing', async () => {
    fetchMock.mockResolvedValue({
      ok: false, status: 500, json: async () => { throw new Error('not json'); },
    });
    await expect(api.get('/x')).rejects.toMatchObject({ status: 500, message: 'HTTP 500' });
  });

  it('ApiError instance has correct name', async () => {
    fetchMock.mockResolvedValue(err(404, { error: 'not found' }));
    try {
      await api.get('/x');
    } catch (e) {
      expect(e).toBeInstanceOf(ApiError);
      expect((e as ApiError).name).toBe('ApiError');
    }
  });

  it('exposes MSP constants and labels', () => {
    expect(MSP.Manufacturer).toBe('ManufacturerMSP');
    expect(MSP.Regulator).toBe('RegulatorMSP');
    expect(MSP_LABELS.ManufacturerMSP).toBe('제조사');
    expect(MSP_LABELS.RegulatorMSP).toBe('검증기관');
  });
});
