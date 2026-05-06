import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import PassportDetailFocusPanel from './PassportDetailFocusPanel';

describe('PassportDetailFocusPanel', () => {
  it('renders 3 fixed sections with eyebrows and captions', () => {
    render(<PassportDetailFocusPanel />);
    expect(screen.getByText('자료 초점')).not.toBeNull();
    expect(screen.getByText('등록부 작업')).not.toBeNull();
    expect(screen.getByText('근거 탭')).not.toBeNull();
    expect(screen.getByText(/SOH/)).not.toBeNull();
    expect(screen.getByText(/권한과 상태/)).not.toBeNull();
    expect(screen.getByText(/소재, 운영 이력/)).not.toBeNull();
  });
});
