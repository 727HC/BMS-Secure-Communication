import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

export interface AuthState {
  token: string | null;
  userId: string | null;
  org: string | null;
}

interface AuthContextValue extends AuthState {
  login: (userId: string, org: string, token: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(() => ({
    token: localStorage.getItem('auth_token'),
    userId: localStorage.getItem('auth_userId'),
    org: localStorage.getItem('auth_org'),
  }));

  useEffect(() => {
    if (state.token) localStorage.setItem('auth_token', state.token); else localStorage.removeItem('auth_token');
    if (state.userId) localStorage.setItem('auth_userId', state.userId); else localStorage.removeItem('auth_userId');
    if (state.org) localStorage.setItem('auth_org', state.org); else localStorage.removeItem('auth_org');
  }, [state]);

  const login = (userId: string, org: string, token: string) => {
    setState({ userId, org, token });
  };
  const logout = () => {
    setState({ userId: null, org: null, token: null });
  };

  return <AuthContext.Provider value={{ ...state, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
