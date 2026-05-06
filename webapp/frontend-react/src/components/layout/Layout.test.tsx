import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import Layout from './Layout';
import { AuthProvider } from '../../contexts/AuthContext';
import { ThemeProvider } from '../../contexts/ThemeContext';

function NavSpy({ onChange }: { onChange: (path: string) => void }) {
  const loc = useLocation();
  onChange(loc.pathname);
  return null;
}

function renderLayout(initial = '/dashboard', authMutator?: () => void) {
  authMutator?.();
  const seen: string[] = [];
  const utils = render(
    <ThemeProvider>
      <AuthProvider>
        <MemoryRouter initialEntries={[initial]}>
          <Routes>
            <Route path="/login" element={<div data-testid="login-page" />} />
            <Route path="*" element={
              <Layout>
                <div data-testid="page-body">body</div>
                <NavSpy onChange={(p) => seen.push(p)} />
              </Layout>
            } />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    </ThemeProvider>,
  );
  return { ...utils, lastPath: () => seen[seen.length - 1] };
}

describe('Layout', () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    localStorage.setItem('theme', 'light'); // skip matchMedia branch
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: false, media: '', addListener: vi.fn(), removeListener: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn(), onchange: null }));
  });

  afterEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    document.documentElement.classList.remove('dark');
    vi.unstubAllGlobals();
  });

  it('renders main child content', () => {
    const { getByTestId } = renderLayout();
    expect(getByTestId('page-body')).not.toBeNull();
  });

  it('renders 8 sidebar nav links', () => {
    const { container } = renderLayout();
    const links = container.querySelectorAll('.ev-sidebar-link');
    expect(links.length).toBe(8);
  });

  it('marks active sidebar item by matching pathname', () => {
    const { container } = renderLayout('/passports');
    const active = container.querySelector('.ev-sidebar-link.active');
    expect(active?.textContent).toContain('배터리 여권');
  });

  it('treats /passports/:id subroute as /passports active', () => {
    const { container } = renderLayout('/passports/P1');
    const active = container.querySelector('.ev-sidebar-link.active');
    expect(active?.textContent).toContain('배터리 여권');
  });

  it('renders userId initials and orgLabel from context', () => {
    sessionStorage.setItem('auth_token', 'tk');
    sessionStorage.setItem('auth_userId', 'alice');
    sessionStorage.setItem('auth_org', 'ManufacturerMSP');
    const { getAllByText } = renderLayout();
    expect(getAllByText('alice').length).toBeGreaterThanOrEqual(1);
    expect(getAllByText('제조사').length).toBeGreaterThanOrEqual(1);
  });

  it('renders ? when no userId', () => {
    const { getAllByText } = renderLayout();
    expect(getAllByText('?').length).toBeGreaterThanOrEqual(1);
  });

  it('disables audit bell when org not in AUDIT_ALLOWED_ORGS', () => {
    sessionStorage.setItem('auth_org', 'ServiceMSP');
    const { container } = renderLayout();
    const bellBtn = container.querySelector('button[aria-label*="권한 필요"]') as HTMLButtonElement;
    expect(bellBtn).not.toBeNull();
    expect(bellBtn.disabled).toBe(true);
  });

  it('enables audit bell for ManufacturerMSP', () => {
    sessionStorage.setItem('auth_org', 'ManufacturerMSP');
    const { container } = renderLayout();
    const bellBtn = container.querySelector('button[aria-label*="감사 로그 열기"]') as HTMLButtonElement;
    expect(bellBtn).not.toBeNull();
    expect(bellBtn.disabled).toBe(false);
  });

  it('clicking audit bell navigates to /audit-log when allowed', () => {
    sessionStorage.setItem('auth_org', 'RegulatorMSP');
    const { container, lastPath } = renderLayout('/dashboard');
    fireEvent.click(container.querySelector('button[aria-label*="감사 로그 열기"]') as HTMLElement);
    expect(lastPath()).toBe('/audit-log');
  });

  it('clicking logout navigates to /login', () => {
    sessionStorage.setItem('auth_token', 'tk');
    sessionStorage.setItem('auth_userId', 'alice');
    const { container, queryByTestId } = renderLayout('/dashboard');
    fireEvent.click(container.querySelector('button[title="로그아웃"]') as HTMLElement);
    expect(queryByTestId('login-page')).not.toBeNull();
  });

  it('clicking 다크 모드 toggle adjusts theme attribute', () => {
    localStorage.setItem('theme', 'light');
    const { container } = renderLayout();
    const btn = container.querySelector('.ev-theme-toggle') as HTMLButtonElement;
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    fireEvent.click(btn);
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    document.documentElement.classList.remove('dark');
  });
});
