import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_userId';
const ORG_KEY = 'auth_org';

function readAuthValue(key: string): string | null {
  return sessionStorage.getItem(key) || localStorage.getItem(key);
}

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
    token: readAuthValue(TOKEN_KEY),
    userId: readAuthValue(USER_KEY),
    org: readAuthValue(ORG_KEY),
  }));

  useEffect(() => {
    if (state.token) {
      sessionStorage.setItem(TOKEN_KEY, state.token);
      localStorage.removeItem(TOKEN_KEY);
    } else {
      sessionStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(TOKEN_KEY);
    }
    if (state.userId) {
      sessionStorage.setItem(USER_KEY, state.userId);
      localStorage.removeItem(USER_KEY);
    } else {
      sessionStorage.removeItem(USER_KEY);
      localStorage.removeItem(USER_KEY);
    }
    if (state.org) {
      sessionStorage.setItem(ORG_KEY, state.org);
      localStorage.removeItem(ORG_KEY);
    } else {
      sessionStorage.removeItem(ORG_KEY);
      localStorage.removeItem(ORG_KEY);
    }
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
