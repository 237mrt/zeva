import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { AppErrorBoundary } from './app/app-error-boundary';
import { AppProviders } from './app/providers/app-providers';
import { AppRouter } from './app/router';
import './index.css';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Uygulama kök elementi bulunamadı.');
}

createRoot(rootElement).render(
  <StrictMode>
    <AppErrorBoundary>
      <AppProviders>
        <AppRouter />
      </AppProviders>
    </AppErrorBoundary>
  </StrictMode>,
);
