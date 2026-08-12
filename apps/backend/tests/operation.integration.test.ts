import type { FastifyInstance } from 'fastify';
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { buildApp } from '../src/app.js';
import { AuthService } from '../src/modules/auth/auth.service.js';
import { hashPassword } from '../src/modules/auth/password.js';
import { OperationService } from '../src/modules/operations/operation.service.js';
import type { DeliveryResponse } from '../src/modules/operations/operation.types.js';
import type { WorkOrderRecord } from '../src/modules/work-orders/work-order.types.js';
import type { ErrorResponse, SuccessResponse } from '../src/shared/http/api-response.js';
import { InMemoryAuthRepository } from './helpers/in-memory-auth-repository.js';
import { InMemoryOperationRepository } from './helpers/in-memory-operation-repository.js';

const now = new Date('2026-08-12T08:00:00.000Z');
const workOrder = (overrides: Partial<WorkOrderRecord> = {}): WorkOrderRecord => ({
  id: 'work-order-ready', customerId: 'customer-alpha', customer: { id: 'customer-alpha', name: 'Alpha Tekstil' },
  productName: 'Galatasaray Garson', type: 'IRONING_PACKAGING', status: 'READY', totalQuantity: 1000,
  unitPrice: '1.25', totalAmount: '1250.00', receivedAt: now, dueAt: null, notes: null,
  createdAt: now, updatedAt: now, deletedAt: null, ...overrides,
});

