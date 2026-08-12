import type { FastifyReply, FastifyRequest } from 'fastify';
import { successResponse } from '../../shared/http/api-response.js';
import { accountPdfParamsSchema, accountPdfQuerySchema, customerReportQuerySchema, deliveryReportQuerySchema, financeReportQuerySchema, reportingIdParamsSchema, workOrderReportQuerySchema } from './reporting.schema.js';
import type { ReportingService } from './reporting.service.js';

const pdf = (reply: FastifyReply, value: { buffer: Buffer; filename: string }) => reply.type('application/pdf').header('Content-Disposition', `attachment; filename="${value.filename}"`).header('Content-Length', String(value.buffer.length)).send(value.buffer);
export function createReportingController(service: ReportingService) { return {
  dashboard: async () => successResponse(await service.dashboard()),
  workOrders: async (request: FastifyRequest) => successResponse(await service.workOrders(workOrderReportQuerySchema.parse(request.query))),
  deliveries: async (request: FastifyRequest) => successResponse(await service.deliveries(deliveryReportQuerySchema.parse(request.query))),
  finance: async (request: FastifyRequest) => successResponse(await service.finance(financeReportQuerySchema.parse(request.query))),
  customers: async (request: FastifyRequest) => successResponse(await service.customers(customerReportQuerySchema.parse(request.query))),
  workOrderPdf: async (request: FastifyRequest, reply: FastifyReply) => { const { id } = reportingIdParamsSchema.parse(request.params); return pdf(reply, await service.workOrderPdf(id)); },
  deliveryPdf: async (request: FastifyRequest, reply: FastifyReply) => { const { id } = reportingIdParamsSchema.parse(request.params); return pdf(reply, await service.deliveryPdf(id)); },
  accountPdf: async (request: FastifyRequest, reply: FastifyReply) => { const { customerId } = accountPdfParamsSchema.parse(request.params); const range = accountPdfQuerySchema.parse(request.query); return pdf(reply, await service.accountStatementPdf(customerId, range)); },
}; }
