import type { FastifyInstance } from 'fastify';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { buildApp } from '../src/app.js';
import { AuthService } from '../src/modules/auth/auth.service.js';
import { hashPassword } from '../src/modules/auth/password.js';
import { FinanceService } from '../src/modules/finance/finance.service.js';
import type { ErrorResponse, SuccessResponse } from '../src/shared/http/api-response.js';
import { InMemoryAuthRepository } from './helpers/in-memory-auth-repository.js';
import { InMemoryFinanceRepository } from './helpers/in-memory-finance-repository.js';

const at = (day: number) => new Date(`2026-08-${String(day).padStart(2, '0')}T10:00:00.000Z`);
const customers = [
  { id: 'alpha', name: 'Alpha Tekstil', deletedAt: null },
  { id: 'beta', name: 'Beta Konfeksiyon', deletedAt: null },
  { id: 'gamma', name: 'Gamma Giyim', deletedAt: null },
  { id: 'deleted', name: 'Silinen Müşteri', deletedAt: at(1) },
];
const workOrders = [
  { id: 'wo-alpha-1', customerId: 'alpha', productName: 'Garson Forma', totalAmount: '1250.00', status: 'READY', receivedAt: at(5), updatedAt: at(5), deletedAt: null },
  { id: 'wo-alpha-cancelled', customerId: 'alpha', productName: 'İptal İş', totalAmount: '900.00', status: 'CANCELLED', receivedAt: at(4), updatedAt: at(4), deletedAt: null },
  { id: 'wo-alpha-deleted', customerId: 'alpha', productName: 'Silinen İş', totalAmount: '700.00', status: 'READY', receivedAt: at(3), updatedAt: at(3), deletedAt: at(3) },
  { id: 'wo-beta', customerId: 'beta', productName: 'Polo Yaka', totalAmount: '500.00', status: 'DELIVERED', receivedAt: at(2), updatedAt: at(2), deletedAt: null },
];

