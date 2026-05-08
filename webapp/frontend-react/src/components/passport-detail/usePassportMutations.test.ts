import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { usePassportMutations } from './usePassportMutations';

const ok = (body: unknown = {}) => ({ ok: true, status: 200, json: async () => body });
const err = (status: number, error?: string) => ({ ok: false, status, json: async () => (error ? { error } : {}) });

describe('usePassportMutations', () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  beforeEach(() => { fetchMock = vi.fn(); vi.stubGlobal('fetch', fetchMock); });
  afterEach(() => { vi.unstubAllGlobals(); });

  function setup(passportId: string | null = 'P1', selectedVcId: string | null = null) {
    const onAfterSuccess = vi.fn();
    const onClose = vi.fn();
    const passport = passportId ? { passportId, did: `did:web:bms:${passportId}` } : null;
    const { result } = renderHook(() =>
      usePassportMutations({ passport, selectedVcId, onAfterSuccess, onClose })
    );
    return { result, onAfterSuccess, onClose };
  }

  it('no-ops when passport.passportId is missing', async () => {
    const { result, onAfterSuccess } = setup(null);
    await act(async () => {
      await result.current.handlers.onBind({ vin: 'V' } as any);
    });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(onAfterSuccess).not.toHaveBeenCalled();
  });

  it('onBind PUTs to /passports/:id/bind', async () => {
    fetchMock.mockResolvedValue(ok());
    const { result, onClose, onAfterSuccess } = setup('P1');
    await act(async () => { await result.current.handlers.onBind({ vin: 'VIN1' } as any); });
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain('/passports/P1/bind');
    expect((init as RequestInit).method).toBe('PUT');
    expect(JSON.parse((init as { body: string }).body)).toEqual({ vin: 'VIN1' });
    expect(onClose).toHaveBeenCalled();
    expect(onAfterSuccess).toHaveBeenCalled();
  });

  it('onMaintenanceRequest POSTs to /maintenance/:id/request', async () => {
    fetchMock.mockResolvedValue(ok());
    const { result } = setup('P2');
    await act(async () => {
      await result.current.handlers.onMaintenanceRequest({ maintenanceType: 'routine', description: 'd' } as any);
    });
    expect(String(fetchMock.mock.calls[0][0])).toContain('/maintenance/P2/request');
  });

  it('onMaintenanceLog POSTs to /maintenance/:id/log', async () => {
    fetchMock.mockResolvedValue(ok());
    const { result } = setup('P3');
    await act(async () => {
      await result.current.handlers.onMaintenanceLog({ maintenanceType: 'r', description: 'd', technician: 't' } as any);
    });
    expect(String(fetchMock.mock.calls[0][0])).toContain('/maintenance/P3/log');
  });

  it('onAnalysisRequest POSTs to /analysis/:id/request with empty body', async () => {
    fetchMock.mockResolvedValue(ok());
    const { result } = setup('P4');
    await act(async () => { await result.current.handlers.onAnalysisRequest(); });
    expect(String(fetchMock.mock.calls[0][0])).toContain('/analysis/P4/request');
  });

  it('onAnalysisResult coerces form numbers via Number()', async () => {
    fetchMock.mockResolvedValue(ok());
    const { result } = setup('P5');
    await act(async () => {
      await result.current.handlers.onAnalysisResult({
        soh: '85', soce: '90', remainingLifeCycle: '500', recycleAvailable: true,
      } as any);
    });
    const body = JSON.parse((fetchMock.mock.calls[0][1] as { body: string }).body);
    expect(body).toEqual({ soh: 85, soce: 90, remainingLifeCycle: 500, recycleAvailable: true });
  });

  it('onDispose POSTs to /recycling/:id/dispose', async () => {
    fetchMock.mockResolvedValue(ok());
    const { result } = setup('P6');
    await act(async () => { await result.current.handlers.onDispose(); });
    expect(String(fetchMock.mock.calls[0][0])).toContain('/recycling/P6/dispose');
  });

  it('onCorrect POSTs to /passports/:id/correct', async () => {
    fetchMock.mockResolvedValue(ok());
    const { result } = setup('P7');
    await act(async () => { await result.current.handlers.onCorrect({ field: 'model', value: 'X' } as any); });
    expect(String(fetchMock.mock.calls[0][0])).toContain('/passports/P7/correct');
  });

  it('onVcIssue pins holderDid to passport.did and converts date-only expiry to RFC3339', async () => {
    fetchMock.mockResolvedValue(ok());
    const { result } = setup('P8');
    await act(async () => {
      await result.current.handlers.onVcIssue({
        credType: 'cert',
        issuerMsp: 'MSP',
        holderDid: 'did:web:wrong-owner',
        expiresAt: '2026-05-08',
      } as any);
    });
    expect(String(fetchMock.mock.calls[0][0])).toContain('/vc/issue');
    const body = JSON.parse((fetchMock.mock.calls[0][1] as { body: string }).body);
    expect(body).toEqual({
      passportId: 'P8',
      credType: 'cert',
      issuerMsp: 'MSP',
      holderDid: 'did:web:bms:P8',
      expiresAt: '2026-05-08T00:00:00Z',
    });
  });

  it('onVcRequest POSTs only credType (not other fields)', async () => {
    fetchMock.mockResolvedValue(ok());
    const { result } = setup('P9');
    await act(async () => {
      await result.current.handlers.onVcRequest({ credType: 'cert', extraField: 'ignored' } as any);
    });
    const body = JSON.parse((fetchMock.mock.calls[0][1] as { body: string }).body);
    expect(body).toEqual({ passportId: 'P9', credType: 'cert' });
  });

  it('onVcApprove POSTs to /vc/request/:requestId/approve (URL encoded)', async () => {
    fetchMock.mockResolvedValue(ok());
    const { result } = setup('P10');
    await act(async () => { await result.current.handlers.onVcApprove({ requestId: 'req 1' } as any); });
    expect(String(fetchMock.mock.calls[0][0])).toContain('/vc/request/req%201/approve');
  });

  it('onVcReject POSTs reason in body', async () => {
    fetchMock.mockResolvedValue(ok());
    const { result } = setup('P11');
    await act(async () => { await result.current.handlers.onVcReject({ requestId: 'r1', reason: 'no' } as any); });
    expect(String(fetchMock.mock.calls[0][0])).toContain('/vc/request/r1/reject');
    const body = JSON.parse((fetchMock.mock.calls[0][1] as { body: string }).body);
    expect(body).toEqual({ reason: 'no' });
  });

  it('onVcRevoke uses selectedVcId, no-ops when null', async () => {
    fetchMock.mockResolvedValue(ok());
    const { result: noVc } = setup('P12', null);
    await act(async () => { await noVc.current.handlers.onVcRevoke({ reason: 'r' } as any); });
    expect(fetchMock).not.toHaveBeenCalled();

    const { result: hasVc } = setup('P12', 'vc1');
    await act(async () => { await hasVc.current.handlers.onVcRevoke({ reason: 'fraud' } as any); });
    const body = JSON.parse((fetchMock.mock.calls[0][1] as { body: string }).body);
    expect(body).toEqual({ credentialId: 'vc1', reason: 'fraud' });
  });

  it('onRegulatoryVerification splits evidenceIds CSV and trims empties', async () => {
    fetchMock.mockResolvedValue(ok());
    const { result } = setup('P13');
    await act(async () => {
      await result.current.handlers.onRegulatoryVerification({
        status: 'VERIFIED', evidenceIds: 'e1, e2 ,, e3 ',
      } as any);
    });
    const body = JSON.parse((fetchMock.mock.calls[0][1] as { body: string }).body);
    expect(body).toEqual({ status: 'VERIFIED', evidenceIds: ['e1', 'e2', 'e3'] });
  });

  it('onPhysicalVerification packages signals into nested object', async () => {
    fetchMock.mockResolvedValue(ok());
    const { result } = setup('P14');
    await act(async () => {
      await result.current.handlers.onPhysicalVerification({
        socMatched: true,
        didMatched: false,
        vinMatched: true,
        fcMatched: false,
        bmsIdentifierMatched: true,
        reason: 'r',
      } as any);
    });
    const body = JSON.parse((fetchMock.mock.calls[0][1] as { body: string }).body);
    expect(body).toEqual({
      signals: {
        socMatched: true,
        didMatched: false,
        vinMatched: true,
        fcMatched: false,
        bmsIdentifierMatched: true,
      },
      reason: 'r',
    });
  });

  it('captures submitError when fetch fails', async () => {
    fetchMock.mockResolvedValue(err(500, 'down'));
    const { result, onClose } = setup('P15');
    await act(async () => { await result.current.handlers.onDispose(); });
    expect(onClose).not.toHaveBeenCalled();
    expect(result.current.submitError).toBeTruthy();
  });
});
