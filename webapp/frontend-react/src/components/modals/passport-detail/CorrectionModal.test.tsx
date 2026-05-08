import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render } from '@testing-library/react';
import CorrectionModal from './CorrectionModal';

describe('CorrectionModal', () => {
  it('renders nothing when closed', () => {
    const { container } = render(<CorrectionModal open={false} submitting={false} onClose={vi.fn()} onSubmit={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders all chaincode-correctable field options + placeholder option (총 27개)', () => {
    const { container } = render(<CorrectionModal open={true} submitting={false} onClose={vi.fn()} onSubmit={vi.fn()} />);
    // 26 FIELD_OPTIONS + 1 placeholder
    expect(container.querySelectorAll('option').length).toBe(27);
  });

  it('shows JSON guidance for extension fields', () => {
    const { getByText, container } = render(<CorrectionModal open={true} submitting={false} onClose={vi.fn()} onSubmit={vi.fn()} />);
    fireEvent.change(container.querySelector('select') as HTMLSelectElement, { target: { value: 'extensionInfo' } });
    expect(getByText('이 필드는 체인코드가 JSON 문자열로 검증합니다. 객체 형태를 그대로 입력하세요.')).not.toBeNull();
  });

  it('blocks 정정 when JSON field value is invalid', () => {
    const { getByText, getByPlaceholderText, container } = render(<CorrectionModal open={true} submitting={false} onClose={vi.fn()} onSubmit={vi.fn()} />);
    fireEvent.change(container.querySelector('select') as HTMLSelectElement, { target: { value: 'extensionInfo' } });
    fireEvent.change(getByPlaceholderText('예: {"bmsProfile":"BMS-v3","oracle":"verified"}'), { target: { value: '{bad' } });
    fireEvent.change(getByPlaceholderText('정정 사유를 입력'), { target: { value: '초기 속성 보완' } });
    expect(getByText('올바른 JSON 객체가 아닙니다.')).not.toBeNull();
    expect((getByText('정정') as HTMLButtonElement).disabled).toBe(true);
  });

  it('disables 정정 button when any field is empty', () => {
    const { getByText } = render(<CorrectionModal open={true} submitting={false} onClose={vi.fn()} onSubmit={vi.fn()} />);
    expect((getByText('정정') as HTMLButtonElement).disabled).toBe(true);
  });

  it('enables 정정 only when all 3 fields filled', () => {
    const { getByText, getByPlaceholderText, container } = render(<CorrectionModal open={true} submitting={false} onClose={vi.fn()} onSubmit={vi.fn()} />);
    fireEvent.change(container.querySelector('select') as HTMLSelectElement, { target: { value: 'model' } });
    expect((getByText('정정') as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(getByPlaceholderText('변경할 값을 입력'), { target: { value: 'Y100' } });
    expect((getByText('정정') as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(getByPlaceholderText('정정 사유를 입력'), { target: { value: '오타' } });
    expect((getByText('정정') as HTMLButtonElement).disabled).toBe(false);
  });

  it('submits all 3 fields on click', () => {
    const onSubmit = vi.fn();
    const { getByText, getByPlaceholderText, container } = render(<CorrectionModal open={true} submitting={false} onClose={vi.fn()} onSubmit={onSubmit} />);
    fireEvent.change(container.querySelector('select') as HTMLSelectElement, { target: { value: 'cellCount' } });
    fireEvent.change(getByPlaceholderText('변경할 값을 입력'), { target: { value: '96' } });
    fireEvent.change(getByPlaceholderText('정정 사유를 입력'), { target: { value: '재계측' } });
    fireEvent.click(getByText('정정'));
    expect(onSubmit).toHaveBeenCalledWith({ fieldName: 'cellCount', newValue: '96', reason: '재계측' });
  });

  it('shows 처리 중... while submitting', () => {
    const { getByText, getByPlaceholderText, container } = render(<CorrectionModal open={true} submitting={true} onClose={vi.fn()} onSubmit={vi.fn()} />);
    fireEvent.change(container.querySelector('select') as HTMLSelectElement, { target: { value: 'model' } });
    fireEvent.change(getByPlaceholderText('변경할 값을 입력'), { target: { value: 'X' } });
    fireEvent.change(getByPlaceholderText('정정 사유를 입력'), { target: { value: 'Y' } });
    expect((getByText('처리 중...') as HTMLButtonElement).disabled).toBe(true);
  });
});
