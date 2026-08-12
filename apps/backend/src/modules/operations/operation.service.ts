import { AppError } from '../../shared/errors/app-error.js';
import { toDeliveryResponse, toPackageResponse } from './operation.mapper.js';
import { operationRepository, type OperationRepository } from './operation.repository.js';
import type {
  CreateDeliveryInput,
  DeliveryListQuery,
  DeliveryResponse,
  PackageListResult,
  PackageUpdateInput,
  PackageWriteInput,
  WorkOrderPackageResponse,
} from './operation.types.js';

function workOrderNotFound(): AppError {
  return new AppError(404, 'WORK_ORDER_NOT_FOUND', 'İş emri bulunamadı.');
}

function packageNotFound(): AppError {
  return new AppError(404, 'PACKAGE_NOT_FOUND', 'Paket bulunamadı.');
}

function quantityExceeded(): AppError {
  return new AppError(
    422,
    'PACKAGE_QUANTITY_EXCEEDS_WORK_ORDER',
    'Girdiğiniz paket adetleri iş emrindeki toplam adedi aşıyor.',
  );
}

function alreadyDelivered(): AppError {
  return new AppError(
    409,
    'PACKAGE_ALREADY_DELIVERED',
    'Teslim edilmiş paket değiştirilemez veya silinemez.',
  );
}

function deliveryNotFound(): AppError {
  return new AppError(404, 'DELIVERY_NOT_FOUND', 'Teslimat bulunamadı.');
}

function mapPackageList(value: PackageListResult) {
  return { ...value, packages: value.packages.map(toPackageResponse) };
}

export class OperationService {
  public constructor(private readonly repository: OperationRepository = operationRepository) {}

  public async listPackages(workOrderId: string) {
    const result = await this.repository.listPackages(workOrderId);
    if (!result) throw workOrderNotFound();
    return mapPackageList(result);
  }

  public async createPackages(workOrderId: string, packages: PackageWriteInput[]) {
    const result = await this.repository.createPackages(workOrderId, packages);
    if (result.kind === 'work_order_not_found') throw workOrderNotFound();
    if (result.kind === 'quantity_exceeded') throw quantityExceeded();
    return mapPackageList(result.value);
  }

  public async updatePackage(
    packageId: string,
    input: PackageUpdateInput,
  ): Promise<WorkOrderPackageResponse> {
    const result = await this.repository.updatePackage(packageId, input);
    if (result.kind === 'package_not_found') throw packageNotFound();
    if (result.kind === 'already_delivered') throw alreadyDelivered();
    if (result.kind === 'quantity_exceeded') throw quantityExceeded();
    return toPackageResponse(result.value);
  }

  public async deletePackage(packageId: string): Promise<void> {
    const result = await this.repository.deletePackage(packageId);
    if (result.kind === 'package_not_found') throw packageNotFound();
    if (result.kind === 'already_delivered') throw alreadyDelivered();
  }

  public async listDeliveries(query: DeliveryListQuery) {
    const result = await this.repository.listDeliveries(query);
    return {
      items: result.items.map(toDeliveryResponse),
      pagination: {
        page: query.page,
        pageSize: query.pageSize,
        total: result.total,
        totalPages: Math.ceil(result.total / query.pageSize),
      },
    };
  }

  public async getDelivery(id: string): Promise<DeliveryResponse> {
    const delivery = await this.repository.findDelivery(id);
    if (!delivery) throw deliveryNotFound();
    return toDeliveryResponse(delivery);
  }

  public async createDelivery(input: CreateDeliveryInput): Promise<DeliveryResponse> {
    const result = await this.repository.createDelivery(input);
    if (result.kind === 'work_order_not_found') throw workOrderNotFound();
    if (result.kind === 'work_order_not_ready') {
      throw new AppError(
        409,
        'WORK_ORDER_NOT_READY_FOR_DELIVERY',
        'Teslimat oluşturmak için iş emri Hazır durumda olmalıdır.',
      );
    }
    if (result.kind === 'package_not_available') {
      throw new AppError(
        422,
        'DELIVERY_PACKAGE_NOT_AVAILABLE',
        'Seçilen paketlerden biri bu iş emrine ait değil veya kullanılamıyor.',
      );
    }
    if (result.kind === 'package_already_delivered') {
      throw new AppError(
        409,
        'PACKAGE_ALREADY_DELIVERED',
        'Seçilen paketlerden biri daha önce teslim edilmiş.',
      );
    }
    return toDeliveryResponse(result.value);
  }

  public async cancelDelivery(id: string): Promise<DeliveryResponse> {
    const result = await this.repository.cancelDelivery(id);
    if (result.kind === 'delivery_not_found') throw deliveryNotFound();
    if (result.kind === 'already_cancelled') {
      throw new AppError(409, 'DELIVERY_ALREADY_CANCELLED', 'Teslimat daha önce iptal edilmiş.');
    }
    return toDeliveryResponse(result.value);
  }
}

export const operationService = new OperationService();
