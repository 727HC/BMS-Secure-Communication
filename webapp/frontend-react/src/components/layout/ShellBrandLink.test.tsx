import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ShellBrandLink from './ShellBrandLink';

describe('ShellBrandLink', () => {
  it('links to /dashboard with proper aria-label and data attribute', () => {
    const { container } = render(<MemoryRouter><ShellBrandLink /></MemoryRouter>);
    const a = container.querySelector('a') as HTMLAnchorElement;
    expect(a.getAttribute('href')).toBe('/dashboard');
    expect(a.getAttribute('aria-label')).toBe('VELKERN dashboard');
    expect(a.getAttribute('data-shell-brand')).toBe('velkern');
  });

  it('renders velkern-mini-logo.png img with alt VELKERN', () => {
    const { container } = render(<MemoryRouter><ShellBrandLink /></MemoryRouter>);
    const img = container.querySelector('img') as HTMLImageElement;
    expect(img.getAttribute('src')).toContain('velkern-mini-logo.png');
    expect(img.getAttribute('alt')).toBe('VELKERN');
    expect(img.getAttribute('draggable')).toBe('false');
  });
});
