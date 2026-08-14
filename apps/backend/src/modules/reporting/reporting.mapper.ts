import type { CustomerReportItem, DeliveryReportItem, WorkOrderReportItem } from './reporting.types.js';

export const mapWorkOrderReportItem = (item: WorkOrderReportItem) => ({ ...item, receivedAt: item.receivedAt.toISOString() });
export const mapDeliveryReportItem = (item: DeliveryReportItem) => ({ ...item, deliveredAt: item.deliveredAt.toISOString(), cancelledAt: item.cancelledAt?.toISOString() ?? null });
export const mapCustomerReportItem = (item: CustomerReportItem) => ({ ...item, lastWorkOrderAt: item.lastWorkOrderAt?.toISOString() ?? null, lastPaymentAt: item.lastPaymentAt?.toISOString() ?? null });
