import { Suspense } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';

import { AppLoading } from '../components/feedback/app-loading';
import { GlobalErrorPage } from '../pages/global-error-page';
import { SetupPage } from '../pages/setup-page';

const router = createBrowserRouter([
  {
    path: '*',
    element: <SetupPage />,
    errorElement: <GlobalErrorPage />,
  },
]);

export function AppRouter() {
  return (
    <Suspense fallback={<AppLoading />}>
      <RouterProvider router={router} />
    </Suspense>
  );
}
