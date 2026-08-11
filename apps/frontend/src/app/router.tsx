import { Suspense } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';

import { AppLoading } from '../components/feedback/app-loading';
import { CustomerPage } from '../features/customers/customer-page';
import { GuestRoute, ProtectedRoute } from '../components/auth/auth-routes';
import { AppLayout } from '../layouts/app-layout';
import { GlobalErrorPage } from '../pages/global-error-page';
import { LoginPage } from '../pages/login-page';
import { ModulePlaceholderPage } from '../pages/module-placeholder-page';

const router = createBrowserRouter([
  {
    element: <GuestRoute />,
    children: [
      {
        path: '/login',
        element: <LoginPage />,
      },
    ],
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        path: '/',
        element: <AppLayout />,
        errorElement: <GlobalErrorPage />,
        children: [
          {
            index: true,
            element: (
              <ModulePlaceholderPage
                eyebrow="Genel bakış"
                title="Dashboard"
                description="Atölyenin günlük iş akışı, üretim durumu ve finansal özeti bu alanda yer alacak."
              />
            ),
          },
          {
            path: 'isler',
            element: (
              <ModulePlaceholderPage
                eyebrow="Operasyon"
                title="İşler"
                description="İş emirleri ve üretim adımları ilerleyen geliştirme aşamasında burada yönetilecek."
              />
            ),
          },
          {
            path: 'utu-paket',
            element: (
              <ModulePlaceholderPage
                eyebrow="Üretim"
                title="Ütü / Paket"
                description="Ütü, paketleme, çuval ve koli hareketleri için çalışma alanı hazırlanacak."
              />
            ),
          },
          {
            path: 'baski',
            element: (
              <ModulePlaceholderPage
                eyebrow="Üretim"
                title="Baskı"
                description="Baskı operasyonlarının planlama ve takip araçları bu bölümde geliştirilecek."
              />
            ),
          },
          {
            path: 'musteriler',
            element: <CustomerPage />,
          },
          {
            path: 'muhasebe',
            element: (
              <ModulePlaceholderPage
                eyebrow="Finans"
                title="Muhasebe"
                description="Ödemeler, cari hesap ve hareket takibi için muhasebe alanı hazırlanacak."
              />
            ),
          },
          {
            path: 'raporlar',
            element: (
              <ModulePlaceholderPage
                eyebrow="Analiz"
                title="Raporlar"
                description="Günlük, aylık ve müşteri bazlı raporlar ilerleyen aşamada burada sunulacak."
              />
            ),
          },
          {
            path: 'ayarlar',
            element: (
              <ModulePlaceholderPage
                eyebrow="Sistem"
                title="Ayarlar"
                description="Uygulama ve atölye tercihleri için yapılandırma alanı burada yer alacak."
              />
            ),
          },
          {
            path: '*',
            element: (
              <ModulePlaceholderPage
                eyebrow="404"
                title="Sayfa bulunamadı"
                description="Aradığınız sayfa mevcut değil veya henüz kullanıma açılmadı."
              />
            ),
          },
        ],
      },
    ],
  },
]);

export function AppRouter() {
  return (
    <Suspense fallback={<AppLoading />}>
      <RouterProvider router={router} />
    </Suspense>
  );
}
