import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import PassportDetailTabNav from './PassportDetailTabNav';

describe('PassportDetailTabNav', () => {
  it('renders all 5 tabs in order', () => {
    render(<PassportDetailTabNav activeTab="identity" onTabChange={vi.fn()} />);
    const buttons = screen.getAllByRole('button');
    expect(buttons.map((b) => b.textContent)).toEqual([
      '개요', '규제·소재', '운영 이력', '진단 데이터', '증빙',
    ]);
  });

  it('marks activeTab with active class', () => {
    render(<PassportDetailTabNav activeTab="trust" onTabChange={vi.fn()} />);
    const trustBtn = screen.getByText('증빙');
    expect(trustBtn.className).toContain('active');
    const identityBtn = screen.getByText('개요');
    expect(identityBtn.className).not.toContain('active');
  });

  it('emits onTabChange with the clicked tab key', () => {
    const onTabChange = vi.fn();
    render(<PassportDetailTabNav activeTab="identity" onTabChange={onTabChange} />);
    fireEvent.click(screen.getByText('규제·소재'));
    expect(onTabChange).toHaveBeenCalledWith('compliance');
    fireEvent.click(screen.getByText('진단 데이터'));
    expect(onTabChange).toHaveBeenCalledWith('data');
  });
});
