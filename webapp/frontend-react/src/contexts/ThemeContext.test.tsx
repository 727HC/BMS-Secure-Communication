import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { ThemeProvider, useTheme } from './ThemeContext';

function wrap({ children }: { children: React.ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}

describe('ThemeContext', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('dark');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('useTheme throws when used outside provider', () => {
    expect(() => renderHook(() => useTheme())).toThrow(/ThemeProvider/);
  });

  it('reads saved theme=dark from localStorage and applies dark class', () => {
    localStorage.setItem('theme', 'dark');
    const { result } = renderHook(() => useTheme(), { wrapper: wrap });
    expect(result.current.theme).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('reads saved theme=light and removes dark class', () => {
    localStorage.setItem('theme', 'light');
    document.documentElement.classList.add('dark');
    const { result } = renderHook(() => useTheme(), { wrapper: wrap });
    expect(result.current.theme).toBe('light');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('falls back to prefers-color-scheme when no saved theme', () => {
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: true, media: '', addListener: vi.fn(), removeListener: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn(), onchange: null }));
    const { result } = renderHook(() => useTheme(), { wrapper: wrap });
    expect(result.current.theme).toBe('dark');
  });

  it('toggleTheme flips between light and dark and persists', () => {
    localStorage.setItem('theme', 'light');
    const { result } = renderHook(() => useTheme(), { wrapper: wrap });
    expect(result.current.theme).toBe('light');
    act(() => result.current.toggleTheme());
    expect(result.current.theme).toBe('dark');
    expect(localStorage.getItem('theme')).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    act(() => result.current.toggleTheme());
    expect(result.current.theme).toBe('light');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });
});
