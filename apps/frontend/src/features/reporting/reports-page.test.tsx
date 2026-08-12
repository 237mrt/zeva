import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useCustomerList } from '../customers/customer.queries';
import { ReportsPage } from './reports-page';
import { useCustomerReport, useDeliveryReport, useFinanceReport, useWorkOrderReport } from './reporting.queries';
import type { CustomerReportData, DeliveryReportData, FinanceReportData, WorkOrderReportData } from './reporting.types';

vi.mock('../customers/customer.queries', () => ({ useCustomerList: vi.fn() }));
vi.mock('./reporting.queries', () => ({ useWorkOrderReport: vi.fn(), useDeliveryReport: vi.fn(), useFinanceReport: vi.fn(), useCustomerReport: vi.fn() }));
const customer = { id: 'alpha', name: 'Alpha Tekstil' }; const occurredAt = '2026-08-12T10:00:00.000Z'; const pagination = { page: 1, pageSize: 20, total: 21, totalPages: 2 };
const workOrders: WorkOrderReportData = { summary: { totalWorkOrders: 21, totalQuantity: 4500, totalAmount: '11250.00' }, statusDistribution: [{ status: 'READY', count: 21 }], typeDistribution: [{ type: 'IRONING_PACKAGING', count: 21 }], customerSummary: [{ customer, workOrderCount: 21, totalQuantity: 4500, totalAmount: '11250.00' }], items: [{ id: 'wo-1', customer, productName: 'Galatasaray Garson', type: 'IRONING_PACKAGING', status: 'READY', totalQuantity: 500, totalAmount: '1250.00', receivedAt: occurredAt }], pagination };
const deliveries: DeliveryReportData = { summary: { totalDeliveries: 1, totalPackages: 5, totalQuantity: 1300 }, customerSummary: [{ customer, deliveryCount: 1, totalQuantity: 1300 }], items: [{ id: 'delivery-1', customer, deliveredAt: occurredAt, workOrderCount: 2, packageCount: 5, totalQuantity: 1300, receiverName: 'Çağrı Şen', cancelledAt: null }, { id: 'delivery-2', customer, deliveredAt: occurredAt, workOrderCount: 1, packageCount: 1, totalQuantity: 200, receiverName: null, cancelledAt: occurredAt }], pagination: { ...pagination, total: 2, totalPages: 1 } };
const finance: FinanceReportData = { period: { workOrderTotal: '4000.00', paymentsTotal: '1250.00', debitAdjustments: '100.00', creditAdjustments: '50.00' }, current: { totalReceivable: '1400.00', totalCustomerCredit: '300.00' } };
const customers: CustomerReportData = { items: [{ customer, workOrderCount: 3, totalQuantity: 900, workOrderTotal: '2250.00', paymentsTotal: '750.00', debitAdjustments: '100.00', creditAdjustments: '50.00', balance: '1550.00', lastWorkOrderAt: occurredAt, lastPaymentAt: occurredAt }], pagination: { ...pagination, total: 1, totalPages: 1 } };
const query = <T,>(data: T | undefined, extra: Record<string, unknown> = {}) => ({ data, isPending: false, isError: false, isFetching: false, isPlaceholderData: false, refetch: vi.fn(), ...extra });

function configure() {
  vi.mocked(useWorkOrderReport).mockReturnValue(query(workOrders) as unknown as ReturnType<typeof useWorkOrderReport>); vi.mocked(useDeliveryReport).mockReturnValue(query(deliveries) as unknown as ReturnType<typeof useDeliveryReport>); vi.mocked(useFinanceReport).mockReturnValue(query(finance) as unknown as ReturnType<typeof useFinanceReport>); vi.mocked(useCustomerReport).mockReturnValue(query(customers) as unknown as ReturnType<typeof useCustomerReport>);
  vi.mocked(useCustomerList).mockReturnValue(query({ items: [{ ...customer, contactName: null, phone: null, address: null, notes: null, createdAt: occurredAt, updatedAt: occurredAt, deletedAt: null }], pagination: { page: 1, pageSize: 20, total: 1, totalPages: 1 } }) as unknown as ReturnType<typeof useCustomerList>);
}

