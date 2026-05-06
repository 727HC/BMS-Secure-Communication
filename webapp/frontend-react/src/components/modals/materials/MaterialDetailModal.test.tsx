import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render } from '@testing-library/react';
import MaterialDetailModal from './MaterialDetailModal';
import type { Material } from './MaterialDetailModal';

const sample: Material = {
  materialId: 'MAT-1',
  name: 'Lithium',
  origin: 'AU',
  supplier: 'AusMin',
  quantity: 1000,
  unit: 'kg',
  certificationId: 'CERT-1',
  createdAt: '2026-05-04T00:00:00Z',
  creatorMsp: 'ManufacturerMSP',
};

describe('MaterialDetailModal', () => {
  it('renders nothing when material is null', () => {
    const { container } = render(<MaterialDetailModal open={true} material={null} onClose={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when closed even with material', () => {
    const { container } = render(<MaterialDetailModal open={false} material={sample} onClose={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders name as title and materialId chip', () => {
    const { getByText } = render(<MaterialDetailModal open={true} material={sample} onClose={vi.fn()} />);
    expect(getByText('Lithium')).not.toBeNull();
    expect(getByText('MAT-1')).not.toBeNull();
  });

  it('renders origin/supplier/quantity+unit/createdAt fields', () => {
    const { getByText, container } = render(<MaterialDetailModal open={true} material={sample} onClose={vi.fn()} />);
    expect(getByText('AU')).not.toBeNull();
    expect(getByText('AusMin')).not.toBeNull();
    expect(container.textContent).toContain('1000 kg');
    expect(container.textContent).toMatch(/2026/);
  });

  it('renders 인증 확인됨 + certificationId when set', () => {
    const { getByText } = render(<MaterialDetailModal open={true} material={sample} onClose={vi.fn()} />);
    expect(getByText('인증 확인됨')).not.toBeNull();
    expect(getByText('CERT-1')).not.toBeNull();
  });

  it('renders 인증 정보 없음 when certificationId is missing', () => {
    const { getByText } = render(<MaterialDetailModal open={true} material={{ ...sample, certificationId: '' }} onClose={vi.fn()} />);
    expect(getByText('인증 정보 없음')).not.toBeNull();
  });

  it('renders creatorMsp chip with fallback to creatorMSP', () => {
    const { getByText, rerender } = render(<MaterialDetailModal open={true} material={sample} onClose={vi.fn()} />);
    expect(getByText('ManufacturerMSP')).not.toBeNull();
    rerender(<MaterialDetailModal open={true} material={{ ...sample, creatorMsp: undefined, creatorMSP: 'OldKey' }} onClose={vi.fn()} />);
    expect(getByText('OldKey')).not.toBeNull();
    rerender(<MaterialDetailModal open={true} material={{ ...sample, creatorMsp: undefined, creatorMSP: undefined }} onClose={vi.fn()} />);
    expect(getByText('-')).not.toBeNull();
  });

  it('emits onClose on 닫기 click', () => {
    const onClose = vi.fn();
    const { getByText } = render(<MaterialDetailModal open={true} material={sample} onClose={onClose} />);
    fireEvent.click(getByText('닫기'));
    expect(onClose).toHaveBeenCalled();
  });
});
