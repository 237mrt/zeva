import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { AuthContext, type AuthContextValue } from '../../contexts/auth-context';
import { GuestRoute, ProtectedRoute } from './auth-routes';

const user = {
  id: 'admin-1',
  email: 'admin@zeva.test',
  name: 'Zeva Yöneticisi',
  role: 'ADMIN' as const,
};

function renderRoutes(status: AuthContextValue['status'], initialEntry: string) {
  const value: AuthContextValue = {
    user: status === 'authenticated' ? user : null,
    status,
    login: () => Promise.resolve(user),
    logout: () => Promise.resolve(),
    refreshSession: () => Promise.resolve(),
  };

  return render(
    <AuthContext.Provider value={value}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route element={<GuestRoute />}>
            <Route path="/login" element={<p>Login ekranı</p>} />
          </Route>
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<p>Ana uygulama</p>} />
            <Route path="/korumali" element={<p>Korumalı içerik</p>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  );
}

describe('Auth routes', () => {
  it('oturumu olmayan kullanıcıyı login sayfasına yönlendirir', async () => {
    renderRoutes('unauthenticated', '/korumali');

    expect(await screen.findByText('Login ekranı')).toBeTruthy();
  });

  it('oturumu olan kullanıcıya korumalı içeriği gösterir', () => {
    renderRoutes('authenticated', '/korumali');

    expect(screen.getByText('Korumalı içerik')).toBeTruthy();
  });

  it('oturumu olan kullanıcıyı login sayfasından ana uygulamaya yönlendirir', async () => {
    renderRoutes('authenticated', '/login');

    expect(await screen.findByText('Ana uygulama')).toBeTruthy();
  });
});
