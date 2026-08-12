import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ConfirmationContext, type ConfirmationContextValue } from '../../contexts/confirmation-context';
import { ToastContext, type ToastContextValue } from '../../contexts/toast-context';
import { CustomerDetailDialog } from './customer-detail-dialog';
import { CustomerPage } from './customer-page';
import {
  useCreateCustomer,
  useCustomerDetail,
  useCustomerList,
  useCustomerPrices,
  useDeleteCustomer,
  useReplaceCustomerPrices,
  useRestoreCustomer,
  useUpdateCustomer,
} from './customer.queries';
import type { Customer, CustomerListData } from './customer.types';
import { useAccountDetail } from '../finance/finance.queries';

vi.mock('../finance/finance.queries', () => ({ useAccountDetail: vi.fn() }));

vi.mock('./customer.queries', () => ({
  useCustomerList: vi.fn(),
  useCustomerDetail: vi.fn(),
  useCustomerPrices: vi.fn(),
  useCreateCustomer: vi.fn(),
  useUpdateCustomer: vi.fn(),
  useDeleteCustomer: vi.fn(),
  useRestoreCustomer: vi.fn(),
  useReplaceCustomerPrices: vi.fn(),
}));

const customer: Customer = {
  id: 'customer-1',
  name: 'Atlas Tekstil',
  contactName: 'Ayşe Kaya',
  phone: '0555 111 22 33',
  address: 'Sanayi Mahallesi',
  notes: 'Düzenli müşteri',
  createdAt: '2026-08-01T09:00:00.000Z',
  updatedAt: '2026-08-02T09:00:00.000Z',
  deletedAt: null,
};
const deletedCustomer: Customer = {
  ...customer,
  id: 'customer-deleted',
  name: 'Silinmiş Müşteri',
  deletedAt: '2026-08-05T09:00:00.000Z',
};
const lastPageCustomer: Customer = {
  ...customer,
  id: 'customer-last-page',
  name: 'Son Sayfa Müşterisi',
};
const deletedLastPageCustomer: Customer = {
  ...lastPageCustomer,
  id: 'customer-deleted-last-page',
  name: 'Son Sayfa Silinmiş Müşteri',
  deletedAt: '2026-08-06T09:00:00.000Z',
};
const listData: CustomerListData = {
  items: [customer],
  pagination: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
};
const emptyData: CustomerListData = {
  items: [],
  pagination: { page: 1, pageSize: 20, total: 0, totalPages: 0 },
};

const confirm = vi.fn<ConfirmationContextValue['confirm']>();
const toastValue: ToastContextValue = {
  show: vi.fn(() => 'toast-id'),
  success: vi.fn(() => 'toast-id'),
  error: vi.fn(() => 'toast-id'),
  warning: vi.fn(() => 'toast-id'),
  info: vi.fn(() => 'toast-id'),
  dismiss: vi.fn(),
};

function Providers({ children }: PropsWithChildren) {
  return (
    <MemoryRouter><ToastContext.Provider value={toastValue}>
      <ConfirmationContext.Provider value={{ confirm }}>{children}</ConfirmationContext.Provider>
    </ToastContext.Provider></MemoryRouter>
  );
}

function queryResult<T>(data: T | undefined, overrides: Record<string, unknown> = {}) {
  return {
    data,
    isPending: false,
    isError: false,
    isFetching: false,
    refetch: vi.fn(),
    ...overrides,
  };
}

async function waitForInitialSearchDebounce() {
  await new Promise<void>((resolve) => window.setTimeout(resolve, 275));
}

const create = vi.fn();
const update = vi.fn();
const remove = vi.fn();
const restore = vi.fn();
const replacePrices = vi.fn();

