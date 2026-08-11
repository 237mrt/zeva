import { useQuery, useQueryClient } from '@tanstack/react-query';
import { type PropsWithChildren, useCallback, useMemo } from 'react';

import {
  AuthContext,
  type AuthContextValue,
  type AuthStatus,
  type AuthUser,
  type LoginCredentials,
} from '../../contexts/auth-context';
import { apiClient, ApiError } from '../../lib/api-client';

interface LoginResponseData {
  accessToken: string;
  user: AuthUser;
}

interface MeResponseData {
  user: AuthUser;
}

const authSessionQueryKey = ['auth', 'session'] as const;

async function getSession(): Promise<AuthUser | null> {
  try {
    const data = await apiClient.request<MeResponseData>('/auth/me');
    return data.user;
  } catch (error) {
    if (
      error instanceof ApiError &&
      (error.code === 'UNAUTHORIZED' || error.code === 'ACCOUNT_DISABLED')
    ) {
      return null;
    }

    throw error;
  }
}

export function AuthProvider({ children }: PropsWithChildren) {
  const queryClient = useQueryClient();
  const sessionQuery = useQuery({
    queryKey: authSessionQueryKey,
    queryFn: getSession,
    retry: false,
    staleTime: 5 * 60_000,
  });

  const login = useCallback(
    async (credentials: LoginCredentials): Promise<AuthUser> => {
      const data = await apiClient.request<LoginResponseData>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(credentials),
      });

      queryClient.setQueryData(authSessionQueryKey, data.user);
      return data.user;
    },
    [queryClient],
  );

  const logout = useCallback(async (): Promise<void> => {
    await apiClient.request<Record<string, never>>('/auth/logout', {
      method: 'POST',
    });
    apiClient.setAccessToken(null);
    queryClient.setQueryData(authSessionQueryKey, null);
  }, [queryClient]);

  const refreshSession = useCallback(async (): Promise<void> => {
    await sessionQuery.refetch();
  }, [sessionQuery]);

  let status: AuthStatus = 'unauthenticated';

  if (sessionQuery.isPending) {
    status = 'loading';
  } else if (sessionQuery.isError) {
    status = 'error';
  } else if (sessionQuery.data) {
    status = 'authenticated';
  }

  const value = useMemo<AuthContextValue>(
    () => ({
      user: sessionQuery.data ?? null,
      status,
      login,
      logout,
      refreshSession,
    }),
    [login, logout, refreshSession, sessionQuery.data, status],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
