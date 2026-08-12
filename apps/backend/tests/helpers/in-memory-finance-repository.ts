import { Prisma } from '../../src/generated/prisma/client.js';
import type { AccountDetailSource, AccountSource, AdjustmentRecord, AdjustmentWriteInput, FinanceCustomer, FinanceRepository, PaymentListQuery, PaymentRecord, PaymentWriteInput, StatementQuery, StatementSource, StatementType } from '../../src/modules/finance/finance.types.js';

export interface FinanceCustomerFixture extends FinanceCustomer { deletedAt: Date | null }
export interface FinanceWorkOrderFixture { id: string; customerId: string; productName: string; totalAmount: string; status: string; receivedAt: Date; updatedAt: Date; deletedAt: Date | null }

const sum = (values: string[]) => values.reduce((total, value) => total.add(value), new Prisma.Decimal(0)).toFixed(2);
const clonePayment = (item: PaymentRecord): PaymentRecord => ({ ...item, customer: { ...item.customer } });
const cloneAdjustment = (item: AdjustmentRecord): AdjustmentRecord => ({ ...item, customer: { ...item.customer } });
const adjustmentStatementType = (type: 'DEBIT' | 'CREDIT'): StatementType => type === 'DEBIT' ? 'ADJUSTMENT_DEBIT' : 'ADJUSTMENT_CREDIT';

export class InMemoryFinanceRepository implements FinanceRepository {
  private readonly customers = new Map<string, FinanceCustomerFixture>();
  private readonly workOrders: FinanceWorkOrderFixture[];
  private readonly payments = new Map<string, PaymentRecord>();
  private readonly adjustments = new Map<string, AdjustmentRecord>();
  private nextPaymentId = 1;
  private nextAdjustmentId = 1;

  public constructor(customers: FinanceCustomerFixture[], workOrders: FinanceWorkOrderFixture[] = []) {
    customers.forEach((item) => this.customers.set(item.id, { ...item }));
    this.workOrders = workOrders.map((item) => ({ ...item }));
  }

  public findActiveCustomer(id: string): Promise<FinanceCustomer | null> {
    const customer = this.customers.get(id);
    return Promise.resolve(customer && !customer.deletedAt ? { id: customer.id, name: customer.name } : null);
  }

  public listPayments(query: PaymentListQuery): Promise<{ items: PaymentRecord[]; total: number }> {
    const q = query.q?.toLocaleLowerCase('tr-TR');
    const items = [...this.payments.values()].filter((item) => {
      if (query.customerId && item.customerId !== query.customerId) return false;
      if (query.method && item.method !== query.method) return false;
      if (query.cancelled !== undefined && Boolean(item.cancelledAt) !== query.cancelled) return false;
      if (query.paidFrom && item.paidAt < query.paidFrom) return false;
      if (query.paidTo && item.paidAt > query.paidTo) return false;
      return !q || [item.customer.name, item.referenceNo, item.notes].some((value) => value?.toLocaleLowerCase('tr-TR').includes(q));
    }).sort((a, b) => b.paidAt.getTime() - a.paidAt.getTime() || b.id.localeCompare(a.id));
    const start = (query.page - 1) * query.pageSize;
    return Promise.resolve({ items: items.slice(start, start + query.pageSize).map(clonePayment), total: items.length });
  }

  public findPayment(id: string): Promise<PaymentRecord | null> { const item = this.payments.get(id); return Promise.resolve(item ? clonePayment(item) : null); }
  public async createPayment(input: PaymentWriteInput): Promise<PaymentRecord> {
    const customer = await this.findActiveCustomer(input.customerId);
    if (!customer) throw new Error('Test müşterisi bulunamadı.');
    const now = new Date();
    const item: PaymentRecord = { id: `payment-${this.nextPaymentId++}`, ...input, amount: new Prisma.Decimal(input.amount).toFixed(2), customer, cancelledAt: null, createdAt: now, updatedAt: now };
    this.payments.set(item.id, item);
    return clonePayment(item);
  }
  public cancelPayment(id: string): Promise<'cancelled' | 'not_found' | 'already_cancelled'> {
    const item = this.payments.get(id); if (!item) return Promise.resolve('not_found'); if (item.cancelledAt) return Promise.resolve('already_cancelled');
    this.payments.set(id, { ...item, cancelledAt: new Date(), updatedAt: new Date() }); return Promise.resolve('cancelled');
  }

