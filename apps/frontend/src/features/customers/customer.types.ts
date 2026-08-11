export const workOrderTypes = [
  'IRONING',
  'PACKAGING',
  'IRONING_PACKAGING',
  'PRINTING',
  'OTHER',
] as const;

export type WorkOrderType = (typeof workOrderTypes)[number];

export const workOrderTypeLabels: Record<WorkOrderType, string> = {
  IRONING: 'Ütü',
  PACKAGING: 'Paketleme',
  IRONING_PACKAGING: 'Ütü + Paketleme',
  PRINTING: 'Baskı',
  OTHER: 'Diğer',
};

export interface Customer {
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

export interface CustomerMutationInput {
  name: string;
  contactName: string | null;
  phone: string | null;
  address: string | null;
  notes: string | null;
}

export interface CustomerListParams {
  q: string;
  page: number;
  pageSize: number;
  deleted: boolean;
}

export interface CustomerListData {
  items: Customer[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface CustomerPrice {
  type: WorkOrderType;
  unitPrice: string;
}
