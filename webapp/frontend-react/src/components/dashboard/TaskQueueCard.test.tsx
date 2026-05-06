import type { ComponentProps } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render } from '@testing-library/react';
import TaskQueueCard from './TaskQueueCard';
import type { TaskRowViewModel } from './lib';

const sampleTasks: TaskRowViewModel[] = [
  { label: 'VIN 미연결', value: '5', unit: '건', tone: 'amber', icon: 'user', route: '/passports' },
  { label: '점검 대기', value: '3', unit: '건', tone: 'green', icon: 'wrench', route: '/maintenance' },
];

function build(overrides: Partial<ComponentProps<typeof TaskQueueCard>> = {}) {
  return {
    taskRows: sampleTasks,
    totalTaskCount: 8,
    onNavigate: vi.fn(),
    ...overrides,
  };
}

describe('TaskQueueCard', () => {
  it('renders count badge with totalTaskCount', () => {
    const { container } = render(<TaskQueueCard {...build({ totalTaskCount: 12 })} />);
    expect(container.querySelector('.vk-card__count')?.textContent).toBe('12');
  });

  it('renders empty caption when totalTaskCount=0', () => {
    const { getByText } = render(<TaskQueueCard {...build({ totalTaskCount: 0, taskRows: [] })} />);
    expect(getByText('대기 중인 작업이 없습니다')).not.toBeNull();
  });

  it('renders one button per taskRow with label + value + unit', () => {
    const { getByText, container } = render(<TaskQueueCard {...build()} />);
    expect(getByText('VIN 미연결')).not.toBeNull();
    expect(getByText('5')).not.toBeNull();
    expect(getByText('점검 대기')).not.toBeNull();
    // tasks rendered as buttons
    expect(container.querySelectorAll('.vk-task').length).toBe(2);
  });

  it('emits onNavigate(route) when task clicked', () => {
    const props = build();
    const { getByText } = render(<TaskQueueCard {...props} />);
    fireEvent.click(getByText('VIN 미연결'));
    expect(props.onNavigate).toHaveBeenCalledWith('/passports');
  });

  it('emits onNavigate(/passports) when 전체 보기 clicked', () => {
    const props = build();
    const { getByText } = render(<TaskQueueCard {...props} />);
    fireEvent.click(getByText('전체 보기').closest('button') as HTMLButtonElement);
    expect(props.onNavigate).toHaveBeenCalledWith('/passports');
  });

  it('applies tone class per task', () => {
    const { container } = render(<TaskQueueCard {...build()} />);
    expect(container.querySelector('.vk-task--amber')).not.toBeNull();
    expect(container.querySelector('.vk-task--green')).not.toBeNull();
  });

  it('uses aria-label like "label value unit 보기"', () => {
    const { container } = render(<TaskQueueCard {...build()} />);
    const taskButtons = container.querySelectorAll('button.vk-task');
    expect(taskButtons[0].getAttribute('aria-label')).toBe('VIN 미연결 5건 보기');
  });
});
