import type { Prisma } from '../../generated/prisma/client.js';
import { prisma } from '../../lib/prisma.js';
import type {
  AccountStatementPdfSource, CustomerReportItem, CustomerReportQuery, CustomerReportSource,
  DashboardSource, DeliveryPdfSource, DeliveryReportItem, DeliveryReportQuery, DeliveryReportSource,
  FinanceReportQuery, FinanceReportSource, ReportingRepository,
  WorkOrderPdfSource, WorkOrderReportItem, WorkOrderReportQuery, WorkOrderReportSource,
} from './reporting.types.js';

const customerSelect = { id: true, name: true } as const;
const zero = '0.00';
const money = (value: { toFixed(decimalPlaces: number): string } | null | undefined) => value?.toFixed(2) ?? zero;
const dateWhere = (from: Date, to: Date) => ({ gte: from, lte: to });

function workOrderWhere(query: WorkOrderReportQuery): Prisma.WorkOrderWhereInput {
  return {
    deletedAt: null,
    customer: { deletedAt: null },
    receivedAt: dateWhere(query.from, query.to),
    status: query.status ?? { not: 'CANCELLED' },
    ...(query.customerId ? { customerId: query.customerId } : {}),
    ...(query.type ? { type: query.type } : {}),
  };
}

function deliveryWhere(query: DeliveryReportQuery): Prisma.DeliveryWhereInput {
  return {
    deliveredAt: dateWhere(query.from, query.to),
    customer: { deletedAt: null },
    ...(query.customerId ? { customerId: query.customerId } : {}),
    ...(query.workOrderId ? { packageItems: { some: { workOrderId: query.workOrderId } } } : {}),
  };
}

async function currentAccounts() {
  const [work, payments, adjustments] = await Promise.all([
    prisma.workOrder.groupBy({ by: ['customerId'], where: { deletedAt: null, status: { not: 'CANCELLED' }, customer: { deletedAt: null } }, _sum: { totalAmount: true } }),
    prisma.payment.groupBy({ by: ['customerId'], where: { cancelledAt: null, customer: { deletedAt: null } }, _sum: { amount: true } }),
    prisma.accountAdjustment.groupBy({ by: ['customerId', 'type'], where: { cancelledAt: null, customer: { deletedAt: null } }, _sum: { amount: true } }),
  ]);
  const ids = new Set([...work.map((item) => item.customerId), ...payments.map((item) => item.customerId), ...adjustments.map((item) => item.customerId)]);
  return [...ids].map((customerId) => ({
    workOrderTotal: money(work.find((item) => item.customerId === customerId)?._sum.totalAmount),
    paymentsTotal: money(payments.find((item) => item.customerId === customerId)?._sum.amount),
    debitAdjustments: money(adjustments.find((item) => item.customerId === customerId && item.type === 'DEBIT')?._sum.amount),
    creditAdjustments: money(adjustments.find((item) => item.customerId === customerId && item.type === 'CREDIT')?._sum.amount),
  }));
}

