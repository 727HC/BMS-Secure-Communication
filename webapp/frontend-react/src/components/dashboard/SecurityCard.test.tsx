import type { ComponentProps } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render } from '@testing-library/react';
import SecurityCard from './SecurityCard';
import type { SecurityRowViewModel } from './lib';

const sampleRows: SecurityRowViewModel[] = [
  { label: 'TLS', value: '활성', tone: 'green', icon: 'lock' },
  { label: 'Identity', value: 'Aries DID', tone: 'blue', icon: 'shield' },
  { label: 'KMS', value: 'HSM', tone: 'amber', icon: 'key' },
];

function build(overrides: Partial<ComponentProps<typeof SecurityCard>> = {}) {
  return {
    securityRows: sampleRows,
    canReadAudit: true,
    onNavigate: vi.fn(),
    ...overrides,
  };
}

describe('SecurityCard', () => {
  it('renders title and subtitle', () => {
    const { getByText } = render(<SecurityCard {...build()} />);
    expect(getByText('보안 상태')).not.toBeNull();
    expect(getByText('플랫폼 보안 기준값')).not.toBeNull();
  });

  it('renders one tile per row with label and value', () => {
    const { getByText, container } = render(<SecurityCard {...build()} />);
    expect(getByText('TLS')).not.toBeNull();
    expect(getByText('활성')).not.toBeNull();
    expect(getByText('Identity')).not.toBeNull();
    expect(getByText('KMS')).not.toBeNull();
    expect(container.querySelectorAll('.vk-sec').length).toBe(3);
  });

  it('applies tone class per row', () => {
    const { container } = render(<SecurityCard {...build()} />);
    expect(container.querySelector('.vk-sec--green')).not.toBeNull();
    expect(container.querySelector('.vk-sec--blue')).not.toBeNull();
    expect(container.querySelector('.vk-sec--amber')).not.toBeNull();
  });

  it('disables 상세 보기 button + shows 권한 필요 when canReadAudit=false', () => {
    const { getByText } = render(<SecurityCard {...build({ canReadAudit: false })} />);
    const btn = getByText('권한 필요').closest('button') as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });

  it('emits onNavigate(/audit-log) when 상세 보기 clicked', () => {
    const props = build();
    const { getByText } = render(<SecurityCard {...props} />);
    fireEvent.click(getByText('상세 보기').closest('button') as HTMLButtonElement);
    expect(props.onNavigate).toHaveBeenCalledWith('/audit-log');
  });
});
