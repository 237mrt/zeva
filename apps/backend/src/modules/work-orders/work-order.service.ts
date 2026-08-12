import { Prisma } from '../../generated/prisma/client.js';
import { AppError } from '../../shared/errors/app-error.js';
import { toWorkOrderResponse } from './work-order.mapper.js';
import { workOrderRepository } from './work-order.repository.js';
import type { WorkOrderRepository } from './work-order.repository.js';
import type {
  CreateWorkOrderInput,
  UpdateWorkOrderInput,
  WorkOrderListQuery,
  WorkOrderListResult,
  WorkOrderResponse,
  WorkOrderStatus,
  WorkOrderType,
} from './work-order.types.js';

function workOrderNotFound(): AppError {
  return new AppError(404, 'WORK_ORDER_NOT_FOUND', 'İş emri bulunamadı.');
}

function unitPriceRequired(): AppError {
  return new AppError(
    422,
    'WORK_ORDER_UNIT_PRICE_REQUIRED',
    'Bu müşteri ve hizmet türü için birim fiyat girilmeli veya varsayılan fiyat tanımlanmalıdır.',
  );
}

function validateDates(receivedAt: Date, dueAt: Date | null): void {
  if (dueAt && dueAt < receivedAt) {
    throw new AppError(
      400,
      'VALIDATION_ERROR',
      'Termin tarihi alınma tarihinden önce olamaz.',
    );
  }
}

function calculateTotalAmount(totalQuantity: number, unitPrice: string): string {
  return new Prisma.Decimal(unitPrice).mul(totalQuantity).toDecimalPlaces(2).toFixed(2);
}

export class WorkOrderService {
  public constructor(private readonly repository: WorkOrderRepository = workOrderRepository) {}

  public async list(query: WorkOrderListQuery, deleted = false): Promise<WorkOrderListResult> {
    const result = await this.repository.list(query, deleted);
    return {
      items: result.items.map(toWorkOrderResponse),
      pagination: {
        page: query.page,
        pageSize: query.pageSize,
        total: result.total,
        totalPages: Math.ceil(result.total / query.pageSize),
      },
    };
  }

  private async resolveUnitPrice(
    customerId: string,
    type: WorkOrderType,
    suppliedUnitPrice: string | undefined,
  ): Promise<string> {
    const customer = await this.repository.findActiveCustomerById(customerId);
    if (!customer) {
      throw new AppError(404, 'CUSTOMER_NOT_FOUND', 'Müşteri bulunamadı.');
    }
    if (suppliedUnitPrice !== undefined) return suppliedUnitPrice;
    const defaultPrice = await this.repository.findCustomerPrice(customerId, type);
    if (!defaultPrice) throw unitPriceRequired();
    return defaultPrice;
  }

  public async create(input: CreateWorkOrderInput): Promise<WorkOrderResponse> {
    const unitPrice = await this.resolveUnitPrice(input.customerId, input.type, input.unitPrice);
    const receivedAt = new Date(input.receivedAt);
    const dueAt = input.dueAt ? new Date(input.dueAt) : null;
    validateDates(receivedAt, dueAt);
    const workOrder = await this.repository.create({
      customerId: input.customerId,
      productName: input.productName,
      type: input.type,
      status: 'WAITING',
      totalQuantity: input.totalQuantity,
      unitPrice,
      totalAmount: calculateTotalAmount(input.totalQuantity, unitPrice),
      receivedAt,
      dueAt,
      notes: input.notes ?? null,
    });
    return toWorkOrderResponse(workOrder);
  }

  public async get(id: string): Promise<WorkOrderResponse> {
    const workOrder = await this.repository.findActiveById(id);
    if (!workOrder) throw workOrderNotFound();
    return toWorkOrderResponse(workOrder);
  }

  public async update(id: string, input: UpdateWorkOrderInput): Promise<WorkOrderResponse> {
    const existing = await this.repository.findActiveById(id);
    if (!existing) throw workOrderNotFound();

    const customerId = input.customerId ?? existing.customerId;
    const type = input.type ?? existing.type;
    const pricingTargetChanged = customerId !== existing.customerId || type !== existing.type;
    const unitPrice = pricingTargetChanged
      ? await this.resolveUnitPrice(customerId, type, input.unitPrice)
      : (input.unitPrice ?? existing.unitPrice);
    const totalQuantity = input.totalQuantity ?? existing.totalQuantity;
    const receivedAt = input.receivedAt ? new Date(input.receivedAt) : existing.receivedAt;
    const dueAt =
      input.dueAt !== undefined ? (input.dueAt ? new Date(input.dueAt) : null) : existing.dueAt;
    validateDates(receivedAt, dueAt);

    const workOrder = await this.repository.updateActive(id, {
      customerId,
      productName: input.productName ?? existing.productName,
      type,
      totalQuantity,
      unitPrice,
      totalAmount: calculateTotalAmount(totalQuantity, unitPrice),
      receivedAt,
      dueAt,
      notes: input.notes !== undefined ? input.notes : existing.notes,
    });
    if (!workOrder) throw workOrderNotFound();
    return toWorkOrderResponse(workOrder);
  }

  public async updateStatus(id: string, status: WorkOrderStatus): Promise<WorkOrderResponse> {
    const workOrder = await this.repository.updateStatusActive(id, status);
    if (!workOrder) throw workOrderNotFound();
    return toWorkOrderResponse(workOrder);
  }

  public async remove(id: string): Promise<void> {
    if (!(await this.repository.softDelete(id))) throw workOrderNotFound();
  }

  public async restore(id: string): Promise<WorkOrderResponse> {
    const result = await this.repository.restore(id);
    if (result === 'not_found') throw workOrderNotFound();
    if (result === 'already_active') {
      throw new AppError(409, 'WORK_ORDER_ALREADY_ACTIVE', 'İş emri zaten aktif durumda.');
    }
    const workOrder = await this.repository.findActiveById(id);
    if (!workOrder) throw workOrderNotFound();
    return toWorkOrderResponse(workOrder);
  }
}

export const workOrderService = new WorkOrderService();