export class PrismaReportingRepository implements ReportingRepository {
  public async getDashboard(now: Date, monthStart: Date, nextMonth: Date): Promise<DashboardSource> {
    const activeStatuses = ['WAITING', 'IN_PROGRESS', 'READY'] as const;
    const [activeCustomerCount, workOrderStatuses, delivered, packagedNotFullyDeliveredCount, monthPayments, accounts, overdue, overdueCount, recentWorkOrders, recentDeliveries, recentPayments] = await Promise.all([
      prisma.customer.count({ where: { deletedAt: null } }),
      prisma.workOrder.groupBy({ by: ['status'], where: { deletedAt: null, customer: { deletedAt: null } }, _count: { _all: true } }),
      prisma.delivery.aggregate({ where: { cancelledAt: null, customer: { deletedAt: null }, deliveredAt: { gte: monthStart, lt: nextMonth } }, _sum: { totalQuantity: true } }),
      prisma.workOrder.count({ where: { deletedAt: null, customer: { deletedAt: null }, status: { in: [...activeStatuses] }, packages: { some: { deletedAt: null } } } }),
      prisma.payment.aggregate({ where: { cancelledAt: null, customer: { deletedAt: null }, paidAt: { gte: monthStart, lt: nextMonth } }, _sum: { amount: true } }),
      currentAccounts(),
      prisma.workOrder.findMany({ where: { deletedAt: null, customer: { deletedAt: null }, dueAt: { lt: now }, status: { in: [...activeStatuses] } }, select: { id: true, productName: true, status: true, dueAt: true, customer: { select: customerSelect } }, orderBy: [{ dueAt: 'asc' }, { id: 'asc' }], take: 5 }),
      prisma.workOrder.count({ where: { deletedAt: null, customer: { deletedAt: null }, dueAt: { lt: now }, status: { in: [...activeStatuses] } } }),
      prisma.workOrder.findMany({ where: { deletedAt: null, customer: { deletedAt: null }, status: { not: 'CANCELLED' } }, select: { id: true, productName: true, createdAt: true, customer: { select: customerSelect } }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: 5 }),
      prisma.delivery.findMany({ where: { cancelledAt: null, customer: { deletedAt: null } }, select: { id: true, totalQuantity: true, deliveredAt: true, customer: { select: customerSelect } }, orderBy: [{ deliveredAt: 'desc' }, { id: 'desc' }], take: 5 }),
      prisma.payment.findMany({ where: { cancelledAt: null, customer: { deletedAt: null } }, select: { id: true, amount: true, paidAt: true, customer: { select: customerSelect } }, orderBy: [{ paidAt: 'desc' }, { id: 'desc' }], take: 5 }),
    ]);
    return {
      activeCustomerCount,
      workOrderStatuses: workOrderStatuses.map((item) => ({ status: item.status, count: item._count._all })),
      deliveredQuantityThisMonth: delivered._sum.totalQuantity ?? 0,
      packagedNotFullyDeliveredCount,
      monthPayments: money(monthPayments._sum.amount),
      currentAccounts: accounts,
      overdue: overdue.map((item) => ({ ...item, dueAt: item.dueAt! })),
      overdueCount,
      recentWorkOrders: recentWorkOrders.map((item) => ({ id: item.id, customer: item.customer, productName: item.productName, occurredAt: item.createdAt })),
      recentDeliveries: recentDeliveries.map((item) => ({ id: item.id, customer: item.customer, totalQuantity: item.totalQuantity, occurredAt: item.deliveredAt })),
      recentPayments: recentPayments.map((item) => ({ id: item.id, customer: item.customer, amount: item.amount.toFixed(2), occurredAt: item.paidAt })),
    };
  }

  public async getWorkOrderReport(query: WorkOrderReportQuery): Promise<WorkOrderReportSource> {
    const where = workOrderWhere(query);
    const [items, total, aggregate, statuses, types, customers] = await Promise.all([
      prisma.workOrder.findMany({ where, select: { id: true, productName: true, type: true, status: true, totalQuantity: true, totalAmount: true, receivedAt: true, customer: { select: customerSelect } }, orderBy: [{ receivedAt: 'desc' }, { id: 'desc' }], skip: (query.page - 1) * query.pageSize, take: query.pageSize }),
      prisma.workOrder.count({ where }),
      prisma.workOrder.aggregate({ where, _sum: { totalQuantity: true, totalAmount: true } }),
      prisma.workOrder.groupBy({ by: ['status'], where, _count: { _all: true } }),
      prisma.workOrder.groupBy({ by: ['type'], where, _count: { _all: true } }),
      prisma.workOrder.groupBy({ by: ['customerId'], where, _count: { _all: true }, _sum: { totalQuantity: true, totalAmount: true }, orderBy: { _sum: { totalAmount: 'desc' } }, take: 10 }),
    ]);
    const names = await prisma.customer.findMany({ where: { id: { in: customers.map((item) => item.customerId) } }, select: customerSelect });
    const nameMap = new Map(names.map((item) => [item.id, item]));
    return {
      items: items.map((item): WorkOrderReportItem => ({ ...item, totalAmount: item.totalAmount.toFixed(2) })), total,
      totalQuantity: aggregate._sum.totalQuantity ?? 0, totalAmount: money(aggregate._sum.totalAmount),
      statusDistribution: statuses.map((item) => ({ status: item.status, count: item._count._all })),
      typeDistribution: types.map((item) => ({ type: item.type, count: item._count._all })),
      customerSummary: customers.flatMap((item) => { const customer = nameMap.get(item.customerId); return customer ? [{ customer, workOrderCount: item._count._all, totalQuantity: item._sum.totalQuantity ?? 0, totalAmount: money(item._sum.totalAmount) }] : []; }),
    };
  }

