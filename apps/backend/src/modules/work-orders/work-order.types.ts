import type { WorkOrderType } from '../customers/customer.types.js';

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

export interface WorkOrderCustomerSummary {
  id: string;
  name: string;
}

export interface WorkOrderRecord {
  id: string;
  customerId: string;
  customer: WorkOrderCustomerSummary;
  productName: string;
  type: WorkOrderType;
  status: WorkOrderStatus;
  totalQuantity: number;
  unitPrice: string;
  totalAmount: string;
  receivedAt: Date;
  dueAt: Date | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface WorkOrderResponse extends Omit<
  WorkOrderRecord,
  'receivedAt' | 'dueAt' | 'createdAt' | 'updatedAt' | 'deletedAt'
> {
  receivedAt: string;
  dueAt: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface WorkOrderListQuery {
  q?: string | undefined;
  page: number;
  pageSize: number;
  customerId?: string | undefined;
  type?: WorkOrderType | undefined;
  status?: WorkOrderStatus | undefined;
}

export interface WorkOrderListResult {
  items: WorkOrderResponse[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface CreateWorkOrderInput {
  customerId: string;
  productName: string;
  type: WorkOrderType;
  totalQuantity: number;
  unitPrice?: string | undefined;
  receivedAt: string;
  dueAt?: string | null | undefined;
  notes?: string | null | undefined;
}

export interface UpdateWorkOrderInput {
  customerId?: string | undefined;
  productName?: string | undefined;
  type?: WorkOrderType | undefined;
  totalQuantity?: number | undefined;
  unitPrice?: string | undefined;
  receivedAt?: string | undefined;
  dueAt?: string | null | undefined;
  notes?: string | null | undefined;
}

export interface WorkOrderWriteData {
  customerId: string;
  productName: string;
  type: WorkOrderType;
  status: WorkOrderStatus;
  totalQuantity: number;
  unitPrice: string;
  totalAmount: string;
  receivedAt: Date;
  dueAt: Date | null;
  notes: string | null;
}

export type WorkOrderUpdateData = Omit<WorkOrderWriteData, 'status'>;

export interface UpdateWorkOrderStatusInput {
  status: WorkOrderStatus;
}
