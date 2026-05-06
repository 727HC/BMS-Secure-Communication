import type { ComponentProps } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render } from '@testing-library/react';
import DataflowCard from './DataflowCard';
import type { DataflowNodeViewModel } from './lib';

const sampleNodes: DataflowNodeViewModel[] = [
  { key: 'cmu', label: 'CMU', action: '셀 측정', status: 'Synced' },
  { key: 'bmu', label: 'BMU', action: '집계', status: 'Loaded' },
  { key: 'agent', label: 'Agent', action: '서명', status: 'Data' },
];

function build(overrides: Partial<ComponentProps<typeof DataflowCard>> = {}) {
  return {
    dataflowNodes: sampleNodes,
    onNavigate: vi.fn(),
    ...overrides,
  };
}

describe('DataflowCard', () => {
  it('renders one node block per entry', () => {
    const { container } = render(<DataflowCard {...build()} />);
    expect(container.querySelectorAll('.vk-dataflow__node').length).toBe(3);
  });

  it('renders label + action + status text per node', () => {
    const { getByText } = render(<DataflowCard {...build()} />);
    expect(getByText('CMU')).not.toBeNull();
    expect(getByText('셀 측정')).not.toBeNull();
    expect(getByText('Synced')).not.toBeNull();
  });

  it('applies status tone class lowercased', () => {
    const { container } = render(<DataflowCard {...build()} />);
    expect(container.querySelector('.vk-dataflow__status--synced')).not.toBeNull();
    expect(container.querySelector('.vk-dataflow__status--loaded')).not.toBeNull();
    expect(container.querySelector('.vk-dataflow__status--data')).not.toBeNull();
  });

  it('renders n-1 connectors between nodes', () => {
    const { container } = render(<DataflowCard {...build()} />);
    expect(container.querySelectorAll('.vk-dataflow__connector').length).toBe(2);
  });

  it('renders 0 connectors with single node', () => {
    const { container } = render(<DataflowCard {...build({ dataflowNodes: [sampleNodes[0]] })} />);
    expect(container.querySelectorAll('.vk-dataflow__connector').length).toBe(0);
  });

  it('emits onNavigate(/bmu-data) when 상세 보기 clicked', () => {
    const props = build();
    const { getByText } = render(<DataflowCard {...props} />);
    fireEvent.click(getByText('상세 보기').closest('button') as HTMLButtonElement);
    expect(props.onNavigate).toHaveBeenCalledWith('/bmu-data');
  });
});
