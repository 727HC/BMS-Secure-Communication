import type { ComponentProps } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render } from '@testing-library/react';
import MaterialsTable from './MaterialsTable';
import type { Material } from '../modals/materials';

const materials: Material[] = [
  { materialId: 'M1', name: 'Lithium', origin: 'AU', supplier: 'AusMin', quantity: 1000, unit: 'kg', certificationId: 'CERT-1', createdAt: '2026-05-04T00:00:00Z' } as unknown as Material,
  { materialId: 'M2', name: 'Cobalt', origin: 'CD', supplier: 'KatangaMin', quantity: 200, unit: 'kg', certificationId: '', createdAt: '' } as unknown as Material,
];

function build(overrides: Partial<ComponentProps<typeof MaterialsTable>> = {}) {
  return {
    filteredCount: 2,
    paginatedMaterials: materials,
    showingFrom: 1,
    showingTo: 2,
    currentPage: 1,
    totalPages: 1,
    onPageChange: vi.fn(),
    onRowClick: vi.fn(),
    ...overrides,
  };
}

describe('MaterialsTable', () => {
  it('renders one row per paginatedMaterials with materialId + name', () => {
    const { getByText } = render(<MaterialsTable {...build()} />);
    expect(getByText('M1')).not.toBeNull();
    expect(getByText('Lithium')).not.toBeNull();
    expect(getByText('M2')).not.toBeNull();
    expect(getByText('Cobalt')).not.toBeNull();
  });

  it('renders origin, supplier, quantity, unit', () => {
    const { getByText } = render(<MaterialsTable {...build()} />);
    expect(getByText('AU')).not.toBeNull();
    expect(getByText('AusMin')).not.toBeNull();
    expect(getByText('1000')).not.toBeNull();
    expect(getByText('CD')).not.toBeNull();
  });

  it('shows 인증 확인 chip when certificationId is set, 근거 대기 otherwise', () => {
    const { getByText } = render(<MaterialsTable {...build()} />);
    expect(getByText('인증 확인')).not.toBeNull();
    expect(getByText('근거 대기')).not.toBeNull();
  });

  it('renders dash for empty createdAt and formatted ko-KR for non-empty', () => {
    const { container, getByText } = render(<MaterialsTable {...build()} />);
    expect(getByText('-')).not.toBeNull(); // M2 createdAt empty
    expect(container.textContent).toMatch(/2026/); // M1 createdAt
  });

  it('shows showingFrom-showingTo caption (header + footer)', () => {
    const { getAllByText } = render(<MaterialsTable {...build({ filteredCount: 99, showingFrom: 81, showingTo: 90 })} />);
    expect(getAllByText('99개 중 81-90 표시').length).toBe(2);
  });

  it('emits onRowClick with material on row click', () => {
    const props = build();
    const { getByText } = render(<MaterialsTable {...props} />);
    fireEvent.click(getByText('Lithium'));
    expect(props.onRowClick).toHaveBeenCalledWith(materials[0]);
  });

  it('disables 이전·다음 on single page', () => {
    const { getByText } = render(<MaterialsTable {...build({ currentPage: 1, totalPages: 1 })} />);
    expect((getByText('이전') as HTMLButtonElement).disabled).toBe(true);
    expect((getByText('다음') as HTMLButtonElement).disabled).toBe(true);
  });

  it('emits onPageChange with clamped value on click', () => {
    const props = build({ currentPage: 1, totalPages: 5 });
    const { getByText } = render(<MaterialsTable {...props} />);
    fireEvent.click(getByText('다음'));
    expect(props.onPageChange).toHaveBeenCalledWith(2);
  });
});
