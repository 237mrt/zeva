import fs from 'node:fs';
import path from 'node:path';
import type { FastifyInstance } from 'fastify';
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { buildApp } from '../src/app.js';
import { AuthService } from '../src/modules/auth/auth.service.js';
import { hashPassword } from '../src/modules/auth/password.js';
import { ReportingService } from '../src/modules/reporting/reporting.service.js';
import type { ErrorResponse, SuccessResponse } from '../src/shared/http/api-response.js';
import { InMemoryAuthRepository } from './helpers/in-memory-auth-repository.js';
import { InMemoryReportingRepository } from './helpers/in-memory-reporting-repository.js';
import { renderAccountStatementPdf, renderDeliveryPdf, renderWorkOrderPdf } from '../src/modules/reporting/pdf/pdf-renderer.js';

const from = '2026-08-01T00:00:00.000Z';
const to = '2026-08-31T23:59:59.999Z';
const range = `from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
const now = new Date('2026-08-12T10:00:00.000Z');

describe('Reporting integration', () => {
  let app: FastifyInstance; let repository: InMemoryReportingRepository; let cookie: string; let passwordHash: string;
  beforeAll(async () => { passwordHash = await hashPassword('ValidPassword123!'); });
  beforeEach(async () => {
    repository = new InMemoryReportingRepository();
    app = await buildApp({ logger: false, documentation: false, authService: new AuthService(new InMemoryAuthRepository([{ id: 'admin', email: 'admin@zeva.test', passwordHash, name: 'Yönetici', role: 'ADMIN', isActive: true }])), reportingService: new ReportingService(repository, () => now) });
    await app.ready();
    const login = await app.inject({ method: 'POST', url: '/api/v1/auth/login', payload: { email: 'admin@zeva.test', password: 'ValidPassword123!' } });
    const header = login.headers['set-cookie']; cookie = (Array.isArray(header) ? header[0] : header)?.split(';')[0] ?? '';
  });
  afterEach(async () => app.close());
  const get = (url: string) => app.inject({ method: 'GET', url, headers: { cookie } });

  it('tüm dashboard, rapor ve PDF endpointlerini cookie oturumu olmadan 401 ile kapatır', async () => {
    const urls = ['/api/v1/dashboard', `/api/v1/reports/work-orders?${range}`, `/api/v1/reports/deliveries?${range}`, `/api/v1/reports/finance?${range}`, `/api/v1/reports/customers?${range}`, '/api/v1/work-orders/wo-1/pdf', '/api/v1/deliveries/delivery-1/pdf', '/api/v1/customer-accounts/alpha/pdf'];
    for (const url of urls) { const response = await app.inject({ method: 'GET', url }); expect(response.statusCode).toBe(401); expect(response.json<ErrorResponse>().error.code).toBe('UNAUTHORIZED'); }
  });

  it('dashboard KPI ve ikincil metriklerini canonical para değerleriyle hesaplar', async () => {
    const data = (await get('/api/v1/dashboard')).json<SuccessResponse<{ kpis: Record<string, string | number>; metrics: Record<string, string | number> }>>().data;
    expect(data.kpis).toMatchObject({ activeWorkOrders: 9, readyForDelivery: 4, deliveredQuantityThisMonth: 1300, totalReceivable: '1400.00' });
    expect(data.metrics).toMatchObject({ activeCustomerCount: 3, waitingWorkOrders: 2, inProgressWorkOrders: 3, packagedNotFullyDeliveredWorkOrders: 2, monthPayments: '800.00', overdueWorkOrders: 1 });
    expect(repository.lastDashboardRange).toEqual({ now, monthStart: new Date('2026-07-31T21:00:00.000Z'), nextMonth: new Date('2026-08-31T21:00:00.000Z') });
  });

  it('gecikmeyi backend saatine göre hesaplar ve son hareketleri birleştirir', async () => {
    const data = (await get('/api/v1/dashboard')).json<SuccessResponse<{ overdueWorkOrders: Array<{ overdueDays: number }>; recentActivity: Array<{ type: string }> }>>().data;
    expect(data.overdueWorkOrders[0]?.overdueDays).toBe(10); expect(data.recentActivity.map((item) => item.type)).toEqual(['PAYMENT', 'DELIVERY', 'WORK_ORDER']);
  });

  it('boş veritabanı için kararlı dashboard döndürür', async () => {
    repository.dashboardSource = { ...repository.dashboardSource, activeCustomerCount: 0, workOrderStatuses: [], deliveredQuantityThisMonth: 0, packagedNotFullyDeliveredCount: 0, monthPayments: '0.00', currentAccounts: [], overdue: [], overdueCount: 0, recentWorkOrders: [], recentDeliveries: [], recentPayments: [] };
    const data = (await get('/api/v1/dashboard')).json<SuccessResponse<{ kpis: { activeWorkOrders: number; totalReceivable: string }; overdueWorkOrders: unknown[]; recentActivity: unknown[] }>>().data;
    expect(data.kpis).toMatchObject({ activeWorkOrders: 0, totalReceivable: '0.00' }); expect(data.overdueWorkOrders).toEqual([]); expect(data.recentActivity).toEqual([]);
  });

  it('iş emri raporuna tüm filtreleri iletir, özet ve pagination döndürür', async () => {
    const data = (await get(`/api/v1/reports/work-orders?${range}&customerId=alpha&type=IRONING_PACKAGING&status=READY&page=2&pageSize=10`)).json<SuccessResponse<{ summary: Record<string, string | number>; pagination: Record<string, number> }>>().data;
    expect(data.summary).toEqual({ totalWorkOrders: 21, totalQuantity: 4500, totalAmount: '11250.00' }); expect(data.pagination).toMatchObject({ page: 2, pageSize: 10, total: 21, totalPages: 3 });
    expect(repository.lastWorkOrderQuery).toMatchObject({ customerId: 'alpha', type: 'IRONING_PACKAGING', status: 'READY', page: 2, pageSize: 10, from: new Date(from), to: new Date(to) });
  });

  it('teslimat raporunda iptal audit satırını gösterir ancak aktif toplama katmaz', async () => {
    const data = (await get(`/api/v1/reports/deliveries?${range}&customerId=alpha&workOrderId=wo-1`)).json<SuccessResponse<{ summary: Record<string, number>; items: Array<{ id: string; cancelledAt: string | null }> }>>().data;
    expect(data.summary).toEqual({ totalDeliveries: 1, totalPackages: 5, totalQuantity: 1300 }); expect(data.items[1]?.id).toBe('delivery-cancelled'); expect(typeof data.items[1]?.cancelledAt).toBe('string'); expect(repository.lastDeliveryQuery).toMatchObject({ customerId: 'alpha', workOrderId: 'wo-1' });
  });

  it('finans raporunda dönem ile mevcut cari durumu ayırır', async () => {
    const data = (await get(`/api/v1/reports/finance?${range}`)).json<SuccessResponse<{ period: Record<string, string>; current: Record<string, string> }>>().data;
    expect(data.period).toEqual({ workOrderTotal: '4000.00', paymentsTotal: '1250.00', debitAdjustments: '100.00', creditAdjustments: '50.00' }); expect(data.current).toEqual({ totalReceivable: '1400.00', totalCustomerCredit: '300.00' });
  });

  it('müşteri raporunu toplu özet, son aktiviteler ve bakiye ile sayfalar', async () => {
    const data = (await get(`/api/v1/reports/customers?${range}&q=Alpha&page=1&pageSize=20`)).json<SuccessResponse<{ items: Array<Record<string, unknown>>; pagination: Record<string, number> }>>().data;
    expect(data.items[0]).toMatchObject({ workOrderCount: 3, totalQuantity: 900, workOrderTotal: '2250.00', paymentsTotal: '750.00', balance: '1550.00' }); expect(typeof data.items[0]?.lastWorkOrderAt).toBe('string'); expect(typeof data.items[0]?.lastPaymentAt).toBe('string'); expect(data.pagination).toMatchObject({ total: 1, totalPages: 1 }); expect(repository.lastCustomerQuery?.q).toBe('Alpha');
  });

  it('geçersiz tarih aralığını ve büyük sayfa boyutunu reddeder', async () => {
    expect((await get(`/api/v1/reports/work-orders?from=${encodeURIComponent(to)}&to=${encodeURIComponent(from)}`)).statusCode).toBe(400); expect((await get(`/api/v1/reports/work-orders?${range}&pageSize=101`)).statusCode).toBe(400);
  });

  it('iş emri PDFini Türkçe metinlerle, PDF başlığı ve güvenli dosya adıyla üretir', async () => {
    const response = await get('/api/v1/work-orders/wo-unsafe/pdf');
    expect(response.statusCode).toBe(200); expect(response.headers['content-type']).toContain('application/pdf'); expect(response.headers['content-disposition']).toBe('attachment; filename="zeva-is-emri-unsafe-id.pdf"'); expect(response.rawPayload.subarray(0, 4).toString()).toBe('%PDF'); expect(response.rawPayload.length).toBeGreaterThan(1000);
  });

  it('çok iş emirli ve iptal edilmiş teslimat PDFlerini üretir', async () => {
    const active = await get('/api/v1/deliveries/delivery-1/pdf'); expect(active.rawPayload.subarray(0, 4).toString()).toBe('%PDF');
    repository.deliveryPdfSource = { ...repository.deliveryPdfSource!, cancelledAt: now }; const cancelled = await get('/api/v1/deliveries/delivery-1/pdf'); expect(cancelled.statusCode).toBe(200); expect(cancelled.rawPayload.length).toBeGreaterThan(1000);
  });

  it('cari ekstre PDF tarih aralığını ve güvenlik limitini uygular', async () => {
    const response = await get(`/api/v1/customer-accounts/alpha/pdf?${range}`);
    expect(response.statusCode).toBe(200); expect(response.headers['content-disposition']).toBe('attachment; filename="zeva-cari-ekstre-ciglik-alpha-tekstil.pdf"'); expect(response.rawPayload.subarray(0, 4).toString()).toBe('%PDF'); expect(repository.lastAccountRange).toEqual({ from: new Date(from), to: new Date(to) }); expect(repository.lastAccountLimit).toBe(5000);
  });

  it('olmayan domain kayıtlarının PDF isteklerini 404 ile yanıtlar', async () => {
    repository.workOrderPdfSource = null; repository.deliveryPdfSource = null; repository.accountSource = null;
    for (const url of ['/api/v1/work-orders/missing/pdf', '/api/v1/deliveries/missing/pdf', '/api/v1/customer-accounts/missing/pdf']) expect((await get(url)).statusCode).toBe(404);
  });

  it('Türkçe içerikli (Çağrı Şen Tekstil, Ütü Şişme Çocuk Önlüğü, İşlem öğleden önce tamamlanacak) İş Emri, Teslimat ve Cari Ekstre PDFlerini sorunsuz üretir', async () => {
    repository.workOrderPdfSource = {
      id: 'wo-tr-test',
      customer: { id: 'c1', name: 'Çağrı Şen Tekstil' },
      productName: 'Ütü Şişme Çocuk Önlüğü',
      type: 'IRONING_PACKAGING',
      status: 'READY',
      totalQuantity: 1000,
      unitPrice: '15.50',
      totalAmount: '15500.00',
      receivedAt: now,
      dueAt: now,
      notes: 'İşlem öğleden önce tamamlanacak.',
      packages: [{ sequenceNo: 1, type: 'SACK', quantity: 1000, delivered: false }],
    };
    const woResponse = await get('/api/v1/work-orders/wo-tr-test/pdf');
    expect(woResponse.statusCode).toBe(200);
    expect(woResponse.rawPayload.subarray(0, 4).toString()).toBe('%PDF');
    expect(woResponse.rawPayload.length).toBeGreaterThan(1000);

    repository.deliveryPdfSource = {
      id: 'del-tr-test',
      customer: { id: 'c1', name: 'Çağrı Şen Tekstil' },
      deliveredAt: now,
      receiverName: 'Çağrı Şen',
      notes: 'İşlem öğleden önce tamamlanacak.',
      cancelledAt: null,
      packages: [
        { workOrderId: 'wo-tr-test', productName: 'Ütü Şişme Çocuk Önlüğü', sequenceNo: 1, type: 'SACK', quantity: 1000 },
      ],
    };
    const delResponse = await get('/api/v1/deliveries/del-tr-test/pdf');
    expect(delResponse.statusCode).toBe(200);
    expect(delResponse.rawPayload.subarray(0, 4).toString()).toBe('%PDF');
    expect(delResponse.rawPayload.length).toBeGreaterThan(1000);

    repository.accountSource = {
      customer: { id: 'c1', name: 'Çağrı Şen Tekstil' },
      workOrderTotal: '15500.00',
      paymentsTotal: '5000.00',
      debitAdjustments: '0.00',
      creditAdjustments: '0.00',
      truncated: false,
      items: [
        { id: 'wo-tr-test', type: 'WORK_ORDER', occurredAt: now, description: 'Ütü Şişme Çocuk Önlüğü', amount: '15500.00', cancelledAt: null },
        { id: 'pay-tr-test', type: 'PAYMENT', occurredAt: now, description: 'İşlem öğleden önce tamamlanacak.', amount: '5000.00', cancelledAt: null },
      ],
    };
    const accountResponse = await get(`/api/v1/customer-accounts/c1/pdf?${range}`);
    expect(accountResponse.statusCode).toBe(200);
    expect(accountResponse.rawPayload.subarray(0, 4).toString()).toBe('%PDF');
    expect(accountResponse.rawPayload.length).toBeGreaterThan(1000);

    const woBuffer = await renderWorkOrderPdf(repository.workOrderPdfSource);
    expect(woBuffer.subarray(0, 4).toString()).toBe('%PDF');

    const delBuffer = await renderDeliveryPdf(repository.deliveryPdfSource);
    expect(delBuffer.subarray(0, 4).toString()).toBe('%PDF');

    const accBuffer = await renderAccountStatementPdf({
      ...repository.accountSource,
      balance: '10500.00 TL',
      rangeLabel: 'Ağustos 2026',
    });
    expect(accBuffer.subarray(0, 4).toString()).toBe('%PDF');
  }, 30_000);

  it('font dosyalarının varlığını ve geçerli TTF/OTF magic headerını doğrular', () => {
    const fontFiles = ['NotoSans-Regular.ttf', 'NotoSans-Bold.ttf'];
    for (const file of fontFiles) {
      const candidates = [
        path.resolve(process.cwd(), 'src/assets/fonts', file),
        path.resolve(process.cwd(), 'apps/backend/src/assets/fonts', file),
      ];
      const fontPath = candidates.find((candidate) => fs.existsSync(candidate));
      expect(fontPath).toBeDefined();
      const buf = fs.readFileSync(fontPath!);
      expect(buf.length).toBeGreaterThan(100000);
      const magicHex = buf.subarray(0, 4).toString('hex');
      const isTTF = magicHex === '00010000' || magicHex === '4f54544f' || magicHex === '74727565';
      expect(isTTF).toBe(true);
    }
  });
});

