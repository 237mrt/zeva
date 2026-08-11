import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { type PropsWithChildren } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useAuth } from '../../hooks/use-auth';
import { apiClient, ApiError } from '../../lib/api-client';
import { AuthProvider } from './auth-provider';

const user = {
  id: 'admin-1',
  email: 'admin@zeva.test',
  name: 'Zeva Yöneticisi',
  role: 'ADMIN' as const,
};

function TestProviders({ children }: PropsWithChildren) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>{children}</AuthProvider>
    </QueryClientProvider>
  );
}

function SessionProbe() {
  const { user: sessionUser, status, login } = useAuth();

  return (
    <div>
      <span>{status}</span>
      {sessionUser ? <span>{sessionUser.name}</span> : null}
      <button
        type="button"
        onClick={() => {
          void login({ email: 'admin@zeva.test', password: 'ValidPassword123!' });
        }}
      >
        Oturum aç
      </button>
    </div>
  );
}

describe('AuthProvider', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('/auth/me cevabıyla mevcut session kullanıcısını yükler', async () => {
    vi.spyOn(apiClient, 'request').mockResolvedValue({ user });

    render(<SessionProbe />, { wrapper: TestProviders });

    expect(await screen.findByText('Zeva Yöneticisi')).toBeTruthy();
    expect(screen.getByText('authenticated')).toBeTruthy();
  });

  it('yetkisiz session cevabını temizler ve login sonrası kullanıcıyı saklar', async () => {
    vi.spyOn(apiClient, 'request')
      .mockRejectedValueOnce(new ApiError('UNAUTHORIZED', 'Oturum geçersiz.', 401))
      .mockResolvedValueOnce({ accessToken: 'token', user });

    render(<SessionProbe />, { wrapper: TestProviders });

    expect(await screen.findByText('unauthenticated')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Oturum aç' }));

    expect(await screen.findByText('Zeva Yöneticisi')).toBeTruthy();
    expect(screen.getByText('authenticated')).toBeTruthy();
  });
});
