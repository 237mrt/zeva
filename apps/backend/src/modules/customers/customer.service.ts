import { AppError } from '../../shared/errors/app-error.js';
import { toCustomerResponse } from './customer.mapper.js';
import { customerRepository } from './customer.repository.js';
import type { CustomerRepository } from './customer.repository.js';
import type {
  CreateCustomerInput,
  CustomerListQuery,
  CustomerListResult,
  CustomerPriceInput,
  CustomerResponse,
  CustomerUpdateData,
  UpdateCustomerInput,
} from './customer.types.js';

function customerNotFound(): AppError {
  return new AppError(404, 'CUSTOMER_NOT_FOUND', 'Müşteri bulunamadı.');
}

export class CustomerService {
  public constructor(private readonly repository: CustomerRepository = customerRepository) {}

  public async list(query: CustomerListQuery, deleted = false): Promise<CustomerListResult> {
    const result = await this.repository.list(query, deleted);
    return {
      items: result.items.map(toCustomerResponse),
      pagination: {
        page: query.page,
        pageSize: query.pageSize,
        total: result.total,
        totalPages: Math.ceil(result.total / query.pageSize),
      },
    };
  }

  public async create(input: CreateCustomerInput): Promise<CustomerResponse> {
    const customer = await this.repository.create({
      name: input.name,
      contactName: input.contactName ?? null,
      phone: input.phone ?? null,
      address: input.address ?? null,
      notes: input.notes ?? null,
    });
    return toCustomerResponse(customer);
  }

  public async get(id: string): Promise<CustomerResponse> {
    const customer = await this.repository.findActiveById(id);
    if (!customer) {
      throw customerNotFound();
    }
    return toCustomerResponse(customer);
  }

  public async update(id: string, input: UpdateCustomerInput): Promise<CustomerResponse> {
    const updateData: CustomerUpdateData = {};

    if (input.name !== undefined) updateData.name = input.name;
    if (input.contactName !== undefined) updateData.contactName = input.contactName;
    if (input.phone !== undefined) updateData.phone = input.phone;
    if (input.address !== undefined) updateData.address = input.address;
    if (input.notes !== undefined) updateData.notes = input.notes;

    const customer = await this.repository.updateActive(id, updateData);
    if (!customer) {
      throw customerNotFound();
    }
    return toCustomerResponse(customer);
  }

  public async remove(id: string): Promise<void> {
    const deleted = await this.repository.softDelete(id);
    if (!deleted) {
      throw customerNotFound();
    }
  }

  public async restore(id: string): Promise<CustomerResponse> {
    const result = await this.repository.restore(id);

    if (result === 'not_found') {
      throw customerNotFound();
    }

    if (result === 'already_active') {
      throw new AppError(409, 'CUSTOMER_ALREADY_ACTIVE', 'Müşteri zaten aktif durumda.');
    }

    const customer = await this.repository.findActiveById(id);
    if (!customer) {
      throw customerNotFound();
    }
    return toCustomerResponse(customer);
  }

  public async getPrices(id: string): Promise<CustomerPriceInput[]> {
    const customer = await this.repository.findActiveById(id);
    if (!customer) {
      throw customerNotFound();
    }
    const prices = await this.repository.listPrices(id);
    return prices.map(({ type, unitPrice }) => ({ type, unitPrice }));
  }

  public async replacePrices(
    id: string,
    prices: CustomerPriceInput[],
  ): Promise<CustomerPriceInput[]> {
    const savedPrices = await this.repository.replacePrices(id, prices);
    if (!savedPrices) {
      throw customerNotFound();
    }
    return savedPrices.map(({ type, unitPrice }) => ({ type, unitPrice }));
  }
}

export const customerService = new CustomerService();