describe('ReportsPage', () => {
  beforeEach(() => { vi.clearAllMocks(); configure(); });

  it('dört rapor sekmesini, iş emri özetini, masaüstü tabloyu ve mobil kartı gösterir', () => {
    render(<ReportsPage />); expect(screen.getAllByRole('tab')).toHaveLength(4); expect(screen.getByText('Toplam İş Emri')).toBeTruthy(); expect(screen.getByText('11.250,00 TL')).toBeTruthy(); expect(screen.getByText('Durum Dağılımı')).toBeTruthy(); expect(screen.getByText('Hizmet Dağılımı')).toBeTruthy(); expect(screen.getByText('Müşteri Özeti')).toBeTruthy(); expect(screen.getByRole('table')).toBeTruthy(); expect(screen.getAllByText('Galatasaray Garson')).toHaveLength(2);
  });

  it('custom dönem presetini ve özel tarih aralığını ISO filtrelerine dönüştürür', async () => {
    render(<ReportsPage />); fireEvent.click(screen.getByRole('button', { name: 'Dönem' })); fireEvent.click(screen.getByRole('option', { name: 'Son 7 Gün' })); await waitFor(() => { const params = vi.mocked(useWorkOrderReport).mock.lastCall?.[0]; expect(params?.from).toContain('T21:00:00.000Z'); expect(params?.to).toContain('T20:59:59.999Z'); });
    fireEvent.change(screen.getByLabelText('Başlangıç tarihi'), { target: { value: '2026-08-01' } }); fireEvent.change(screen.getByLabelText('Bitiş tarihi'), { target: { value: '2026-08-10' } }); await waitFor(() => { const params = vi.mocked(useWorkOrderReport).mock.lastCall?.[0]; expect(params?.from).toContain('2026-07-31T21:00:00'); expect(params?.to).toContain('2026-08-10T20:59:59'); });
  });

  it('müşteri combobox, hizmet ve durum Select filtrelerini uygular', async () => {
    render(<ReportsPage />); const box = screen.getByRole('combobox', { name: 'İş emri müşteri filtresi' }); fireEvent.focus(box); fireEvent.click(screen.getByRole('option', { name: 'Alpha Tekstil' })); fireEvent.click(screen.getByRole('button', { name: 'Hizmet türü' })); fireEvent.click(screen.getByRole('option', { name: 'Ütü + Paketleme' })); fireEvent.click(screen.getByRole('button', { name: 'İş durumu' })); fireEvent.click(screen.getByRole('option', { name: 'Hazır' })); await waitFor(() => expect(useWorkOrderReport).toHaveBeenLastCalledWith(expect.objectContaining({ customerId: 'alpha', type: 'IRONING_PACKAGING', status: 'READY', page: 1 }), true));
  });

  it('sayfalama yapar ve filtre değişince ilk sayfaya döner', async () => {
    render(<ReportsPage />); fireEvent.click(screen.getByLabelText('Sonraki sayfa')); await waitFor(() => expect(useWorkOrderReport).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2 }), true)); fireEvent.click(screen.getByRole('button', { name: 'İş durumu' })); fireEvent.click(screen.getByRole('option', { name: 'İşlemde' })); await waitFor(() => expect(useWorkOrderReport).toHaveBeenLastCalledWith(expect.objectContaining({ page: 1, status: 'IN_PROGRESS' }), true));
  });

  it('teslimat iptal kaydını gösterir, finans dönemini ve güncel cariyi ayırır', () => {
    render(<ReportsPage />); fireEvent.click(screen.getByRole('tab', { name: 'Teslimatlar' })); expect(screen.getAllByText('İptal Edildi').length).toBeGreaterThan(0); expect(screen.getByText('Aktif Teslimat')).toBeTruthy(); expect(screen.getByText('Müşteri Bazlı Teslimat')).toBeTruthy(); fireEvent.click(screen.getByRole('tab', { name: 'Finans' })); expect(screen.getByText('Seçilen Dönem')).toBeTruthy(); expect(screen.getByText('Güncel Cari Durum')).toBeTruthy(); expect(screen.getByText(/dönemden bağımsız/)).toBeTruthy();
  });

  it('müşteri raporunda toplu performans ve bakiye özetini gösterir', () => {
    render(<ReportsPage />); fireEvent.click(screen.getByRole('tab', { name: 'Müşteriler' })); expect(screen.getByRole('table')).toBeTruthy(); expect(screen.getAllByText('Alpha Tekstil').length).toBeGreaterThan(1); expect(screen.getAllByText('1.550,00 TL alınacak').length).toBeGreaterThan(0);
  });

  it('loading, error ve empty durumlarını açıkça gösterir', () => {
    vi.mocked(useWorkOrderReport).mockReturnValue(query(undefined, { isPending: true }) as unknown as ReturnType<typeof useWorkOrderReport>); const view = render(<ReportsPage />); expect(screen.getByLabelText('İş emri raporu yükleniyor')).toBeTruthy();
    vi.mocked(useWorkOrderReport).mockReturnValue(query(undefined, { isError: true }) as unknown as ReturnType<typeof useWorkOrderReport>); view.rerender(<ReportsPage />); expect(screen.getByText('İş emri raporu yüklenemedi')).toBeTruthy();
    vi.mocked(useWorkOrderReport).mockReturnValue(query({ ...workOrders, items: [] }) as unknown as ReturnType<typeof useWorkOrderReport>); view.rerender(<ReportsPage />); expect(screen.getByText('İş emri bulunamadı')).toBeTruthy();
  });
});