  public async createAdjustment(input: AdjustmentWriteInput): Promise<AdjustmentRecord> {
    const customer = await this.findActiveCustomer(input.customerId);
    if (!customer) throw new Error('Test müşterisi bulunamadı.');
    const now = new Date();
    const item: AdjustmentRecord = { id: `adjustment-${this.nextAdjustmentId++}`, ...input, amount: new Prisma.Decimal(input.amount).toFixed(2), customer, cancelledAt: null, createdAt: now, updatedAt: now };
    this.adjustments.set(item.id, item);
    return cloneAdjustment(item);
  }
  public cancelAdjustment(id: string): Promise<'cancelled' | 'not_found' | 'already_cancelled'> {
    const item = this.adjustments.get(id); if (!item) return Promise.resolve('not_found'); if (item.cancelledAt) return Promise.resolve('already_cancelled');
    this.adjustments.set(id, { ...item, cancelledAt: new Date(), updatedAt: new Date() }); return Promise.resolve('cancelled');
  }

  private accountSource(customer: FinanceCustomer): AccountSource {
    const workOrders = this.workOrders.filter((item) => item.customerId === customer.id && !item.deletedAt && item.status !== 'CANCELLED');
    const payments = [...this.payments.values()].filter((item) => item.customerId === customer.id && !item.cancelledAt);
    const adjustments = [...this.adjustments.values()].filter((item) => item.customerId === customer.id && !item.cancelledAt);
    const activity = [...workOrders.map((item) => item.updatedAt), ...payments.map((item) => item.paidAt), ...adjustments.map((item) => item.occurredAt)].sort((a, b) => b.getTime() - a.getTime());
    return { customer: { ...customer }, workOrderTotal: sum(workOrders.map((item) => item.totalAmount)), paymentsTotal: sum(payments.map((item) => item.amount)), debitAdjustments: sum(adjustments.filter((item) => item.type === 'DEBIT').map((item) => item.amount)), creditAdjustments: sum(adjustments.filter((item) => item.type === 'CREDIT').map((item) => item.amount)), lastPaymentAt: payments.sort((a, b) => b.paidAt.getTime() - a.paidAt.getTime())[0]?.paidAt ?? null, lastActivityAt: activity[0] ?? null };
  }

  public listAccountSources(q?: string): Promise<AccountSource[]> {
    const search = q?.toLocaleLowerCase('tr-TR');
    const active = [...this.customers.values()].filter((item) => !item.deletedAt && (!search || item.name.toLocaleLowerCase('tr-TR').includes(search))).sort((a, b) => a.name.localeCompare(b.name, 'tr-TR'));
    return Promise.resolve(active.map((item) => this.accountSource({ id: item.id, name: item.name })));
  }

  public async getAccountDetail(customerId: string, query: StatementQuery): Promise<AccountDetailSource | null> {
    const customer = await this.findActiveCustomer(customerId); if (!customer) return null;
    const source = this.accountSource(customer);
    const within = (date: Date) => (!query.from || date >= query.from) && (!query.to || date <= query.to);
    const statements: StatementSource[] = [
      ...this.workOrders.filter((item) => item.customerId === customerId && !item.deletedAt && item.status !== 'CANCELLED' && within(item.receivedAt)).map((item) => ({ id: `WORK_ORDER:${item.id}`, sourceId: item.id, type: 'WORK_ORDER' as const, occurredAt: item.receivedAt, description: `İş Emri · ${item.productName}`, amount: item.totalAmount, cancelledAt: null })),
      ...[...this.payments.values()].filter((item) => item.customerId === customerId && within(item.paidAt)).map((item) => ({ id: `PAYMENT:${item.id}`, sourceId: item.id, type: 'PAYMENT' as const, occurredAt: item.paidAt, description: `Tahsilat · ${item.method}`, amount: item.amount, cancelledAt: item.cancelledAt })),
      ...[...this.adjustments.values()].filter((item) => item.customerId === customerId && within(item.occurredAt)).map((item) => ({ id: `ADJUSTMENT:${item.id}`, sourceId: item.id, type: adjustmentStatementType(item.type), occurredAt: item.occurredAt, description: item.description, amount: item.amount, cancelledAt: item.cancelledAt })),
    ].filter((item) => !query.type || item.type === query.type).sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime() || b.id.localeCompare(a.id));
    const start = (query.page - 1) * query.pageSize;
    return { customer, workOrderTotal: source.workOrderTotal, paymentsTotal: source.paymentsTotal, debitAdjustments: source.debitAdjustments, creditAdjustments: source.creditAdjustments, lastPaymentAt: source.lastPaymentAt, statements: statements.slice(start, start + query.pageSize), statementTotal: statements.length };
  }

  public getMonthPaymentsTotal(start: Date, end: Date): Promise<string> { return Promise.resolve(sum([...this.payments.values()].filter((item) => !item.cancelledAt && item.paidAt >= start && item.paidAt < end).map((item) => item.amount))); }
}
