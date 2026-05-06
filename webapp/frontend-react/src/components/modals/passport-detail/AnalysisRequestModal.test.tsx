import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render } from '@testing-library/react';
import AnalysisRequestModal from './AnalysisRequestModal';

describe('AnalysisRequestModal', () => {
  it('renders nothing when closed', () => {
    const { container } = render(<AnalysisRequestModal open={false} submitting={false} onClose={vi.fn()} onSubmit={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders title and confirm/cancel buttons', () => {
    const { getByText } = render(<AnalysisRequestModal open={true} submitting={false} onClose={vi.fn()} onSubmit={vi.fn()} />);
    expect(getByText('분석 요청')).not.toBeNull();
    expect(getByText('취소')).not.toBeNull();
    expect(getByText('요청')).not.toBeNull();
  });

  it('emits onSubmit on 요청 click', () => {
    const onSubmit = vi.fn();
    const { getByText } = render(<AnalysisRequestModal open={true} submitting={false} onClose={vi.fn()} onSubmit={onSubmit} />);
    fireEvent.click(getByText('요청'));
    expect(onSubmit).toHaveBeenCalled();
  });

  it('shows 처리 중... and disables submit while submitting', () => {
    const { getByText } = render(<AnalysisRequestModal open={true} submitting={true} onClose={vi.fn()} onSubmit={vi.fn()} />);
    expect((getByText('처리 중...') as HTMLButtonElement).disabled).toBe(true);
  });
});
