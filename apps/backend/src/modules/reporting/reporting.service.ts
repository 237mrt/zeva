import { Prisma } from '../../generated/prisma/client.js';
import { AppError } from '../../shared/errors/app-error.js';
import { renderAccountStatementPdf, renderDeliveryPdf, renderWorkOrderPdf, sanitizePdfFilename } from './pdf/pdf-renderer.js';
import { mapCustomerReportItem, mapDeliveryReportItem, mapWorkOrderReportItem } from './reporting.mapper.js';
import { reportingRepository } from './reporting.repository.js';
import type { CustomerReportQuery, DeliveryReportQuery, FinanceReportQuery, ReportingRepository, WorkOrderReportQuery } from './reporting.types.js';

const pagination = (page: number, pageSize: number, total: number) => ({ page, pageSize, total, totalPages: Math.ceil(total / pageSize) });
const accountBalance = (value: { workOrderTotal: string; paymentsTotal: string; debitAdjustments: string; creditAdjustments: string }) => new Prisma.Decimal(value.workOrderTotal).add(value.debitAdjustments).sub(value.paymentsTotal).sub(value.creditAdjustments);
function currentOverview(accounts: Array<{ workOrderTotal: string; paymentsTotal: string; debitAdjustments: string; creditAdjustments: string }>) {
  return accounts.reduce((result, account) => { const balance = accountBalance(account); if (balance.gt(0)) result.totalReceivable = result.totalReceivable.add(balance); else if (balance.lt(0)) result.totalCustomerCredit = result.totalCustomerCredit.add(balance.abs()); return result; }, { totalReceivable: new Prisma.Decimal(0), totalCustomerCredit: new Prisma.Decimal(0) });
}
const rangeLabel = (from?: Date, to?: Date) => from || to ? `${from ? from.toLocaleDateString('tr-TR', { timeZone: 'Europe/Istanbul' }) : 'Başlangıç'} – ${to ? to.toLocaleDateString('tr-TR', { timeZone: 'Europe/Istanbul' }) : 'Bugün'}` : 'Tüm hareketler';
function istanbulMonthRange(now: Date) {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Istanbul', year: 'numeric', month: 'numeric' }).formatToParts(now);
  const year = Number(parts.find((part) => part.type === 'year')?.value); const month = Number(parts.find((part) => part.type === 'month')?.value);
  const nextYear = month === 12 ? year + 1 : year; const nextMonth = month === 12 ? 1 : month + 1;
  return { monthStart: new Date(`${year}-${String(month).padStart(2, '0')}-01T00:00:00+03:00`), nextMonth: new Date(`${nextYear}-${String(nextMonth).padStart(2, '0')}-01T00:00:00+03:00`) };
}

export class ReportingService {
  public constructor(private readonly repository: ReportingRepository = reportingRepository, private readonly clock: () => Date = () => new Date()) {}

