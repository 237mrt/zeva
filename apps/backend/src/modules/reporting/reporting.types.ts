import type { WorkOrderType } from '../customers/customer.types.js';
import type { PackageType } from '../operations/operation.types.js';
import type { WorkOrderStatus } from '../work-orders/work-order.types.js';

export interface DateRange { from: Date; to: Date }
export interface PaginationQuery { page: number; pageSize: number }
export interface ReportCustomer { id: string; name: string }

export interface WorkOrderReportQuery extends DateRange, PaginationQuery {
  customerId?: string | undefined;
  type?: WorkOrderType | undefined;
  status?: WorkOrderStatus | undefined;
}
export interface DeliveryReportQuery extends DateRange, PaginationQuery {
  customerId?: string | undefined;
  workOrderId?: string | undefined;
}
export type FinanceReportQuery = DateRange;
export interface CustomerReportQuery extends DateRange, PaginationQuery { q?: string | undefined }

export interface WorkOrderReportItem {
  id: string; customer: ReportCustomer; productName: string; type: WorkOrderType;
  status: WorkOrderStatus; totalQuantity: number; totalAmount: string; receivedAt: Date;
}
export interface DeliveryReportItem {
  id: string; customer: ReportCustomer; deliveredAt: Date; workOrderCount: number;
  packageCount: number; totalQuantity: number; receiverName: string | null; cancelledAt: Date | null;
}
export interface CustomerReportItem {
  customer: ReportCustomer; workOrderCount: number; totalQuantity: number; workOrderTotal: string;
  paymentsTotal: string; debitAdjustments: string; creditAdjustments: string; balance: string;
  lastWorkOrderAt: Date | null; lastPaymentAt: Date | null;
}
export interface StatusCount { status: WorkOrderStatus; count: number }
export interface TypeCount { type: WorkOrderType; count: number }

export interface DashboardSource {
  activeCustomerCount: number;
  workOrderStatuses: StatusCount[];
  deliveredQuantityThisMonth: number;
  packagedNotFullyDeliveredCount: number;
  monthPayments: string;
  currentAccounts: Array<{ workOrderTotal: string; paymentsTotal: string; debitAdjustments: string; creditAdjustments: string }>;
  overdue: Array<{ id: string; customer: ReportCustomer; productName: string; status: WorkOrderStatus; dueAt: Date }>;
  overdueCount: number;
  recentWorkOrders: Array<{ id: string; customer: ReportCustomer; productName: string; occurredAt: Date }>;
  recentDeliveries: Array<{ id: string; customer: ReportCustomer; totalQuantity: number; occurredAt: Date }>;
  recentPayments: Array<{ id: string; customer: ReportCustomer; amount: string; occurredAt: Date }>;
}

export interface WorkOrderReportSource {
  items: WorkOrderReportItem[]; total: number; totalQuantity: number; totalAmount: string;
  statusDistribution: StatusCount[]; typeDistribution: TypeCount[];
  customerSummary: Array<{ customer: ReportCustomer; workOrderCount: number; totalQuantity: number; totalAmount: string }>;
}
export interface DeliveryReportSource {
  items: DeliveryReportItem[]; total: number; activeDeliveryCount: number; activePackageCount: number;
  activeQuantity: number; customerSummary: Array<{ customer: ReportCustomer; deliveryCount: number; totalQuantity: number }>;
}
export interface FinanceReportSource {
  periodWorkOrderTotal: string; periodPaymentsTotal: string; periodDebitAdjustments: string;
  periodCreditAdjustments: string;
  currentAccounts: Array<{ workOrderTotal: string; paymentsTotal: string; debitAdjustments: string; creditAdjustments: string }>;
}
export interface CustomerReportSource { items: CustomerReportItem[]; total: number }

export interface WorkOrderPdfSource {
  id: string; customer: ReportCustomer; productName: string; type: WorkOrderType; status: WorkOrderStatus;
  totalQuantity: number; unitPrice: string; totalAmount: string; receivedAt: Date; dueAt: Date | null;
  notes: string | null; packages: Array<{ sequenceNo: number; type: PackageType; quantity: number; delivered: boolean }>;
}
export interface DeliveryPdfSource {
  id: string; customer: ReportCustomer; deliveredAt: Date; receiverName: string | null; notes: string | null;
  cancelledAt: Date | null; packages: Array<{ workOrderId: string; productName: string; sequenceNo: number; type: PackageType; quantity: number }>;
}
export type StatementType = 'WORK_ORDER' | 'PAYMENT' | 'ADJUSTMENT_DEBIT' | 'ADJUSTMENT_CREDIT';
export interface AccountStatementPdfSource {
  customer: ReportCustomer;
  workOrderTotal: string; paymentsTotal: string; debitAdjustments: string; creditAdjustments: string;
  items: Array<{ id: string; type: StatementType; occurredAt: Date; description: string; amount: string; cancelledAt: Date | null }>;
  truncated: boolean;
}

export interface CustomerActiveWorkOrderItem {
  id: string;
  productName: string;
  type: WorkOrderType;
  status: WorkOrderStatus;
  totalQuantity: number;
  deliveredQuantity: number;
  remainingQuantity: number;
  sackCount: number;
  boxCount: number;
  packagedQuantity: number;
  receivedAt: Date;
  dueAt: Date | null;
  notes: string | null;
  packages: Array<{ sequenceNo: number; type: PackageType; quantity: number; delivered: boolean }>;
}

export interface CustomerActiveWorkOrdersPdfSource {
  customer: ReportCustomer;
  generatedAt: Date;
  items: CustomerActiveWorkOrderItem[];
  summary: {
    totalWorkOrders: number;
    totalQuantity: number;
    totalDeliveredQuantity: number;
    totalRemainingQuantity: number;
    totalSacks: number;
    totalBoxes: number;
    totalPackagedQuantity: number;
  };
}

export interface PdfResult { buffer: Buffer; filename: string }

export interface ReportingRepository {
  getDashboard(now: Date, monthStart: Date, nextMonth: Date): Promise<DashboardSource>;
  getWorkOrderReport(query: WorkOrderReportQuery): Promise<WorkOrderReportSource>;
  getDeliveryReport(query: DeliveryReportQuery): Promise<DeliveryReportSource>;
  getFinanceReport(query: FinanceReportQuery): Promise<FinanceReportSource>;
  getCustomerReport(query: CustomerReportQuery): Promise<CustomerReportSource>;
  findWorkOrderForPdf(id: string): Promise<WorkOrderPdfSource | null>;
  findDeliveryForPdf(id: string): Promise<DeliveryPdfSource | null>;
  getAccountStatementForPdf(customerId: string, range: { from?: Date | undefined; to?: Date | undefined }, limit: number): Promise<AccountStatementPdfSource | null>;
  getCustomerActiveWorkOrdersForPdf(customerId: string): Promise<CustomerActiveWorkOrdersPdfSource | null>;
}
