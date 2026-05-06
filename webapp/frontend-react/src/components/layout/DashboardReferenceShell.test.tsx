import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import DashboardReferenceShell from './DashboardReferenceShell';
import { AuthProvider } from '../../contexts/AuthContext';
import { ThemeProvider } from '../../contexts/ThemeContext';

function NavSpy({ onChange }: { onChange: (path: string) => void }) {
  const loc = useLocation();
  onChange(loc.pathname);
  return null;
}

function renderShell(initial = '/dashboard') {
  const seen: string[] = [];
  const utils = render(
    <ThemeProvider>
      <AuthProvider>
        <MemoryRouter initialEntries={[initial]}>
          <Routes>
            <Route path="/login" element={<div data-testid="login-page" />} />
            <Route path="*" element={
              <DashboardReferenceShell>
                <div data-testid="ref-body">body</div>
                <NavSpy onChange={(p) => seen.push(p)} />
              </DashboardReferenceShell>
            } />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    </ThemeProvider>,
  );
  return { ...utils, lastPath: () => seen[seen.length - 1] };
}

describe('DashboardReferenceShell', () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    localStorage.setItem('theme', 'light');
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: false, media: '', addListener: vi.fn(), removeListener: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn(), onchange: null }));
  });
  afterEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    document.documentElement.classList.remove('dark');
    vi.unstubAllGlobals();
  });

  it('renders main child content inside vk-ref-content', () => {
    const { container, getByTestId } = renderShell();
    expect(getByTestId('ref-body')).not.toBeNull();
    expect(container.querySelector('.vk-ref-content')).not.toBeNull();
  });

  it('renders 8 sidebar nav links', () => {
    const { container } = renderShell();
    expect(container.querySelectorAll('.ev-sidebar-link').length).toBe(8);
  });

  it('marks active sidebar item by pathname', () => {
    const { container } = renderShell('/recycling');
    expect(container.querySelector('.ev-sidebar-link.active')?.textContent).toContain('재활용·ESG');
  });

  it('shows 조직 미확인 fallback when no org', () => {
    const { getAllByText } = renderShell();
    // appears in sidebar profile + topbar chip
    expect(getAllByText('조직 미확인').length).toBeGreaterThanOrEqual(1);
  });

  it('disables audit bell when org=ServiceMSP', () => {
    sessionStorage.setItem('auth_org', 'ServiceMSP');
    const { container } = renderShell();
    const bell = container.querySelector('button[aria-label*="권한 필요"]') as HTMLButtonElement;
    expect(bell.disabled).toBe(true);
  });

  it('clicking audit bell navigates to /audit-log when allowed', () => {
    sessionStorage.setItem('auth_org', 'RegulatorMSP');
    const { container, lastPath } = renderShell('/dashboard');
    fireEvent.click(container.querySelector('button[aria-label*="감사 로그 열기"]') as HTMLElement);
    expect(lastPath()).toBe('/audit-log');
  });

  it('logout button navigates to /login', () => {
    sessionStorage.setItem('auth_token', 'tk');
    sessionStorage.setItem('auth_userId', 'alice');
    const { container, queryByTestId } = renderShell('/dashboard');
    fireEvent.click(container.querySelector('button[title="로그아웃"]') as HTMLElement);
    expect(queryByTestId('login-page')).not.toBeNull();
  });

  it('clicking theme toggle adds dark class', () => {
    const { container } = renderShell();
    fireEvent.click(container.querySelector('.ev-theme-toggle') as HTMLElement);
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });
});
