import { useContext } from 'react';

import { AuthContext, type AuthContextValue } from '../contexts/auth-context';

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth, AuthProvider içinde kullanılmalıdır.');
  }

  return context;
}
