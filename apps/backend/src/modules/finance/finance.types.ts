export const paymentMethods = ['CASH', 'BANK_TRANSFER', 'CARD', 'OTHER'] as const;
export type PaymentMethod = (typeof paymentMethods)[number];
export const adjustmentTypes = ['DEBIT', 'CREDIT'] as const;
export type AccountAdjustmentType = (typeof adjustmentTypes)[number];
export const balanceStatuses = ['RECEIVABLE', 'CREDIT', 'SETTLED'] as const;
export type BalanceStatus = (typeof balanceStatuses)[number];
export const statementTypes = ['WORK_ORDER', 'PAYMENT', 'ADJUSTMENT_DEBIT', 'ADJUSTMENT_CREDIT'] as const;
export type StatementType = (typeof statementTypes)[number];

export interface FinanceCustomer { id: string; name: string }
export interface PaymentRecord {
  id: string; customerId: string; customer: FinanceCustomer; amount: string; method: PaymentMethod;
  paidAt: Date; referenceNo: string | null; notes: string | null; cancelledAt: Date | null;
  createdAt: Date; updatedAt: Date;
}
export interface AdjustmentRecord {
  id: string; customerId: string; customer: FinanceCustomer; type: AccountAdjustmentType;
  amount: string; occurredAt: Date; description: string; cancelledAt: Date | null;
  createdAt: Date; updatedAt: Date;
}
export interface PaymentWriteInput { customerId: string; amount: string; method: PaymentMethod; paidAt: Date; referenceNo: string | null; notes: string | null }
export interface AdjustmentWriteInput { customerId: string; type: AccountAdjustmentType; amount: string; occurredAt: Date; description: string }
export interface PaymentListQuery {
  q?: string | undefined; page: number; pageSize: number; customerId?: string | undefined; method?: PaymentMethod | undefined;
  paidFrom?: Date | undefined; paidTo?: Date | undefined; cancelled?: boolean | undefined;
}
export interface AccountListQuery { q?: string | undefined; page: number; pageSize: number; balanceStatus?: BalanceStatus | undefined }
export interface StatementQuery { page: number; pageSize: number; from?: Date | undefined; to?: Date | undefined; type?: StatementType | undefined }
export interface MoneyTotals { workOrderTotal: string; debitAdjustments: string; paymentsTotal: string; creditAdjustments: string; balance: string }
export interface AccountSource {
  customer: FinanceCustomer;
  workOrderTotal: string; paymentsTotal: string; debitAdjustments: string; creditAdjustments: string;
  lastPaymentAt: Date | null; lastActivityAt: Date | null;
}
export interface StatementSource {
  id: string; type: StatementType; occurredAt: Date; description: string; amount: string;
  cancelledAt: Date | null; sourceId: string;
}
export interface AccountDetailSource {
  customer: FinanceCustomer; workOrderTotal: string; paymentsTotal: string; debitAdjustments: string;
  creditAdjustments: string; lastPaymentAt: Date | null; statements: StatementSource[]; statementTotal: number;
}
export interface FinanceRepository {
  findActiveCustomer(id: string): Promise<FinanceCustomer | null>;
  listPayments(query: PaymentListQuery): Promise<{ items: PaymentRecord[]; total: number }>;
  findPayment(id: string): Promise<PaymentRecord | null>;
  createPayment(input: PaymentWriteInput): Promise<PaymentRecord>;
  cancelPayment(id: string): Promise<'cancelled' | 'not_found' | 'already_cancelled'>;
  createAdjustment(input: AdjustmentWriteInput): Promise<AdjustmentRecord>;
  cancelAdjustment(id: string): Promise<'cancelled' | 'not_found' | 'already_cancelled'>;
  listAccountSources(q?: string): Promise<AccountSource[]>;
  getAccountDetail(customerId: string, query: StatementQuery): Promise<AccountDetailSource | null>;
  getMonthPaymentsTotal(start: Date, end: Date): Promise<string>;
}

export interface PaymentResponse extends Omit<PaymentRecord, 'paidAt' | 'cancelledAt' | 'createdAt' | 'updatedAt'> { paidAt: string; cancelledAt: string | null; createdAt: string; updatedAt: string }
export interface AdjustmentResponse extends Omit<AdjustmentRecord, 'occurredAt' | 'cancelledAt' | 'createdAt' | 'updatedAt'> { occurredAt: string; cancelledAt: string | null; createdAt: string; updatedAt: string }
