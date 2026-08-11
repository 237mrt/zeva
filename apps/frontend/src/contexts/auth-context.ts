import { createContext } from 'react';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN';
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated' | 'error';

export interface AuthContextValue {
  user: AuthUser | null;
  status: AuthStatus;
  login: (credentials: LoginCredentials) => Promise<AuthUser>;
  refreshSession: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
