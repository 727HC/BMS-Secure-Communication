import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render } from '@testing-library/react';
import LoginForm from './LoginForm';

function build(overrides: Partial<React.ComponentProps<typeof LoginForm>> = {}) {
  return {
    orgNum: 1,
    onOrgNumChange: vi.fn(),
    userId: '',
    onUserIdChange: vi.fn(),
    password: '',
    onPasswordChange: vi.fn(),
    loading: false,
    submitLabel: '로그인',
    onSubmit: vi.fn(),
    ...overrides,
  };
}

describe('LoginForm', () => {
  it('renders 4 org option buttons with labels', () => {
    const { getByText } = render(<LoginForm {...build()} />);
    expect(getByText('제조사')).not.toBeNull();
    expect(getByText('EV제조사')).not.toBeNull();
    expect(getByText('정비/분석')).not.toBeNull();
    expect(getByText('검증기관')).not.toBeNull();
  });

  it('renders submitLabel prop on submit button', () => {
    const { getByText, rerender } = render(<LoginForm {...build({ submitLabel: '계정 등록' })} />);
    expect(getByText('계정 등록')).not.toBeNull();
    rerender(<LoginForm {...build({ submitLabel: '로그인' })} />);
    expect(getByText('로그인')).not.toBeNull();
  });

  it('shows 처리 중... label and disables button while loading', () => {
    const { container, getByText } = render(<LoginForm {...build({ loading: true, userId: 'a', password: 'b' })} />);
    expect(getByText('처리 중...')).not.toBeNull();
    const submitBtn = container.querySelector('button[type="submit"]') as HTMLButtonElement;
    expect(submitBtn.disabled).toBe(true);
  });

  it('submit button is enabled when not loading (parent does empty-field check)', () => {
    const { container } = render(<LoginForm {...build()} />);
    const btn = container.querySelector('button[type="submit"]') as HTMLButtonElement;
    expect(btn.disabled).toBe(false);
  });

  it('emits onOrgNumChange when org button clicked', () => {
    const props = build();
    const { getByText } = render(<LoginForm {...props} />);
    fireEvent.click(getByText('검증기관'));
    expect(props.onOrgNumChange).toHaveBeenCalledWith(4);
  });

  it('emits onUserIdChange/onPasswordChange when inputs change', () => {
    const props = build();
    const { container } = render(<LoginForm {...props} />);
    const inputs = container.querySelectorAll('input');
    fireEvent.change(inputs[0], { target: { value: 'alice' } });
    fireEvent.change(inputs[1], { target: { value: 'pw' } });
    expect(props.onUserIdChange).toHaveBeenCalledWith('alice');
    expect(props.onPasswordChange).toHaveBeenCalledWith('pw');
  });

  it('emits onSubmit on form submit', () => {
    const props = build({ userId: 'a', password: 'b' });
    const { container } = render(<LoginForm {...props} />);
    fireEvent.submit(container.querySelector('form') as HTMLFormElement);
    expect(props.onSubmit).toHaveBeenCalled();
  });

  it('marks active org with primary border (orgNum=2)', () => {
    const { getByText } = render(<LoginForm {...build({ orgNum: 2 })} />);
    const evBtn = getByText('EV제조사').closest('button') as HTMLButtonElement;
    expect(evBtn.style.border).toContain('var(--color-primary)');
  });
});
