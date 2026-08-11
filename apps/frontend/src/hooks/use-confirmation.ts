import { useContext } from 'react';

import {
  ConfirmationContext,
  type ConfirmationContextValue,
} from '../contexts/confirmation-context';

export function useConfirmation(): ConfirmationContextValue {
  const context = useContext(ConfirmationContext);

  if (!context) {
    throw new Error('useConfirmation, ConfirmationDialogProvider içinde kullanılmalıdır.');
  }

  return context;
}
