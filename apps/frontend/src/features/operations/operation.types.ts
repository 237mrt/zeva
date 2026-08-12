export const packageTypes = ['SACK', 'BOX'] as const;
export type PackageType = (typeof packageTypes)[number];
export const packageTypeLabels: Record<PackageType, string> = { SACK: 'Çuval', BOX: 'Koli' };

export interface OperationWorkOrder {
  id: string;
  productName: string;
  status: string;
  totalQuantity: number;
  customer: { id: string; name: string };
}

export interface WorkOrderPackage {
  id: string;
  workOrderId: string;
  sequenceNo: number;
  type: PackageType;
  quantity: number;
  deliveryId: string | null;
  delivery: { id: string; deliveredAt: string } | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface PackageSummary {
  workOrderTotalQuantity: number;
  packagedQuantity: number;
  remainingQuantity: number;
  deliveredQuantity: number;
  packageCount: number;
  deliveredPackageCount: number;
}

export interface PackageListData {
  workOrder: OperationWorkOrder;
  packages: WorkOrderPackage[];
  summary: PackageSummary;
}

export interface PackageInput { type: PackageType; quantity: number; notes?: string | null }

export interface DeliveryPackage { id: string; sequenceNo: number; type: PackageType; quantity: number }
export interface Delivery {
  id: string;
  workOrderId: string;
  workOrder: { id: string; productName: string };
  customer: { id: string; name: string };
  totalQuantity: number;
  deliveredAt: string;
  receiverName: string | null;
  notes: string | null;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
  packages: DeliveryPackage[];
  packageCount: number;
}

export interface DeliveryListParams {
  q: string;
  page: number;
  pageSize: number;
  customerId?: string | undefined;
  workOrderId?: string | undefined;
}
export interface DeliveryListData {
  items: Delivery[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
}
export interface CreateDeliveryInput {
  workOrderId: string;
  packageIds: string[];
  deliveredAt: string;
  receiverName: string | null;
  notes: string | null;
}
