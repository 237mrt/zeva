import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { ToastProvider } from '../components/feedback/toast-provider';
import { AuthContext, type AuthContextValue } from '../contexts/auth-context';
import { ApiError } from '../lib/api-client';
import { LoginPage } from './login-page';

function renderLogin(login: AuthContextValue['login']) {
  const authValue: AuthContextValue = {
    user: null,
    status: 'unauthenticated',
    login,
    refreshSession: () => Promise.resolve(),
  };

  return render(
    <ToastProvider>
      <AuthContext.Provider value={authValue}>
        <MemoryRouter>
          <LoginPage />
        </MemoryRouter>
      </AuthContext.Provider>
    </ToastProvider>,
  );
}

describe('LoginPage', () => {
  it('boş form gönderildiğinde alan validasyonlarını gösterir', async () => {
    const login = vi.fn<AuthContextValue['login']>();
    renderLogin(login);

    fireEvent.click(screen.getByRole('button', { name: 'Giriş yap' }));

    expect(await screen.findByText('E-posta adresi zorunludur.')).toBeTruthy();
    expect(await screen.findByText('Şifre zorunludur.')).toBeTruthy();
    expect(login).not.toHaveBeenCalled();
  });

  it('başarısız login hatasını formda ve toast içinde gösterir', async () => {
    const login = vi
      .fn<AuthContextValue['login']>()
      .mockRejectedValue(new ApiError('INVALID_CREDENTIALS', 'E-posta veya şifre hatalı.', 401));
    renderLogin(login);

    fireEvent.change(screen.getByLabelText('E-posta'), {
      target: { value: 'admin@zeva.test' },
    });
    fireEvent.change(screen.getByLabelText('Şifre'), {
      target: { value: 'WrongPassword123!' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Giriş yap' }));

    await waitFor(() => {
      expect(login).toHaveBeenCalledWith({
        email: 'admin@zeva.test',
        password: 'WrongPassword123!',
      });
    });
    expect((await screen.findAllByText('E-posta veya şifre hatalı.')).length).toBeGreaterThan(0);
    expect(screen.getByText('Giriş yapılamadı')).toBeTruthy();
  });
});
