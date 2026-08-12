import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ConfirmationContext, type ConfirmationContextValue } from '../../contexts/confirmation-context';
import { ToastContext, type ToastContextValue } from '../../contexts/toast-context';
import { useCustomerList, useCustomerPrices } from '../customers/customer.queries';
import type { Customer, CustomerListData } from '../customers/customer.types';
import { WorkOrderPage } from './work-order-page';
import {
  useCreateWorkOrder,
  useDeleteWorkOrder,
  useRestoreWorkOrder,
  useUpdateWorkOrder,
  useUpdateWorkOrderStatus,
  useWorkOrderDetail,
  useWorkOrderList,
} from './work-order.queries';
import type { WorkOrder, WorkOrderListData, WorkOrderMutationInput } from './work-order.types';
import { usePackageList } from '../operations/operation.queries';

vi.mock('./work-order.queries', () => ({
  useWorkOrderList: vi.fn(),
  useWorkOrderDetail: vi.fn(),
  useCreateWorkOrder: vi.fn(),
  useUpdateWorkOrder: vi.fn(),
  useUpdateWorkOrderStatus: vi.fn(),
  useDeleteWorkOrder: vi.fn(),
  useRestoreWorkOrder: vi.fn(),
}));

vi.mock('../customers/customer.queries', () => ({
  useCustomerList: vi.fn(),
  useCustomerPrices: vi.fn(),
}));

vi.mock('../operations/operation.queries', () => ({ usePackageList: vi.fn() }));

const customer: Customer = {
  id: 'customer-alpha',
  name: 'Alpha Tekstil',
  contactName: null,
  phone: null,
  address: null,
  notes: null,
  createdAt: '2026-08-01T08:00:00.000Z',
  updatedAt: '2026-08-02T08:00:00.000Z',
  deletedAt: null,
};
const betaCustomer: Customer = {
  ...customer,
  id: 'customer-beta',
  name: 'Beta Tekstil',
};
const customerData: CustomerListData = {
  items: [customer, betaCustomer],
  pagination: { page: 1, pageSize: 20, total: 2, totalPages: 1 },
};

const workOrder: WorkOrder = {
  id: 'work-order-alpha',
  customerId: customer.id,
  customer: { id: customer.id, name: customer.name },
  productName: 'Galatasaray Garson',
  type: 'IRONING',
  status: 'WAITING',
  totalQuantity: 100,
  unitPrice: '1.25',
  totalAmount: '125.00',
  receivedAt: '2026-08-12T08:00:00.000Z',
  dueAt: '2026-08-15T17:00:00.000Z',
  notes: 'Öncelikli',
  createdAt: '2026-08-10T08:00:00.000Z',
  updatedAt: '2026-08-11T08:00:00.000Z',
  deletedAt: null,
};

const deletedWorkOrder: WorkOrder = {
  ...workOrder,
  id: 'work-order-deleted',
  productName: 'Silinmiş İş Emri',
  deletedAt: '2026-08-16T08:00:00.000Z',
};
const lastPageWorkOrder: WorkOrder = {
  ...workOrder,
  id: 'work-order-last-page',
  productName: 'Son Sayfa İş Emri',
};
const listData: WorkOrderListData = {
  items: [workOrder],
  pagination: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
};
const emptyData: WorkOrderListData = {
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
    <ToastContext.Provider value={toastValue}>
      <ConfirmationContext.Provider value={{ confirm }}>{children}</ConfirmationContext.Provider>
    </ToastContext.Provider>
  );
}

function queryResult<T>(data: T | undefined, overrides: Record<string, unknown> = {}) {
  return { data, isPending: false, isError: false, isFetching: false, isPlaceholderData: false, refetch: vi.fn(), ...overrides };
}

const create = vi.fn<(input: WorkOrderMutationInput) => Promise<WorkOrder>>();
const update = vi.fn<
  (args: { id: string; input: WorkOrderMutationInput }) => Promise<WorkOrder>
