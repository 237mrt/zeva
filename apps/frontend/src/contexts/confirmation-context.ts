import { createContext } from 'react';

export interface ConfirmationOptions {
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'default' | 'danger';
}

export interface ConfirmationContextValue {
  confirm: (options: ConfirmationOptions) => Promise<boolean>;
}

export const ConfirmationContext = createContext<ConfirmationContextValue | null>(null);