describe('Finance integration', () => {
  let app: FastifyInstance; let repository: InMemoryFinanceRepository; let cookie: string; let passwordHash: string;
  beforeAll(async () => { passwordHash = await hashPassword('ValidPassword123!'); });
  beforeEach(async () => {
    repository = new InMemoryFinanceRepository(customers, workOrders);
    app = await buildApp({ logger: false, documentation: false, authService: new AuthService(new InMemoryAuthRepository([{ id: 'admin', email: 'admin@zeva.test', passwordHash, name: 'Yönetici', role: 'ADMIN', isActive: true }])), financeService: new FinanceService(repository) });
    await app.ready();
    const login = await app.inject({ method: 'POST', url: '/api/v1/auth/login', payload: { email: 'admin@zeva.test', password: 'ValidPassword123!' } });
    const header = login.headers['set-cookie']; cookie = (Array.isArray(header) ? header[0] : header)?.split(';')[0] ?? '';
  });
  afterEach(async () => app.close());
  const request = (method: 'GET' | 'POST', url: string, payload?: unknown) => app.inject({ method, url, headers: { cookie }, ...(payload ? { payload } : {}) });
  const createPayment = (overrides: Record<string, unknown> = {}) => request('POST', '/api/v1/payments', { customerId: 'alpha', amount: '250.5', method: 'BANK_TRANSFER', paidAt: at(10).toISOString(), referenceNo: ' EFT-42 ', notes: ' İlk tahsilat ', ...overrides });
  const createAdjustment = (type: 'DEBIT' | 'CREDIT', amount: string, description = 'Açılış bakiyesi') => request('POST', '/api/v1/account-adjustments', { customerId: 'alpha', type, amount, occurredAt: at(9).toISOString(), description });

  it('tüm finans endpointlerini cookie oturumu olmadan 401 ile kapatır', async () => {
    for (const [method, url, payload] of [['GET', '/api/v1/customer-accounts'], ['GET', '/api/v1/customer-accounts/alpha'], ['GET', '/api/v1/payments'], ['POST', '/api/v1/payments', { customerId: 'alpha', amount: '1.00', method: 'CASH', paidAt: at(10).toISOString() }], ['GET', '/api/v1/payments/missing'], ['POST', '/api/v1/payments/missing/cancel'], ['POST', '/api/v1/account-adjustments', { customerId: 'alpha', type: 'DEBIT', amount: '1.00', occurredAt: at(10).toISOString(), description: 'Test düzeltmesi' }], ['POST', '/api/v1/account-adjustments/missing/cancel']] as const) {
      const response = await app.inject({ method, url, ...(payload ? { payload } : {}) }); expect(response.statusCode).toBe(401); expect(response.json<ErrorResponse>().error.code).toBe('UNAUTHORIZED');
    }
  });

  it('tahsilatı canonical tutarla oluşturur, metinleri normalize eder ve fazla ödemeye izin verir', async () => {
    const response = await createPayment({ amount: '5000' }); const item = response.json<SuccessResponse<{ payment: { amount: string; referenceNo: string; notes: string } }>>().data.payment;
    expect(response.statusCode).toBe(201); expect(item).toMatchObject({ amount: '5000.00', referenceNo: 'EFT-42', notes: 'İlk tahsilat' });
    const account = await request('GET', '/api/v1/customer-accounts/alpha'); expect(account.json<SuccessResponse<{ summary: { balance: string } }>>().data.summary.balance).toBe('-3750.00');
  });

  it.each(['0', '-1.00', '1.001', 'abc'])('geçersiz tahsilat tutarını reddeder: %s', async (amount) => { const response = await createPayment({ amount }); expect(response.statusCode).toBe(400); expect(response.json<ErrorResponse>().error.code).toBe('VALIDATION_ERROR'); });
  it('soft-delete ve olmayan müşteri için tahsilat oluşturmaz', async () => { for (const customerId of ['deleted', 'missing']) { const response = await createPayment({ customerId }); expect(response.statusCode).toBe(404); expect(response.json<ErrorResponse>().error.code).toBe('CUSTOMER_NOT_FOUND'); } });

  it('tahsilat listesini müşteri, yöntem, tarih, arama ve iptal durumuyla filtreler', async () => {
    await createPayment(); const second = await createPayment({ customerId: 'beta', method: 'CASH', amount: '100', paidAt: at(12).toISOString(), referenceNo: 'KASA-7', notes: null });
    const secondId = second.json<SuccessResponse<{ payment: { id: string } }>>().data.payment.id; await request('POST', `/api/v1/payments/${secondId}/cancel`);
    for (const url of ['/api/v1/payments?customerId=alpha', '/api/v1/payments?method=BANK_TRANSFER', '/api/v1/payments?q=EFT-42', `/api/v1/payments?paidFrom=${encodeURIComponent(at(9).toISOString())}&paidTo=${encodeURIComponent(at(11).toISOString())}`]) expect((await request('GET', url)).json<SuccessResponse<{ pagination: { total: number } }>>().data.pagination.total).toBe(1);
    const cancelled = await request('GET', '/api/v1/payments?cancelled=true'); expect(cancelled.json<SuccessResponse<{ items: Array<{ id: string }> }>>().data.items[0]?.id).toBe(secondId);
  });

  it('tahsilat detayını getirir, atomik biçimde bir kez iptal eder ve audit kaydını korur', async () => {
    const created = await createPayment(); const id = created.json<SuccessResponse<{ payment: { id: string } }>>().data.payment.id;
    expect((await request('GET', `/api/v1/payments/${id}`)).statusCode).toBe(200); expect((await request('GET', '/api/v1/payments/missing')).statusCode).toBe(404);
    expect((await request('POST', `/api/v1/payments/${id}/cancel`)).statusCode).toBe(200); const again = await request('POST', `/api/v1/payments/${id}/cancel`); expect(again.statusCode).toBe(409); expect(again.json<ErrorResponse>().error.code).toBe('PAYMENT_ALREADY_CANCELLED');
    const statement = await request('GET', '/api/v1/customer-accounts/alpha?type=PAYMENT'); const data = statement.json<SuccessResponse<{ summary: { paymentsTotal: string }; statement: { items: Array<{ cancelledAt: string | null }> } }>>().data;
    expect(data.summary.paymentsTotal).toBe('0.00'); expect(data.statement.items[0]?.cancelledAt).not.toBeNull();
  });

  it('borç ve alacak düzeltmelerini cari formüle doğru uygular', async () => {
    await createPayment({ amount: '200' }); await createAdjustment('DEBIT', '500'); await createAdjustment('CREDIT', '250');
    const data = (await request('GET', '/api/v1/customer-accounts/alpha')).json<SuccessResponse<{ summary: Record<string, string> }>>().data.summary;
    expect(data).toMatchObject({ workOrderTotal: '1250.00', debitAdjustments: '500.00', paymentsTotal: '200.00', creditAdjustments: '250.00', balance: '1300.00' });
  });

  it.each([['0', 400], ['-1', 400], ['10.001', 400], ['10', 400]] as const)('düzeltme validasyonunu uygular: %s', async (amount, status) => { const response = await createAdjustment('DEBIT', amount, amount === '10' ? '' : 'Geçerli açıklama'); expect(response.statusCode).toBe(status); });
  it('soft-delete müşteri için düzeltme oluşturmaz', async () => { const response = await request('POST', '/api/v1/account-adjustments', { customerId: 'deleted', type: 'DEBIT', amount: '10', occurredAt: at(9).toISOString(), description: 'Eski borç' }); expect(response.statusCode).toBe(404); });

  it('cari düzeltmeyi bir kez iptal eder, toplamdan çıkarır ve audit geçmişini korur', async () => {
    const created = await createAdjustment('DEBIT', '300'); const id = created.json<SuccessResponse<{ adjustment: { id: string } }>>().data.adjustment.id;
    expect((await request('POST', `/api/v1/account-adjustments/${id}/cancel`)).statusCode).toBe(200); const again = await request('POST', `/api/v1/account-adjustments/${id}/cancel`); expect(again.statusCode).toBe(409); expect(again.json<ErrorResponse>().error.code).toBe('ACCOUNT_ADJUSTMENT_ALREADY_CANCELLED');
    const account = (await request('GET', '/api/v1/customer-accounts/alpha?type=ADJUSTMENT_DEBIT')).json<SuccessResponse<{ summary: { debitAdjustments: string }; statement: { items: Array<{ cancelledAt: string | null }> } }>>().data;
    expect(account.summary.debitAdjustments).toBe('0.00'); expect(account.statement.items[0]?.cancelledAt).not.toBeNull();
  });

  it('iptal ve soft-delete iş emirlerini dışarıda tutup müşterileri izole eder', async () => {
    const alpha = (await request('GET', '/api/v1/customer-accounts/alpha')).json<SuccessResponse<{ summary: { workOrderTotal: string } }>>().data; const beta = (await request('GET', '/api/v1/customer-accounts/beta')).json<SuccessResponse<{ summary: { workOrderTotal: string } }>>().data;
    expect(alpha.summary.workOrderTotal).toBe('1250.00'); expect(beta.summary.workOrderTotal).toBe('500.00');
  });

  it('pozitif, kapalı ve müşteri alacağı bakiyelerini filtreleyip sayfalar', async () => {
    await createPayment({ customerId: 'beta', amount: '500' }); await createPayment({ customerId: 'gamma', amount: '75' });
    expect((await request('GET', '/api/v1/customer-accounts?balanceStatus=RECEIVABLE')).json<SuccessResponse<{ pagination: { total: number } }>>().data.pagination.total).toBe(1);
    expect((await request('GET', '/api/v1/customer-accounts?balanceStatus=SETTLED')).json<SuccessResponse<{ items: Array<{ customer: { id: string } }> }>>().data.items[0]?.customer.id).toBe('beta');
    expect((await request('GET', '/api/v1/customer-accounts?balanceStatus=CREDIT')).json<SuccessResponse<{ items: Array<{ customer: { id: string } }> }>>().data.items[0]?.customer.id).toBe('gamma');
    const page = await request('GET', '/api/v1/customer-accounts?page=2&pageSize=2'); expect(page.json<SuccessResponse<{ pagination: { total: number; totalPages: number } }>>().data.pagination).toMatchObject({ total: 3, totalPages: 2 });
  });

  it('müşteri aramasını tek toplu repository çağrısıyla yapar', async () => { const spy = vi.spyOn(repository, 'listAccountSources'); const response = await request('GET', '/api/v1/customer-accounts?q=Alpha'); expect(response.json<SuccessResponse<{ pagination: { total: number } }>>().data.pagination.total).toBe(1); expect(spy).toHaveBeenCalledTimes(1); });

  it('cari hareketleri tarih ve kimlikle deterministik sıralar, filtreler ve sayfalar', async () => {
    await createPayment({ paidAt: at(10).toISOString(), amount: '100' }); await createAdjustment('DEBIT', '20', 'Yuvarlama farkı');
    const first = (await request('GET', '/api/v1/customer-accounts/alpha?page=1&pageSize=2')).json<SuccessResponse<{ statement: { items: Array<{ type: string }>; pagination: { total: number; totalPages: number } } }>>().data.statement;
    expect(first.items.map((item) => item.type)).toEqual(['PAYMENT', 'ADJUSTMENT_DEBIT']); expect(first.pagination).toMatchObject({ total: 3, totalPages: 2 });
    const filtered = await request('GET', `/api/v1/customer-accounts/alpha?type=WORK_ORDER&from=${encodeURIComponent(at(1).toISOString())}`); expect(filtered.json<SuccessResponse<{ statement: { items: Array<{ type: string }> } }>>().data.statement.items).toEqual([expect.objectContaining({ type: 'WORK_ORDER' })]);
  });
});
