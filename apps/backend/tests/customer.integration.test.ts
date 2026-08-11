import type { FastifyInstance } from 'fastify';
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { buildApp } from '../src/app.js';
import { AuthService } from '../src/modules/auth/auth.service.js';
import { hashPassword } from '../src/modules/auth/password.js';
import { CustomerService } from '../src/modules/customers/customer.service.js';
import type {
  CustomerListResult,
  CustomerPriceInput,
  CustomerPriceRecord,
  CustomerRecord,
  CustomerResponse,
} from '../src/modules/customers/customer.types.js';
import type { ErrorResponse, SuccessResponse } from '../src/shared/http/api-response.js';
import { InMemoryAuthRepository } from './helpers/in-memory-auth-repository.js';
import { InMemoryCustomerRepository } from './helpers/in-memory-customer-repository.js';

interface CustomerData {
  customer: CustomerResponse;
}

interface PricesData {
  prices: CustomerPriceInput[];
}

describe('Customer integration', () => {
  let app: FastifyInstance;
  let passwordHash: string;
  let sessionCookie: string;

  beforeAll(async () => {
    passwordHash = await hashPassword('ValidPassword123!');
  });

  beforeEach(async () => {
    const createdAt = new Date('2026-08-01T09:00:00.000Z');
    const updatedAt = new Date('2026-08-02T09:00:00.000Z');
    const customers: CustomerRecord[] = [
      {
        id: 'customer-alpha',
        name: 'Alpha Tekstil',
        contactName: 'Ayşe Kaya',
        phone: '0555 111 22 33',
        address: 'Merkez Mahallesi',
        notes: null,
        createdAt,
        updatedAt,
        deletedAt: null,
      },
      {
        id: 'customer-beta',
        name: 'Beta Konfeksiyon',
        contactName: 'Mehmet Demir',
        phone: '0555 222 33 44',
        address: null,
        notes: 'Öncelikli müşteri',
        createdAt,
        updatedAt,
        deletedAt: null,
      },
      {
        id: 'customer-gamma',
        name: 'Gamma Giyim',
        contactName: null,
        phone: '0555 333 44 55',
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
        deletedAt: new Date('2026-08-05T09:00:00.000Z'),
      },
    ];
    const prices: CustomerPriceRecord[] = [
      {
        id: 'price-1',
        customerId: 'customer-alpha',
        type: 'IRONING',
        unitPrice: '1.25',
        createdAt,
        updatedAt,
      },
    ];
    const customerRepository = new InMemoryCustomerRepository(customers, prices);
    const authRepository = new InMemoryAuthRepository([
      {
        id: 'active-admin',
        email: 'admin@zeva.test',
        passwordHash,
        name: 'Aktif Yönetici',
        role: 'ADMIN',
        isActive: true,
      },
    ]);

    app = await buildApp({
      logger: false,
      documentation: false,
      authService: new AuthService(authRepository),
      customerService: new CustomerService(customerRepository),
    });
    await app.ready();

    const loginResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: 'admin@zeva.test', password: 'ValidPassword123!' },
    });
    const setCookieHeader = loginResponse.headers['set-cookie'];
    sessionCookie =
      (Array.isArray(setCookieHeader) ? setCookieHeader[0] : setCookieHeader)?.split(';')[0] ?? '';
  });

  afterEach(async () => {
    await app.close();
  });

  it('tüm customer endpointlerini oturumsuz kullanıcıya kapatır', async () => {
    const requests = [
      { method: 'GET', url: '/api/v1/customers' },
      { method: 'POST', url: '/api/v1/customers', payload: { name: 'Yeni Müşteri' } },
      { method: 'GET', url: '/api/v1/customers/customer-alpha' },
      {
        method: 'PATCH',
        url: '/api/v1/customers/customer-alpha',
        payload: { name: 'Güncel Müşteri' },
      },
      { method: 'DELETE', url: '/api/v1/customers/customer-alpha' },
      { method: 'GET', url: '/api/v1/customers/trash' },
      { method: 'POST', url: '/api/v1/customers/customer-deleted/restore' },
      { method: 'GET', url: '/api/v1/customers/customer-alpha/prices' },
      {
        method: 'PUT',
        url: '/api/v1/customers/customer-alpha/prices',
        payload: { prices: [] },
      },
    ] as const;

    for (const request of requests) {
      const response = await app.inject(request);
      expect(response.statusCode).toBe(401);
      expect(response.json<ErrorResponse>().error.code).toBe('UNAUTHORIZED');
    }
  });

  it('müşteri oluşturur ve boş opsiyonel alanları null olarak normalize eder', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/customers',
      headers: { cookie: sessionCookie },
      payload: {
        name: '  Delta Tekstil  ',
        contactName: '   ',
        phone: '',
        address: '  Sanayi Sitesi  ',
      },
    });
    const body = response.json<SuccessResponse<CustomerData>>();

    expect(response.statusCode).toBe(201);
    expect(body.data.customer).toMatchObject({
      name: 'Delta Tekstil',
      contactName: null,
      phone: null,
      address: 'Sanayi Sitesi',
      notes: null,
      deletedAt: null,
    });
  });

  it('geçersiz müşteri verisini standart validation hatasıyla reddeder', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/customers',
      headers: { cookie: sessionCookie },
      payload: { name: ' ' },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json<ErrorResponse>().error.code).toBe('VALIDATION_ERROR');
  });

  it('yalnızca aktif müşterileri listeler', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/customers',
      headers: { cookie: sessionCookie },
    });
    const data = response.json<SuccessResponse<CustomerListResult>>().data;

    expect(response.statusCode).toBe(200);
    expect(data.items).toHaveLength(3);
    expect(data.items.map((customer) => customer.id)).not.toContain('customer-deleted');
    expect(data.pagination).toEqual({ page: 1, pageSize: 20, total: 3, totalPages: 1 });
  });

  it('müşterileri ad, yetkili ve telefon alanlarında arar', async () => {
    const responses = await Promise.all(
      ['beta', 'Ayşe', '333 44'].map((query) =>
        app.inject({
          method: 'GET',
          url: `/api/v1/customers?q=${encodeURIComponent(query)}`,
          headers: { cookie: sessionCookie },
        }),
      ),
    );
    const ids = responses.map(
      (response) => response.json<SuccessResponse<CustomerListResult>>().data.items[0]?.id,
    );

    expect(ids).toEqual(['customer-beta', 'customer-alpha', 'customer-gamma']);
  });

  it('müşteri listesini sayfalar', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/customers?page=2&pageSize=2',
      headers: { cookie: sessionCookie },
    });
    const data = response.json<SuccessResponse<CustomerListResult>>().data;

    expect(data.items).toHaveLength(1);
    expect(data.pagination).toEqual({ page: 2, pageSize: 2, total: 3, totalPages: 2 });
  });

  it('aktif müşteri detayını getirir', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/customers/customer-alpha',
      headers: { cookie: sessionCookie },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json<SuccessResponse<CustomerData>>().data.customer).toMatchObject({
      id: 'customer-alpha',
      name: 'Alpha Tekstil',
      contactName: 'Ayşe Kaya',
    });
  });

  it('olmayan ve silinmiş müşteriyi normal detail endpointinde bulamaz', async () => {
    for (const id of ['missing-customer', 'customer-deleted']) {
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/customers/${id}`,
        headers: { cookie: sessionCookie },
      });

      expect(response.statusCode).toBe(404);
      expect(response.json<ErrorResponse>().error.code).toBe('CUSTOMER_NOT_FOUND');
    }
  });

  it('aktif müşteriyi kısmi olarak günceller ve boş patchi reddeder', async () => {
    const updateResponse = await app.inject({
      method: 'PATCH',
      url: '/api/v1/customers/customer-alpha',
      headers: { cookie: sessionCookie },
      payload: { contactName: '  Yeni Yetkili  ', phone: '' },
    });

    expect(updateResponse.statusCode).toBe(200);
    expect(updateResponse.json<SuccessResponse<CustomerData>>().data.customer).toMatchObject({
      name: 'Alpha Tekstil',
      contactName: 'Yeni Yetkili',
      phone: null,
    });

    const emptyResponse = await app.inject({
      method: 'PATCH',
      url: '/api/v1/customers/customer-alpha',
      headers: { cookie: sessionCookie },
      payload: {},
    });
    expect(emptyResponse.statusCode).toBe(400);
    expect(emptyResponse.json<ErrorResponse>().error.code).toBe('VALIDATION_ERROR');
  });

  it('müşteriyi soft-delete eder; normal listeden kaldırıp trash listesine taşır', async () => {
    const deleteResponse = await app.inject({
      method: 'DELETE',
      url: '/api/v1/customers/customer-alpha',
      headers: { cookie: sessionCookie },
    });
    expect(deleteResponse.statusCode).toBe(200);

    const activeResponse = await app.inject({
      method: 'GET',
      url: '/api/v1/customers',
      headers: { cookie: sessionCookie },
    });
    const activeItems = activeResponse.json<SuccessResponse<CustomerListResult>>().data.items;
    expect(activeItems.map((customer) => customer.id)).not.toContain('customer-alpha');

    const detailResponse = await app.inject({
      method: 'GET',
      url: '/api/v1/customers/customer-alpha',
      headers: { cookie: sessionCookie },
    });
    expect(detailResponse.statusCode).toBe(404);

    const trashResponse = await app.inject({
      method: 'GET',
      url: '/api/v1/customers/trash?q=Alpha',
      headers: { cookie: sessionCookie },
    });
    const trashItems = trashResponse.json<SuccessResponse<CustomerListResult>>().data.items;
    expect(trashItems).toHaveLength(1);
    expect(trashItems[0]?.deletedAt).not.toBeNull();
  });

  it('silinmiş müşteriyi geri yükler ve yeniden normal listede gösterir', async () => {
    const restoreResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/customers/customer-deleted/restore',
      headers: { cookie: sessionCookie },
    });

    expect(restoreResponse.statusCode).toBe(200);
    expect(restoreResponse.json<SuccessResponse<CustomerData>>().data.customer.deletedAt).toBeNull();

    const listResponse = await app.inject({
      method: 'GET',
      url: '/api/v1/customers?q=Silinmiş',
      headers: { cookie: sessionCookie },
    });
    expect(listResponse.json<SuccessResponse<CustomerListResult>>().data.items[0]?.id).toBe(
      'customer-deleted',
    );
  });

  it('aktif müşteriyi restore etmeyi conflict hatasıyla reddeder', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/customers/customer-alpha/restore',
      headers: { cookie: sessionCookie },
    });

    expect(response.statusCode).toBe(409);
    expect(response.json<ErrorResponse>().error.code).toBe('CUSTOMER_ALREADY_ACTIVE');
  });

  it('müşterinin canonical decimal hizmet fiyatlarını getirir', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/customers/customer-alpha/prices',
      headers: { cookie: sessionCookie },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json<SuccessResponse<PricesData>>().data.prices).toEqual([
      { type: 'IRONING', unitPrice: '1.25' },
    ]);
  });

  it('müşteri fiyat setini tam replacement semantiğiyle değiştirir', async () => {
    const putResponse = await app.inject({
      method: 'PUT',
      url: '/api/v1/customers/customer-alpha/prices',
      headers: { cookie: sessionCookie },
      payload: {
        prices: [
          { type: 'PACKAGING', unitPrice: '0.75' },
          { type: 'PRINTING', unitPrice: '2' },
        ],
      },
    });

    expect(putResponse.statusCode).toBe(200);
    expect(putResponse.json<SuccessResponse<PricesData>>().data.prices).toEqual([
      { type: 'PACKAGING', unitPrice: '0.75' },
      { type: 'PRINTING', unitPrice: '2.00' },
    ]);

    const getResponse = await app.inject({
      method: 'GET',
      url: '/api/v1/customers/customer-alpha/prices',
      headers: { cookie: sessionCookie },
    });
    expect(getResponse.json<SuccessResponse<PricesData>>().data.prices).not.toContainEqual({
      type: 'IRONING',
      unitPrice: '1.25',
    });
  });

  it('payload içindeki tekrarlanan fiyat türünü reddeder', async () => {
    const response = await app.inject({
      method: 'PUT',
      url: '/api/v1/customers/customer-alpha/prices',
      headers: { cookie: sessionCookie },
      payload: {
        prices: [
          { type: 'IRONING', unitPrice: '1.00' },
          { type: 'IRONING', unitPrice: '2.00' },
        ],
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json<ErrorResponse>().error.code).toBe('VALIDATION_ERROR');
  });

  it('negatif, fazla hassas ve precision sınırını aşan fiyatları reddeder', async () => {
    for (const unitPrice of ['-1.00', '1.234', '10000000000.00']) {
      const response = await app.inject({
        method: 'PUT',
        url: '/api/v1/customers/customer-alpha/prices',
        headers: { cookie: sessionCookie },
        payload: { prices: [{ type: 'OTHER', unitPrice }] },
      });

      expect(response.statusCode).toBe(400);
      expect(response.json<ErrorResponse>().error.code).toBe('VALIDATION_ERROR');
    }
  });

  it('silinmiş müşteri için fiyat okuma ve güncelleme işlemlerini reddeder', async () => {
    const requests = [
      {
        method: 'GET',
        url: '/api/v1/customers/customer-deleted/prices',
        headers: { cookie: sessionCookie },
      },
      {
        method: 'PUT',
        url: '/api/v1/customers/customer-deleted/prices',
        headers: { cookie: sessionCookie },
        payload: { prices: [{ type: 'OTHER', unitPrice: '1.00' }] },
      },
    ] as const;

    for (const request of requests) {
      const response = await app.inject(request);
      expect(response.statusCode).toBe(404);
      expect(response.json<ErrorResponse>().error.code).toBe('CUSTOMER_NOT_FOUND');
    }
  });
});
