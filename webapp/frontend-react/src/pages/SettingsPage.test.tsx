import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import SettingsPage from './SettingsPage';
import { AuthProvider } from '../contexts/AuthContext';
import { ThemeProvider } from '../contexts/ThemeContext';

function renderPage() {
  return render(
    <ThemeProvider>
      <AuthProvider>
        <SettingsPage />
      </AuthProvider>
    </ThemeProvider>,
  );
}

describe('SettingsPage', () => {
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

  it('renders root with data-page="settings"', () => {
    const { container } = renderPage();
    expect(container.querySelector('[data-page="settings"]')).not.toBeNull();
  });

  it('shows 세션 없음 when no token', () => {
    const { getByText } = renderPage();
    expect(getByText('세션 없음')).not.toBeNull();
  });

  it('shows 인증됨 when token present', () => {
    sessionStorage.setItem('auth_token', 'tk');
    const { getByText } = renderPage();
    expect(getByText('인증됨')).not.toBeNull();
    expect(getByText('세션 토큰 감지됨')).not.toBeNull();
  });

  it('shows 라이트 모드 when theme is light', () => {
    const { getByText } = renderPage();
    expect(getByText('라이트 모드')).not.toBeNull();
  });

  it('shows 다크 모드 when theme is dark', () => {
    localStorage.setItem('theme', 'dark');
    const { getByText } = renderPage();
    expect(getByText('다크 모드')).not.toBeNull();
  });

  it('shows fallback labels when no userId/org', () => {
    const { getByText } = renderPage();
    expect(getByText('사용자 ID 없음')).not.toBeNull();
    expect(getByText('조직 미확인')).not.toBeNull();
    expect(getByText('MSP 미확인')).not.toBeNull();
    expect(getByText('토큰 없음')).not.toBeNull();
  });

  it('shows userId, MSP raw, and labelled org from context', () => {
    sessionStorage.setItem('auth_token', 'tk');
    sessionStorage.setItem('auth_userId', 'alice');
    sessionStorage.setItem('auth_org', 'ManufacturerMSP');
    const { getByText } = renderPage();
    expect(getByText('alice')).not.toBeNull();
    expect(getByText('제조사')).not.toBeNull();
    expect(getByText('ManufacturerMSP')).not.toBeNull();
  });

  it('renders 4 setting cards (.sn-info-tile inside section card)', () => {
    const { container } = renderPage();
    expect(container.querySelectorAll('.sn-info-tile').length).toBe(4);
  });
});
