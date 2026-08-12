import type { Prisma } from '../../generated/prisma/client.js';
import { prisma } from '../../lib/prisma.js';
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
} from './operation.types.js';

export interface OperationRepository {
  listPackages(workOrderId: string): Promise<PackageListResult | null>;
  createPackages(workOrderId: string, packages: PackageWriteInput[]): Promise<PackageCreateResult>;
  updatePackage(packageId: string, input: PackageUpdateInput): Promise<PackageUpdateResult>;
  deletePackage(packageId: string): Promise<PackageDeleteResult>;
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
  workOrderId: true,
  totalQuantity: true,
  deliveredAt: true,
  receiverName: true,
  notes: true,
  cancelledAt: true,
  createdAt: true,
  updatedAt: true,
  workOrder: {
    select: {
      id: true,
      productName: true,
      customer: { select: { id: true, name: true } },
    },
  },
  packageItems: {
    select: {
      workOrderPackageId: true,
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
    workOrderId: value.workOrderId,
    workOrder: { id: value.workOrder.id, productName: value.workOrder.productName },
    customer: value.workOrder.customer,
    totalQuantity: value.totalQuantity,
    deliveredAt: value.deliveredAt,
    receiverName: value.receiverName,
    notes: value.notes,
    cancelledAt: value.cancelledAt,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
    packages: value.packageItems.map((item) => ({
      id: item.workOrderPackageId,
      sequenceNo: item.sequenceNo,
      type: item.type,
      quantity: item.quantity,
    })),
  };
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

  public async listDeliveries(query: DeliveryListQuery): Promise<DeliveryListResult> {
    const where: Prisma.DeliveryWhereInput = {
      ...(query.customerId ? { workOrder: { customerId: query.customerId } } : {}),
      ...(query.workOrderId ? { workOrderId: query.workOrderId } : {}),
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
              { workOrder: { productName: { contains: query.q } } },
              { workOrder: { customer: { name: { contains: query.q } } } },
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
      const workOrder = await transaction.workOrder.findFirst({
        where: { id: input.workOrderId, deletedAt: null },
        select: { id: true, status: true, totalQuantity: true },
      });
      if (!workOrder) return { kind: 'work_order_not_found' };
      if (!['READY', 'DELIVERED'].includes(workOrder.status)) return { kind: 'work_order_not_ready' };
      const packages = await transaction.workOrderPackage.findMany({
        where: { id: { in: input.packageIds } },
        select: { id: true, workOrderId: true, sequenceNo: true, type: true, quantity: true, deliveryId: true, deletedAt: true },
      });
      if (packages.some((item) => item.deliveryId)) return { kind: 'package_already_delivered' };
      if (
        packages.length !== input.packageIds.length ||
        packages.some((item) => item.workOrderId !== input.workOrderId || item.deletedAt)
      ) {
        return { kind: 'package_not_available' };
      }
      const totalQuantity = packages.reduce((sum, item) => sum + item.quantity, 0);
      const delivery = await transaction.delivery.create({
        data: {
          workOrderId: input.workOrderId,
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
          workOrderId: input.workOrderId,
          deletedAt: null,
          deliveryId: null,
        },
        data: { deliveryId: delivery.id },
      });
      if (claimed.count !== input.packageIds.length) throw new PackageClaimConflict();
      await transaction.deliveryPackageItem.createMany({
        data: packages.map((item) => ({
          deliveryId: delivery.id,
          workOrderPackageId: item.id,
          sequenceNo: item.sequenceNo,
          type: item.type,
          quantity: item.quantity,
        })),
      });
      const delivered = await transaction.workOrderPackage.aggregate({
        where: { workOrderId: input.workOrderId, deletedAt: null, deliveryId: { not: null } },
        _sum: { quantity: true },
      });
      if ((delivered._sum.quantity ?? 0) >= workOrder.totalQuantity && workOrder.status === 'READY') {
        await transaction.workOrder.update({ where: { id: workOrder.id }, data: { status: 'DELIVERED' } });
      }
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
        select: { id: true, workOrderId: true, cancelledAt: true },
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
      const [workOrder, delivered] = await Promise.all([
        transaction.workOrder.findUnique({
          where: { id: delivery.workOrderId },
          select: { status: true, totalQuantity: true },
        }),
        transaction.workOrderPackage.aggregate({
          where: { workOrderId: delivery.workOrderId, deletedAt: null, deliveryId: { not: null } },
          _sum: { quantity: true },
        }),
      ]);
      if (
        workOrder?.status === 'DELIVERED' &&
        (delivered._sum.quantity ?? 0) < workOrder.totalQuantity
      ) {
        await transaction.workOrder.update({
          where: { id: delivery.workOrderId },
          data: { status: 'READY' },
        });
      }
      const cancelledDelivery = await transaction.delivery.findUniqueOrThrow({
        where: { id },
        select: deliverySelection,
      });
      return { kind: 'cancelled', value: mapDelivery(cancelledDelivery) };
    });
  }
}

export const operationRepository = new PrismaOperationRepository();
