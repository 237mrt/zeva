import { useContext } from 'react';

import { ToastContext, type ToastContextValue } from '../contexts/toast-context';

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error('useToast, ToastProvider içinde kullanılmalıdır.');
  }

  return context;
}
