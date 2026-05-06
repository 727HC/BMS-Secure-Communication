import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import SpecRow from './SpecRow';

describe('SpecRow', () => {
  it('renders key + value pair', () => {
    const { getByText } = render(<SpecRow k="모델" v="X100" />);
    expect(getByText('모델')).not.toBeNull();
    expect(getByText('X100')).not.toBeNull();
  });

  it('renders dash for null value', () => {
    const { getByText } = render(<SpecRow k="모델" v={null} />);
    expect(getByText('-')).not.toBeNull();
  });

  it('renders dash for undefined value', () => {
    const { getByText } = render(<SpecRow k="모델" v={undefined} />);
    expect(getByText('-')).not.toBeNull();
  });

  it('renders 0 (not dash) for numeric zero', () => {
    const { getByText } = render(<SpecRow k="cnt" v={0} />);
    expect(getByText('0')).not.toBeNull();
  });

  it('uses mono class when mono=true', () => {
    const { container } = render(<SpecRow k="hash" v="abc" mono />);
    expect(container.querySelector('.sn-detail-spec-value-mono')).not.toBeNull();
    expect(container.querySelector('.sn-detail-spec-value')).toBeNull();
  });

  it('uses default class when mono is omitted', () => {
    const { container } = render(<SpecRow k="hash" v="abc" />);
    expect(container.querySelector('.sn-detail-spec-value')).not.toBeNull();
    expect(container.querySelector('.sn-detail-spec-value-mono')).toBeNull();
  });
});
