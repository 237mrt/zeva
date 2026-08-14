import type { FastifyPluginAsync } from 'fastify';

import { authRoutes } from '../modules/auth/auth.route.js';
import type { AuthService } from '../modules/auth/auth.service.js';
import { customerRoutes } from '../modules/customers/customer.route.js';
import type { CustomerService } from '../modules/customers/customer.service.js';
import { healthRoutes } from '../modules/health/health.route.js';
import { financeRoutes } from '../modules/finance/finance.route.js';
import type { FinanceService } from '../modules/finance/finance.service.js';
import { reportingRoutes } from '../modules/reporting/reporting.route.js';
import type { ReportingService } from '../modules/reporting/reporting.service.js';
import { operationRoutes } from '../modules/operations/operation.route.js';
import type { OperationService } from '../modules/operations/operation.service.js';
import { workOrderRoutes } from '../modules/work-orders/work-order.route.js';
import type { WorkOrderService } from '../modules/work-orders/work-order.service.js';

interface ApiV1RoutesOptions {
  authService?: AuthService;
  customerService?: CustomerService;
  workOrderService?: WorkOrderService;
  operationService?: OperationService;
  financeService?: FinanceService;
  reportingService?: ReportingService;
}

export const apiV1Routes: FastifyPluginAsync<ApiV1RoutesOptions> = async (app, options) => {
  app.register(healthRoutes);
  await app.register(authRoutes, {
    prefix: '/auth',
    ...(options.authService ? { service: options.authService } : {}),
  });
  await app.register(customerRoutes, {
    ...(options.customerService ? { service: options.customerService } : {}),
  });
  await app.register(workOrderRoutes, {
    ...(options.workOrderService ? { service: options.workOrderService } : {}),
  });
  await app.register(operationRoutes, {
    ...(options.operationService ? { service: options.operationService } : {}),
  });
  await app.register(financeRoutes, {
    ...(options.financeService ? { service: options.financeService } : {}),
  });
  await app.register(reportingRoutes, {
    ...(options.reportingService ? { service: options.reportingService } : {}),
  });
};
