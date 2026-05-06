import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, waitFor } from '@testing-library/react';
import VcVerifyModal from './VcVerifyModal';

const apiGetMock = vi.fn();

vi.mock('../../../lib/api', () => ({
  api: {
    get: (path: string) => apiGetMock(path),
  },
}));

describe('VcVerifyModal', () => {
  beforeEach(() => apiGetMock.mockReset());
  afterEach(() => vi.clearAllMocks());

  it('renders nothing when closed', () => {
    const { container } = render(<VcVerifyModal open={false} credentialId="VC-1" onClose={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });

  it('does not call api.get when credentialId is null', () => {
    render(<VcVerifyModal open={true} credentialId={null} onClose={vi.fn()} />);
    expect(apiGetMock).not.toHaveBeenCalled();
  });

  it('calls api.get with encoded credentialId on open', () => {
    apiGetMock.mockResolvedValue({ valid: true, credType: 'GBA', issuerMsp: 'RegMSP' });
    render(<VcVerifyModal open={true} credentialId="VC/1" onClose={vi.fn()} />);
    expect(apiGetMock).toHaveBeenCalledWith('/vc/verify/VC%2F1');
  });

  it('renders valid result with credType + issuerMsp', async () => {
    apiGetMock.mockResolvedValue({ valid: true, credType: 'GBA', issuerMsp: 'RegMSP', issuedAt: '2026-04-01T00:00:00Z' });
    const { findByText, getByText } = render(<VcVerifyModal open={true} credentialId="VC1" onClose={vi.fn()} />);
    expect(await findByText('유효한 증명서입니다')).not.toBeNull();
    expect(getByText('GBA')).not.toBeNull();
    expect(getByText('RegMSP')).not.toBeNull();
  });

  it('renders invalid result with revoked details when reason=revoked', async () => {
    apiGetMock.mockResolvedValue({
      valid: false,
      reason: 'revoked',
      revokedAt: '2026-05-01T00:00:00Z',
      revocationReason: '데이터 오류',
      credType: 'GBA',
    });
    const { findByText, getByText } = render(<VcVerifyModal open={true} credentialId="VC1" onClose={vi.fn()} />);
    expect(await findByText('유효하지 않은 증명서입니다')).not.toBeNull();
    expect(getByText('데이터 오류')).not.toBeNull();
  });

  it('emits onClose on 확인 click', async () => {
    apiGetMock.mockResolvedValue({ valid: true });
    const onClose = vi.fn();
    const { getByText } = render(<VcVerifyModal open={true} credentialId="VC1" onClose={onClose} />);
    await waitFor(() => expect(apiGetMock).toHaveBeenCalled());
    fireEvent.click(getByText('확인'));
    expect(onClose).toHaveBeenCalled();
  });
});