  public async getDeliveryReport(query: DeliveryReportQuery): Promise<DeliveryReportSource> {
    const where = deliveryWhere(query);
    const activeWhere = { ...where, cancelledAt: null } satisfies Prisma.DeliveryWhereInput;
    const [rows, total, activeAggregate, activePackageCount, customers] = await Promise.all([
      prisma.delivery.findMany({ where, select: { id: true, deliveredAt: true, totalQuantity: true, receiverName: true, cancelledAt: true, customer: { select: customerSelect }, _count: { select: { packageItems: true } }, packageItems: { distinct: ['workOrderId'], select: { workOrderId: true } } }, orderBy: [{ deliveredAt: 'desc' }, { id: 'desc' }], skip: (query.page - 1) * query.pageSize, take: query.pageSize }),
      prisma.delivery.count({ where }),
      prisma.delivery.aggregate({ where: activeWhere, _count: { _all: true }, _sum: { totalQuantity: true } }),
      prisma.deliveryPackageItem.count({ where: { delivery: activeWhere } }),
      prisma.delivery.groupBy({ by: ['customerId'], where: activeWhere, _count: { _all: true }, _sum: { totalQuantity: true }, orderBy: { _sum: { totalQuantity: 'desc' } }, take: 10 }),
    ]);
    const names = await prisma.customer.findMany({ where: { id: { in: customers.map((item) => item.customerId) } }, select: customerSelect });
    const nameMap = new Map(names.map((item) => [item.id, item]));
    return {
      items: rows.map((item): DeliveryReportItem => ({ id: item.id, customer: item.customer, deliveredAt: item.deliveredAt, workOrderCount: item.packageItems.length, packageCount: item._count.packageItems, totalQuantity: item.totalQuantity, receiverName: item.receiverName, cancelledAt: item.cancelledAt })),
      total, activeDeliveryCount: activeAggregate._count._all, activePackageCount, activeQuantity: activeAggregate._sum.totalQuantity ?? 0,
      customerSummary: customers.flatMap((item) => { const customer = nameMap.get(item.customerId); return customer ? [{ customer, deliveryCount: item._count._all, totalQuantity: item._sum.totalQuantity ?? 0 }] : []; }),
    };
  }

  public async getFinanceReport(query: FinanceReportQuery): Promise<FinanceReportSource> {
    const [periodWork, periodPayments, periodAdjustments, accounts] = await Promise.all([
      prisma.workOrder.aggregate({ where: { deletedAt: null, customer: { deletedAt: null }, status: { not: 'CANCELLED' }, receivedAt: dateWhere(query.from, query.to) }, _sum: { totalAmount: true } }),
      prisma.payment.aggregate({ where: { cancelledAt: null, customer: { deletedAt: null }, paidAt: dateWhere(query.from, query.to) }, _sum: { amount: true } }),
      prisma.accountAdjustment.groupBy({ by: ['type'], where: { cancelledAt: null, customer: { deletedAt: null }, occurredAt: dateWhere(query.from, query.to) }, _sum: { amount: true } }),
      currentAccounts(),
    ]);
    return {
      periodWorkOrderTotal: money(periodWork._sum.totalAmount), periodPaymentsTotal: money(periodPayments._sum.amount),
      periodDebitAdjustments: money(periodAdjustments.find((item) => item.type === 'DEBIT')?._sum.amount),
      periodCreditAdjustments: money(periodAdjustments.find((item) => item.type === 'CREDIT')?._sum.amount),
      currentAccounts: accounts,
    };
  }

