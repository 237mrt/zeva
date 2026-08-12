export const paymentMethods = ['CASH', 'BANK_TRANSFER', 'CARD', 'OTHER'] as const;
export type PaymentMethod = (typeof paymentMethods)[number];
export const paymentMethodLabels: Record<PaymentMethod, string> = { CASH: 'Nakit', BANK_TRANSFER: 'Havale / EFT', CARD: 'Kart', OTHER: 'Diğer' };
export const adjustmentTypes = ['DEBIT', 'CREDIT'] as const;
export type AdjustmentType = (typeof adjustmentTypes)[number];
export const balanceStatuses = ['RECEIVABLE', 'CREDIT', 'SETTLED'] as const;
export type BalanceStatus = (typeof balanceStatuses)[number];

export interface CustomerSummary { id: string; name: string }
export interface MoneySummary { workOrderTotal: string; debitAdjustments: string; paymentsTotal: string; creditAdjustments: string; balance: string }
export interface AccountListItem { customer: CustomerSummary; summary: MoneySummary; lastPaymentAt: string | null; lastActivityAt: string | null }
export interface Pagination { page: number; pageSize: number; total: number; totalPages: number }
export interface AccountListData { items: AccountListItem[]; overview: { totalReceivable: string; totalCustomerCredit: string; openAccountCount: number; monthPayments: string }; pagination: Pagination }
export interface Payment { id: string; customerId: string; customer: CustomerSummary; amount: string; method: PaymentMethod; paidAt: string; referenceNo: string | null; notes: string | null; cancelledAt: string | null; createdAt: string; updatedAt: string }
export interface Adjustment { id: string; customerId: string; customer: CustomerSummary; type: AdjustmentType; amount: string; occurredAt: string; description: string; cancelledAt: string | null; createdAt: string; updatedAt: string }
export type StatementType = 'WORK_ORDER' | 'PAYMENT' | 'ADJUSTMENT_DEBIT' | 'ADJUSTMENT_CREDIT';
export interface StatementItem { id: string; sourceId: string; type: StatementType; occurredAt: string; description: string; debit: string; credit: string; cancelledAt: string | null }
export interface AccountDetail { customer: CustomerSummary; summary: MoneySummary & { lastPaymentAt: string | null }; statement: { items: StatementItem[]; pagination: Pagination } }
export interface AccountListParams { q: string; page: number; pageSize: number; balanceStatus: BalanceStatus | '' }
export interface StatementParams { page: number; pageSize: number }
export interface PaymentListParams { q: string; page: number; pageSize: number; customerId: string; method: PaymentMethod | ''; paidFrom: string; paidTo: string; cancelled?: boolean }
export interface PaymentInput { customerId: string; amount: string; method: PaymentMethod; paidAt: string; referenceNo: string | null; notes: string | null }
export interface AdjustmentInput { customerId: string; type: AdjustmentType; amount: string; occurredAt: string; description: string }