  public async dashboard() {
    const now = this.clock(); const { monthStart, nextMonth } = istanbulMonthRange(now);
    const source = await this.repository.getDashboard(now, monthStart, nextMonth); const counts = new Map(source.workOrderStatuses.map((item) => [item.status, item.count])); const current = currentOverview(source.currentAccounts);
    const recentActivity = [
      ...source.recentWorkOrders.map((item) => ({ id: `WORK_ORDER:${item.id}`, sourceId: item.id, type: 'WORK_ORDER' as const, occurredAt: item.occurredAt, title: 'Yeni iş emri', description: `${item.customer.name} · ${item.productName}` })),
      ...source.recentDeliveries.map((item) => ({ id: `DELIVERY:${item.id}`, sourceId: item.id, type: 'DELIVERY' as const, occurredAt: item.occurredAt, title: 'Teslimat', description: `${item.customer.name} · ${item.totalQuantity.toLocaleString('tr-TR')} adet` })),
      ...source.recentPayments.map((item) => ({ id: `PAYMENT:${item.id}`, sourceId: item.id, type: 'PAYMENT' as const, occurredAt: item.occurredAt, title: 'Tahsilat', description: `${item.customer.name} · ${item.amount} TL` })),
    ].sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime() || b.id.localeCompare(a.id)).slice(0, 8).map((item) => ({ ...item, occurredAt: item.occurredAt.toISOString() }));
    return {
      kpis: { activeWorkOrders: (counts.get('WAITING') ?? 0) + (counts.get('IN_PROGRESS') ?? 0) + (counts.get('READY') ?? 0), readyForDelivery: counts.get('READY') ?? 0, deliveredQuantityThisMonth: source.deliveredQuantityThisMonth, totalReceivable: current.totalReceivable.toFixed(2) },
      metrics: { activeCustomerCount: source.activeCustomerCount, waitingWorkOrders: counts.get('WAITING') ?? 0, inProgressWorkOrders: counts.get('IN_PROGRESS') ?? 0, packagedNotFullyDeliveredWorkOrders: source.packagedNotFullyDeliveredCount, monthPayments: source.monthPayments, overdueWorkOrders: source.overdueCount },
      workOrderStatuses: source.workOrderStatuses,
      overdueWorkOrders: source.overdue.map((item) => ({ ...item, dueAt: item.dueAt.toISOString(), overdueDays: Math.max(1, Math.ceil((now.getTime() - item.dueAt.getTime()) / 86_400_000)) })),
      recentActivity,
    };
  }

  public async workOrders(query: WorkOrderReportQuery) { const source = await this.repository.getWorkOrderReport(query); return { summary: { totalWorkOrders: source.total, totalQuantity: source.totalQuantity, totalAmount: source.totalAmount }, statusDistribution: source.statusDistribution, typeDistribution: source.typeDistribution, customerSummary: source.customerSummary, items: source.items.map(mapWorkOrderReportItem), pagination: pagination(query.page, query.pageSize, source.total) }; }
  public async deliveries(query: DeliveryReportQuery) { const source = await this.repository.getDeliveryReport(query); return { summary: { totalDeliveries: source.activeDeliveryCount, totalPackages: source.activePackageCount, totalQuantity: source.activeQuantity }, customerSummary: source.customerSummary, items: source.items.map(mapDeliveryReportItem), pagination: pagination(query.page, query.pageSize, source.total) }; }
  public async finance(query: FinanceReportQuery) { const source = await this.repository.getFinanceReport(query); const current = currentOverview(source.currentAccounts); return { period: { workOrderTotal: source.periodWorkOrderTotal, paymentsTotal: source.periodPaymentsTotal, debitAdjustments: source.periodDebitAdjustments, creditAdjustments: source.periodCreditAdjustments }, current: { totalReceivable: current.totalReceivable.toFixed(2), totalCustomerCredit: current.totalCustomerCredit.toFixed(2) } }; }
  public async customers(query: CustomerReportQuery) { const source = await this.repository.getCustomerReport(query); return { items: source.items.map(mapCustomerReportItem), pagination: pagination(query.page, query.pageSize, source.total) }; }

  public async workOrderPdf(id: string) { const source = await this.repository.findWorkOrderForPdf(id); if (!source) throw new AppError(404, 'WORK_ORDER_NOT_FOUND', 'İş emri bulunamadı.'); return { buffer: await renderWorkOrderPdf(source), filename: `zeva-is-emri-${sanitizePdfFilename(source.id.slice(-10))}.pdf` }; }
  public async deliveryPdf(id: string) { const source = await this.repository.findDeliveryForPdf(id); if (!source) throw new AppError(404, 'DELIVERY_NOT_FOUND', 'Teslimat bulunamadı.'); const day = source.deliveredAt.toISOString().slice(0, 10); return { buffer: await renderDeliveryPdf(source), filename: `zeva-teslimat-${day}-${sanitizePdfFilename(source.id.slice(-8))}.pdf` }; }
  public async accountStatementPdf(customerId: string, range: { from?: Date | undefined; to?: Date | undefined }) { const source = await this.repository.getAccountStatementForPdf(customerId, range, 5_000); if (!source) throw new AppError(404, 'CUSTOMER_NOT_FOUND', 'Müşteri bulunamadı.'); const balance = accountBalance(source).toFixed(2); return { buffer: await renderAccountStatementPdf({ ...source, balance, rangeLabel: rangeLabel(range.from, range.to) }), filename: `zeva-cari-ekstre-${sanitizePdfFilename(source.customer.name)}.pdf` }; }
}

export const reportingService = new ReportingService();
