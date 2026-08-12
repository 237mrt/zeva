import type { Prisma } from '../../generated/prisma/client.js';
import { prisma } from '../../lib/prisma.js';
import type {
  CreateDeliveryInput,
  DeliveryCancelResult,
  DeliveryCreateResult,
  DeliverablePackagesLookupResult,
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
} from './operation.types.js';

export interface OperationRepository {
  listPackages(workOrderId: string): Promise<PackageListResult | null>;
  createPackages(workOrderId: string, packages: PackageWriteInput[]): Promise<PackageCreateResult>;
  updatePackage(packageId: string, input: PackageUpdateInput): Promise<PackageUpdateResult>;
  deletePackage(packageId: string): Promise<PackageDeleteResult>;
  listDeliverablePackages(customerId: string): Promise<DeliverablePackagesLookupResult>;
  listDeliveries(query: DeliveryListQuery): Promise<DeliveryListResult>;
  findDelivery(id: string): Promise<DeliveryRecord | null>;
  createDelivery(input: CreateDeliveryInput): Promise<DeliveryCreateResult>;
  cancelDelivery(id: string): Promise<DeliveryCancelResult>;
}

class PackageClaimConflict extends Error {}

const packageSelection = {
  id: true,
  workOrderId: true,
  sequenceNo: true,
  type: true,
  quantity: true,
  deliveryId: true,
  delivery: { select: { id: true, deliveredAt: true } },
  notes: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
} as const;

const deliverySelection = {
  id: true,
  customerId: true,
  totalQuantity: true,
  deliveredAt: true,
  receiverName: true,
  notes: true,
  cancelledAt: true,
  createdAt: true,
  updatedAt: true,
  customer: { select: { id: true, name: true } },
  packageItems: {
    select: {
      workOrderPackageId: true,
      workOrderId: true,
      workOrderProductName: true,
      sequenceNo: true,
      type: true,
      quantity: true,
    },
    orderBy: { sequenceNo: 'asc' as const },
  },
} as const;

type PackageRow = Prisma.WorkOrderPackageGetPayload<{ select: typeof packageSelection }>;
type DeliveryRow = Prisma.DeliveryGetPayload<{ select: typeof deliverySelection }>;

function mapPackage(value: PackageRow): WorkOrderPackageRecord {
  return value;
}

function mapDelivery(value: DeliveryRow): DeliveryRecord {
  return {
    id: value.id,
    customer: value.customer,
    totalQuantity: value.totalQuantity,
    deliveredAt: value.deliveredAt,
    receiverName: value.receiverName,
    notes: value.notes,
    cancelledAt: value.cancelledAt,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
    packages: value.packageItems.map((item) => ({
      id: item.workOrderPackageId,
      workOrderId: item.workOrderId,
      workOrder: { id: item.workOrderId, productName: item.workOrderProductName },
      sequenceNo: item.sequenceNo,
      type: item.type,
      quantity: item.quantity,
    })),
  };
}

async function recalculateWorkOrders(
  transaction: Prisma.TransactionClient,
  workOrderIds: string[],
  direction: 'delivery' | 'cancellation',
): Promise<void> {
  for (const workOrderId of [...new Set(workOrderIds)]) {
    const [workOrder, delivered] = await Promise.all([
      transaction.workOrder.findUnique({
        where: { id: workOrderId },
        select: { status: true, totalQuantity: true },
      }),
      transaction.workOrderPackage.aggregate({
        where: { workOrderId, deletedAt: null, deliveryId: { not: null } },
        _sum: { quantity: true },
      }),
    ]);
    if (!workOrder) continue;
    const deliveredQuantity = delivered._sum.quantity ?? 0;
    if (
      direction === 'delivery' &&
      workOrder.status === 'READY' &&
      deliveredQuantity >= workOrder.totalQuantity
    ) {
      await transaction.workOrder.update({ where: { id: workOrderId }, data: { status: 'DELIVERED' } });
    }
    if (
      direction === 'cancellation' &&
      workOrder.status === 'DELIVERED' &&
      deliveredQuantity < workOrder.totalQuantity
    ) {
      await transaction.workOrder.update({ where: { id: workOrderId }, data: { status: 'READY' } });
    }
  }
}