  public async getCustomerReport(query: CustomerReportQuery): Promise<CustomerReportSource> {
    const customerWhere: Prisma.CustomerWhereInput = { deletedAt: null, ...(query.q ? { name: { contains: query.q } } : {}) };
    const [customers, total] = await Promise.all([
      prisma.customer.findMany({ where: customerWhere, select: customerSelect, orderBy: [{ name: 'asc' }, { id: 'asc' }], skip: (query.page - 1) * query.pageSize, take: query.pageSize }),
      prisma.customer.count({ where: customerWhere }),
    ]);
    const ids = customers.map((item) => item.id); if (!ids.length) return { items: [], total };
    const period = dateWhere(query.from, query.to);
    const [work, payments, adjustments, currentWork, currentPayments, currentAdjustments] = await Promise.all([
      prisma.workOrder.groupBy({ by: ['customerId'], where: { customerId: { in: ids }, deletedAt: null, status: { not: 'CANCELLED' }, receivedAt: period }, _count: { _all: true }, _sum: { totalQuantity: true, totalAmount: true }, _max: { receivedAt: true } }),
      prisma.payment.groupBy({ by: ['customerId'], where: { customerId: { in: ids }, cancelledAt: null, paidAt: period }, _sum: { amount: true }, _max: { paidAt: true } }),
      prisma.accountAdjustment.groupBy({ by: ['customerId', 'type'], where: { customerId: { in: ids }, cancelledAt: null, occurredAt: period }, _sum: { amount: true } }),
      prisma.workOrder.groupBy({ by: ['customerId'], where: { customerId: { in: ids }, deletedAt: null, status: { not: 'CANCELLED' } }, _sum: { totalAmount: true } }),
      prisma.payment.groupBy({ by: ['customerId'], where: { customerId: { in: ids }, cancelledAt: null }, _sum: { amount: true } }),
      prisma.accountAdjustment.groupBy({ by: ['customerId', 'type'], where: { customerId: { in: ids }, cancelledAt: null }, _sum: { amount: true } }),
    ]);
    const Decimal = (await import('../../generated/prisma/client.js')).Prisma.Decimal;
    const items = customers.map((customer): CustomerReportItem => {
      const w = work.find((item) => item.customerId === customer.id); const p = payments.find((item) => item.customerId === customer.id);
      const debit = adjustments.find((item) => item.customerId === customer.id && item.type === 'DEBIT'); const credit = adjustments.find((item) => item.customerId === customer.id && item.type === 'CREDIT');
      const cw = currentWork.find((item) => item.customerId === customer.id); const cp = currentPayments.find((item) => item.customerId === customer.id);
      const cd = currentAdjustments.find((item) => item.customerId === customer.id && item.type === 'DEBIT'); const cc = currentAdjustments.find((item) => item.customerId === customer.id && item.type === 'CREDIT');
      const balance = new Decimal(money(cw?._sum.totalAmount)).add(money(cd?._sum.amount)).sub(money(cp?._sum.amount)).sub(money(cc?._sum.amount)).toFixed(2);
      return { customer, workOrderCount: w?._count._all ?? 0, totalQuantity: w?._sum.totalQuantity ?? 0, workOrderTotal: money(w?._sum.totalAmount), paymentsTotal: money(p?._sum.amount), debitAdjustments: money(debit?._sum.amount), creditAdjustments: money(credit?._sum.amount), balance, lastWorkOrderAt: w?._max.receivedAt ?? null, lastPaymentAt: p?._max.paidAt ?? null };
    });
    return { items, total };
  }

  public async findWorkOrderForPdf(id: string): Promise<WorkOrderPdfSource | null> {
    const item = await prisma.workOrder.findFirst({ where: { id, deletedAt: null }, select: { id: true, productName: true, type: true, status: true, totalQuantity: true, unitPrice: true, totalAmount: true, receivedAt: true, dueAt: true, notes: true, customer: { select: customerSelect }, packages: { where: { deletedAt: null }, select: { sequenceNo: true, type: true, quantity: true, deliveryId: true }, orderBy: { sequenceNo: 'asc' } } } });
    return item ? { ...item, unitPrice: item.unitPrice.toFixed(2), totalAmount: item.totalAmount.toFixed(2), packages: item.packages.map((entry) => ({ ...entry, delivered: Boolean(entry.deliveryId) })) } : null;
  }

