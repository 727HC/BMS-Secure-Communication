import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import BmuOperationsPage from './BmuOperationsPage';
import { AuthProvider } from '../contexts/AuthContext';

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/bmu-operations']}>
      <AuthProvider>
        <Routes>
          <Route path="/bmu-operations" element={<BmuOperationsPage />} />
          <Route path="/dashboard" element={<div data-testid="dashboard-redirect">redirected</div>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

function authAs(org: string) {
  sessionStorage.setItem('auth_token', 'tk');
  sessionStorage.setItem('auth_userId', 'alice');
  sessionStorage.setItem('auth_org', org);
}

const VALID_REASON = '2026-05-19 펌웨어 업데이트 후 BMU 보드 재부팅으로 FC 카운터가 리셋되어 재동기화가 필요합니다.';
const DEFAULT_STATUS = {
  optionB: {
    expectedResetFcCallsPerDay: 0,
    fcPattern: '0xNN000000 boot jump-start',
  },
  fcWindow: {
    status: 'normal',
    observationCount: 0,
    maxFcHex: null,
    thresholdHex: '0xf8000000',
    maxBootSlot: null,
  },
  resetFcDailyCount: 0,
  alerts: [],
};

function okJson(data: unknown) {
  return {
    ok: true,
    status: 200,
    json: async () => data,
  };
}

function findPostCall(fetchMock: ReturnType<typeof vi.fn>) {
  const call = fetchMock.mock.calls.find(([, init]) => init?.method === 'POST');
  if (!call) throw new Error('POST call not found');
  return call;
}

describe('BmuOperationsPage', () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(okJson(DEFAULT_STATUS)));
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders form when org is Manufacturer', () => {
    authAs('ManufacturerMSP');
    const { getByText, getByLabelText } = renderPage();
    expect(getByText('BMU 상태와 FC fail-safe')).not.toBeNull();
    expect(getByLabelText('대상 DID')).not.toBeNull();
  });

  it('renders form when org is Regulator', () => {
    authAs('RegulatorMSP');
    const { getByText } = renderPage();
    expect(getByText('BMU 상태와 FC fail-safe')).not.toBeNull();
  });

  it('renders Option B status and FC wrap yellow alert', async () => {
    authAs('ManufacturerMSP');
    const fetchMock = vi.fn().mockResolvedValue(okJson({
      ...DEFAULT_STATUS,
      fcWindow: {
        status: 'yellow',
        observationCount: 5,
        maxFcHex: '0xf8000001',
        thresholdHex: '0xf8000000',
        maxBootSlot: 248,
      },
      resetFcDailyCount: 1,
      alerts: [{
        id: 'A1',
        type: 'FC_WRAP_NEAR',
        severity: 'yellow',
        title: 'BMU FC 256-boot wrap 근접',
        message: '최근 24시간 max FC가 0xF8000000 이상입니다.',
        fcHex: '0xf8000001',
      }],
    }));
    vi.stubGlobal('fetch', fetchMock);

    const { findAllByText, getByText } = renderPage();

    expect((await findAllByText('0xf8000001')).length).toBeGreaterThan(0);
    expect(getByText(/BMU FC 256-boot wrap/)).not.toBeNull();
    expect(getByText('최근 24h reset-fc')).not.toBeNull();
  });

  it('redirects to dashboard when org lacks permission', () => {
    authAs('ServiceMSP');
    const { getByTestId } = renderPage();
    expect(getByTestId('dashboard-redirect')).not.toBeNull();
  });

  it('disables submit until DID confirm matches, reason >=50, and confirm checked', () => {
    authAs('ManufacturerMSP');
    const { getByLabelText, getByRole } = renderPage();
    const submitBtn = getByRole('button', { name: /FC 재동기화 실행/ }) as HTMLButtonElement;
    expect(submitBtn.disabled).toBe(true);

    fireEvent.change(getByLabelText('대상 DID'), { target: { value: 'did:web:bms:1' } });
    fireEvent.change(getByLabelText('DID 다시 입력 (오타 방지)'), { target: { value: 'did:web:bms:1' } });
    fireEvent.change(getByLabelText(/사유/), { target: { value: VALID_REASON } });
    fireEvent.click(getByLabelText(/본 작업이 chaincode lastFc를 초기화하고/));

    expect(submitBtn.disabled).toBe(false);
  });

  it('keeps submit disabled when DID confirm does not match', () => {
    authAs('ManufacturerMSP');
    const { getByLabelText, getByRole } = renderPage();
    fireEvent.change(getByLabelText('대상 DID'), { target: { value: 'did:web:bms:1' } });
    fireEvent.change(getByLabelText('DID 다시 입력 (오타 방지)'), { target: { value: 'did:web:bms:2' } });
    fireEvent.change(getByLabelText(/사유/), { target: { value: VALID_REASON } });
    fireEvent.click(getByLabelText(/본 작업이 chaincode lastFc를 초기화하고/));
    expect((getByRole('button', { name: /FC 재동기화 실행/ }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('POSTs /api/bmu/reset-fc with did, reason, confirm:true on submit', async () => {
    authAs('ManufacturerMSP');
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(okJson(DEFAULT_STATUS))
      .mockResolvedValueOnce(okJson({ success: true, did: 'did:web:bms:1', status: 'FC_RESET' }));
    vi.stubGlobal('fetch', fetchMock);

    const { getByLabelText, getByRole, findByText } = renderPage();
    fireEvent.change(getByLabelText('대상 DID'), { target: { value: 'did:web:bms:1' } });
    fireEvent.change(getByLabelText('DID 다시 입력 (오타 방지)'), { target: { value: 'did:web:bms:1' } });
    fireEvent.change(getByLabelText(/사유/), { target: { value: VALID_REASON } });
    fireEvent.click(getByLabelText(/본 작업이 chaincode lastFc를 초기화하고/));
    fireEvent.click(getByRole('button', { name: /FC 재동기화 실행/ }));

    await waitFor(() => expect(fetchMock.mock.calls.some(([, init]) => init?.method === 'POST')).toBe(true));
    const [url, init] = findPostCall(fetchMock);
    expect(String(url)).toContain('/api/bmu/reset-fc');
    expect(init.method).toBe('POST');
    const sent = JSON.parse(init.body);
    expect(sent.did).toBe('did:web:bms:1');
    expect(sent.reason).toBe(VALID_REASON);
    expect(sent.confirm).toBe(true);
    expect(sent.expected_next_fc).toBeUndefined();
    expect(await findByText(/재동기화 완료/)).not.toBeNull();
  });

  it('includes expected_next_fc when provided as non-negative integer', async () => {
    authAs('ManufacturerMSP');
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(okJson(DEFAULT_STATUS))
      .mockResolvedValueOnce(okJson({ success: true, did: 'did:web:bms:1', status: 'FC_RESET' }));
    vi.stubGlobal('fetch', fetchMock);

    const { getByLabelText, getByRole } = renderPage();
    fireEvent.change(getByLabelText('대상 DID'), { target: { value: 'did:web:bms:1' } });
    fireEvent.change(getByLabelText('DID 다시 입력 (오타 방지)'), { target: { value: 'did:web:bms:1' } });
    fireEvent.change(getByLabelText(/사유/), { target: { value: VALID_REASON } });
    fireEvent.change(getByLabelText(/expected_next_fc/), { target: { value: '42' } });
    fireEvent.click(getByLabelText(/본 작업이 chaincode lastFc를 초기화하고/));
    fireEvent.click(getByRole('button', { name: /FC 재동기화 실행/ }));

    await waitFor(() => expect(fetchMock.mock.calls.some(([, init]) => init?.method === 'POST')).toBe(true));
    const sent = JSON.parse(findPostCall(fetchMock)[1].body);
    expect(sent.expected_next_fc).toBe(42);
  });

  it('shows API error message when server rejects', async () => {
    authAs('ManufacturerMSP');
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(okJson(DEFAULT_STATUS))
      .mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: async () => ({ error: 'rate limit exceeded' }),
      });
    vi.stubGlobal('fetch', fetchMock);

    const { getByLabelText, getByRole, findByText } = renderPage();
    fireEvent.change(getByLabelText('대상 DID'), { target: { value: 'did:web:bms:1' } });
    fireEvent.change(getByLabelText('DID 다시 입력 (오타 방지)'), { target: { value: 'did:web:bms:1' } });
    fireEvent.change(getByLabelText(/사유/), { target: { value: VALID_REASON } });
    fireEvent.click(getByLabelText(/본 작업이 chaincode lastFc를 초기화하고/));
    fireEvent.click(getByRole('button', { name: /FC 재동기화 실행/ }));

    expect(await findByText(/rate limit exceeded/)).not.toBeNull();
  });

  // C1: 네트워크 에러 → 에러 메시지 표시, 필드 값 보존
  it('shows network error message and preserves form fields for retry', async () => {
    authAs('ManufacturerMSP');
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(okJson(DEFAULT_STATUS))
      .mockRejectedValueOnce(new TypeError('Failed to fetch'));
    vi.stubGlobal('fetch', fetchMock);

    const { getByLabelText, getByRole, findByText } = renderPage();
    fireEvent.change(getByLabelText('대상 DID'), { target: { value: 'did:web:bms:1' } });
    fireEvent.change(getByLabelText('DID 다시 입력 (오타 방지)'), { target: { value: 'did:web:bms:1' } });
    fireEvent.change(getByLabelText(/사유/), { target: { value: VALID_REASON } });
    fireEvent.click(getByLabelText(/본 작업이 chaincode lastFc를 초기화하고/));
    fireEvent.click(getByRole('button', { name: /FC 재동기화 실행/ }));

    // 에러 메시지 표시
    expect(await findByText(/Failed to fetch/)).not.toBeNull();

    // 필드 값 보존 (clear 안 됨)
    expect((getByLabelText('대상 DID') as HTMLInputElement).value).toBe('did:web:bms:1');
    expect((getByLabelText('DID 다시 입력 (오타 방지)') as HTMLInputElement).value).toBe('did:web:bms:1');
    expect((getByLabelText(/사유/) as HTMLTextAreaElement).value).toBe(VALID_REASON);
    expect((getByLabelText(/본 작업이 chaincode lastFc를 초기화하고/) as HTMLInputElement).checked).toBe(true);
  });

  // C3: reason 글자 카운터 — 49자 → disabled, 50자 → enabled
  it('disables submit at 49 chars and enables at 50 chars reason boundary', () => {
    authAs('ManufacturerMSP');
    const { getByLabelText, getByRole } = renderPage();

    const did = 'did:web:bms:1';
    fireEvent.change(getByLabelText('대상 DID'), { target: { value: did } });
    fireEvent.change(getByLabelText('DID 다시 입력 (오타 방지)'), { target: { value: did } });
    fireEvent.click(getByLabelText(/본 작업이 chaincode lastFc를 초기화하고/));

    const submitBtn = getByRole('button', { name: /FC 재동기화 실행/ }) as HTMLButtonElement;

    // 49자: submit disabled
    const reason49 = 'a'.repeat(49);
    fireEvent.change(getByLabelText(/사유/), { target: { value: reason49 } });
    expect(submitBtn.disabled).toBe(true);

    // 50자: submit enabled
    const reason50 = 'a'.repeat(50);
    fireEvent.change(getByLabelText(/사유/), { target: { value: reason50 } });
    expect(submitBtn.disabled).toBe(false);
  });
});
