import type { OperationRepository } from '../../src/modules/operations/operation.repository.js';
import type {
  CreateDeliveryInput,
  DeliveryCancelResult,
  DeliveryCreateResult,
  DeliveryListQuery,
  DeliveryListResult,
  DeliveryRecord,
  PackageCreateResult,
  PackageDeleteResult,
  PackageListResult,
  PackageUpdateInput,
  PackageUpdateResult,
  PackageWriteInput,
  WorkOrderPackageRecord,
} from '../../src/modules/operations/operation.types.js';
import type { WorkOrderRecord } from '../../src/modules/work-orders/work-order.types.js';

const clonePackage = (value: WorkOrderPackageRecord): WorkOrderPackageRecord => ({
  ...value,
  delivery: value.delivery ? { ...value.delivery } : null,
});
const cloneDelivery = (value: DeliveryRecord): DeliveryRecord => ({
  ...value,
  customer: { ...value.customer },
  workOrder: { ...value.workOrder },
  packages: value.packages.map((item) => ({ ...item })),
});

export class InMemoryOperationRepository implements OperationRepository {
  private readonly workOrders = new Map<string, WorkOrderRecord>();
  private readonly packages = new Map<string, WorkOrderPackageRecord>();
  private readonly deliveries = new Map<string, DeliveryRecord>();
  private nextPackageId = 1;
  private nextDeliveryId = 1;

  public constructor(workOrders: WorkOrderRecord[], packages: WorkOrderPackageRecord[] = []) {
    workOrders.forEach((item) => this.workOrders.set(item.id, { ...item, customer: { ...item.customer } }));
    packages.forEach((item) => this.packages.set(item.id, clonePackage(item)));
  }

  private activeWorkOrder(id: string) {
    const value = this.workOrders.get(id);
    return value && !value.deletedAt ? value : null;
  }

  public getWorkOrderStatus(id: string) { return this.workOrders.get(id)?.status; }
  public setWorkOrderStatus(id: string, status: WorkOrderRecord['status']) {
    const value = this.workOrders.get(id);
    if (value) this.workOrders.set(id, { ...value, status });
  }

  public listPackages(workOrderId: string): Promise<PackageListResult | null> {
    const workOrder = this.activeWorkOrder(workOrderId);
    if (!workOrder) return Promise.resolve(null);
    const packages = [...this.packages.values()]
      .filter((item) => item.workOrderId === workOrderId && !item.deletedAt)
      .sort((a, b) => a.sequenceNo - b.sequenceNo);
    const packagedQuantity = packages.reduce((sum, item) => sum + item.quantity, 0);
    const delivered = packages.filter((item) => item.deliveryId);
    return Promise.resolve({
      workOrder: {
        id: workOrder.id, productName: workOrder.productName, status: workOrder.status,
        totalQuantity: workOrder.totalQuantity, customer: { ...workOrder.customer },
      },
      packages: packages.map(clonePackage),
      summary: {
        workOrderTotalQuantity: workOrder.totalQuantity,
        packagedQuantity,
        remainingQuantity: workOrder.totalQuantity - packagedQuantity,
        deliveredQuantity: delivered.reduce((sum, item) => sum + item.quantity, 0),
        packageCount: packages.length,
        deliveredPackageCount: delivered.length,
      },
    });
  }

  public async createPackages(workOrderId: string, inputs: PackageWriteInput[]): Promise<PackageCreateResult> {
    const workOrder = this.activeWorkOrder(workOrderId);
    if (!workOrder) return { kind: 'work_order_not_found' };
    const active = [...this.packages.values()].filter((item) => item.workOrderId === workOrderId && !item.deletedAt);
    if (active.reduce((sum, item) => sum + item.quantity, 0) + inputs.reduce((sum, item) => sum + item.quantity, 0) > workOrder.totalQuantity) return { kind: 'quantity_exceeded' };
    let sequenceNo = Math.max(0, ...[...this.packages.values()].filter((item) => item.workOrderId === workOrderId).map((item) => item.sequenceNo));
    const now = new Date();
    inputs.forEach((input) => {
      sequenceNo += 1;
      const value: WorkOrderPackageRecord = {
        id: `package-${this.nextPackageId++}`, workOrderId, sequenceNo, type: input.type,
        quantity: input.quantity, deliveryId: null, delivery: null, notes: input.notes ?? null,
        createdAt: now, updatedAt: now, deletedAt: null,
      };
      this.packages.set(value.id, value);
    });
    return { kind: 'created', value: (await this.listPackages(workOrderId))! };
  }

  public updatePackage(id: string, input: PackageUpdateInput): Promise<PackageUpdateResult> {
    const current = this.packages.get(id);
    if (!current || current.deletedAt || !this.activeWorkOrder(current.workOrderId)) return Promise.resolve({ kind: 'package_not_found' });
    if (current.deliveryId) return Promise.resolve({ kind: 'already_delivered' });
    const quantity = input.quantity ?? current.quantity;
    const others = [...this.packages.values()].filter((item) => item.workOrderId === current.workOrderId && item.id !== id && !item.deletedAt);
    if (others.reduce((sum, item) => sum + item.quantity, 0) + quantity > this.workOrders.get(current.workOrderId)!.totalQuantity) return Promise.resolve({ kind: 'quantity_exceeded' });
    const updated: WorkOrderPackageRecord = {
      ...current,
      type: input.type ?? current.type,
      quantity: input.quantity ?? current.quantity,
      notes: input.notes !== undefined ? input.notes : current.notes,
      updatedAt: new Date(),
    };
    this.packages.set(id, updated);
    return Promise.resolve({ kind: 'updated', value: clonePackage(updated) });
  }

