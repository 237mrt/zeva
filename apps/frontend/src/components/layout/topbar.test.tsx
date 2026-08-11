import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { AuthContext, type AuthContextValue } from '../../contexts/auth-context';
import { ToastContext, type ToastContextValue } from '../../contexts/toast-context';
import { Topbar } from './topbar';

const user = {
  id: 'admin-1',
  email: 'admin@zeva.test',
  name: 'Zeva Yöneticisi',
  role: 'ADMIN' as const,
};

describe('Topbar', () => {
  it('çıkış işlemi tamamlandığında login ekranına yönlendirir ve bildirim gösterir', async () => {
    const logout = vi.fn<AuthContextValue['logout']>().mockResolvedValue();
    const success = vi.fn<ToastContextValue['success']>(() => 'toast-id');
    const toastValue: ToastContextValue = {
      show: vi.fn(() => 'toast-id'),
      dismiss: vi.fn(),
      success,
      error: vi.fn(() => 'toast-id'),
      warning: vi.fn(() => 'toast-id'),
      info: vi.fn(() => 'toast-id'),
    };
    const authValue: AuthContextValue = {
      user,
      status: 'authenticated',
      login: vi.fn(),
      logout,
      refreshSession: vi.fn(),
    };

    render(
      <ToastContext.Provider value={toastValue}>
        <AuthContext.Provider value={authValue}>
          <MemoryRouter initialEntries={['/']}>
            <Routes>
              <Route path="/" element={<Topbar onMenuClick={vi.fn()} />} />
              <Route path="/login" element={<p>Giriş ekranı</p>} />
            </Routes>
          </MemoryRouter>
        </AuthContext.Provider>
      </ToastContext.Provider>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Çıkış yap' }));

    expect(await screen.findByText('Giriş ekranı')).toBeTruthy();
    expect(logout).toHaveBeenCalledOnce();
    expect(success).toHaveBeenCalledWith(
      'Oturum kapatıldı',
      'Güvenli şekilde çıkış yaptınız.',
    );
  });
});
