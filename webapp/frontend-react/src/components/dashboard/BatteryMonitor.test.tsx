import type { ComponentProps } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render } from '@testing-library/react';
import BatteryMonitor from './BatteryMonitor';
import type { FleetGaugeViewModel, PassportOptionViewModel } from './lib';

const passports: PassportOptionViewModel[] = [
  { id: 'P1', label: 'P1 — VIN1', status: 'ACTIVE' },
  { id: 'P2', label: 'P2 — VIN2', status: 'MAINTENANCE' },
];

const gauges: FleetGaugeViewModel[] = [
  { label: 'SOC', value: '75%', tone: 'green' },
  { label: 'SOH', value: '90%', tone: 'blue' },
];

function build(overrides: Partial<ComponentProps<typeof BatteryMonitor>> = {}) {
  return {
    selectedPassportLabel: 'P1',
    selectedPassportId: 'P1',
    selectorTitle: '배터리를 선택하세요',
    selectorButtonLabel: 'P1',
    selectorDisabled: false,
    passportOptions: passports,
    onPassportSelect: vi.fn(),
    fleetGauges: gauges,
    ...overrides,
  };
}

describe('BatteryMonitor', () => {
  it('renders selectedPassportLabel in subtitle', () => {
    const { getByText } = render(<BatteryMonitor {...build({ selectedPassportLabel: 'BAT-X' })} />);
    expect(getByText(/Viewing: BAT-X/)).not.toBeNull();
  });

  it('renders selector button with label and disabled state', () => {
    const { container } = render(<BatteryMonitor {...build({ selectorDisabled: true, selectorButtonLabel: '선택 없음' })} />);
    const btn = container.querySelector('button.vk-selectbtn') as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
    expect(btn.textContent).toContain('선택 없음');
  });

  it('does not render menu by default (collapsed)', () => {
    const { container } = render(<BatteryMonitor {...build()} />);
    expect(container.querySelector('[role="listbox"]')).toBeNull();
  });

  it('opens menu when selector button is clicked', () => {
    const { container } = render(<BatteryMonitor {...build()} />);
    fireEvent.click(container.querySelector('button.vk-selectbtn') as HTMLButtonElement);
    expect(container.querySelector('[role="listbox"]')).not.toBeNull();
  });

  it('renders one option per passportOption when menu open', () => {
    const { container, getByText } = render(<BatteryMonitor {...build()} />);
    fireEvent.click(container.querySelector('button.vk-selectbtn') as HTMLButtonElement);
    expect(getByText('P1 — VIN1')).not.toBeNull();
    expect(getByText('P2 — VIN2')).not.toBeNull();
    expect(container.querySelectorAll('[role="option"]').length).toBe(2);
  });

  it('emits onPassportSelect on option click and closes menu', () => {
    const props = build();
    const { container, getByText } = render(<BatteryMonitor {...props} />);
    fireEvent.click(container.querySelector('button.vk-selectbtn') as HTMLButtonElement);
    fireEvent.click(getByText('P2 — VIN2'));
    expect(props.onPassportSelect).toHaveBeenCalledWith('P2');
    expect(container.querySelector('[role="listbox"]')).toBeNull();
  });

  it('marks selected option with aria-selected=true', () => {
    const { container } = render(<BatteryMonitor {...build({ selectedPassportId: 'P2' })} />);
    fireEvent.click(container.querySelector('button.vk-selectbtn') as HTMLButtonElement);
    const opts = container.querySelectorAll('[role="option"]');
    expect(opts[0].getAttribute('aria-selected')).toBe('false');
    expect(opts[1].getAttribute('aria-selected')).toBe('true');
  });

  it('emits onPassportSelect on Enter key on option', () => {
    const props = build();
    const { container } = render(<BatteryMonitor {...props} />);
    fireEvent.click(container.querySelector('button.vk-selectbtn') as HTMLButtonElement);
    fireEvent.keyDown(container.querySelectorAll('[role="option"]')[0] as HTMLElement, { key: 'Enter' });
    expect(props.onPassportSelect).toHaveBeenCalledWith('P1');
  });

  it('closes menu on Escape key on selector button', () => {
    const { container } = render(<BatteryMonitor {...build()} />);
    const btn = container.querySelector('button.vk-selectbtn') as HTMLButtonElement;
    fireEvent.click(btn);
    expect(container.querySelector('[role="listbox"]')).not.toBeNull();
    fireEvent.keyDown(btn, { key: 'Escape' });
    expect(container.querySelector('[role="listbox"]')).toBeNull();
  });

  it('renders fleet gauges from props', () => {
    const { getByText } = render(<BatteryMonitor {...build()} />);
    expect(getByText('SOC')).not.toBeNull();
    expect(getByText('75%')).not.toBeNull();
  });

  it('renders 4 legend items', () => {
    const { container } = render(<BatteryMonitor {...build()} />);
    expect(container.querySelectorAll('.vk-fleet__legend-item').length).toBe(4);
  });
});
