export const workOrderTypes = [
  'IRONING',
  'PACKAGING',
  'IRONING_PACKAGING',
  'PRINTING',
  'OTHER',
] as const;

export type WorkOrderType = (typeof workOrderTypes)[number];

export interface CustomerRecord {
  id: string;
  name: string;
  contactName: string | null;
  phone: string | null;
  address: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface CustomerResponse {
  id: string;
  name: string;
  contactName: string | null;
  phone: string | null;
  address: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface CreateCustomerInput {
  name: string;
  contactName?: string | null | undefined;
  phone?: string | null | undefined;
  address?: string | null | undefined;
  notes?: string | null | undefined;
}

export interface CustomerWriteData {
  name: string;
  contactName: string | null;
  phone: string | null;
  address: string | null;
  notes: string | null;
}

export interface UpdateCustomerInput {
  name?: string | undefined;
  contactName?: string | null | undefined;
  phone?: string | null | undefined;
  address?: string | null | undefined;
  notes?: string | null | undefined;
}

export interface CustomerUpdateData {
  name?: string;
  contactName?: string | null;
  phone?: string | null;
  address?: string | null;
  notes?: string | null;
}

export interface CustomerListQuery {
  q?: string | undefined;
  page: number;
  pageSize: number;
}

export interface CustomerListResult {
  items: CustomerResponse[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface CustomerPriceInput {
  type: WorkOrderType;
  unitPrice: string;
}

export interface CustomerPriceRecord extends CustomerPriceInput {
  id: string;
  customerId: string;
  createdAt: Date;
  updatedAt: Date;
}
