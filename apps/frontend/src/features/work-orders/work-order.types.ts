import type { WorkOrderType } from '../customers/customer.types';

export type { WorkOrderType };

export const workOrderStatuses = [
  'WAITING',
  'IN_PROGRESS',
  'READY',
  'DELIVERED',
  'CLOSED',
  'CANCELLED',
] as const;

export type WorkOrderStatus = (typeof workOrderStatuses)[number];

export const workOrderStatusLabels: Record<WorkOrderStatus, string> = {
  WAITING: 'Bekliyor',
  IN_PROGRESS: 'İşlemde',
  READY: 'Hazır',
  DELIVERED: 'Teslim Edildi',
  CLOSED: 'Kapalı',
  CANCELLED: 'İptal',
};

export interface WorkOrder {
  id: string;
  customerId: string;
  customer: { id: string; name: string };
  productName: string;
  type: WorkOrderType;
  status: WorkOrderStatus;
  totalQuantity: number;
  unitPrice: string;
  totalAmount: string;
  receivedAt: string;
  dueAt: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface WorkOrderListParams {
  q: string;
  page: number;
  pageSize: number;
  deleted: boolean;
  customerId?: string | undefined;
  type?: WorkOrderType | undefined;
  status?: WorkOrderStatus | undefined;
}

export interface WorkOrderListData {
  items: WorkOrder[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface WorkOrderMutationInput {
  customerId: string;
  productName: string;
  type: WorkOrderType;
  totalQuantity: number;
  unitPrice?: string | undefined;
  receivedAt: string;
  dueAt: string | null;
  notes: string | null;
}
