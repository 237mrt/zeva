import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DashboardPage } from './dashboard-page';
import { useDashboard } from './reporting.queries';
import type { DashboardData } from './reporting.types';

vi.mock('./reporting.queries', () => ({ useDashboard: vi.fn() }));
const data: DashboardData = {
  kpis: { activeWorkOrders: 9, readyForDelivery: 4, deliveredQuantityThisMonth: 1300, totalReceivable: '1400.00' },
  metrics: { activeCustomerCount: 3, waitingWorkOrders: 2, inProgressWorkOrders: 3, packagedNotFullyDeliveredWorkOrders: 2, monthPayments: '800.00', overdueWorkOrders: 1 },
  workOrderStatuses: [{ status: 'WAITING', count: 2 }, { status: 'IN_PROGRESS', count: 3 }, { status: 'READY', count: 4 }],
  overdueWorkOrders: [{ id: 'wo-1', customer: { id: 'alpha', name: 'Alpha Tekstil' }, productName: 'Galatasaray Garson', status: 'IN_PROGRESS', dueAt: '2026-08-02T10:00:00.000Z', overdueDays: 10 }],
  recentActivity: [{ id: 'PAYMENT:1', sourceId: '1', type: 'PAYMENT', occurredAt: '2026-08-12T10:00:00.000Z', title: 'Tahsilat', description: 'Alpha Tekstil · 250.00 TL' }],
};
const result = (value: DashboardData | undefined, extra: Record<string, unknown> = {}) => ({ data: value, isPending: false, isError: false, refetch: vi.fn(), ...extra });
const renderPage = () => render(<MemoryRouter><DashboardPage /></MemoryRouter>);

describe('DashboardPage', () => {
  beforeEach(() => vi.mocked(useDashboard).mockReturnValue(result(data) as unknown as ReturnType<typeof useDashboard>));

  it('KPI, geciken işler, durum dağılımı ve son hareketleri render eder', () => {
    renderPage();
    expect(screen.getByText('9')).toBeTruthy(); expect(screen.getByText('1.400,00 TL')).toBeTruthy(); expect(screen.getByText('Galatasaray Garson')).toBeTruthy(); expect(screen.getByText(/10 gün gecikti/)).toBeTruthy(); expect(screen.getByText('Son Hareketler')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Detay' }).getAttribute('href')).toBe('/isler?workOrderId=wo-1');
  });

  it('mobil ve masaüstünde aynı semantik kart/list yapısını kullanır', () => {
    renderPage(); const section = screen.getByLabelText('Temel göstergeler');
    expect(section.className).toContain('grid-cols-2'); expect(section.className).toContain('lg:grid-cols-4'); expect(screen.getAllByRole('article').length).toBeGreaterThan(5);
  });

  it('loading ve error durumlarını açıkça gösterir', () => {
    vi.mocked(useDashboard).mockReturnValue(result(undefined, { isPending: true }) as unknown as ReturnType<typeof useDashboard>); const view = renderPage(); expect(screen.getByLabelText('Genel Bakış yükleniyor')).toBeTruthy();
    vi.mocked(useDashboard).mockReturnValue(result(undefined, { isError: true }) as unknown as ReturnType<typeof useDashboard>); view.rerender(<MemoryRouter><DashboardPage /></MemoryRouter>); expect(screen.getByText('Genel Bakış yüklenemedi')).toBeTruthy();
  });

  it('geciken iş ve hareket olmadığında açıklayıcı boş durum gösterir', () => {
    vi.mocked(useDashboard).mockReturnValue(result({ ...data, overdueWorkOrders: [], recentActivity: [] }) as unknown as ReturnType<typeof useDashboard>); renderPage(); expect(screen.getByText('Geciken iş bulunmuyor.')).toBeTruthy(); expect(screen.getByText('Henüz hareket bulunmuyor.')).toBeTruthy();
  });
});