describe('Operations integration', () => {
  type Method = 'GET' | 'POST' | 'PATCH' | 'DELETE';
  let app: FastifyInstance;
  let cookie: string;
  let repository: InMemoryOperationRepository;
  let passwordHash: string;

  beforeAll(async () => { passwordHash = await hashPassword('ValidPassword123!'); });
  beforeEach(async () => {
    repository = new InMemoryOperationRepository([
      workOrder(),
      workOrder({ id: 'work-order-other', productName: 'Polo Yaka', totalQuantity: 300 }),
      workOrder({ id: 'work-order-beta', customerId: 'customer-beta', customer: { id: 'customer-beta', name: 'Beta Konfeksiyon' }, productName: 'Forma', totalQuantity: 400 }),
      workOrder({ id: 'work-order-waiting', status: 'WAITING' }),
      workOrder({ id: 'work-order-closed', status: 'CLOSED' }),
      workOrder({ id: 'work-order-deleted', deletedAt: now }),
    ]);
    app = await buildApp({
      logger: false,
      authService: new AuthService(new InMemoryAuthRepository([{ id: 'admin', email: 'admin@zeva.test', passwordHash, name: 'Yönetici', role: 'ADMIN', isActive: true }])),
      operationService: new OperationService(repository),
    });
    await app.ready();
    const response = await app.inject({ method: 'POST', url: '/api/v1/auth/login', payload: { email: 'admin@zeva.test', password: 'ValidPassword123!' } });
    const header = response.headers['set-cookie'];
    cookie = (Array.isArray(header) ? header[0] : header)?.split(';')[0] ?? '';
  });
  afterEach(async () => app.close());

  const request = (method: Method, url: string, payload?: unknown) => app.inject({ method, url, headers: { cookie }, ...(payload ? { payload } : {}) });
  const createPackages = async (workOrderId = 'work-order-ready', quantities = [250, 250]) => {
    const response = await request('POST', `/api/v1/work-orders/${workOrderId}/packages`, { packages: quantities.map((quantity) => ({ type: 'SACK', quantity })) });
    return response.json<SuccessResponse<{ packages: Array<{ id: string; sequenceNo: number; quantity: number }>; summary: { packagedQuantity: number; remainingQuantity: number } }>>().data;
  };

  it('tüm operasyon endpointlerini oturumsuz erişime kapatır', async () => {
    const calls: Array<[Method, string, unknown?]> = [
      ['GET', '/api/v1/work-orders/work-order-ready/packages', undefined],
      ['POST', '/api/v1/work-orders/work-order-ready/packages', { packages: [{ type: 'SACK', quantity: 1 }] }],
      ['PATCH', '/api/v1/work-order-packages/package-1', { quantity: 1 }],
      ['DELETE', '/api/v1/work-order-packages/package-1', undefined],
      ['GET', '/api/v1/customers/customer-alpha/deliverable-packages', undefined],
      ['GET', '/api/v1/deliveries', undefined],
      ['POST', '/api/v1/deliveries', { customerId: 'customer-alpha', packageIds: ['package-1'], deliveredAt: now.toISOString() }],
      ['GET', '/api/v1/deliveries/delivery-1', undefined],
      ['POST', '/api/v1/deliveries/delivery-1/cancel', undefined],
    ];
    for (const [method, url, payload] of calls) {
      const response = await app.inject({ method, url, ...(payload ? { payload } : {}) });
      expect(response.statusCode).toBe(401);
      expect(response.json<ErrorResponse>().error.code).toBe('UNAUTHORIZED');
    }
  });

  it('paketleri batch oluşturur, sıra numarası verir ve kısmi/tam özeti hesaplar', async () => {
    const first = await createPackages('work-order-ready', [250, 250, 250]);
    expect(first.packages.map((item) => item.sequenceNo)).toEqual([1, 2, 3]);
    expect(first.summary).toMatchObject({ packagedQuantity: 750, remainingQuantity: 250 });
    const second = await createPackages('work-order-ready', [250]);
    expect(second.packages.at(-1)?.sequenceNo).toBe(4);
    expect(second.summary).toMatchObject({ packagedQuantity: 1000, remainingQuantity: 0 });
  });

  it('geçersiz adet ve iş emri toplamını aşan batch isteğini reddeder', async () => {
    const invalid = await request('POST', '/api/v1/work-orders/work-order-ready/packages', { packages: [{ type: 'SACK', quantity: 0 }] });
    expect(invalid.statusCode).toBe(400);
    await createPackages('work-order-ready', [900]);
    const exceeded = await request('POST', '/api/v1/work-orders/work-order-ready/packages', { packages: [{ type: 'BOX', quantity: 101 }] });
    expect(exceeded.statusCode).toBe(422);
    expect(exceeded.json<ErrorResponse>().error.code).toBe('PACKAGE_QUANTITY_EXCEEDS_WORK_ORDER');
  });

  it('olmayan ve soft-delete iş emrinin paket işlemlerini reddeder', async () => {
    for (const id of ['missing', 'work-order-deleted']) {
      const response = await request('GET', `/api/v1/work-orders/${id}/packages`);
      expect(response.statusCode).toBe(404);
      expect(response.json<ErrorResponse>().error.code).toBe('WORK_ORDER_NOT_FOUND');
    }
  });

  it('teslim edilmemiş paketi düzenler ve soft-delete edilen paketi özetten çıkarır', async () => {
    const created = await createPackages('work-order-ready', [300, 200]);
    const updated = await request('PATCH', `/api/v1/work-order-packages/${created.packages[0]!.id}`, { type: 'BOX', quantity: 250, notes: 'Mavi koli' });
    expect(updated.statusCode).toBe(200);
    await request('DELETE', `/api/v1/work-order-packages/${created.packages[1]!.id}`);
    const list = await request('GET', '/api/v1/work-orders/work-order-ready/packages');
    expect(list.json<SuccessResponse<{ packages: unknown[]; summary: { packagedQuantity: number } }>>().data).toMatchObject({ packages: [expect.objectContaining({ type: 'BOX', notes: 'Mavi koli' })], summary: { packagedQuantity: 250 } });
  });

  it('boş/duplicate packageIds ve farklı müşteri paket enjeksiyonunu reddeder', async () => {
    const packages = await createPackages('work-order-ready', [250]);
    const other = await createPackages('work-order-beta', [100]);
    const bodies = [
      { customerId: 'customer-alpha', packageIds: [], deliveredAt: now.toISOString() },
      { customerId: 'customer-alpha', packageIds: [packages.packages[0]!.id, packages.packages[0]!.id], deliveredAt: now.toISOString() },
    ];
    for (const body of bodies) expect((await request('POST', '/api/v1/deliveries', body)).statusCode).toBe(400);
    const injected = await request('POST', '/api/v1/deliveries', { customerId: 'customer-alpha', packageIds: [other.packages[0]!.id], deliveredAt: now.toISOString() });
    expect(injected.statusCode).toBe(422);
    expect(injected.json<ErrorResponse>().error.code).toBe('DELIVERY_PACKAGE_CUSTOMER_MISMATCH');
  });

  it('teslimat toplamını backend hesaplar ve kısmi teslimatı paketlerle kaydeder', async () => {
    const packages = await createPackages('work-order-ready', [250, 250, 500]);
    const response = await request('POST', '/api/v1/deliveries', { customerId: 'customer-alpha', packageIds: packages.packages.slice(0, 2).map((item) => item.id), deliveredAt: now.toISOString(), receiverName: 'Ahmet Yılmaz', totalQuantity: 999 });
    const delivery = response.json<SuccessResponse<{ delivery: DeliveryResponse }>>().data.delivery;
    expect(response.statusCode).toBe(201);
    expect(delivery.totalQuantity).toBe(500);
    expect(delivery.packageCount).toBe(2);
    expect(repository.getWorkOrderStatus('work-order-ready')).toBe('READY');
  });

  it('tek teslimatta aynı müşterinin birden fazla iş emrinden paketlerini teslim eder', async () => {
    const first = await createPackages('work-order-ready', [500, 500]);
    const second = await createPackages('work-order-other', [100, 200]);
    const deliverable = await request('GET', '/api/v1/customers/customer-alpha/deliverable-packages');
    const available = deliverable.json<SuccessResponse<{ workOrders: Array<{ workOrder: { id: string }; packages: unknown[] }>; summary: { workOrderCount: number; packageCount: number; totalQuantity: number } }>>().data;
    expect(available.workOrders.map((group) => group.workOrder.id)).toEqual(expect.arrayContaining(['work-order-ready', 'work-order-other']));
    expect(available.summary).toMatchObject({ workOrderCount: 2, packageCount: 4, totalQuantity: 1300 });

    const response = await request('POST', '/api/v1/deliveries', {
      customerId: 'customer-alpha',
      packageIds: [first.packages[0]!.id, first.packages[1]!.id, second.packages[0]!.id],
      deliveredAt: now.toISOString(),
    });
    const delivery = response.json<SuccessResponse<{ delivery: DeliveryResponse }>>().data.delivery;
    expect(response.statusCode).toBe(201);
    expect(delivery).toMatchObject({ totalQuantity: 1100, packageCount: 3, workOrderCount: 2 });
    expect(new Set(delivery.packages.map((item) => item.workOrderId))).toEqual(new Set(['work-order-ready', 'work-order-other']));
    expect(repository.getWorkOrderStatus('work-order-ready')).toBe('DELIVERED');
    expect(repository.getWorkOrderStatus('work-order-other')).toBe('READY');
  });

  it('çoklu iş emri tam teslimatını ve cancellation durumlarını ayrı ayrı yeniden hesaplar', async () => {
    const first = await createPackages('work-order-ready', [1000]);
    const second = await createPackages('work-order-other', [300]);
    const created = await request('POST', '/api/v1/deliveries', {
      customerId: 'customer-alpha',
      packageIds: [first.packages[0]!.id, second.packages[0]!.id],
      deliveredAt: now.toISOString(),
    });
    const delivery = created.json<SuccessResponse<{ delivery: DeliveryResponse }>>().data.delivery;
    expect(repository.getWorkOrderStatus('work-order-ready')).toBe('DELIVERED');
    expect(repository.getWorkOrderStatus('work-order-other')).toBe('DELIVERED');

    repository.setWorkOrderStatus('work-order-other', 'CLOSED');
    const cancelled = await request('POST', `/api/v1/deliveries/${delivery.id}/cancel`);
    const audit = cancelled.json<SuccessResponse<{ delivery: DeliveryResponse }>>().data.delivery;
    expect(audit.packages).toHaveLength(2);
    expect(audit.workOrderCount).toBe(2);
    expect(repository.getWorkOrderStatus('work-order-ready')).toBe('READY');
    expect(repository.getWorkOrderStatus('work-order-other')).toBe('CLOSED');
  });

  it('aynı veya soft-delete paketi teslimata kabul etmez ve teslim edilmiş paketi değiştirmez/silmez', async () => {
    const packages = await createPackages('work-order-ready', [250, 250]);
    await request('DELETE', `/api/v1/work-order-packages/${packages.packages[1]!.id}`);
    const deleted = await request('POST', '/api/v1/deliveries', { customerId: 'customer-alpha', packageIds: [packages.packages[1]!.id], deliveredAt: now.toISOString() });
    expect(deleted.statusCode).toBe(422);
    await request('POST', '/api/v1/deliveries', { customerId: 'customer-alpha', packageIds: [packages.packages[0]!.id], deliveredAt: now.toISOString() });
    const duplicate = await request('POST', '/api/v1/deliveries', { customerId: 'customer-alpha', packageIds: [packages.packages[0]!.id], deliveredAt: now.toISOString() });
    expect(duplicate.statusCode).toBe(409);
    for (const [method, payload] of [['PATCH', { quantity: 200 }], ['DELETE', undefined]] as const) {
      const response = await request(method, `/api/v1/work-order-packages/${packages.packages[0]!.id}`, payload);
      expect(response.statusCode).toBe(409);
      expect(response.json<ErrorResponse>().error.code).toBe('PACKAGE_ALREADY_DELIVERED');
    }
  });

  it('yalnız READY iş emrinden teslimat oluşturur ve tam teslimatta DELIVERED yapar', async () => {
    const waiting = await createPackages('work-order-waiting', [1000]);
    const rejected = await request('POST', '/api/v1/deliveries', { customerId: 'customer-alpha', packageIds: [waiting.packages[0]!.id], deliveredAt: now.toISOString() });
    expect(rejected.statusCode).toBe(409);
    expect(rejected.json<ErrorResponse>().error.code).toBe('WORK_ORDER_NOT_READY_FOR_DELIVERY');
    const packages = await createPackages('work-order-ready', [500, 500]);
    const full = await request('POST', '/api/v1/deliveries', { customerId: 'customer-alpha', packageIds: packages.packages.map((item) => item.id), deliveredAt: now.toISOString() });
    expect(full.statusCode).toBe(201);
    expect(repository.getWorkOrderStatus('work-order-ready')).toBe('DELIVERED');
  });

  it('teslimat liste arama/filtre/pagination ve detayını sunar', async () => {
    const packages = await createPackages('work-order-ready', [250]);
    const created = await request('POST', '/api/v1/deliveries', { customerId: 'customer-alpha', packageIds: [packages.packages[0]!.id], deliveredAt: now.toISOString(), receiverName: 'Ahmet Yılmaz' });
    const id = created.json<SuccessResponse<{ delivery: DeliveryResponse }>>().data.delivery.id;
    for (const url of ['/api/v1/deliveries?q=Ahmet&page=1&pageSize=1', '/api/v1/deliveries?customerId=customer-alpha', '/api/v1/deliveries?workOrderId=work-order-ready']) {
      const response = await request('GET', url);
      expect(response.json<SuccessResponse<{ items: DeliveryResponse[] }>>().data.items).toHaveLength(1);
    }
    const detail = await request('GET', `/api/v1/deliveries/${id}`);
    expect(detail.json<SuccessResponse<{ delivery: DeliveryResponse }>>().data.delivery.packages[0]).toMatchObject({ sequenceNo: 1, quantity: 250 });
  });

  it('teslimatı iptal eder, audit paketlerini korur, paketi serbest bırakır ve tekrar teslim eder', async () => {
    const packages = await createPackages('work-order-ready', [1000]);
    const created = await request('POST', '/api/v1/deliveries', { customerId: 'customer-alpha', packageIds: [packages.packages[0]!.id], deliveredAt: now.toISOString() });
    const id = created.json<SuccessResponse<{ delivery: DeliveryResponse }>>().data.delivery.id;
    expect(repository.getWorkOrderStatus('work-order-ready')).toBe('DELIVERED');
    const cancelled = await request('POST', `/api/v1/deliveries/${id}/cancel`);
    const audit = cancelled.json<SuccessResponse<{ delivery: DeliveryResponse }>>().data.delivery;
    expect(audit.cancelledAt).not.toBeNull();
    expect(audit.packages).toHaveLength(1);
    expect(repository.getWorkOrderStatus('work-order-ready')).toBe('READY');
    expect((await request('POST', `/api/v1/deliveries/${id}/cancel`)).json<ErrorResponse>().error.code).toBe('DELIVERY_ALREADY_CANCELLED');
    expect((await request('POST', '/api/v1/deliveries', { customerId: 'customer-alpha', packageIds: [packages.packages[0]!.id], deliveredAt: now.toISOString() })).statusCode).toBe(201);
  });

  it('CLOSED iş emrini cancellation sırasında yeniden açmaz', async () => {
    const packages = await createPackages('work-order-ready', [100]);
    const created = await request('POST', '/api/v1/deliveries', { customerId: 'customer-alpha', packageIds: [packages.packages[0]!.id], deliveredAt: now.toISOString() });
    const id = created.json<SuccessResponse<{ delivery: DeliveryResponse }>>().data.delivery.id;
    repository.setWorkOrderStatus('work-order-ready', 'CLOSED');
    expect((await request('POST', `/api/v1/deliveries/${id}/cancel`)).statusCode).toBe(200);
    expect(repository.getWorkOrderStatus('work-order-ready')).toBe('CLOSED');
  });
});