  public deletePackage(id: string): Promise<PackageDeleteResult> {
    const current = this.packages.get(id);
    if (!current || current.deletedAt || !this.activeWorkOrder(current.workOrderId)) return Promise.resolve({ kind: 'package_not_found' });
    if (current.deliveryId) return Promise.resolve({ kind: 'already_delivered' });
    this.packages.set(id, { ...current, deletedAt: new Date(), updatedAt: new Date() });
    return Promise.resolve({ kind: 'deleted' });
  }

  public listDeliveries(query: DeliveryListQuery): Promise<DeliveryListResult> {
    const search = query.q?.toLocaleLowerCase('tr-TR');
    const items = [...this.deliveries.values()]
      .filter((item) => !query.customerId || item.customer.id === query.customerId)
      .filter((item) => !query.workOrderId || item.workOrderId === query.workOrderId)
      .filter((item) => !query.deliveredFrom || item.deliveredAt >= query.deliveredFrom)
      .filter((item) => !query.deliveredTo || item.deliveredAt <= query.deliveredTo)
      .filter((item) => !search || item.receiverName?.toLocaleLowerCase('tr-TR').includes(search) || item.customer.name.toLocaleLowerCase('tr-TR').includes(search) || item.workOrder.productName.toLocaleLowerCase('tr-TR').includes(search))
      .sort((a, b) => b.deliveredAt.getTime() - a.deliveredAt.getTime());
    const start = (query.page - 1) * query.pageSize;
    return Promise.resolve({ items: items.slice(start, start + query.pageSize).map(cloneDelivery), total: items.length });
  }

  public findDelivery(id: string): Promise<DeliveryRecord | null> {
    const value = this.deliveries.get(id);
    return Promise.resolve(value ? cloneDelivery(value) : null);
  }

  public createDelivery(input: CreateDeliveryInput): Promise<DeliveryCreateResult> {
    const workOrder = this.activeWorkOrder(input.workOrderId);
    if (!workOrder) return Promise.resolve({ kind: 'work_order_not_found' });
    if (!['READY', 'DELIVERED'].includes(workOrder.status)) return Promise.resolve({ kind: 'work_order_not_ready' });
    const packages = input.packageIds.map((id) => this.packages.get(id));
    if (packages.some((item) => item?.deliveryId)) return Promise.resolve({ kind: 'package_already_delivered' });
    if (packages.some((item) => !item || item.deletedAt || item.workOrderId !== input.workOrderId)) return Promise.resolve({ kind: 'package_not_available' });
    const available = packages as WorkOrderPackageRecord[];
    const id = `delivery-${this.nextDeliveryId++}`;
    const now = new Date();
    available.forEach((item) => this.packages.set(item.id, { ...item, deliveryId: id, delivery: { id, deliveredAt: input.deliveredAt }, updatedAt: now }));
    const delivery: DeliveryRecord = {
      id, workOrderId: workOrder.id, workOrder: { id: workOrder.id, productName: workOrder.productName }, customer: { ...workOrder.customer },
      totalQuantity: available.reduce((sum, item) => sum + item.quantity, 0), deliveredAt: input.deliveredAt,
      receiverName: input.receiverName, notes: input.notes, cancelledAt: null, createdAt: now, updatedAt: now,
      packages: available.map((item) => ({ id: item.id, sequenceNo: item.sequenceNo, type: item.type, quantity: item.quantity })),
    };
    this.deliveries.set(id, delivery);
    const deliveredTotal = [...this.packages.values()].filter((item) => item.workOrderId === workOrder.id && !item.deletedAt && item.deliveryId).reduce((sum, item) => sum + item.quantity, 0);
    if (deliveredTotal >= workOrder.totalQuantity && workOrder.status === 'READY') this.workOrders.set(workOrder.id, { ...workOrder, status: 'DELIVERED' });
    return Promise.resolve({ kind: 'created', value: cloneDelivery(delivery) });
  }

  public cancelDelivery(id: string): Promise<DeliveryCancelResult> {
    const delivery = this.deliveries.get(id);
    if (!delivery) return Promise.resolve({ kind: 'delivery_not_found' });
    if (delivery.cancelledAt) return Promise.resolve({ kind: 'already_cancelled' });
    const now = new Date();
    const cancelled = { ...delivery, cancelledAt: now, updatedAt: now };
    this.deliveries.set(id, cancelled);
    delivery.packages.forEach((item) => {
      const current = this.packages.get(item.id);
      if (current?.deliveryId === id) this.packages.set(item.id, { ...current, deliveryId: null, delivery: null, updatedAt: now });
    });
    const workOrder = this.workOrders.get(delivery.workOrderId);
    if (workOrder?.status === 'DELIVERED') this.workOrders.set(workOrder.id, { ...workOrder, status: 'READY' });
    return Promise.resolve({ kind: 'cancelled', value: cloneDelivery(cancelled) });
  }
}
