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

describe('BmuOperationsPage', () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders form when org is Manufacturer', () => {
    authAs('ManufacturerMSP');
    const { getByText, getByLabelText } = renderPage();
    expect(getByText('FC 재동기화')).not.toBeNull();
    expect(getByLabelText('대상 DID')).not.toBeNull();
  });

  it('renders form when org is Regulator', () => {
    authAs('RegulatorMSP');
    const { getByText } = renderPage();
    expect(getByText('FC 재동기화')).not.toBeNull();
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
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: true, did: 'did:web:bms:1', status: 'FC_RESET' }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const { getByLabelText, getByRole, findByText } = renderPage();
    fireEvent.change(getByLabelText('대상 DID'), { target: { value: 'did:web:bms:1' } });
    fireEvent.change(getByLabelText('DID 다시 입력 (오타 방지)'), { target: { value: 'did:web:bms:1' } });
    fireEvent.change(getByLabelText(/사유/), { target: { value: VALID_REASON } });
    fireEvent.click(getByLabelText(/본 작업이 chaincode lastFc를 초기화하고/));
    fireEvent.click(getByRole('button', { name: /FC 재동기화 실행/ }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const [url, init] = fetchMock.mock.calls[0];
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
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: true, did: 'did:web:bms:1', status: 'FC_RESET' }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const { getByLabelText, getByRole } = renderPage();
    fireEvent.change(getByLabelText('대상 DID'), { target: { value: 'did:web:bms:1' } });
    fireEvent.change(getByLabelText('DID 다시 입력 (오타 방지)'), { target: { value: 'did:web:bms:1' } });
    fireEvent.change(getByLabelText(/사유/), { target: { value: VALID_REASON } });
    fireEvent.change(getByLabelText(/expected_next_fc/), { target: { value: '42' } });
    fireEvent.click(getByLabelText(/본 작업이 chaincode lastFc를 초기화하고/));
    fireEvent.click(getByRole('button', { name: /FC 재동기화 실행/ }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const sent = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(sent.expected_next_fc).toBe(42);
  });

  it('shows API error message when server rejects', async () => {
    authAs('ManufacturerMSP');
    const fetchMock = vi.fn().mockResolvedValue({
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
});
