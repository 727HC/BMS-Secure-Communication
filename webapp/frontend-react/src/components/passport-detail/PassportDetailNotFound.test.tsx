import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import PassportDetailNotFound from './PassportDetailNotFound';

describe('PassportDetailNotFound', () => {
  it('renders default subtitle when fetchError is null', () => {
    render(<PassportDetailNotFound passportId="P1" fetchError={null} onBack={vi.fn()} />);
    expect(screen.getByText('Dossier unavailable')).not.toBeNull();
    expect(screen.getByText(/요청한 여권을 찾을 수 없습니다/)).not.toBeNull();
  });

  it('uses fetchError as subtitle when provided', () => {
    render(<PassportDetailNotFound passportId="P1" fetchError="네트워크 오류" onBack={vi.fn()} />);
    expect(screen.getByText('네트워크 오류')).not.toBeNull();
  });

  it('renders the passport id badge or "ID 없음" fallback', () => {
    const { rerender } = render(<PassportDetailNotFound passportId="P9" fetchError={null} onBack={vi.fn()} />);
    expect(screen.getByText('P9')).not.toBeNull();

    rerender(<PassportDetailNotFound passportId={undefined} fetchError={null} onBack={vi.fn()} />);
    expect(screen.getByText('ID 없음')).not.toBeNull();
  });

  it('emits onBack when back button clicked', () => {
    const onBack = vi.fn();
    render(<PassportDetailNotFound passportId="P1" fetchError={null} onBack={onBack} />);
    fireEvent.click(screen.getByRole('button', { name: /여권 등록부/ }));
    expect(onBack).toHaveBeenCalled();
  });
});