async function packageList(
  transaction: Prisma.TransactionClient,
  workOrderId: string,
): Promise<PackageListResult | null> {
  const workOrder = await transaction.workOrder.findFirst({
    where: { id: workOrderId, deletedAt: null },
    select: {
      id: true,
      productName: true,
      status: true,
      totalQuantity: true,
      customer: { select: { id: true, name: true } },
    },
  });
  if (!workOrder) return null;
  const packages = await transaction.workOrderPackage.findMany({
    where: { workOrderId, deletedAt: null },
    select: packageSelection,
    orderBy: { sequenceNo: 'asc' },
  });
  const packagedQuantity = packages.reduce((sum, item) => sum + item.quantity, 0);
  const deliveredPackages = packages.filter((item) => item.deliveryId !== null);
  return {
    workOrder,
    packages: packages.map(mapPackage),
    summary: {
      workOrderTotalQuantity: workOrder.totalQuantity,
      packagedQuantity,
      remainingQuantity: workOrder.totalQuantity - packagedQuantity,
      deliveredQuantity: deliveredPackages.reduce((sum, item) => sum + item.quantity, 0),
      packageCount: packages.length,
      deliveredPackageCount: deliveredPackages.length,
    },
  };
}

export class PrismaOperationRepository implements OperationRepository {
  public listPackages(workOrderId: string): Promise<PackageListResult | null> {
    return prisma.$transaction((transaction) => packageList(transaction, workOrderId));
  }

  public createPackages(
    workOrderId: string,
    packages: PackageWriteInput[],
  ): Promise<PackageCreateResult> {
    return prisma.$transaction(async (transaction): Promise<PackageCreateResult> => {
      const workOrder = await transaction.workOrder.findFirst({
        where: { id: workOrderId, deletedAt: null },
        select: { totalQuantity: true },
      });
      if (!workOrder) return { kind: 'work_order_not_found' };
      const [aggregate, maximum] = await Promise.all([
        transaction.workOrderPackage.aggregate({
          where: { workOrderId, deletedAt: null },
          _sum: { quantity: true },
        }),
        transaction.workOrderPackage.aggregate({
          where: { workOrderId },
          _max: { sequenceNo: true },
        }),
      ]);
      const newQuantity = packages.reduce((sum, item) => sum + item.quantity, 0);
      if ((aggregate._sum.quantity ?? 0) + newQuantity > workOrder.totalQuantity) {
        return { kind: 'quantity_exceeded' };
      }
      let sequenceNo = maximum._max.sequenceNo ?? 0;
      for (const item of packages) {
        sequenceNo += 1;
        await transaction.workOrderPackage.create({
          data: {
            workOrderId,
            sequenceNo,
            type: item.type,
            quantity: item.quantity,
            notes: item.notes ?? null,
          },
        });
      }
      const value = await packageList(transaction, workOrderId);
      if (!value) return { kind: 'work_order_not_found' };
      return { kind: 'created', value };
    });
  }

  public updatePackage(packageId: string, input: PackageUpdateInput): Promise<PackageUpdateResult> {
    return prisma.$transaction(async (transaction) => {
      const current = await transaction.workOrderPackage.findFirst({
        where: { id: packageId, deletedAt: null, workOrder: { deletedAt: null } },
        select: { ...packageSelection, workOrder: { select: { totalQuantity: true } } },
      });
      if (!current) return { kind: 'package_not_found' };
      if (current.deliveryId) return { kind: 'already_delivered' };
      const quantity = input.quantity ?? current.quantity;
      const aggregate = await transaction.workOrderPackage.aggregate({
        where: { workOrderId: current.workOrderId, deletedAt: null },
        _sum: { quantity: true },
      });
      if ((aggregate._sum.quantity ?? 0) - current.quantity + quantity > current.workOrder.totalQuantity) {
        return { kind: 'quantity_exceeded' };
      }
      const updated = await transaction.workOrderPackage.update({
        where: { id: packageId },
        data: {
          ...(input.type ? { type: input.type } : {}),
          ...(input.quantity !== undefined ? { quantity: input.quantity } : {}),
          ...(input.notes !== undefined ? { notes: input.notes } : {}),
        },
        select: packageSelection,
      });
      return { kind: 'updated', value: mapPackage(updated) };
    });
  }

