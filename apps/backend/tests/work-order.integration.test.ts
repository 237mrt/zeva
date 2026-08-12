import type { FastifyInstance } from 'fastify';
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { buildApp } from '../src/app.js';
import { AuthService } from '../src/modules/auth/auth.service.js';
import { hashPassword } from '../src/modules/auth/password.js';
import type { CustomerPriceRecord, CustomerRecord } from '../src/modules/customers/customer.types.js';
import { WorkOrderService } from '../src/modules/work-orders/work-order.service.js';
import type { WorkOrderListResult, WorkOrderRecord, WorkOrderResponse } from '../src/modules/work-orders/work-order.types.js';
import type { ErrorResponse, SuccessResponse } from '../src/shared/http/api-response.js';
import { InMemoryAuthRepository } from './helpers/in-memory-auth-repository.js';
import { InMemoryWorkOrderRepository } from './helpers/in-memory-work-order-repository.js';

interface WorkOrderData {
  workOrder: WorkOrderResponse;
}

const receivedAt = new Date('2026-08-12T08:00:00.000Z');
const dueAt = new Date('2026-08-15T17:00:00.000Z');
const createdAt = new Date('2026-08-10T08:00:00.000Z');
const updatedAt = new Date('2026-08-11T08:00:00.000Z');

function workOrder(
  overrides: Partial<WorkOrderRecord> & Pick<WorkOrderRecord, 'id'>,
): WorkOrderRecord {
  const { id, ...values } = overrides;
  return {
    id,
    customerId: 'customer-alpha',
    customer: { id: 'customer-alpha', name: 'Alpha Tekstil' },
    productName: 'Galatasaray Garson',
    type: 'IRONING',
    status: 'WAITING',
    totalQuantity: 100,
    unitPrice: '1.25',
    totalAmount: '125.00',
    receivedAt,
    dueAt,
    notes: null,
    createdAt,
    updatedAt,
    deletedAt: null,
    ...values,
  };
}