function configureQueries(activeData: CustomerListData = listData, trashData: CustomerListData = emptyData) {
  vi.mocked(useCustomerList).mockImplementation((params) =>
    queryResult(params.deleted ? trashData : activeData) as unknown as ReturnType<typeof useCustomerList>,
  );
  vi.mocked(useCustomerDetail).mockReturnValue(
    queryResult(customer) as unknown as ReturnType<typeof useCustomerDetail>,
  );
  vi.mocked(useCustomerPrices).mockReturnValue(
    queryResult([{ type: 'IRONING', unitPrice: '1.25' }]) as unknown as ReturnType<typeof useCustomerPrices>,
  );
  vi.mocked(useCreateCustomer).mockReturnValue(
    { mutateAsync: create, isPending: false } as unknown as ReturnType<typeof useCreateCustomer>,
  );
  vi.mocked(useUpdateCustomer).mockReturnValue(
    { mutateAsync: update, isPending: false } as unknown as ReturnType<typeof useUpdateCustomer>,
  );
  vi.mocked(useDeleteCustomer).mockReturnValue(
    { mutateAsync: remove, isPending: false } as unknown as ReturnType<typeof useDeleteCustomer>,
  );
  vi.mocked(useRestoreCustomer).mockReturnValue(
    { mutateAsync: restore, isPending: false } as unknown as ReturnType<typeof useRestoreCustomer>,
  );
  vi.mocked(useReplaceCustomerPrices).mockReturnValue(
    { mutateAsync: replacePrices, isPending: false } as unknown as ReturnType<
      typeof useReplaceCustomerPrices
    >,
  );
}

