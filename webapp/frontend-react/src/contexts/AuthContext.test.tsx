import { beforeEach, describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { AuthProvider, useAuth } from './AuthContext';

function wrap({ children }: { children: React.ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}

describe('AuthContext', () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
  });

  it('useAuth throws outside provider', () => {
    expect(() => renderHook(() => useAuth())).toThrow(/AuthProvider/);
  });

  it('initial state is null when no storage values', () => {
    const { result } = renderHook(() => useAuth(), { wrapper: wrap });
    expect(result.current.token).toBeNull();
    expect(result.current.userId).toBeNull();
    expect(result.current.org).toBeNull();
  });

  it('reads initial state from sessionStorage', () => {
    sessionStorage.setItem('auth_token', 'tk');
    sessionStorage.setItem('auth_userId', 'u1');
    sessionStorage.setItem('auth_org', 'ManufacturerMSP');
    const { result } = renderHook(() => useAuth(), { wrapper: wrap });
    expect(result.current.token).toBe('tk');
    expect(result.current.userId).toBe('u1');
    expect(result.current.org).toBe('ManufacturerMSP');
  });

  it('falls back to localStorage when sessionStorage missing', () => {
    localStorage.setItem('auth_token', 'lt');
    localStorage.setItem('auth_userId', 'lu');
    localStorage.setItem('auth_org', 'RegulatorMSP');
    const { result } = renderHook(() => useAuth(), { wrapper: wrap });
    expect(result.current.token).toBe('lt');
    expect(result.current.userId).toBe('lu');
    expect(result.current.org).toBe('RegulatorMSP');
  });

  it('login updates state and persists session+legacy keys', () => {
    const { result } = renderHook(() => useAuth(), { wrapper: wrap });
    act(() => result.current.login('alice', 'ManufacturerMSP', 'tk-1'));
    expect(result.current.token).toBe('tk-1');
    expect(result.current.userId).toBe('alice');
    expect(result.current.org).toBe('ManufacturerMSP');
    expect(sessionStorage.getItem('auth_token')).toBe('tk-1');
    expect(localStorage.getItem('bp_token')).toBe('tk-1');
    expect(localStorage.getItem('bp_userId')).toBe('alice');
    expect(localStorage.getItem('bp_orgMsp')).toBe('ManufacturerMSP');
    // legacy localStorage auth_* should be cleared
    expect(localStorage.getItem('auth_token')).toBeNull();
  });

  it('logout clears state and storage', () => {
    sessionStorage.setItem('auth_token', 'tk');
    const { result } = renderHook(() => useAuth(), { wrapper: wrap });
    act(() => result.current.login('alice', 'ManufacturerMSP', 'tk-1'));
    act(() => result.current.logout());
    expect(result.current.token).toBeNull();
    expect(sessionStorage.getItem('auth_token')).toBeNull();
    expect(localStorage.getItem('bp_token')).toBeNull();
    expect(localStorage.getItem('bp_userId')).toBeNull();
    expect(localStorage.getItem('bp_orgMsp')).toBeNull();
  });
});
