import type { ComponentProps } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render } from '@testing-library/react';
import AlertCard from './AlertCard';
import type { AlertRowViewModel } from './lib';

const sampleRows: AlertRowViewModel[] = [
  { key: 'a1', message: 'SOH 임계 초과', source: 'P1', severity: 'High', time: '5분 전', navigable: true },
  { key: 'a2', message: '플랫폼 상태 조회 실패', source: 'down', severity: 'High', time: '현재' },
];

function build(overrides: Partial<ComponentProps<typeof AlertCard>> = {}) {
  return {
    alertRows: sampleRows,
    canReadAudit: true,
    onNavigate: vi.fn(),
    onPassportClick: vi.fn(),
    ...overrides,
  };
}

describe('AlertCard', () => {
  it('renders alert count badge with rows length', () => {
    const { container } = render(<AlertCard {...build()} />);
    const count = container.querySelector('.vk-card__count');
    expect(count?.textContent).toBe('2');
  });

  it('renders empty caption when no alerts', () => {
    const { getByText } = render(<AlertCard {...build({ alertRows: [] })} />);
    expect(getByText('표시할 알림이 없습니다')).not.toBeNull();
  });

  it('renders message + source + severity per row', () => {
    const { getByText, getAllByText } = render(<AlertCard {...build()} />);
    expect(getByText('SOH 임계 초과')).not.toBeNull();
    expect(getByText('P1')).not.toBeNull();
    // High shown twice (severity + status)
    expect(getAllByText('High').length).toBeGreaterThanOrEqual(2);
  });

  it('disables 전체 알림 보기 button when canReadAudit=false and shows 권한 필요', () => {
    const { getByText } = render(<AlertCard {...build({ canReadAudit: false })} />);
    const btn = getByText('권한 필요').closest('button') as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });

  it('emits onNavigate(/audit-log) when 전체 알림 보기 clicked', () => {
    const props = build();
    const { getByText } = render(<AlertCard {...props} />);
    fireEvent.click(getByText('전체 알림 보기').closest('button') as HTMLButtonElement);
    expect(props.onNavigate).toHaveBeenCalledWith('/audit-log');
  });

  it('emits onPassportClick when navigable row clicked', () => {
    const props = build();
    const { getByText } = render(<AlertCard {...props} />);
    fireEvent.click(getByText('SOH 임계 초과'));
    expect(props.onPassportClick).toHaveBeenCalledWith('P1');
  });

  it('does not emit onPassportClick for non-navigable rows', () => {
    const props = build();
    const { getByText } = render(<AlertCard {...props} />);
    fireEvent.click(getByText('플랫폼 상태 조회 실패'));
    expect(props.onPassportClick).not.toHaveBeenCalled();
  });

  it('row has role=button only when navigable', () => {
    const { container } = render(<AlertCard {...build()} />);
    const buttonRows = container.querySelectorAll('li[role="button"]');
    expect(buttonRows.length).toBe(1); // only first row navigable
  });

  it('emits onPassportClick on Enter key on navigable row', () => {
    const props = build();
    const { container } = render(<AlertCard {...props} />);
    const row = container.querySelector('li[role="button"]') as HTMLElement;
    fireEvent.keyDown(row, { key: 'Enter' });
    expect(props.onPassportClick).toHaveBeenCalledWith('P1');
  });
});