  public deletePackage(packageId: string): Promise<PackageDeleteResult> {
    return prisma.$transaction(async (transaction) => {
      const current = await transaction.workOrderPackage.findFirst({
        where: { id: packageId, deletedAt: null, workOrder: { deletedAt: null } },
        select: { deliveryId: true },
      });
      if (!current) return { kind: 'package_not_found' };
      if (current.deliveryId) return { kind: 'already_delivered' };
      await transaction.workOrderPackage.update({
        where: { id: packageId },
        data: { deletedAt: new Date() },
      });
      return { kind: 'deleted' };
    });
  }

  public listDeliverablePackages(customerId: string): Promise<DeliverablePackagesLookupResult> {
    return prisma.$transaction(async (transaction) => {
      const customer = await transaction.customer.findFirst({
        where: { id: customerId, deletedAt: null },
        select: { id: true, name: true },
      });
      if (!customer) return { kind: 'customer_not_found' };
      const rows = await transaction.workOrderPackage.findMany({
        where: {
          deletedAt: null,
          deliveryId: null,
          workOrder: {
            customerId,
            deletedAt: null,
            status: { in: ['READY', 'DELIVERED'] },
          },
        },
        select: {
          ...packageSelection,
          workOrder: {
            select: {
              id: true,
              productName: true,
              status: true,
              totalQuantity: true,
              customer: { select: { id: true, name: true } },
            },
          },
        },
        orderBy: [{ workOrder: { productName: 'asc' } }, { sequenceNo: 'asc' }],
      });
      const groups = new Map<string, { workOrder: (typeof rows)[number]['workOrder']; packages: WorkOrderPackageRecord[] }>();
      for (const row of rows) {
        const group = groups.get(row.workOrderId) ?? { workOrder: row.workOrder, packages: [] };
        group.packages.push(mapPackage(row));
        groups.set(row.workOrderId, group);
      }
      return {
        kind: 'found',
        value: {
          customer,
          workOrders: [...groups.values()],
          summary: {
            workOrderCount: groups.size,
            packageCount: rows.length,
            totalQuantity: rows.reduce((sum, row) => sum + row.quantity, 0),
          },
        },
      };
    });
  }

