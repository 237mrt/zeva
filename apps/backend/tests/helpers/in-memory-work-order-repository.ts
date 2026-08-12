import type { CustomerPriceRecord, CustomerRecord } from '../../src/modules/customers/customer.types.js';
import type {
  RestoreWorkOrderResult,
  WorkOrderRepository,
  WorkOrderRepositoryListResult,
} from '../../src/modules/work-orders/work-order.repository.js';
import type {
  WorkOrderCustomerSummary,
  WorkOrderListQuery,
  WorkOrderRecord,
  WorkOrderStatus,
  WorkOrderType,
  WorkOrderUpdateData,
  WorkOrderWriteData,
} from '../../src/modules/work-orders/work-order.types.js';

function cloneWorkOrder(workOrder: WorkOrderRecord): WorkOrderRecord {
  return { ...workOrder, customer: { ...workOrder.customer } };
}

export class InMemoryWorkOrderRepository implements WorkOrderRepository {
  private readonly customers = new Map<string, CustomerRecord>();
  private readonly prices = new Map<string, string>();
  private readonly workOrders = new Map<string, WorkOrderRecord>();
  private nextId = 1;

  public constructor(
    customers: CustomerRecord[] = [],
    prices: CustomerPriceRecord[] = [],
    workOrders: WorkOrderRecord[] = [],
  ) {
    customers.forEach((customer) => this.customers.set(customer.id, { ...customer }));
    prices.forEach((price) => this.prices.set(`${price.customerId}:${price.type}`, price.unitPrice));
    workOrders.forEach((workOrder) => this.workOrders.set(workOrder.id, cloneWorkOrder(workOrder)));
  }

  public list(
    query: WorkOrderListQuery,
    deleted: boolean,
  ): Promise<WorkOrderRepositoryListResult> {
    const search = query.q?.toLocaleLowerCase('tr-TR');
    const items = [...this.workOrders.values()]
      .filter((workOrder) => Boolean(workOrder.deletedAt) === deleted)
      .filter((workOrder) => !query.customerId || workOrder.customerId === query.customerId)
      .filter((workOrder) => !query.type || workOrder.type === query.type)
      .filter((workOrder) => !query.status || workOrder.status === query.status)
      .filter(
        (workOrder) =>
          !search ||
          workOrder.productName.toLocaleLowerCase('tr-TR').includes(search) ||
          workOrder.customer.name.toLocaleLowerCase('tr-TR').includes(search),
      )
      .sort((first, second) => {
        const firstDate = deleted ? first.deletedAt : first.receivedAt;
        const secondDate = deleted ? second.deletedAt : second.receivedAt;
        return (secondDate?.getTime() ?? 0) - (firstDate?.getTime() ?? 0);
      });
    const start = (query.page - 1) * query.pageSize;
    return Promise.resolve({
      items: items.slice(start, start + query.pageSize).map(cloneWorkOrder),
      total: items.length,
    });
  }

  public findActiveById(id: string): Promise<WorkOrderRecord | null> {
    const workOrder = this.workOrders.get(id);
    return Promise.resolve(workOrder && !workOrder.deletedAt ? cloneWorkOrder(workOrder) : null);
  }

  public findActiveCustomerById(id: string): Promise<WorkOrderCustomerSummary | null> {
    const customer = this.customers.get(id);
    return Promise.resolve(
      customer && !customer.deletedAt ? { id: customer.id, name: customer.name } : null,
    );
  }

  public findCustomerPrice(customerId: string, type: WorkOrderType): Promise<string | null> {
    return Promise.resolve(this.prices.get(`${customerId}:${type}`) ?? null);
  }

  public setCustomerPrice(customerId: string, type: WorkOrderType, unitPrice: string): void {
    this.prices.set(`${customerId}:${type}`, unitPrice);
  }

  public create(input: WorkOrderWriteData): Promise<WorkOrderRecord> {
    const customer = this.customers.get(input.customerId);
    if (!customer) throw new Error('Test customer not found');
    const now = new Date();
    const workOrder: WorkOrderRecord = {
      id: `work-order-${this.nextId++}`,
      ...input,
      customer: { id: customer.id, name: customer.name },
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    };
    this.workOrders.set(workOrder.id, workOrder);
    return Promise.resolve(cloneWorkOrder(workOrder));
  }

  public updateActive(
    id: string,
    input: WorkOrderUpdateData,
  ): Promise<WorkOrderRecord | null> {
    const workOrder = this.workOrders.get(id);
    if (!workOrder || workOrder.deletedAt) return Promise.resolve(null);
    const customer = this.customers.get(input.customerId);
    if (!customer) throw new Error('Test customer not found');
    const updated = {
      ...workOrder,
      ...input,
      customer: { id: customer.id, name: customer.name },
      updatedAt: new Date(),
    };
    this.workOrders.set(id, updated);
    return Promise.resolve(cloneWorkOrder(updated));
  }

  public updateStatusActive(
    id: string,
    status: WorkOrderStatus,
  ): Promise<WorkOrderRecord | null> {
    const workOrder = this.workOrders.get(id);
    if (!workOrder || workOrder.deletedAt) return Promise.resolve(null);
    const updated = { ...workOrder, status, updatedAt: new Date() };
    this.workOrders.set(id, updated);
    return Promise.resolve(cloneWorkOrder(updated));
  }

  public softDelete(id: string): Promise<boolean> {
    const workOrder = this.workOrders.get(id);
    if (!workOrder || workOrder.deletedAt) return Promise.resolve(false);
    this.workOrders.set(id, { ...workOrder, deletedAt: new Date(), updatedAt: new Date() });
    return Promise.resolve(true);
  }

  public restore(id: string): Promise<RestoreWorkOrderResult> {
    const workOrder = this.workOrders.get(id);
    if (!workOrder) return Promise.resolve('not_found');
    if (!workOrder.deletedAt) return Promise.resolve('already_active');
    this.workOrders.set(id, { ...workOrder, deletedAt: null, updatedAt: new Date() });
    return Promise.resolve('restored');
  }
}