describe('CustomerPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    create.mockResolvedValue(customer);
    update.mockResolvedValue(customer);
    remove.mockResolvedValue({});
    restore.mockResolvedValue(customer);
    replacePrices.mockResolvedValue([]);
    confirm.mockResolvedValue(true);
    vi.mocked(useAccountDetail).mockReturnValue(
      queryResult({
        customer: { id: customer.id, name: customer.name },
        summary: { workOrderTotal: '1000.00', debitAdjustments: '0.00', paymentsTotal: '250.00', creditAdjustments: '0.00', balance: '750.00', lastPaymentAt: customer.updatedAt },
        statement: { items: [], pagination: { page: 1, pageSize: 1, total: 0, totalPages: 0 } },
      }) as unknown as ReturnType<typeof useAccountDetail>,
    );
    configureQueries();
  });

  it('müşteri listesini render eder', () => {
    render(<CustomerPage />, { wrapper: Providers });
    expect(screen.getByText('Atlas Tekstil')).toBeTruthy();
    expect(screen.getByText('Ayşe Kaya')).toBeTruthy();
  });

  it('loading skeleton gösterir', () => {
    vi.mocked(useCustomerList).mockReturnValue(
      queryResult(undefined, { isPending: true }) as unknown as ReturnType<typeof useCustomerList>,
    );
    render(<CustomerPage />, { wrapper: Providers });
    expect(screen.getByLabelText('Müşteriler yükleniyor')).toBeTruthy();
  });

  it('boş liste durumunu gösterir', () => {
    configureQueries(emptyData);
    render(<CustomerPage />, { wrapper: Providers });
    expect(screen.getByText('Henüz müşteri yok')).toBeTruthy();
  });

  it('API hata durumunu ve retry aksiyonunu gösterir', () => {
    vi.mocked(useCustomerList).mockReturnValue(
      queryResult(undefined, { isError: true }) as unknown as ReturnType<typeof useCustomerList>,
    );
    render(<CustomerPage />, { wrapper: Providers });
    expect(screen.getByText('Müşteriler yüklenemedi')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Tekrar dene' })).toBeTruthy();
  });

  it('arama değerini debounce sonrası query parametresine taşır', async () => {
    render(<CustomerPage />, { wrapper: Providers });
    fireEvent.change(screen.getByLabelText('Müşteri ara'), { target: { value: 'Atlas' } });

    await waitFor(() => {
      expect(vi.mocked(useCustomerList)).toHaveBeenLastCalledWith(
        expect.objectContaining({ q: 'Atlas', page: 1 }),
      );
    });
  });

  it('create formunda zorunlu alan validasyonunu gösterir', async () => {
    render(<CustomerPage />, { wrapper: Providers });
    fireEvent.click(screen.getByRole('button', { name: 'Yeni müşteri' }));
    fireEvent.click(screen.getByRole('button', { name: 'Müşteri oluştur' }));

    expect(await screen.findByText('Müşteri adı en az 2 karakter olmalıdır.')).toBeTruthy();
    expect(create).not.toHaveBeenCalled();
  });

  it('yeni müşteriyi normalize edilmiş payload ile oluşturur', async () => {
    render(<CustomerPage />, { wrapper: Providers });
    fireEvent.click(screen.getByRole('button', { name: 'Yeni müşteri' }));
    fireEvent.change(screen.getByLabelText(/Müşteri adı/), { target: { value: 'Yeni Tekstil' } });
    fireEvent.click(screen.getByRole('button', { name: 'Müşteri oluştur' }));

    await waitFor(() => {
      expect(create).toHaveBeenCalledWith({
        name: 'Yeni Tekstil',
        contactName: null,
        phone: null,
        address: null,
        notes: null,
      });
    });
    expect(toastValue.success).toHaveBeenCalledWith(
      'Müşteri oluşturuldu',
      'Yeni Tekstil müşteri listesine eklendi.',
    );
  });

  it('mevcut müşteri bilgilerini düzenler', async () => {
    render(<CustomerPage />, { wrapper: Providers });
    fireEvent.click(screen.getByRole('button', { name: 'Düzenle: Atlas Tekstil' }));
    const nameInput = screen.getByLabelText(/Müşteri adı/);
    expect((nameInput as HTMLInputElement).value).toBe('Atlas Tekstil');
    fireEvent.change(nameInput, { target: { value: 'Atlas Güncel' } });
    fireEvent.click(screen.getByRole('button', { name: 'Değişiklikleri kaydet' }));

    await waitFor(() => {
      expect(update).toHaveBeenCalledWith({
        id: 'customer-1',
        input: {
          name: 'Atlas Güncel',
          contactName: 'Ayşe Kaya',
          phone: '0555 111 22 33',
          address: 'Sanayi Mahallesi',
          notes: 'Düzenli müşteri',
        },
      });
    });
  });

  it('silmeden önce confirmation ister ve onayla siler', async () => {
    render(<CustomerPage />, { wrapper: Providers });
    fireEvent.click(screen.getByRole('button', { name: 'Sil: Atlas Tekstil' }));

    await waitFor(() => expect(confirm).toHaveBeenCalled());
    expect(remove).toHaveBeenCalledWith('customer-1');
  });

  it('trash görünümüne geçer ve müşteriyi geri yükler', async () => {
    configureQueries(listData, {
      items: [deletedCustomer],
      pagination: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
    });
    render(<CustomerPage />, { wrapper: Providers });
    fireEvent.click(screen.getByRole('button', { name: 'Çöp kutusu' }));

    expect(await screen.findByText('Silinmiş Müşteri')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Geri yükle: Silinmiş Müşteri' }));
    await waitFor(() => expect(restore).toHaveBeenCalledWith('customer-deleted'));
  });

  it('silme sonrası azalan aktif liste sayfasını son geçerli sayfaya çeker', async () => {
    let totalPages = 2;
    vi.mocked(useCustomerList).mockImplementation((params) => {
      if (params.deleted) return queryResult(emptyData) as unknown as ReturnType<typeof useCustomerList>;
      const data =
        params.page === 1
          ? {
              items: [customer],
              pagination: { page: 1, pageSize: 20, total: totalPages === 2 ? 21 : 20, totalPages },
            }
          : {
              items: totalPages === 2 ? [lastPageCustomer] : [],
              pagination: { page: 2, pageSize: 20, total: 20, totalPages },
            };
      return queryResult(data) as unknown as ReturnType<typeof useCustomerList>;
    });
    remove.mockImplementationOnce(() => {
      totalPages = 1;
      return Promise.resolve({});
    });

    const { rerender } = render(<CustomerPage />, { wrapper: Providers });
    await waitForInitialSearchDebounce();
    fireEvent.click(screen.getByRole('button', { name: 'Sonraki sayfa' }));
    expect(await screen.findByText('Son Sayfa Müşterisi')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Sil: Son Sayfa Müşterisi' }));

    await waitFor(() => expect(remove).toHaveBeenCalledWith('customer-last-page'));
    rerender(<CustomerPage />);

    await waitFor(() => {
      expect(vi.mocked(useCustomerList)).toHaveBeenLastCalledWith(
        expect.objectContaining({ deleted: false, page: 1 }),
      );
    });
    expect(await screen.findByText('Atlas Tekstil')).toBeTruthy();
    expect(screen.queryByText('Henüz müşteri yok')).toBeNull();
  });

  it('restore sonrası azalan trash sayfasını son geçerli sayfaya çeker', async () => {
    let trashTotalPages = 2;
    vi.mocked(useCustomerList).mockImplementation((params) => {
      if (!params.deleted) return queryResult(listData) as unknown as ReturnType<typeof useCustomerList>;
      const data =
        params.page === 1
          ? {
              items: [deletedCustomer],
              pagination: {
                page: 1,
                pageSize: 20,
                total: trashTotalPages === 2 ? 21 : 20,
                totalPages: trashTotalPages,
              },
            }
          : {
              items: trashTotalPages === 2 ? [deletedLastPageCustomer] : [],
              pagination: { page: 2, pageSize: 20, total: 20, totalPages: trashTotalPages },
            };
      return queryResult(data) as unknown as ReturnType<typeof useCustomerList>;
    });
    restore.mockImplementationOnce(() => {
      trashTotalPages = 1;
      return Promise.resolve(customer);
    });

    const { rerender } = render(<CustomerPage />, { wrapper: Providers });
    await waitForInitialSearchDebounce();
    fireEvent.click(screen.getByRole('button', { name: 'Çöp kutusu' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Sonraki sayfa' }));
    expect(await screen.findByText('Son Sayfa Silinmiş Müşteri')).toBeTruthy();
    fireEvent.click(
      screen.getByRole('button', { name: 'Geri yükle: Son Sayfa Silinmiş Müşteri' }),
    );

    await waitFor(() => expect(restore).toHaveBeenCalledWith('customer-deleted-last-page'));
    rerender(<CustomerPage />);

    await waitFor(() => {
      expect(vi.mocked(useCustomerList)).toHaveBeenLastCalledWith(
        expect.objectContaining({ deleted: true, page: 1 }),
      );
    });
    expect(await screen.findByText('Silinmiş Müşteri')).toBeTruthy();
    expect(screen.queryByText('Çöp kutusu boş')).toBeNull();
  });

  it('toplam sayfa sıfıra düştüğünde page değerini bire döndürür', async () => {
    let hasCustomers = true;
    vi.mocked(useCustomerList).mockImplementation((params) => {
      if (params.deleted) return queryResult(emptyData) as unknown as ReturnType<typeof useCustomerList>;
      if (!hasCustomers) {
        return queryResult({
          items: [],
          pagination: { page: params.page, pageSize: 20, total: 0, totalPages: 0 },
        }) as unknown as ReturnType<typeof useCustomerList>;
      }
      return queryResult(
        params.page === 1
          ? {
              items: [customer],
              pagination: { page: 1, pageSize: 20, total: 21, totalPages: 2 },
            }
          : {
              items: [lastPageCustomer],
              pagination: { page: 2, pageSize: 20, total: 21, totalPages: 2 },
            },
      ) as unknown as ReturnType<typeof useCustomerList>;
    });

    const { rerender } = render(<CustomerPage />, { wrapper: Providers });
    await waitForInitialSearchDebounce();
    fireEvent.click(screen.getByRole('button', { name: 'Sonraki sayfa' }));
    expect(await screen.findByText('Son Sayfa Müşterisi')).toBeTruthy();

    hasCustomers = false;
    rerender(<CustomerPage />);

    await waitFor(() => {
      expect(vi.mocked(useCustomerList)).toHaveBeenLastCalledWith(
        expect.objectContaining({ deleted: false, page: 1 }),
      );
    });
    expect(await screen.findByText('Henüz müşteri yok')).toBeTruthy();
  });

  it('customer price formunu string değerlerle kaydeder', async () => {
    render(
      <Providers>
        <CustomerDetailDialog customerId="customer-1" onClose={vi.fn()} onEdit={vi.fn()} />
      </Providers>,
    );
    const ironing = await screen.findByLabelText('Ütü');
    expect(screen.getByText('750,00 TL alınacak')).toBeTruthy();
    expect(screen.getByText('250,00 TL')).toBeTruthy();
    expect(screen.getByRole('button', { name: /Cari hesabı görüntüle/ })).toBeTruthy();
    expect((ironing as HTMLInputElement).value).toBe('1.25');
    fireEvent.change(screen.getByLabelText('Baskı'), { target: { value: '2.50' } });
    fireEvent.click(screen.getByRole('button', { name: 'Fiyatları kaydet' }));

    await waitFor(() => {
      expect(replacePrices).toHaveBeenCalledWith({
        id: 'customer-1',
        prices: [
          { type: 'IRONING', unitPrice: '1.25' },
          { type: 'PRINTING', unitPrice: '2.50' },
        ],
      });
    });
  });
});
