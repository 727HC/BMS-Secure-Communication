import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const stub = (id: string) => ({
  default: () => <div data-testid={id} />,
});

vi.mock('./pages/LandingPage', () => stub('LandingPage'));
vi.mock('./pages/LoginPage', () => stub('LoginPage'));
vi.mock('./pages/DashboardPage', () => stub('DashboardPage'));
vi.mock('./pages/PassportsPage', () => stub('PassportsPage'));
vi.mock('./pages/PassportDetailPage', () => stub('PassportDetailPage'));
vi.mock('./pages/MaterialsPage', () => stub('MaterialsPage'));
vi.mock('./pages/BmuDataPage', () => stub('BmuDataPage'));
vi.mock('./pages/MaintenancePage', () => stub('MaintenancePage'));
vi.mock('./pages/RecyclingPage', () => stub('RecyclingPage'));
vi.mock('./pages/QrScanPage', () => stub('QrScanPage'));
vi.mock('./pages/AuditLogPage', () => stub('AuditLogPage'));
vi.mock('./pages/SettingsPage', () => stub('SettingsPage'));

// Stub layout shells so we can test routing without sidebar plumbing
vi.mock('./components/layout/Layout', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div data-testid="Layout">{children}</div>,
}));
vi.mock('./components/layout/DashboardReferenceShell', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div data-testid="DashboardShell">{children}</div>,
}));

// We don't import App directly because react-router context conflicts; instead
// re-define the routes with the same mocks to validate the routing table.
// Actually App wraps Routes inside its own provider; using MemoryRouter wrapper
// requires not having BrowserRouter inside. App uses Routes directly (no Router wrapper),
// so it's safe to mount it inside MemoryRouter.
import App from './App';

function renderApp(initial: string) {
  return render(
    <MemoryRouter initialEntries={[initial]}>
      <App />
    </MemoryRouter>,
  );
}

describe('App routing', () => {
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

  async function findById(testId: string, container: HTMLElement): Promise<HTMLElement | null> {
    let found: HTMLElement | null = null;
    await waitFor(
      () => {
        found = container.querySelector(`[data-testid="${testId}"]`) as HTMLElement | null;
        if (!found) throw new Error(`testid ${testId} not found yet`);
      },
      { timeout: 2000 },
    );
    return found;
  }

  it('/ renders LandingPage (public)', async () => {
    const { container } = renderApp('/');
    expect(await findById('LandingPage', container)).not.toBeNull();
  });

  it('/login renders LoginPage (public)', async () => {
    const { container } = renderApp('/login');
    expect(await findById('LoginPage', container)).not.toBeNull();
  });

  it('/dashboard requires auth — redirects to login when no token', async () => {
    const { container } = renderApp('/dashboard');
    expect(await findById('LoginPage', container)).not.toBeNull();
  });

  it('/dashboard with token renders DashboardShell + DashboardPage', async () => {
    sessionStorage.setItem('auth_token', 'tk');
    const { container } = renderApp('/dashboard');
    expect(await findById('DashboardShell', container)).not.toBeNull();
    expect(await findById('DashboardPage', container)).not.toBeNull();
  });

  it('/passports with token renders Layout + PassportsPage', async () => {
    sessionStorage.setItem('auth_token', 'tk');
    const { container } = renderApp('/passports');
    expect(await findById('Layout', container)).not.toBeNull();
    expect(await findById('PassportsPage', container)).not.toBeNull();
  });

  it('/passports/:id renders PassportDetailPage', async () => {
    sessionStorage.setItem('auth_token', 'tk');
    const { container } = renderApp('/passports/P1');
    expect(await findById('PassportDetailPage', container)).not.toBeNull();
  });

  it.each([
    ['/materials', 'MaterialsPage'],
    ['/bmu-data', 'BmuDataPage'],
    ['/maintenance', 'MaintenancePage'],
    ['/recycling', 'RecyclingPage'],
    ['/qr-scan', 'QrScanPage'],
    ['/audit-log', 'AuditLogPage'],
    ['/settings', 'SettingsPage'],
  ])('%s with token renders %s', async (path, expected) => {
    sessionStorage.setItem('auth_token', 'tk');
    const { container } = renderApp(path);
    expect(await findById(expected, container)).not.toBeNull();
  });

  it('unknown path redirects to /', async () => {
    const { container } = renderApp('/totally-unknown');
    expect(await findById('LandingPage', container)).not.toBeNull();
  });
});