>();
const updateStatus = vi.fn();
const remove = vi.fn();
const restore = vi.fn();

function configureQueries(activeData: WorkOrderListData = listData, trashData: WorkOrderListData = emptyData) {
  vi.mocked(useWorkOrderList).mockImplementation((params) =>
    queryResult(params.deleted ? trashData : activeData) as unknown as ReturnType<typeof useWorkOrderList>,
  );
  vi.mocked(useWorkOrderDetail).mockReturnValue(
    queryResult(workOrder) as unknown as ReturnType<typeof useWorkOrderDetail>,
  );
  vi.mocked(useCustomerList).mockReturnValue(
    queryResult(customerData) as unknown as ReturnType<typeof useCustomerList>,
  );
  vi.mocked(useCustomerPrices).mockImplementation((id) =>
    queryResult(
      id
        ? [
            { type: 'IRONING', unitPrice: id === betaCustomer.id ? '3.00' : '1.25' },
            { type: 'PRINTING', unitPrice: id === betaCustomer.id ? '4.00' : '2.00' },
          ]
        : [],
    ) as unknown as ReturnType<typeof useCustomerPrices>,
  );
  vi.mocked(usePackageList).mockReturnValue(
    queryResult({
      workOrder: { id: workOrder.id, productName: workOrder.productName, status: workOrder.status, totalQuantity: workOrder.totalQuantity, customer: workOrder.customer },
      packages: [],
      summary: { workOrderTotalQuantity: 100, packagedQuantity: 0, remainingQuantity: 100, deliveredQuantity: 0, packageCount: 0, deliveredPackageCount: 0 },
    }) as unknown as ReturnType<typeof usePackageList>,
  );
  vi.mocked(useCreateWorkOrder).mockReturnValue(
    { mutateAsync: create, isPending: false } as unknown as ReturnType<typeof useCreateWorkOrder>,
  );
  vi.mocked(useUpdateWorkOrder).mockReturnValue(
    { mutateAsync: update, isPending: false } as unknown as ReturnType<typeof useUpdateWorkOrder>,
  );
  vi.mocked(useUpdateWorkOrderStatus).mockReturnValue(
    { mutateAsync: updateStatus, isPending: false } as unknown as ReturnType<typeof useUpdateWorkOrderStatus>,
  );
  vi.mocked(useDeleteWorkOrder).mockReturnValue(
    { mutateAsync: remove, isPending: false } as unknown as ReturnType<typeof useDeleteWorkOrder>,
  );
  vi.mocked(useRestoreWorkOrder).mockReturnValue(
    { mutateAsync: restore, isPending: false } as unknown as ReturnType<typeof useRestoreWorkOrder>,
  );
}

function openCreateForm() {
  fireEvent.click(screen.getByRole('button', { name: 'Yeni iş emri' }));
}

function chooseSelect(label: string, option: string) {
  fireEvent.click(screen.getByRole('button', { name: label }));
  fireEvent.click(screen.getByRole('option', { name: option }));
}

function chooseCustomer(label: string, option: string) {
  const combobox = screen.getByRole('combobox', { name: label });
  fireEvent.focus(combobox);
  fireEvent.click(screen.getByRole('option', { name: option }));
}

function fillRequiredCreateFields() {
  chooseCustomer('Müşteri', customer.name);
  fireEvent.change(screen.getByLabelText(/İş \/ ürün adı/), { target: { value: 'Yeni Polo' } });
}

