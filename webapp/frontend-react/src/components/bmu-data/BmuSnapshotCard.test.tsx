import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import BmuSnapshotCard from './BmuSnapshotCard';
import type { BmuRecord } from './lib';

const baseRecord: BmuRecord = {
  passportId: 'P1',
  timestamp: '2026-05-04T12:00:00Z',
  soc: 80,
  voltage: 3.78,
  current: 12.34,
  temperature: 28,
  statusFlags: 0,
} as unknown as BmuRecord;

const emptySlice = { soc: [], voltage: [], current: [], temperature: [] };
const filledSlice = { soc: [70, 75, 80], voltage: [3.6, 3.7, 3.78], current: [10, 11, 12], temperature: [25, 26, 28] };

describe('BmuSnapshotCard', () => {
  it('renders SOC/전압/전류/온도 metric labels', () => {
    const { getByText } = render(<BmuSnapshotCard latestRecord={baseRecord} recentSlice={emptySlice} />);
    expect(getByText('SOC')).not.toBeNull();
    expect(getByText('전압')).not.toBeNull();
    expect(getByText('전류')).not.toBeNull();
    expect(getByText('온도')).not.toBeNull();
  });

  it('shows 정상 badge when statusFlags is 0', () => {
    const { getByText } = render(<BmuSnapshotCard latestRecord={baseRecord} recentSlice={emptySlice} />);
    expect(getByText('정상')).not.toBeNull();
  });

  it('decodes statusFlags=0x07 as 충전중 + 밸런싱 + 결함', () => {
    const rec = { ...baseRecord, statusFlags: 0x07 } as BmuRecord;
    const { getByText, queryByText } = render(<BmuSnapshotCard latestRecord={rec} recentSlice={emptySlice} />);
    expect(getByText('충전중')).not.toBeNull();
    expect(getByText('밸런싱')).not.toBeNull();
    expect(getByText('결함')).not.toBeNull();
    expect(queryByText('정상')).toBeNull();
  });

  it('decodes single bit (charging) without others', () => {
    const rec = { ...baseRecord, statusFlags: 0x01 } as BmuRecord;
    const { getByText, queryByText } = render(<BmuSnapshotCard latestRecord={rec} recentSlice={emptySlice} />);
    expect(getByText('충전중')).not.toBeNull();
    expect(queryByText('밸런싱')).toBeNull();
    expect(queryByText('결함')).toBeNull();
  });

  it('omits sparkline when recentSlice arrays are empty (≤ 1 value)', () => {
    const { container } = render(<BmuSnapshotCard latestRecord={baseRecord} recentSlice={emptySlice} />);
    expect(container.querySelectorAll('svg').length).toBe(0);
  });

  it('renders 4 sparklines when all slice arrays have > 1 values', () => {
    const { container } = render(<BmuSnapshotCard latestRecord={baseRecord} recentSlice={filledSlice} />);
    expect(container.querySelectorAll('svg').length).toBe(4);
  });

  it('renders SOC value with % and voltage/current/temperature with units', () => {
    const { container } = render(<BmuSnapshotCard latestRecord={baseRecord} recentSlice={emptySlice} />);
    const text = container.textContent ?? '';
    expect(text).toContain('80%');
    expect(text).toContain('3.78V');
    expect(text).toContain('12.34A');
    expect(text).toContain('28°C');
  });

  it('renders timestamp via toLocaleString', () => {
    const { container } = render(<BmuSnapshotCard latestRecord={baseRecord} recentSlice={emptySlice} />);
    expect(container.textContent).toMatch(/2026/);
  });
});
