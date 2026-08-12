import type {
  AccountStatementPdfSource,
  CustomerReportQuery,
  CustomerReportSource,
  DashboardSource,
  DeliveryPdfSource,
  DeliveryReportQuery,
  DeliveryReportSource,
  FinanceReportQuery,
  FinanceReportSource,
  ReportingRepository,
  WorkOrderPdfSource,
  WorkOrderReportQuery,
  WorkOrderReportSource,
} from '../../src/modules/reporting/reporting.types.js';

const at = (day: number) => new Date(`2026-08-${String(day).padStart(2, '0')}T10:00:00.000Z`);
const customer = { id: 'alpha', name: 'Çığlık / Alpha Tekstil' };

export class InMemoryReportingRepository implements ReportingRepository {
  public lastWorkOrderQuery: WorkOrderReportQuery | null = null;
  public lastDeliveryQuery: DeliveryReportQuery | null = null;
  public lastFinanceQuery: FinanceReportQuery | null = null;
  public lastCustomerQuery: CustomerReportQuery | null = null;
  public lastAccountRange: { from?: Date | undefined; to?: Date | undefined } | null = null;
  public lastAccountLimit: number | null = null;
  public lastDashboardRange: { now: Date; monthStart: Date; nextMonth: Date } | null = null;

  public dashboardSource: DashboardSource = {
    activeCustomerCount: 3,
    workOrderStatuses: [
      { status: 'WAITING', count: 2 },
      { status: 'IN_PROGRESS', count: 3 },
      { status: 'READY', count: 4 },
      { status: 'DELIVERED', count: 7 },
    ],
    deliveredQuantityThisMonth: 1_300,
    packagedNotFullyDeliveredCount: 2,
    monthPayments: '800.00',
    currentAccounts: [
      { workOrderTotal: '2000.00', paymentsTotal: '500.00', debitAdjustments: '100.00', creditAdjustments: '200.00' },
      { workOrderTotal: '100.00', paymentsTotal: '400.00', debitAdjustments: '0.00', creditAdjustments: '0.00' },
    ],
    overdue: [{ id: 'wo-overdue', customer, productName: 'Şampiyon Forma', status: 'IN_PROGRESS', dueAt: at(2) }],
    overdueCount: 1,
    recentWorkOrders: [{ id: 'wo-recent', customer, productName: 'Özel Ürün', occurredAt: at(10) }],
    recentDeliveries: [{ id: 'delivery-recent', customer, totalQuantity: 500, occurredAt: at(11) }],
    recentPayments: [{ id: 'payment-recent', customer, amount: '250.00', occurredAt: at(12) }],
  };

  public workOrderSource: WorkOrderReportSource = {
    items: [{ id: 'wo-1', customer, productName: 'Şampiyon Forma', type: 'IRONING_PACKAGING', status: 'READY', totalQuantity: 500, totalAmount: '1250.00', receivedAt: at(5) }],
    total: 21,
    totalQuantity: 4_500,
    totalAmount: '11250.00',
    statusDistribution: [{ status: 'READY', count: 12 }, { status: 'IN_PROGRESS', count: 9 }],
    typeDistribution: [{ type: 'IRONING_PACKAGING', count: 21 }],
    customerSummary: [{ customer, workOrderCount: 21, totalQuantity: 4_500, totalAmount: '11250.00' }],
  };

  public deliverySource: DeliveryReportSource = {
    items: [
      { id: 'delivery-active', customer, deliveredAt: at(8), workOrderCount: 2, packageCount: 5, totalQuantity: 1_300, receiverName: 'Çağrı Şen', cancelledAt: null },
      { id: 'delivery-cancelled', customer, deliveredAt: at(7), workOrderCount: 1, packageCount: 2, totalQuantity: 400, receiverName: null, cancelledAt: at(9) },
    ],
    total: 2,
    activeDeliveryCount: 1,
    activePackageCount: 5,
    activeQuantity: 1_300,
    customerSummary: [{ customer, deliveryCount: 1, totalQuantity: 1_300 }],
  };