describe('WorkOrderPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    create.mockResolvedValue(workOrder);
    update.mockResolvedValue(workOrder);
    updateStatus.mockResolvedValue({ ...workOrder, status: 'READY' });
    remove.mockResolvedValue({});
    restore.mockResolvedValue(workOrder);
    confirm.mockResolvedValue(true);
    configureQueries();
  });

  it('iş emri listesini finansal ve müşteri bilgileriyle render eder', () => {
    render(<WorkOrderPage />, { wrapper: Providers });
    expect(screen.getByText('Galatasaray Garson')).toBeTruthy();
    expect(screen.getAllByText('Alpha Tekstil').length).toBeGreaterThan(0);
    expect(screen.getByText('125,00 TL')).toBeTruthy();
  });

  it('loading skeleton gösterir', () => {
    vi.mocked(useWorkOrderList).mockReturnValue(
      queryResult(undefined, { isPending: true }) as unknown as ReturnType<typeof useWorkOrderList>,
    );
    render(<WorkOrderPage />, { wrapper: Providers });
    expect(screen.getByLabelText('İş emirleri yükleniyor')).toBeTruthy();
  });

  it('boş liste durumunu gösterir', () => {
    configureQueries(emptyData);
    render(<WorkOrderPage />, { wrapper: Providers });
    expect(screen.getByText('Henüz iş emri yok')).toBeTruthy();
  });

  it('API hata durumunu ve retry aksiyonunu gösterir', () => {
    vi.mocked(useWorkOrderList).mockReturnValue(
      queryResult(undefined, { isError: true }) as unknown as ReturnType<typeof useWorkOrderList>,
    );
    render(<WorkOrderPage />, { wrapper: Providers });
    expect(screen.getByText('İş emirleri yüklenemedi')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Tekrar dene' })).toBeTruthy();
  });

  it('arama değerini debounce sonrası query parametresine taşır', async () => {
    render(<WorkOrderPage />, { wrapper: Providers });
    fireEvent.change(screen.getByLabelText('İş emri ara'), { target: { value: 'Forma' } });
    await waitFor(() => {
      expect(vi.mocked(useWorkOrderList)).toHaveBeenLastCalledWith(
        expect.objectContaining({ q: 'Forma', page: 1 }),
      );
    });
  });

  it('müşteri, hizmet ve durum filtrelerini uygular', async () => {
    render(<WorkOrderPage />, { wrapper: Providers });
    chooseCustomer('Müşteri filtresi', customer.name);
    chooseSelect('Hizmet türü filtresi', 'Ütü');
    chooseSelect('Durum filtresi', 'Bekliyor');
    await waitFor(() => {
      expect(vi.mocked(useWorkOrderList)).toHaveBeenLastCalledWith(
        expect.objectContaining({ customerId: customer.id, type: 'IRONING', status: 'WAITING', page: 1 }),
      );
    });
    fireEvent.click(screen.getByRole('button', { name: 'Filtreleri temizle' }));
  });

  it('pagination ile sonraki sayfaya geçer', async () => {
    vi.mocked(useWorkOrderList).mockImplementation((params) =>
      queryResult({
        items: [params.page === 1 ? workOrder : lastPageWorkOrder],
        pagination: { page: params.page, pageSize: 20, total: 21, totalPages: 2 },
      }) as unknown as ReturnType<typeof useWorkOrderList>,
    );
    render(<WorkOrderPage />, { wrapper: Providers });
    fireEvent.click(screen.getByRole('button', { name: 'Sonraki sayfa' }));
    expect(await screen.findByText('Son Sayfa İş Emri')).toBeTruthy();
  });

  it('pagination küçülünce son geçerli sayfaya döner ve sıfırı page bire map eder', async () => {
    let totalPages = 2;
    vi.mocked(useWorkOrderList).mockImplementation((params) =>
      queryResult({
        items: totalPages === 0 ? [] : [params.page === 1 ? workOrder : lastPageWorkOrder],
        pagination: {
          page: params.page,
          pageSize: 20,
          total: totalPages === 0 ? 0 : 21,
          totalPages,
        },
      }) as unknown as ReturnType<typeof useWorkOrderList>,
    );
    const { rerender } = render(<WorkOrderPage />, { wrapper: Providers });
    fireEvent.click(screen.getByRole('button', { name: 'Sonraki sayfa' }));
    expect(await screen.findByText('Son Sayfa İş Emri')).toBeTruthy();
    totalPages = 0;
    rerender(<WorkOrderPage />);
    await waitFor(() => {
      expect(vi.mocked(useWorkOrderList)).toHaveBeenLastCalledWith(
        expect.objectContaining({ page: 1, deleted: false }),
      );
    });
    expect(await screen.findByText('Henüz iş emri yok')).toBeTruthy();
  });

  it('create formunda zorunlu alan validasyonunu gösterir', async () => {
    render(<WorkOrderPage />, { wrapper: Providers });
    openCreateForm();
    fireEvent.click(screen.getByRole('button', { name: 'İş emri oluştur' }));
    expect(await screen.findByText('Müşteri seçmelisiniz.')).toBeTruthy();
    expect(screen.getByText('İş / ürün adı en az 2 karakter olmalıdır.')).toBeTruthy();
    expect(create).not.toHaveBeenCalled();
  });

  it('müşteri seçer ve CustomerPrice varsayılanını forma uygular', async () => {
    render(<WorkOrderPage />, { wrapper: Providers });
    openCreateForm();
    chooseCustomer('Müşteri', customer.name);
    expect(await screen.findByText('Müşteri varsayılanı: 1.25 TL')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Varsayılanı kullan' }));
    expect(screen.getByLabelText<HTMLInputElement>('Birim fiyat').value).toBe('1.25');
    expect(screen.getByText(/Kesin tutar kaydettiğinizde hesaplanır/)).toBeTruthy();
  });

  it('formdaki müşteri aramasını debounce sonrası müşteri sorgusuna taşır', async () => {
    render(<WorkOrderPage />, { wrapper: Providers });
    openCreateForm();
    fireEvent.change(screen.getByRole('combobox', { name: 'Müşteri' }), {
      target: { value: 'Alp' },
    });

    await waitFor(() => {
      expect(vi.mocked(useCustomerList)).toHaveBeenCalledWith(
        expect.objectContaining({ q: 'Alp', page: 1, pageSize: 20, deleted: false }),
      );
    });
  });

  it('yeni iş emrini totalAmount göndermeden oluşturur', async () => {
    render(<WorkOrderPage />, { wrapper: Providers });
    openCreateForm();
    fillRequiredCreateFields();
    fireEvent.click(screen.getByRole('button', { name: 'Varsayılanı kullan' }));
    fireEvent.click(screen.getByRole('button', { name: 'İş emri oluştur' }));
    await waitFor(() => expect(create).toHaveBeenCalled());
    const payload = create.mock.calls[0]?.[0];
    expect(payload).toMatchObject({
      customerId: customer.id,
      productName: 'Yeni Polo',
      totalQuantity: 1,
      unitPrice: '1.25',
    });
    expect(payload).not.toHaveProperty('totalAmount');
    expect(toastValue.success).toHaveBeenCalled();
  });

  it('mevcut iş emrini düzenler', async () => {
    render(<WorkOrderPage />, { wrapper: Providers });
    fireEvent.click(screen.getByRole('button', { name: 'Düzenle: Galatasaray Garson' }));
    const productInput = screen.getByLabelText(/İş \/ ürün adı/);
    fireEvent.change(productInput, { target: { value: 'Güncel Forma' } });
    fireEvent.click(screen.getByRole('button', { name: 'Değişiklikleri kaydet' }));
    await waitFor(() => expect(update).toHaveBeenCalled());
    expect(update.mock.calls[0]?.[0]).toMatchObject({
      id: workOrder.id,
      input: { productName: 'Güncel Forma', unitPrice: '1.25' },
    });
  });

  it('edit sırasında hizmet türü değişince eski fiyat snapshotını göndermez', async () => {
    render(<WorkOrderPage />, { wrapper: Providers });
    fireEvent.click(screen.getByRole('button', { name: 'Düzenle: Galatasaray Garson' }));

    expect(screen.getByLabelText<HTMLInputElement>('Birim fiyat').value).toBe('1.25');
    chooseSelect('Hizmet türü', 'Baskı');

    await waitFor(() => expect(screen.getByLabelText<HTMLInputElement>('Birim fiyat').value).toBe(''));
    expect(await screen.findByText('Müşteri varsayılanı: 2.00 TL')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Değişiklikleri kaydet' }));

    await waitFor(() => expect(update).toHaveBeenCalled());
    const input = update.mock.calls[0]?.[0].input;
    expect(input).toMatchObject({ type: 'PRINTING' });
    expect(input).not.toHaveProperty('unitPrice');
  });

  it('edit sırasında müşteri değişince eski fiyat snapshotını göndermez', async () => {
    render(<WorkOrderPage />, { wrapper: Providers });
    fireEvent.click(screen.getByRole('button', { name: 'Düzenle: Galatasaray Garson' }));

    chooseCustomer('Müşteri', betaCustomer.name);

    await waitFor(() => expect(screen.getByLabelText<HTMLInputElement>('Birim fiyat').value).toBe(''));
    expect(await screen.findByText('Müşteri varsayılanı: 3.00 TL')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Değişiklikleri kaydet' }));

    await waitFor(() => expect(update).toHaveBeenCalled());
    const input = update.mock.calls[0]?.[0].input;
    expect(input).toMatchObject({ customerId: betaCustomer.id });
    expect(input).not.toHaveProperty('unitPrice');
  });

  it('durumu tablo üzerinden değiştirir', async () => {
    render(<WorkOrderPage />, { wrapper: Providers });
    chooseSelect('Durum: Galatasaray Garson', 'Hazır');
    await waitFor(() =>
      expect(updateStatus).toHaveBeenCalledWith({ id: workOrder.id, status: 'READY' }),
    );
  });

  it('CANCELLED durumu için confirmation ister ve reddedilince değiştirmez', async () => {
    confirm.mockResolvedValueOnce(false);
    render(<WorkOrderPage />, { wrapper: Providers });
    chooseSelect('Durum: Galatasaray Garson', 'İptal');
    await waitFor(() => expect(confirm).toHaveBeenCalled());
    expect(updateStatus).not.toHaveBeenCalled();
  });

  it('silmeden önce confirmation ister', async () => {
    render(<WorkOrderPage />, { wrapper: Providers });
    fireEvent.click(screen.getByRole('button', { name: 'Sil: Galatasaray Garson' }));
    await waitFor(() => expect(confirm).toHaveBeenCalled());
    await waitFor(() => expect(remove).toHaveBeenCalledWith(workOrder.id));
  });

  it('trash görünümünde silinmiş iş emrini geri yükler', async () => {
    configureQueries(listData, {
      items: [deletedWorkOrder],
      pagination: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
    });
    render(<WorkOrderPage />, { wrapper: Providers });
    fireEvent.click(screen.getByRole('button', { name: 'Çöp kutusu' }));
    expect(await screen.findByText('Silinmiş İş Emri')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Geri yükle: Silinmiş İş Emri' }));
    await waitFor(() => expect(restore).toHaveBeenCalledWith(deletedWorkOrder.id));
  });

  it('iş emri detayını açar', async () => {
    render(<WorkOrderPage />, { wrapper: Providers });
    fireEvent.click(screen.getByRole('button', { name: 'Detayı görüntüle: Galatasaray Garson' }));
    expect(await screen.findByRole('heading', { name: 'Galatasaray Garson' })).toBeTruthy();
    expect(screen.getAllByText('125.00 TL').length).toBeGreaterThan(0);
    expect(screen.getByText('Öncelikli')).toBeTruthy();
  });

  it('mutation API hatasında formu açık tutar', async () => {
    create.mockRejectedValueOnce(new Error('API hatası'));
    render(<WorkOrderPage />, { wrapper: Providers });
    openCreateForm();
    fillRequiredCreateFields();
    fireEvent.click(screen.getByRole('button', { name: 'İş emri oluştur' }));
    await waitFor(() => expect(create).toHaveBeenCalled());
    expect(screen.getByRole('heading', { name: 'Yeni iş emri' })).toBeTruthy();
  });
});
