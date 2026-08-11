import type { Prisma } from '../../generated/prisma/client.js';
import { prisma } from '../../lib/prisma.js';
import type {
  CustomerListQuery,
  CustomerPriceInput,
  CustomerPriceRecord,
  CustomerRecord,
  CustomerUpdateData,
  CustomerWriteData,
  WorkOrderType,
} from './customer.types.js';

export interface CustomerRepositoryListResult {
  items: CustomerRecord[];
  total: number;
}

export type RestoreCustomerResult = 'restored' | 'not_found' | 'already_active';

export interface CustomerRepository {
  list(query: CustomerListQuery, deleted: boolean): Promise<CustomerRepositoryListResult>;
  findById(id: string): Promise<CustomerRecord | null>;
  findActiveById(id: string): Promise<CustomerRecord | null>;
  create(input: CustomerWriteData): Promise<CustomerRecord>;
  updateActive(id: string, input: CustomerUpdateData): Promise<CustomerRecord | null>;
  softDelete(id: string): Promise<boolean>;
  restore(id: string): Promise<RestoreCustomerResult>;
  listPrices(customerId: string): Promise<CustomerPriceRecord[]>;
  replacePrices(
    customerId: string,
    prices: CustomerPriceInput[],
  ): Promise<CustomerPriceRecord[] | null>;
}

function toCustomerRecord(customer: {
  id: string;
  name: string;
  contactName: string | null;
  phone: string | null;
  address: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}): CustomerRecord {
  return { ...customer };
}

function toCustomerPriceRecord(price: {
  id: string;
  customerId: string;
  type: WorkOrderType;
  unitPrice: { toFixed(decimalPlaces: number): string };
  createdAt: Date;
  updatedAt: Date;
}): CustomerPriceRecord {
  return {
    id: price.id,
    customerId: price.customerId,
    type: price.type,
    unitPrice: price.unitPrice.toFixed(2),
    createdAt: price.createdAt,
    updatedAt: price.updatedAt,
  };
}

export class PrismaCustomerRepository implements CustomerRepository {
  public async list(
    query: CustomerListQuery,
    deleted: boolean,
  ): Promise<CustomerRepositoryListResult> {
    const search: Prisma.CustomerWhereInput = query.q
      ? {
          OR: [
            { name: { contains: query.q } },
            { contactName: { contains: query.q } },
            { phone: { contains: query.q } },
          ],
        }
      : {};
    const where: Prisma.CustomerWhereInput = {
      deletedAt: deleted ? { not: null } : null,
      ...search,
    };
    const [items, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        orderBy: deleted
          ? [{ deletedAt: 'desc' }, { name: 'asc' }, { id: 'asc' }]
          : [{ name: 'asc' }, { id: 'asc' }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      prisma.customer.count({ where }),
    ]);

    return { items: items.map(toCustomerRecord), total };
  }

  public async findById(id: string): Promise<CustomerRecord | null> {
    const customer = await prisma.customer.findUnique({ where: { id } });
    return customer ? toCustomerRecord(customer) : null;
  }

  public async findActiveById(id: string): Promise<CustomerRecord | null> {
    const customer = await prisma.customer.findFirst({ where: { id, deletedAt: null } });
    return customer ? toCustomerRecord(customer) : null;
  }

  public async create(input: CustomerWriteData): Promise<CustomerRecord> {
    const customer = await prisma.customer.create({ data: input });
    return toCustomerRecord(customer);
  }

  public async updateActive(
    id: string,
    input: CustomerUpdateData,
  ): Promise<CustomerRecord | null> {
    return prisma.$transaction(async (transaction) => {
      const result = await transaction.customer.updateMany({
        where: { id, deletedAt: null },
        data: input,
      });

      if (result.count === 0) {
        return null;
      }

      const customer = await transaction.customer.findUniqueOrThrow({ where: { id } });
      return toCustomerRecord(customer);
    });
  }

  public async softDelete(id: string): Promise<boolean> {
    const result = await prisma.customer.updateMany({
      where: { id, deletedAt: null },
      data: { deletedAt: new Date() },
    });
    return result.count > 0;
  }

  public async restore(id: string): Promise<RestoreCustomerResult> {
    return prisma.$transaction(async (transaction) => {
      const customer = await transaction.customer.findUnique({
        where: { id },
        select: { deletedAt: true },
      });

      if (!customer) {
        return 'not_found';
      }

      if (!customer.deletedAt) {
        return 'already_active';
      }

      await transaction.customer.update({ where: { id }, data: { deletedAt: null } });
      return 'restored';
    });
  }

  public async listPrices(customerId: string): Promise<CustomerPriceRecord[]> {
    const prices = await prisma.customerPrice.findMany({
      where: { customerId },
      orderBy: { type: 'asc' },
    });
    return prices.map(toCustomerPriceRecord);
  }

  public async replacePrices(
    customerId: string,
    prices: CustomerPriceInput[],
  ): Promise<CustomerPriceRecord[] | null> {
    return prisma.$transaction(async (transaction) => {
      const customer = await transaction.customer.findFirst({
        where: { id: customerId, deletedAt: null },
        select: { id: true },
      });

      if (!customer) {
        return null;
      }

      await transaction.customerPrice.deleteMany({ where: { customerId } });

      for (const price of prices) {
        await transaction.customerPrice.create({
          data: { customerId, type: price.type, unitPrice: price.unitPrice },
        });
      }

      const savedPrices = await transaction.customerPrice.findMany({
        where: { customerId },
        orderBy: { type: 'asc' },
      });
      return savedPrices.map(toCustomerPriceRecord);
    });
  }
}

export const customerRepository = new PrismaCustomerRepository();
