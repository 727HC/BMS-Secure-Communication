import { describe, expect, it } from 'vitest';
import { fireEvent, render } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import LandingPage from './LandingPage';

let lastPath = '';
function NavSpy() {
  const loc = useLocation();
  lastPath = loc.pathname;
  return null;
}

function renderPage() {
  lastPath = '';
  return render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="*" element={<><LandingPage /><NavSpy /></>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('LandingPage', () => {
  it('renders root with data-page="landing"', () => {
    const { container } = renderPage();
    expect(container.querySelector('[data-page="landing"]')).not.toBeNull();
  });

  it('renders hero copy and tagline', () => {
    const { getByText } = renderPage();
    expect(getByText('Verified Power.')).not.toBeNull();
    expect(getByText('Trusted Passport.')).not.toBeNull();
    expect(getByText(/From BMS Signal to Blockchain Trust/)).not.toBeNull();
  });

  it('renders 5 value items with titles', () => {
    const { getByText } = renderPage();
    expect(getByText('VERIFIED POWER')).not.toBeNull();
    expect(getByText('TRUSTED PASSPORT')).not.toBeNull();
    expect(getByText('SECURE NETWORK')).not.toBeNull();
    expect(getByText('BATTERY LIFECYCLE')).not.toBeNull();
    expect(getByText('SUSTAINABLE FUTURE')).not.toBeNull();
  });

  it('navigates to /login when 시작하기 clicked', () => {
    const { getByText } = renderPage();
    fireEvent.click(getByText('시작하기'));
    expect(lastPath).toBe('/login');
  });

  it('renders 자세히 보기 anchor link to #landing-highlights', () => {
    const { getByText } = renderPage();
    const link = getByText('자세히 보기') as HTMLAnchorElement;
    expect(link.getAttribute('href')).toBe('#landing-highlights');
  });

  it('renders highlights section anchor target', () => {
    const { container } = renderPage();
    expect(container.querySelector('#landing-highlights')).not.toBeNull();
  });

  it('renders VELKERN wordmark + network hero images', () => {
    const { container } = renderPage();
    const imgs = container.querySelectorAll('img');
    expect(imgs.length).toBeGreaterThanOrEqual(2);
    const srcs = Array.from(imgs).map((i) => i.getAttribute('src'));
    expect(srcs).toContain('/velkern-wordmark-light.png');
    expect(srcs).toContain('/landing-network-hero.png');
  });
});
