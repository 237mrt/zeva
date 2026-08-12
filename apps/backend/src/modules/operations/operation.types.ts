import type { WorkOrderStatus } from '../work-orders/work-order.types.js';

export const packageTypes = ['SACK', 'BOX'] as const;
export type PackageType = (typeof packageTypes)[number];

export interface OperationWorkOrderSummary {
  id: string;
  productName: string;
  status: WorkOrderStatus;
  totalQuantity: number;
  customer: { id: string; name: string };
}

export interface PackageDeliverySummary {
  id: string;
  deliveredAt: Date;
}

export interface WorkOrderPackageRecord {
  id: string;
  workOrderId: string;
  sequenceNo: number;
  type: PackageType;
  quantity: number;
  deliveryId: string | null;
  delivery: PackageDeliverySummary | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface PackageSummary {
  workOrderTotalQuantity: number;
  packagedQuantity: number;
  remainingQuantity: number;
  deliveredQuantity: number;
  packageCount: number;
  deliveredPackageCount: number;
}

export interface PackageListResult {
  workOrder: OperationWorkOrderSummary;
  packages: WorkOrderPackageRecord[];
  summary: PackageSummary;
}

export interface PackageWriteInput {
  type: PackageType;
  quantity: number;
  notes?: string | null | undefined;
}

export interface PackageUpdateInput {
  type?: PackageType | undefined;
  quantity?: number | undefined;
  notes?: string | null | undefined;
}

export interface DeliveryPackageRecord {
  id: string;
  sequenceNo: number;
  type: PackageType;
  quantity: number;
}

export interface DeliveryRecord {
  id: string;
  workOrderId: string;
  workOrder: { id: string; productName: string };
  customer: { id: string; name: string };
  totalQuantity: number;
  deliveredAt: Date;
  receiverName: string | null;
  notes: string | null;
  cancelledAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  packages: DeliveryPackageRecord[];
}

export interface DeliveryListQuery {
  q?: string | undefined;
  page: number;
  pageSize: number;
  customerId?: string | undefined;
  workOrderId?: string | undefined;
  deliveredFrom?: Date | undefined;
  deliveredTo?: Date | undefined;
}

export interface DeliveryListResult {
  items: DeliveryRecord[];
  total: number;
}

export interface CreateDeliveryInput {
  workOrderId: string;
  packageIds: string[];
  deliveredAt: Date;
  receiverName: string | null;
  notes: string | null;
}

export type PackageCreateResult =
  | { kind: 'created'; value: PackageListResult }
  | { kind: 'work_order_not_found' }
  | { kind: 'quantity_exceeded' };

export type PackageUpdateResult =
  | { kind: 'updated'; value: WorkOrderPackageRecord }
  | { kind: 'package_not_found' }
  | { kind: 'already_delivered' }
  | { kind: 'quantity_exceeded' };

export type PackageDeleteResult =
  | { kind: 'deleted' }
  | { kind: 'package_not_found' }
  | { kind: 'already_delivered' };

export type DeliveryCreateResult =
  | { kind: 'created'; value: DeliveryRecord }
  | { kind: 'work_order_not_found' }
  | { kind: 'work_order_not_ready' }
  | { kind: 'package_not_available' }
  | { kind: 'package_already_delivered' };

export type DeliveryCancelResult =
  | { kind: 'cancelled'; value: DeliveryRecord }
  | { kind: 'delivery_not_found' }
  | { kind: 'already_cancelled' };

export interface WorkOrderPackageResponse extends Omit<WorkOrderPackageRecord, 'delivery' | 'createdAt' | 'updatedAt' | 'deletedAt'> {
  delivery: { id: string; deliveredAt: string } | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface DeliveryResponse extends Omit<DeliveryRecord, 'deliveredAt' | 'cancelledAt' | 'createdAt' | 'updatedAt'> {
  packageCount: number;
  deliveredAt: string;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
}
