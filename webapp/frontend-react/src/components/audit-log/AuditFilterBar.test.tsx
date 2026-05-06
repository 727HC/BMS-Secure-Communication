import type { ComponentProps } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render } from '@testing-library/react';
import AuditFilterBar from './AuditFilterBar';
import { ACTION_OPTIONS } from './lib';

function renderBar(overrides: Partial<ComponentProps<typeof AuditFilterBar>> = {}) {
  const props = {
    filterAction: '',
    onActionChange: vi.fn(),
    filterWriteOnly: false,
    onWriteOnlyChange: vi.fn(),
    total: 100,
    logsCount: 25,
    ...overrides,
  };
  const utils = render(<AuditFilterBar {...props} />);
  return { ...utils, props };
}

describe('AuditFilterBar', () => {
  it('renders one option per ACTION_OPTIONS entry', () => {
    const { container } = renderBar();
    const options = container.querySelectorAll('option');
    expect(options.length).toBe(ACTION_OPTIONS.length);
    expect((options[0] as HTMLOptionElement).textContent).toBe('전체');
  });

  it('emits onActionChange when select changes', () => {
    const { container, props } = renderBar();
    const select = container.querySelector('select') as HTMLSelectElement;
    fireEvent.change(select, { target: { value: 'CREATE_PASSPORT' } });
    expect(props.onActionChange).toHaveBeenCalledWith('CREATE_PASSPORT');
  });

  it('emits onWriteOnlyChange when checkbox toggled', () => {
    const { container, props } = renderBar();
    const checkbox = container.querySelector('input[type="checkbox"]') as HTMLInputElement;
    fireEvent.click(checkbox);
    expect(props.onWriteOnlyChange).toHaveBeenCalledWith(true);
  });

  it('reflects filterWriteOnly state in checkbox', () => {
    const { container } = renderBar({ filterWriteOnly: true });
    const checkbox = container.querySelector('input[type="checkbox"]') as HTMLInputElement;
    expect(checkbox.checked).toBe(true);
  });

  it('renders total count text', () => {
    const { getByText } = renderBar({ total: 1234 });
    expect(getByText(/총 1234건/)).not.toBeNull();
  });

  it('shows ALL when filterAction is empty in stamp row', () => {
    const { getByText } = renderBar({ filterAction: '' });
    expect(getByText(/action ALL/)).not.toBeNull();
  });

  it('shows current action in stamp row', () => {
    const { getByText } = renderBar({ filterAction: 'CREATE_PASSPORT' });
    expect(getByText(/action CREATE_PASSPORT/)).not.toBeNull();
  });

  it('shows writeOnly true/false in stamp row', () => {
    const { getByText, rerender } = renderBar({ filterWriteOnly: true });
    expect(getByText(/writeOnly true/)).not.toBeNull();
    rerender(<AuditFilterBar filterAction="" onActionChange={vi.fn()} filterWriteOnly={false} onWriteOnlyChange={vi.fn()} total={0} logsCount={0} />);
    expect(getByText(/writeOnly false/)).not.toBeNull();
  });

  it('renders displayed logsCount in stamp row', () => {
    const { getByText } = renderBar({ logsCount: 7 });
    expect(getByText(/표시 7/)).not.toBeNull();
  });
});
