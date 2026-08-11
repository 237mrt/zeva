import type { CustomerRecord, CustomerResponse } from './customer.types.js';

export function toCustomerResponse(customer: CustomerRecord): CustomerResponse {
  return {
    id: customer.id,
    name: customer.name,
    contactName: customer.contactName,
    phone: customer.phone,
    address: customer.address,
    notes: customer.notes,
    createdAt: customer.createdAt.toISOString(),
    updatedAt: customer.updatedAt.toISOString(),
    deletedAt: customer.deletedAt?.toISOString() ?? null,
  };
}
