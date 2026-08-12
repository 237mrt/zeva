import type { WorkOrderRecord, WorkOrderResponse } from './work-order.types.js';

export function toWorkOrderResponse(workOrder: WorkOrderRecord): WorkOrderResponse {
  return {
    ...workOrder,
    receivedAt: workOrder.receivedAt.toISOString(),
    dueAt: workOrder.dueAt?.toISOString() ?? null,
    createdAt: workOrder.createdAt.toISOString(),
    updatedAt: workOrder.updatedAt.toISOString(),
    deletedAt: workOrder.deletedAt?.toISOString() ?? null,
  };
}