  public async findDeliveryForPdf(id: string): Promise<DeliveryPdfSource | null> {
    const item = await prisma.delivery.findUnique({ where: { id }, select: { id: true, deliveredAt: true, receiverName: true, notes: true, cancelledAt: true, customer: { select: customerSelect }, packageItems: { select: { workOrderId: true, workOrderProductName: true, sequenceNo: true, type: true, quantity: true }, orderBy: [{ workOrderId: 'asc' }, { sequenceNo: 'asc' }] } } });
    return item ? { id: item.id, customer: item.customer, deliveredAt: item.deliveredAt, receiverName: item.receiverName, notes: item.notes, cancelledAt: item.cancelledAt, packages: item.packageItems.map((entry) => ({ workOrderId: entry.workOrderId, productName: entry.workOrderProductName, sequenceNo: entry.sequenceNo, type: entry.type, quantity: entry.quantity })) } : null;
  }

  public async getAccountStatementForPdf(customerId: string, range: Partial<{ from: Date; to: Date }>, limit: number): Promise<AccountStatementPdfSource | null> {
    const customer = await prisma.customer.findFirst({ where: { id: customerId, deletedAt: null }, select: customerSelect }); if (!customer) return null;
    const dates = { ...(range.from ? { gte: range.from } : {}), ...(range.to ? { lte: range.to } : {}) };
    const hasRange = Boolean(range.from || range.to); const take = limit + 1;
    const [work, payments, adjustments, workTotal, paymentTotal, adjustmentTotals] = await Promise.all([
      prisma.workOrder.findMany({ where: { customerId, deletedAt: null, status: { not: 'CANCELLED' }, ...(hasRange ? { receivedAt: dates } : {}) }, select: { id: true, productName: true, totalAmount: true, receivedAt: true }, orderBy: [{ receivedAt: 'desc' }, { id: 'desc' }], take }),
      prisma.payment.findMany({ where: { customerId, ...(hasRange ? { paidAt: dates } : {}) }, select: { id: true, method: true, amount: true, paidAt: true, cancelledAt: true }, orderBy: [{ paidAt: 'desc' }, { id: 'desc' }], take }),
      prisma.accountAdjustment.findMany({ where: { customerId, ...(hasRange ? { occurredAt: dates } : {}) }, select: { id: true, type: true, amount: true, occurredAt: true, description: true, cancelledAt: true }, orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }], take }),
      prisma.workOrder.aggregate({ where: { customerId, deletedAt: null, status: { not: 'CANCELLED' }, ...(hasRange ? { receivedAt: dates } : {}) }, _sum: { totalAmount: true } }),
      prisma.payment.aggregate({ where: { customerId, cancelledAt: null, ...(hasRange ? { paidAt: dates } : {}) }, _sum: { amount: true } }),
      prisma.accountAdjustment.groupBy({ by: ['type'], where: { customerId, cancelledAt: null, ...(hasRange ? { occurredAt: dates } : {}) }, _sum: { amount: true } }),
    ]);
    const rows = [
      ...work.map((item) => ({ id: `WORK_ORDER:${item.id}`, type: 'WORK_ORDER' as const, occurredAt: item.receivedAt, description: `İş Emri · ${item.productName}`, amount: item.totalAmount.toFixed(2), cancelledAt: null })),
      ...payments.map((item) => ({ id: `PAYMENT:${item.id}`, type: 'PAYMENT' as const, occurredAt: item.paidAt, description: `Tahsilat · ${item.method}`, amount: item.amount.toFixed(2), cancelledAt: item.cancelledAt })),
      ...adjustments.map((item) => ({ id: `ADJUSTMENT:${item.id}`, type: item.type === 'DEBIT' ? 'ADJUSTMENT_DEBIT' as const : 'ADJUSTMENT_CREDIT' as const, occurredAt: item.occurredAt, description: item.description, amount: item.amount.toFixed(2), cancelledAt: item.cancelledAt })),
    ].sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime() || b.id.localeCompare(a.id));
    return { customer, workOrderTotal: money(workTotal._sum.totalAmount), paymentsTotal: money(paymentTotal._sum.amount), debitAdjustments: money(adjustmentTotals.find((item) => item.type === 'DEBIT')?._sum.amount), creditAdjustments: money(adjustmentTotals.find((item) => item.type === 'CREDIT')?._sum.amount), items: rows.slice(0, limit), truncated: rows.length > limit };
  }
}

export const reportingRepository = new PrismaReportingRepository();
