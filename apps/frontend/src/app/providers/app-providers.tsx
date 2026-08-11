import {
  MutationCache,
  QueryCache,
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query';
import { type PropsWithChildren, useState } from 'react';

import { ConfirmationDialogProvider } from '../../components/feedback/confirmation-dialog-provider';
import { ToastProvider } from '../../components/feedback/toast-provider';
import { useToast } from '../../hooks/use-toast';
import { AuthProvider } from './auth-provider';

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Bağlantı sırasında beklenmeyen bir hata oluştu.';
}

function QueryProvider({ children }: PropsWithChildren) {
  const toast = useToast();
  const [queryClient] = useState(
    () =>
      new QueryClient({
        queryCache: new QueryCache({
          onError: (error) => {
            toast.error('Veriler yüklenemedi', getErrorMessage(error));
          },
        }),
        mutationCache: new MutationCache({
          onError: (error) => {
            toast.error('İşlem tamamlanamadı', getErrorMessage(error));
          },
        }),
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            retry: 1,
            refetchOnWindowFocus: false,
          },
          mutations: {
            retry: 0,
          },
        },
      }),
  );

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <ToastProvider>
      <ConfirmationDialogProvider>
        <QueryProvider>
          <AuthProvider>{children}</AuthProvider>
        </QueryProvider>
      </ConfirmationDialogProvider>
    </ToastProvider>
  );
}
