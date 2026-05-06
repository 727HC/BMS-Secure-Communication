import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import RequireAuth from './RequireAuth';
import { AuthProvider } from '../../contexts/AuthContext';

describe('RequireAuth', () => {
  function renderRoute(initialPath: string) {
    return render(
      <AuthProvider>
        <MemoryRouter initialEntries={[initialPath]}>
          <Routes>
            <Route path="/login" element={<div data-testid="login-page" />} />
            <Route path="/secret" element={<RequireAuth><div data-testid="secret-page" /></RequireAuth>} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>,
    );
  }

  it('redirects to /login when no token', () => {
    sessionStorage.clear();
    localStorage.clear();
    const { queryByTestId } = renderRoute('/secret');
    expect(queryByTestId('login-page')).not.toBeNull();
    expect(queryByTestId('secret-page')).toBeNull();
  });

  it('renders children when token present in sessionStorage', () => {
    sessionStorage.clear();
    localStorage.clear();
    sessionStorage.setItem('auth_token', 'tk');
    const { queryByTestId } = renderRoute('/secret');
    expect(queryByTestId('secret-page')).not.toBeNull();
    expect(queryByTestId('login-page')).toBeNull();
    sessionStorage.clear();
  });
});
