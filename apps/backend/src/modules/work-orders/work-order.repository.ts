import type { Prisma } from '../../generated/prisma/client.js';
import { prisma } from '../../lib/prisma.js';
import type { WorkOrderType } from '../customers/customer.types.js';
import type {
  WorkOrderCustomerSummary,
  WorkOrderListQuery,
  WorkOrderRecord,
  WorkOrderStatus,
  WorkOrderUpdateData,
  WorkOrderWriteData,
} from './work-order.types.js';

export interface WorkOrderRepositoryListResult {
  items: WorkOrderRecord[];
  total: number;
}

export type RestoreWorkOrderResult = 'restored' | 'not_found' | 'already_active';

export interface WorkOrderRepository {
  list(query: WorkOrderListQuery, deleted: boolean): Promise<WorkOrderRepositoryListResult>;
  findActiveById(id: string): Promise<WorkOrderRecord | null>;
  findActiveCustomerById(id: string): Promise<WorkOrderCustomerSummary | null>;
  findCustomerPrice(customerId: string, type: WorkOrderType): Promise<string | null>;
  create(input: WorkOrderWriteData): Promise<WorkOrderRecord>;
  updateActive(id: string, input: WorkOrderUpdateData): Promise<WorkOrderRecord | null>;
  updateStatusActive(id: string, status: WorkOrderStatus): Promise<WorkOrderRecord | null>;
  softDelete(id: string): Promise<boolean>;
  restore(id: string): Promise<RestoreWorkOrderResult>;
}

const workOrderSelection = {
  id: true,
  customerId: true,
  productName: true,
  type: true,
  status: true,
  totalQuantity: true,
  unitPrice: true,
  totalAmount: true,
  receivedAt: true,
  dueAt: true,
  notes: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
  customer: { select: { id: true, name: true } },
} as const;

function toWorkOrderRecord(workOrder: {
  id: string;
  customerId: string;
  productName: string;
  type: WorkOrderType;
  status: WorkOrderStatus;
  totalQuantity: number;
  unitPrice: { toFixed(decimalPlaces: number): string };
  totalAmount: { toFixed(decimalPlaces: number): string };
  receivedAt: Date;
  dueAt: Date | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  customer: WorkOrderCustomerSummary;
}): WorkOrderRecord {
  return {
    ...workOrder,
    unitPrice: workOrder.unitPrice.toFixed(2),
    totalAmount: workOrder.totalAmount.toFixed(2),
  };
}

export class PrismaWorkOrderRepository implements WorkOrderRepository {
  public async list(
    query: WorkOrderListQuery,
    deleted: boolean,
  ): Promise<WorkOrderRepositoryListResult> {
    const where: Prisma.WorkOrderWhereInput = {
      deletedAt: deleted ? { not: null } : null,
      ...(query.customerId ? { customerId: query.customerId } : {}),
      ...(query.type ? { type: query.type } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.q
        ? {
            OR: [
              { productName: { contains: query.q } },
              { customer: { name: { contains: query.q } } },
            ],
          }
        : {}),
    };
    const [items, total] = await Promise.all([
      prisma.workOrder.findMany({
        where,
        select: workOrderSelection,
        orderBy: deleted
          ? [{ deletedAt: 'desc' }, { receivedAt: 'desc' }, { id: 'desc' }]
          : [{ receivedAt: 'desc' }, { id: 'desc' }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      prisma.workOrder.count({ where }),
    ]);

    return { items: items.map(toWorkOrderRecord), total };
  }

  public async findActiveById(id: string): Promise<WorkOrderRecord | null> {
    const workOrder = await prisma.workOrder.findFirst({
      where: { id, deletedAt: null },
      select: workOrderSelection,
    });
    return workOrder ? toWorkOrderRecord(workOrder) : null;
  }

  public async findActiveCustomerById(id: string): Promise<WorkOrderCustomerSummary | null> {
    return prisma.customer.findFirst({
      where: { id, deletedAt: null },
      select: { id: true, name: true },
    });
  }

  public async findCustomerPrice(customerId: string, type: WorkOrderType): Promise<string | null> {
    const price = await prisma.customerPrice.findUnique({
      where: { customerId_type: { customerId, type } },
      select: { unitPrice: true },
    });
    return price?.unitPrice.toFixed(2) ?? null;
  }

  public async create(input: WorkOrderWriteData): Promise<WorkOrderRecord> {
    const workOrder = await prisma.workOrder.create({
      data: input,
      select: workOrderSelection,
    });
    return toWorkOrderRecord(workOrder);
  }

  public async updateActive(
    id: string,
    input: WorkOrderUpdateData,
  ): Promise<WorkOrderRecord | null> {
    return prisma.$transaction(async (transaction) => {
      const result = await transaction.workOrder.updateMany({
        where: { id, deletedAt: null },
        data: input,
      });
      if (result.count === 0) return null;
      const workOrder = await transaction.workOrder.findUniqueOrThrow({
        where: { id },
        select: workOrderSelection,
      });
      return toWorkOrderRecord(workOrder);
    });
  }

  public async updateStatusActive(
    id: string,
    status: WorkOrderStatus,
  ): Promise<WorkOrderRecord | null> {
    return prisma.$transaction(async (transaction) => {
      const result = await transaction.workOrder.updateMany({
        where: { id, deletedAt: null },
        data: { status },
      });
      if (result.count === 0) return null;
      const workOrder = await transaction.workOrder.findUniqueOrThrow({
        where: { id },
        select: workOrderSelection,
      });
      return toWorkOrderRecord(workOrder);
    });
  }

  public async softDelete(id: string): Promise<boolean> {
    const result = await prisma.workOrder.updateMany({
      where: { id, deletedAt: null },
      data: { deletedAt: new Date() },
    });
    return result.count > 0;
  }

  public async restore(id: string): Promise<RestoreWorkOrderResult> {
    return prisma.$transaction(async (transaction) => {
      const workOrder = await transaction.workOrder.findUnique({
        where: { id },
        select: { deletedAt: true },
      });
      if (!workOrder) return 'not_found';
      if (!workOrder.deletedAt) return 'already_active';
      await transaction.workOrder.update({ where: { id }, data: { deletedAt: null } });
      return 'restored';
    });
  }
}

export const workOrderRepository = new PrismaWorkOrderRepository();