  public financeSource: FinanceReportSource = {
    periodWorkOrderTotal: '4000.00',
    periodPaymentsTotal: '1250.00',
    periodDebitAdjustments: '100.00',
    periodCreditAdjustments: '50.00',
    currentAccounts: this.dashboardSource.currentAccounts,
  };

  public customerSource: CustomerReportSource = {
    items: [{ customer, workOrderCount: 3, totalQuantity: 900, workOrderTotal: '2250.00', paymentsTotal: '750.00', debitAdjustments: '100.00', creditAdjustments: '50.00', balance: '1550.00', lastWorkOrderAt: at(9), lastPaymentAt: at(10) }],
    total: 1,
  };

  public workOrderPdfSource: WorkOrderPdfSource | null = {
    id: 'wo-unsafe/id', customer, productName: 'Şampiyon Ürün', type: 'IRONING_PACKAGING', status: 'READY',
    totalQuantity: 500, unitPrice: '2.50', totalAmount: '1250.00', receivedAt: at(3), dueAt: at(15),
    notes: 'Ç, Ğ, I, İ, Ö, Ş, Ü ve <script> yalnız metindir.',
    packages: [{ sequenceNo: 1, type: 'SACK', quantity: 250, delivered: false }, { sequenceNo: 2, type: 'BOX', quantity: 250, delivered: true }],
  };

  public deliveryPdfSource: DeliveryPdfSource | null = {
    id: 'delivery-1', customer, deliveredAt: at(8), receiverName: 'Çağrı Şen', notes: 'İki iş emri teslimatı', cancelledAt: null,
    packages: [
      { workOrderId: 'wo-1', productName: 'Galatasaray Garson', sequenceNo: 1, type: 'SACK', quantity: 250 },
      { workOrderId: 'wo-1', productName: 'Galatasaray Garson', sequenceNo: 2, type: 'SACK', quantity: 250 },
      { workOrderId: 'wo-2', productName: 'Fenerbahçe Forma', sequenceNo: 1, type: 'BOX', quantity: 800 },
    ],
  };

  public accountSource: AccountStatementPdfSource | null = {
    customer, workOrderTotal: '2250.00', paymentsTotal: '750.00', debitAdjustments: '100.00', creditAdjustments: '50.00', truncated: false,
    items: [
      { id: 'wo-1', type: 'WORK_ORDER', occurredAt: at(3), description: 'Şampiyon Ürün', amount: '1250.00', cancelledAt: null },
      { id: 'payment-1', type: 'PAYMENT', occurredAt: at(5), description: 'Banka tahsilatı', amount: '750.00', cancelledAt: null },
    ],
  };

  public getDashboard(now: Date, monthStart: Date, nextMonth: Date): Promise<DashboardSource> { this.lastDashboardRange = { now, monthStart, nextMonth }; return Promise.resolve(this.dashboardSource); }
  public getWorkOrderReport(query: WorkOrderReportQuery): Promise<WorkOrderReportSource> { this.lastWorkOrderQuery = query; return Promise.resolve(this.workOrderSource); }
  public getDeliveryReport(query: DeliveryReportQuery): Promise<DeliveryReportSource> { this.lastDeliveryQuery = query; return Promise.resolve(this.deliverySource); }
  public getFinanceReport(query: FinanceReportQuery): Promise<FinanceReportSource> { this.lastFinanceQuery = query; return Promise.resolve(this.financeSource); }
  public getCustomerReport(query: CustomerReportQuery): Promise<CustomerReportSource> { this.lastCustomerQuery = query; return Promise.resolve(this.customerSource); }
  public findWorkOrderForPdf(): Promise<WorkOrderPdfSource | null> { return Promise.resolve(this.workOrderPdfSource); }
  public findDeliveryForPdf(): Promise<DeliveryPdfSource | null> { return Promise.resolve(this.deliveryPdfSource); }
  public getAccountStatementForPdf(_customerId: string, range: { from?: Date | undefined; to?: Date | undefined }, limit: number): Promise<AccountStatementPdfSource | null> { this.lastAccountRange = range; this.lastAccountLimit = limit; return Promise.resolve(this.accountSource); }
}