describe('WorkOrder integration', () => {
  let app: FastifyInstance;
  let passwordHash: string;
  let sessionCookie: string;
  let repository: InMemoryWorkOrderRepository;

  beforeAll(async () => {
    passwordHash = await hashPassword('ValidPassword123!');
  });

  beforeEach(async () => {
    const customers: CustomerRecord[] = [
      {
        id: 'customer-alpha',
        name: 'Alpha Tekstil',
        contactName: null,
        phone: null,
        address: null,
        notes: null,
        createdAt,
        updatedAt,
        deletedAt: null,
      },
      {
        id: 'customer-beta',
        name: 'Beta Konfeksiyon',
        contactName: null,
        phone: null,
        address: null,
        notes: null,
        createdAt,
        updatedAt,
        deletedAt: null,
      },
      {
        id: 'customer-deleted',
        name: 'Silinmiş Müşteri',
        contactName: null,
        phone: null,
        address: null,
        notes: null,
        createdAt,
        updatedAt,
        deletedAt: new Date('2026-08-09T08:00:00.000Z'),
      },
    ];
    const prices: CustomerPriceRecord[] = [
      {
        id: 'price-alpha-ironing',
        customerId: 'customer-alpha',
        type: 'IRONING',
        unitPrice: '1.25',
        createdAt,
        updatedAt,
      },
      {
        id: 'price-alpha-printing',
        customerId: 'customer-alpha',
        type: 'PRINTING',
        unitPrice: '2.00',
        createdAt,
        updatedAt,
      },
      {
        id: 'price-beta-packaging',
        customerId: 'customer-beta',
        type: 'PACKAGING',
        unitPrice: '2.50',
        createdAt,
        updatedAt,
      },
    ];
    const workOrders: WorkOrderRecord[] = [
      workOrder({ id: 'work-order-alpha' }),
      workOrder({
        id: 'work-order-beta',
        customerId: 'customer-beta',
        customer: { id: 'customer-beta', name: 'Beta Konfeksiyon' },
        productName: 'Polo Yaka',
        type: 'PACKAGING',
        status: 'READY',
        totalQuantity: 50,
        unitPrice: '2.50',
        totalAmount: '125.00',
        receivedAt: new Date('2026-08-13T08:00:00.000Z'),
      }),
      workOrder({
        id: 'work-order-print',
        productName: 'Logo Baskı',
        type: 'PRINTING',
        status: 'IN_PROGRESS',
        totalQuantity: 10,
        unitPrice: '2.00',
        totalAmount: '20.00',
        receivedAt: new Date('2026-08-11T08:00:00.000Z'),
      }),
      workOrder({
        id: 'work-order-deleted',
        productName: 'Silinmiş İş',
        deletedAt: new Date('2026-08-14T08:00:00.000Z'),
      }),
    ];
    repository = new InMemoryWorkOrderRepository(customers, prices, workOrders);
    app = await buildApp({
      logger: false,
      documentation: false,
      authService: new AuthService(
        new InMemoryAuthRepository([
          {
            id: 'active-admin',
            email: 'admin@zeva.test',
            passwordHash,
            name: 'Aktif Yönetici',
            role: 'ADMIN',
            isActive: true,
          },
        ]),
      ),
      workOrderService: new WorkOrderService(repository),
    });
    await app.ready();
    const loginResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: 'admin@zeva.test', password: 'ValidPassword123!' },
    });
    const setCookie = loginResponse.headers['set-cookie'];
    sessionCookie =
      (Array.isArray(setCookie) ? setCookie[0] : setCookie)?.split(';')[0] ?? '';
  });

  afterEach(async () => {
    await app.close();
  });

  function createPayload(overrides: Record<string, unknown> = {}) {
    return {
      customerId: 'customer-alpha',
      productName: 'Yeni İş Emri',
      type: 'IRONING',
      totalQuantity: 3,
      receivedAt: receivedAt.toISOString(),
      dueAt: dueAt.toISOString(),
      notes: 'Öncelikli',
      ...overrides,
    };
  }

  it('tüm WorkOrder endpointlerini oturumsuz kullanıcıya kapatır', async () => {
    const requests = [
      { method: 'GET', url: '/api/v1/work-orders' },
      { method: 'POST', url: '/api/v1/work-orders', payload: createPayload() },
      { method: 'GET', url: '/api/v1/work-orders/trash' },
      { method: 'GET', url: '/api/v1/work-orders/work-order-alpha' },
      { method: 'PATCH', url: '/api/v1/work-orders/work-order-alpha', payload: { totalQuantity: 2 } },
      { method: 'PATCH', url: '/api/v1/work-orders/work-order-alpha/status', payload: { status: 'READY' } },
      { method: 'DELETE', url: '/api/v1/work-orders/work-order-alpha' },
      { method: 'POST', url: '/api/v1/work-orders/work-order-deleted/restore' },
    ] as const;

    for (const request of requests) {
      const response = await app.inject(request);
      expect(response.statusCode).toBe(401);
      expect(response.json<ErrorResponse>().error.code).toBe('UNAUTHORIZED');
    }
  });

  it('açık birim fiyatla WAITING iş emri oluşturur ve toplamı Decimal ile hesaplar', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/work-orders',
      headers: { cookie: sessionCookie },
      payload: createPayload({ unitPrice: '0.10' }),
    });
    const created = response.json<SuccessResponse<WorkOrderData>>().data.workOrder;

    expect(response.statusCode).toBe(201);
    expect(created).toMatchObject({
      customer: { id: 'customer-alpha', name: 'Alpha Tekstil' },
      status: 'WAITING',
      totalQuantity: 3,
      unitPrice: '0.10',
      totalAmount: '0.30',
    });
  });

  it('birim fiyat verilmezse CustomerPrice varsayılanını kullanır', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/work-orders',
      headers: { cookie: sessionCookie },
      payload: createPayload({ totalQuantity: 100 }),
    });
    const created = response.json<SuccessResponse<WorkOrderData>>().data.workOrder;

    expect(response.statusCode).toBe(201);
    expect(created.unitPrice).toBe('1.25');
    expect(created.totalAmount).toBe('125.00');
  });

  it('olmayan ve soft-delete müşteriden iş emri oluşturmayı reddeder', async () => {
    for (const customerId of ['missing-customer', 'customer-deleted']) {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/work-orders',
        headers: { cookie: sessionCookie },
        payload: createPayload({ customerId, unitPrice: '1.00' }),
      });
      expect(response.statusCode).toBe(404);
      expect(response.json<ErrorResponse>().error.code).toBe('CUSTOMER_NOT_FOUND');
    }
  });

  it('fiyat ve müşteri varsayılanı yoksa açık domain hatası döndürür', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/work-orders',
      headers: { cookie: sessionCookie },
      payload: createPayload({ type: 'OTHER' }),
    });

    expect(response.statusCode).toBe(422);
    expect(response.json<ErrorResponse>().error.code).toBe('WORK_ORDER_UNIT_PRICE_REQUIRED');
  });

  it('geçersiz adet, decimal ve tarih sırasını validation hatasıyla reddeder', async () => {
    const payloads = [
      createPayload({ totalQuantity: 0, unitPrice: '1.00' }),
      createPayload({ totalQuantity: 1.5, unitPrice: '1.00' }),
      createPayload({ unitPrice: '-1.00' }),
      createPayload({ unitPrice: '1.234' }),
      createPayload({ dueAt: '2026-08-11T08:00:00.000Z' }),
    ];
    for (const payload of payloads) {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/work-orders',
        headers: { cookie: sessionCookie },
        payload,
      });
      expect(response.statusCode).toBe(400);
      expect(response.json<ErrorResponse>().error.code).toBe('VALIDATION_ERROR');
    }
  });

  it('yalnızca aktif iş emirlerini customer summary ile listeler', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/work-orders',
      headers: { cookie: sessionCookie },
    });
    const data = response.json<SuccessResponse<WorkOrderListResult>>().data;

    expect(data.items).toHaveLength(3);
    expect(data.items.map((item) => item.id)).not.toContain('work-order-deleted');
    expect(data.items[0]?.customer).toEqual({ id: 'customer-beta', name: 'Beta Konfeksiyon' });
    expect(data.pagination).toEqual({ page: 1, pageSize: 20, total: 3, totalPages: 1 });
  });

  it('ürün ve müşteri adına göre arar', async () => {
    const responses = await Promise.all(
      ['Logo', 'Beta'].map((query) =>
        app.inject({
          method: 'GET',
          url: `/api/v1/work-orders?q=${query}`,
          headers: { cookie: sessionCookie },
        }),
      ),
    );
    expect(
      responses.map(
        (response) =>
          response.json<SuccessResponse<WorkOrderListResult>>().data.items[0]?.id,
      ),
    ).toEqual(['work-order-print', 'work-order-beta']);
  });

  it('iş emri listesini sayfalar', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/work-orders?page=2&pageSize=2',
      headers: { cookie: sessionCookie },
    });
    const data = response.json<SuccessResponse<WorkOrderListResult>>().data;
    expect(data.items).toHaveLength(1);
    expect(data.pagination).toEqual({ page: 2, pageSize: 2, total: 3, totalPages: 2 });
  });

  it('müşteri, hizmet türü ve durum filtrelerini uygular', async () => {
    const cases = [
      ['/api/v1/work-orders?customerId=customer-beta', 'work-order-beta'],
      ['/api/v1/work-orders?type=PRINTING', 'work-order-print'],
      ['/api/v1/work-orders?status=WAITING', 'work-order-alpha'],
    ] as const;
    for (const [url, expectedId] of cases) {
      const response = await app.inject({ method: 'GET', url, headers: { cookie: sessionCookie } });
      const items = response.json<SuccessResponse<WorkOrderListResult>>().data.items;
      expect(items.map((item) => item.id)).toEqual([expectedId]);
    }
  });

  it('aktif iş emri detayını getirir ve canonical para alanları döndürür', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/work-orders/work-order-alpha',
      headers: { cookie: sessionCookie },
    });
    expect(response.statusCode).toBe(200);
    expect(response.json<SuccessResponse<WorkOrderData>>().data.workOrder).toMatchObject({
      id: 'work-order-alpha',
      unitPrice: '1.25',
      totalAmount: '125.00',
      customer: { id: 'customer-alpha', name: 'Alpha Tekstil' },
    });
  });

  it('olmayan ve silinmiş iş emrini normal detail endpointinde bulamaz', async () => {
    for (const id of ['missing-work-order', 'work-order-deleted']) {
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/work-orders/${id}`,
        headers: { cookie: sessionCookie },
      });
      expect(response.statusCode).toBe(404);
      expect(response.json<ErrorResponse>().error.code).toBe('WORK_ORDER_NOT_FOUND');
    }
  });

  it('boş PATCH ve status alanını normal update endpointinde reddeder', async () => {
    for (const payload of [{}, { status: 'READY' }]) {
      const response = await app.inject({
        method: 'PATCH',
        url: '/api/v1/work-orders/work-order-alpha',
        headers: { cookie: sessionCookie },
        payload,
      });
      expect(response.statusCode).toBe(400);
      expect(response.json<ErrorResponse>().error.code).toBe('VALIDATION_ERROR');
    }
  });

  it('adet değişince totalAmount değerini yeniden hesaplar', async () => {
    const response = await app.inject({
      method: 'PATCH',
      url: '/api/v1/work-orders/work-order-alpha',
      headers: { cookie: sessionCookie },
      payload: { totalQuantity: 7 },
    });
    const updated = response.json<SuccessResponse<WorkOrderData>>().data.workOrder;
    expect(updated.totalQuantity).toBe(7);
    expect(updated.totalAmount).toBe('8.75');
  });

  it('iş emri adedini paketlenmiş toplamın altına düşürmez', async () => {
    repository.setActivePackagedQuantity('work-order-alpha', 75);
    const response = await app.inject({
      method: 'PATCH',
      url: '/api/v1/work-orders/work-order-alpha',
      headers: { cookie: sessionCookie },
      payload: { totalQuantity: 50 },
    });
    expect(response.statusCode).toBe(422);
    expect(response.json<ErrorResponse>().error.code).toBe('WORK_ORDER_QUANTITY_BELOW_PACKAGED');
  });

  it('birim fiyat değişince canonical fiyat ve toplamı yeniden hesaplar', async () => {
    const response = await app.inject({
      method: 'PATCH',
      url: '/api/v1/work-orders/work-order-alpha',
      headers: { cookie: sessionCookie },
      payload: { unitPrice: '0.10' },
    });
    const updated = response.json<SuccessResponse<WorkOrderData>>().data.workOrder;
    expect(updated.unitPrice).toBe('0.10');
    expect(updated.totalAmount).toBe('10.00');
  });

  it('müşteri ve type değişince yeni CustomerPrice varsayılanını kullanır', async () => {
    const response = await app.inject({
      method: 'PATCH',
      url: '/api/v1/work-orders/work-order-alpha',
      headers: { cookie: sessionCookie },
      payload: { customerId: 'customer-beta', type: 'PACKAGING' },
    });
    const updated = response.json<SuccessResponse<WorkOrderData>>().data.workOrder;
    expect(updated.customer).toEqual({ id: 'customer-beta', name: 'Beta Konfeksiyon' });
    expect(updated.unitPrice).toBe('2.50');
    expect(updated.totalAmount).toBe('250.00');
  });

  it('pricing target değişiminde explicit fiyatı varsayılanın önüne geçirir', async () => {
    const response = await app.inject({
      method: 'PATCH',
      url: '/api/v1/work-orders/work-order-alpha',
      headers: { cookie: sessionCookie },
      payload: { customerId: 'customer-beta', type: 'PACKAGING', unitPrice: '3.00' },
    });
    const updated = response.json<SuccessResponse<WorkOrderData>>().data.workOrder;
    expect(updated.unitPrice).toBe('3.00');
    expect(updated.totalAmount).toBe('300.00');
  });

  it('pricing target değişip varsayılan bulunamazsa güncellemeyi reddeder', async () => {
    const response = await app.inject({
      method: 'PATCH',
      url: '/api/v1/work-orders/work-order-alpha',
      headers: { cookie: sessionCookie },
      payload: { type: 'OTHER' },
    });
    expect(response.statusCode).toBe(422);
    expect(response.json<ErrorResponse>().error.code).toBe('WORK_ORDER_UNIT_PRICE_REQUIRED');
  });

  it('müşteri değişiminde aktif müşteri zorunluluğunu korur', async () => {
    for (const customerId of ['missing-customer', 'customer-deleted']) {
      const response = await app.inject({
        method: 'PATCH',
        url: '/api/v1/work-orders/work-order-alpha',
        headers: { cookie: sessionCookie },
        payload: { customerId, unitPrice: '1.00' },
      });
      expect(response.statusCode).toBe(404);
      expect(response.json<ErrorResponse>().error.code).toBe('CUSTOMER_NOT_FOUND');
    }
  });

  it('PATCH sonrası birleşik tarih aralığını yeniden doğrular', async () => {
    const response = await app.inject({
      method: 'PATCH',
      url: '/api/v1/work-orders/work-order-alpha',
      headers: { cookie: sessionCookie },
      payload: { receivedAt: '2026-08-16T08:00:00.000Z' },
    });
    expect(response.statusCode).toBe(400);
    expect(response.json<ErrorResponse>().error.code).toBe('VALIDATION_ERROR');
  });

  it('CustomerPrice sonradan değişse de mevcut iş emri fiyat snapshotını korur', async () => {
    const createResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/work-orders',
      headers: { cookie: sessionCookie },
      payload: createPayload(),
    });
    const created = createResponse.json<SuccessResponse<WorkOrderData>>().data.workOrder;
    repository.setCustomerPrice('customer-alpha', 'IRONING', '9.99');

    const detailResponse = await app.inject({
      method: 'GET',
      url: `/api/v1/work-orders/${created.id}`,
      headers: { cookie: sessionCookie },
    });
    expect(detailResponse.json<SuccessResponse<WorkOrderData>>().data.workOrder.unitPrice).toBe(
      '1.25',
    );
  });

  it('status endpointi durumu değiştirir ve aynı durumu idempotent kabul eder', async () => {
    for (const status of ['READY', 'READY']) {
      const response = await app.inject({
        method: 'PATCH',
        url: '/api/v1/work-orders/work-order-alpha/status',
        headers: { cookie: sessionCookie },
        payload: { status },
      });
      expect(response.statusCode).toBe(200);
      expect(response.json<SuccessResponse<WorkOrderData>>().data.workOrder.status).toBe('READY');
    }
  });

  it('geçersiz status değerini reddeder', async () => {
    const response = await app.inject({
      method: 'PATCH',
      url: '/api/v1/work-orders/work-order-alpha/status',
      headers: { cookie: sessionCookie },
      payload: { status: 'UNKNOWN' },
    });
    expect(response.statusCode).toBe(400);
    expect(response.json<ErrorResponse>().error.code).toBe('VALIDATION_ERROR');
  });

  it('iş emrini soft-delete eder ve normal akışlardan gizler', async () => {
    const deleteResponse = await app.inject({
      method: 'DELETE',
      url: '/api/v1/work-orders/work-order-alpha',
      headers: { cookie: sessionCookie },
    });
    expect(deleteResponse.statusCode).toBe(200);

    const listResponse = await app.inject({
      method: 'GET',
      url: '/api/v1/work-orders',
      headers: { cookie: sessionCookie },
    });
    expect(
      listResponse
        .json<SuccessResponse<WorkOrderListResult>>()
        .data.items.map((item) => item.id),
    ).not.toContain('work-order-alpha');

    for (const request of [
      { method: 'GET', url: '/api/v1/work-orders/work-order-alpha' },
      { method: 'PATCH', url: '/api/v1/work-orders/work-order-alpha', payload: { notes: 'x' } },
      { method: 'PATCH', url: '/api/v1/work-orders/work-order-alpha/status', payload: { status: 'READY' } },
    ] as const) {
      const response = await app.inject({ ...request, headers: { cookie: sessionCookie } });
      expect(response.statusCode).toBe(404);
      expect(response.json<ErrorResponse>().error.code).toBe('WORK_ORDER_NOT_FOUND');
    }
  });

  it('trash listesi yalnızca silinmiş kayıtları ve filtreleri döndürür', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/work-orders/trash?q=Silinmiş&type=IRONING&status=WAITING',
      headers: { cookie: sessionCookie },
    });
    const data = response.json<SuccessResponse<WorkOrderListResult>>().data;
    expect(data.items.map((item) => item.id)).toEqual(['work-order-deleted']);
    expect(data.items[0]?.deletedAt).not.toBeNull();
  });

  it('silinmiş iş emrini geri yükler ve normal listede gösterir', async () => {
    const restoreResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/work-orders/work-order-deleted/restore',
      headers: { cookie: sessionCookie },
    });
    expect(restoreResponse.statusCode).toBe(200);
    expect(
      restoreResponse.json<SuccessResponse<WorkOrderData>>().data.workOrder.deletedAt,
    ).toBeNull();

    const listResponse = await app.inject({
      method: 'GET',
      url: '/api/v1/work-orders?q=Silinmiş',
      headers: { cookie: sessionCookie },
    });
    expect(listResponse.json<SuccessResponse<WorkOrderListResult>>().data.items[0]?.id).toBe(
      'work-order-deleted',
    );
  });

  it('olmayan restore için 404, aktif restore için 409 döndürür', async () => {
    const cases = [
      ['missing-work-order', 404, 'WORK_ORDER_NOT_FOUND'],
      ['work-order-alpha', 409, 'WORK_ORDER_ALREADY_ACTIVE'],
    ] as const;
    for (const [id, statusCode, code] of cases) {
      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/work-orders/${id}/restore`,
        headers: { cookie: sessionCookie },
      });
      expect(response.statusCode).toBe(statusCode);
      expect(response.json<ErrorResponse>().error.code).toBe(code);
    }
  });
});