  public async listDeliveries(query: DeliveryListQuery): Promise<DeliveryListResult> {
    const where: Prisma.DeliveryWhereInput = {
      ...(query.customerId ? { customerId: query.customerId } : {}),
      ...(query.workOrderId ? { packageItems: { some: { workOrderId: query.workOrderId } } } : {}),
      ...(query.deliveredFrom || query.deliveredTo
        ? {
            deliveredAt: {
              ...(query.deliveredFrom ? { gte: query.deliveredFrom } : {}),
              ...(query.deliveredTo ? { lte: query.deliveredTo } : {}),
            },
          }
        : {}),
      ...(query.q
        ? {
            OR: [
              { receiverName: { contains: query.q } },
              { customer: { name: { contains: query.q } } },
              { packageItems: { some: { workOrderProductName: { contains: query.q } } } },
            ],
          }
        : {}),
    };
    const [items, total] = await Promise.all([
      prisma.delivery.findMany({
        where,
        select: deliverySelection,
        orderBy: [{ deliveredAt: 'desc' }, { id: 'desc' }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      prisma.delivery.count({ where }),
    ]);
    return { items: items.map(mapDelivery), total };
  }

  public async findDelivery(id: string): Promise<DeliveryRecord | null> {
    const delivery = await prisma.delivery.findUnique({ where: { id }, select: deliverySelection });
    return delivery ? mapDelivery(delivery) : null;
  }

  public createDelivery(input: CreateDeliveryInput): Promise<DeliveryCreateResult> {
    return prisma.$transaction(async (transaction): Promise<DeliveryCreateResult> => {
      const customer = await transaction.customer.findFirst({
        where: { id: input.customerId, deletedAt: null },
        select: { id: true },
      });
      if (!customer) return { kind: 'customer_not_found' };
      const packages = await transaction.workOrderPackage.findMany({
        where: { id: { in: input.packageIds } },
        select: {
          id: true,
          workOrderId: true,
          sequenceNo: true,
          type: true,
          quantity: true,
          deliveryId: true,
          deletedAt: true,
          workOrder: {
            select: {
              customerId: true,
              productName: true,
              status: true,
              deletedAt: true,
            },
          },
        },
      });
      if (packages.length !== input.packageIds.length) return { kind: 'package_not_available' };
      if (packages.some((item) => item.workOrder.customerId !== input.customerId)) {
        return { kind: 'package_customer_mismatch' };
      }
      if (packages.some((item) => item.deletedAt || item.workOrder.deletedAt)) {
        return { kind: 'package_not_available' };
      }
      if (packages.some((item) => item.deliveryId)) return { kind: 'package_already_delivered' };
      if (packages.some((item) => !['READY', 'DELIVERED'].includes(item.workOrder.status))) {
        return { kind: 'work_order_not_ready' };
      }
      const totalQuantity = packages.reduce((sum, item) => sum + item.quantity, 0);
      const delivery = await transaction.delivery.create({
        data: {
          customerId: input.customerId,
          totalQuantity,
          deliveredAt: input.deliveredAt,
          receiverName: input.receiverName,
          notes: input.notes,
        },
        select: { id: true },
      });
      const claimed = await transaction.workOrderPackage.updateMany({
        where: {
          id: { in: input.packageIds },
          deletedAt: null,
          deliveryId: null,
          workOrder: {
            customerId: input.customerId,
            deletedAt: null,
            status: { in: ['READY', 'DELIVERED'] },
          },
        },
        data: { deliveryId: delivery.id },
      });
      if (claimed.count !== input.packageIds.length) throw new PackageClaimConflict();
      await transaction.deliveryPackageItem.createMany({
        data: packages.map((item) => ({
          deliveryId: delivery.id,
          workOrderPackageId: item.id,
          workOrderId: item.workOrderId,
          workOrderProductName: item.workOrder.productName,
          sequenceNo: item.sequenceNo,
          type: item.type,
          quantity: item.quantity,
        })),
      });
      await recalculateWorkOrders(transaction, packages.map((item) => item.workOrderId), 'delivery');
      const created = await transaction.delivery.findUniqueOrThrow({
        where: { id: delivery.id },
        select: deliverySelection,
      });
      return { kind: 'created', value: mapDelivery(created) };
    }).catch((error: unknown) => {
      if (error instanceof PackageClaimConflict) {
        return { kind: 'package_already_delivered' } as const;
      }
      throw error;
    });
  }

  public cancelDelivery(id: string): Promise<DeliveryCancelResult> {
    return prisma.$transaction(async (transaction) => {
      const delivery = await transaction.delivery.findUnique({
        where: { id },
        select: {
          id: true,
          cancelledAt: true,
          packageItems: { select: { workOrderId: true } },
        },
      });
      if (!delivery) return { kind: 'delivery_not_found' };
      if (delivery.cancelledAt) return { kind: 'already_cancelled' };
      const cancelled = await transaction.delivery.updateMany({
        where: { id, cancelledAt: null },
        data: { cancelledAt: new Date() },
      });
      if (cancelled.count === 0) return { kind: 'already_cancelled' };
      await transaction.workOrderPackage.updateMany({
        where: { deliveryId: id },
        data: { deliveryId: null },
      });
      await recalculateWorkOrders(
        transaction,
        delivery.packageItems.map((item) => item.workOrderId),
        'cancellation',
      );
      const cancelledDelivery = await transaction.delivery.findUniqueOrThrow({
        where: { id },
        select: deliverySelection,
      });
      return { kind: 'cancelled', value: mapDelivery(cancelledDelivery) };
    });
  }
}

export const operationRepository = new PrismaOperationRepository();
