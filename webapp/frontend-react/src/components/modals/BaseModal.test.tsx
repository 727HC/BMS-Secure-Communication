import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render } from '@testing-library/react';
import BaseModal, { ModalErrorContext } from './BaseModal';

describe('BaseModal', () => {
  it('renders nothing when open=false', () => {
    const { container } = render(
      <BaseModal open={false} title="X" onClose={vi.fn()}><p>body</p></BaseModal>,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders title and children when open=true', () => {
    const { getByText } = render(
      <BaseModal open={true} title="제목" onClose={vi.fn()}><p>body content</p></BaseModal>,
    );
    expect(getByText('제목')).not.toBeNull();
    expect(getByText('body content')).not.toBeNull();
  });

  it('emits onClose on overlay click', () => {
    const onClose = vi.fn();
    const { container } = render(
      <BaseModal open={true} title="X" onClose={onClose}><p>body</p></BaseModal>,
    );
    fireEvent.click(container.querySelector('.sn-overlay') as HTMLElement);
    expect(onClose).toHaveBeenCalled();
  });

  it('does not emit onClose on inner modal click (stopPropagation)', () => {
    const onClose = vi.fn();
    const { container } = render(
      <BaseModal open={true} title="X" onClose={onClose}><p>body</p></BaseModal>,
    );
    fireEvent.click(container.querySelector('.sn-modal') as HTMLElement);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('emits onClose on close button click', () => {
    const onClose = vi.fn();
    const { getByLabelText } = render(
      <BaseModal open={true} title="X" onClose={onClose}><p>body</p></BaseModal>,
    );
    fireEvent.click(getByLabelText('닫기'));
    expect(onClose).toHaveBeenCalled();
  });

  it('emits onClose on Escape key when open', () => {
    const onClose = vi.fn();
    render(<BaseModal open={true} title="X" onClose={onClose}><p>body</p></BaseModal>);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });

  it('does not emit onClose on Escape when closed', () => {
    const onClose = vi.fn();
    render(<BaseModal open={false} title="X" onClose={onClose}><p>body</p></BaseModal>);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).not.toHaveBeenCalled();
  });

  it('applies custom maxWidth style on inner modal', () => {
    const { container } = render(
      <BaseModal open={true} title="X" onClose={vi.fn()} maxWidth={800}><p>body</p></BaseModal>,
    );
    const inner = container.querySelector('.sn-modal') as HTMLElement;
    expect(inner.style.maxWidth).toBe('800px');
  });

  it('removes Escape handler on unmount', () => {
    const onClose = vi.fn();
    const { unmount } = render(<BaseModal open={true} title="X" onClose={onClose}><p>body</p></BaseModal>);
    unmount();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).not.toHaveBeenCalled();
  });

  it('renders the error banner from ModalErrorContext when an error is set', () => {
    const { getByRole, getByText } = render(
      <ModalErrorContext.Provider value="제출에 실패했습니다">
        <BaseModal open={true} title="X" onClose={vi.fn()}><p>body</p></BaseModal>
      </ModalErrorContext.Provider>,
    );
    expect(getByRole('alert')).not.toBeNull();
    expect(getByText('제출에 실패했습니다')).not.toBeNull();
  });

  it('renders no error banner when there is no context error', () => {
    const { queryByRole } = render(
      <BaseModal open={true} title="X" onClose={vi.fn()}><p>body</p></BaseModal>,
    );
    expect(queryByRole('alert')).toBeNull();
  });
});
