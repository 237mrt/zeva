import type {
  DeliveryRecord,
  DeliveryResponse,
  WorkOrderPackageRecord,
  WorkOrderPackageResponse,
} from './operation.types.js';

export function toPackageResponse(value: WorkOrderPackageRecord): WorkOrderPackageResponse {
  return {
    ...value,
    delivery: value.delivery
      ? { id: value.delivery.id, deliveredAt: value.delivery.deliveredAt.toISOString() }
      : null,
    createdAt: value.createdAt.toISOString(),
    updatedAt: value.updatedAt.toISOString(),
    deletedAt: value.deletedAt?.toISOString() ?? null,
  };
}

export function toDeliveryResponse(value: DeliveryRecord): DeliveryResponse {
  return {
    ...value,
    packageCount: value.packages.length,
    deliveredAt: value.deliveredAt.toISOString(),
    cancelledAt: value.cancelledAt?.toISOString() ?? null,
    createdAt: value.createdAt.toISOString(),
    updatedAt: value.updatedAt.toISOString(),
  };
}
