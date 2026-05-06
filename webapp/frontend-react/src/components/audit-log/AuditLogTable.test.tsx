import type { ComponentProps } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render } from '@testing-library/react';
import AuditLogTable from './AuditLogTable';
import type { LogRecord } from './lib';

const sampleLogs: LogRecord[] = [
  { id: 'L1', action: 'CREATE_PASSPORT', timestamp: '2026-05-04T12:00:00Z', userId: 'op1', orgMsp: 'MfgMSP', method: 'POST', path: '/api/passports', statusCode: 200, ip: '10.0.0.1', duration: 42, requestBody: { foo: 'bar' } },
  { id: 'L2', action: 'BIND_VEHICLE', timestamp: '2026-05-03T12:00:00Z', method: 'POST', path: '/api/bind', statusCode: 500 },
];

function build(overrides: Partial<ComponentProps<typeof AuditLogTable>> = {}) {
  return {
    logs: sampleLogs,
    expandedId: null,
    onToggleDetail: vi.fn(),
    total: 100,
    page: 1,
    totalPages: 10,
    pageSize: 25 as const,
    pageStart: 1,
    pageEnd: 25,
    onPageChange: vi.fn(),
    onPageSizeChange: vi.fn(),
    ...overrides,
  };
}

describe('AuditLogTable', () => {
  it('renders one row per log with mapped action label', () => {
    const { getByText } = render(<AuditLogTable {...build()} />);
    expect(getByText('여권 생성')).not.toBeNull();
    expect(getByText('VIN 바인딩')).not.toBeNull();
  });

  it('renders pageStart-pageEnd stamp + total stamp', () => {
    const { getByText } = render(<AuditLogTable {...build({ pageStart: 51, pageEnd: 75, total: 250 })} />);
    expect(getByText('51-75')).not.toBeNull();
    expect(getByText('total 250')).not.toBeNull();
    expect(getByText(/250건 중 51~75/)).not.toBeNull();
  });

  it('emits onToggleDetail with log id when row clicked', () => {
    const props = build();
    const { getAllByText } = render(<AuditLogTable {...props} />);
    fireEvent.click(getAllByText('여권 생성')[0]);
    expect(props.onToggleDetail).toHaveBeenCalledWith('L1');
  });

  it('renders expanded detail panel only for the expanded row', () => {
    const { container } = render(<AuditLogTable {...build({ expandedId: 'L1' })} />);
    // Detail panel renders 'HTTP 메서드' eyebrow text — should appear exactly once
    expect(container.textContent?.match(/HTTP 메서드/g)?.length).toBe(1);
  });

  it('renders requestBody as pretty JSON in expanded row', () => {
    const { container } = render(<AuditLogTable {...build({ expandedId: 'L1' })} />);
    const pre = container.querySelector('pre') as HTMLPreElement;
    expect(pre).not.toBeNull();
    expect(pre.textContent).toContain('"foo"');
    expect(pre.textContent).toContain('"bar"');
  });

  it('omits the requestBody pre when log has no requestBody', () => {
    const { container } = render(<AuditLogTable {...build({ expandedId: 'L2' })} />);
    expect(container.querySelector('pre')).toBeNull();
  });

  it('disables 이전 button on page=1 and 다음 button on last page', () => {
    const { getByText, rerender } = render(<AuditLogTable {...build({ page: 1, totalPages: 10 })} />);
    expect((getByText('이전') as HTMLButtonElement).disabled).toBe(true);
    expect((getByText('다음') as HTMLButtonElement).disabled).toBe(false);
    rerender(<AuditLogTable {...build({ page: 10, totalPages: 10 })} />);
    expect((getByText('이전') as HTMLButtonElement).disabled).toBe(false);
    expect((getByText('다음') as HTMLButtonElement).disabled).toBe(true);
  });

  it('emits onPageChange(page-1) on 이전 click and onPageChange(page+1) on 다음 click', () => {
    const props = build({ page: 5, totalPages: 10 });
    const { getByText } = render(<AuditLogTable {...props} />);
    fireEvent.click(getByText('이전'));
    fireEvent.click(getByText('다음'));
    expect(props.onPageChange).toHaveBeenNthCalledWith(1, 4);
    expect(props.onPageChange).toHaveBeenNthCalledWith(2, 6);
  });

  it('emits onPageSizeChange with numeric size when select changes', () => {
    const props = build();
    const { container } = render(<AuditLogTable {...props} />);
    const select = container.querySelector('select') as HTMLSelectElement;
    fireEvent.change(select, { target: { value: '50' } });
    expect(props.onPageSizeChange).toHaveBeenCalledWith(50);
  });

  it('shows fallback 시스템(BMU) when userId is missing for RECORD_BMU action', () => {
    const logs: LogRecord[] = [{ id: 'L3', action: 'RECORD_BMU' }];
    const { getByText } = render(<AuditLogTable {...build({ logs })} />);
    expect(getByText('시스템(BMU)')).not.toBeNull();
  });

  it('shows em dash when statusCode is missing', () => {
    const logs: LogRecord[] = [{ id: 'L4', action: 'CREATE_PASSPORT' }];
    const { getByText } = render(<AuditLogTable {...build({ logs })} />);
    expect(getByText('—')).not.toBeNull();
  });
});
