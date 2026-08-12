import type { FastifyReply,FastifyRequest } from 'fastify';
import { successResponse } from '../../shared/http/api-response.js';
import { accountCustomerParamsSchema,accountListQuerySchema,createAdjustmentSchema,createPaymentSchema,financeIdParamsSchema,paymentListQuerySchema,statementQuerySchema } from './finance.schema.js';
import type { FinanceService } from './finance.service.js';
export function createFinanceController(service:FinanceService){return {
  listAccounts:async(request:FastifyRequest)=>successResponse(await service.listAccounts(accountListQuerySchema.parse(request.query))),
  getAccount:async(request:FastifyRequest)=>{const {customerId}=accountCustomerParamsSchema.parse(request.params);return successResponse(await service.getAccount(customerId,statementQuerySchema.parse(request.query)));},
  listPayments:async(request:FastifyRequest)=>successResponse(await service.listPayments(paymentListQuerySchema.parse(request.query))),
  getPayment:async(request:FastifyRequest)=>{const {id}=financeIdParamsSchema.parse(request.params);return successResponse({payment:await service.getPayment(id)});},
  createPayment:async(request:FastifyRequest,reply:FastifyReply)=>{const input=createPaymentSchema.parse(request.body);const payment=await service.createPayment({...input,paidAt:new Date(input.paidAt),referenceNo:input.referenceNo??null,notes:input.notes??null});return reply.status(201).send(successResponse({payment}));},
  cancelPayment:async(request:FastifyRequest)=>{const {id}=financeIdParamsSchema.parse(request.params);return successResponse({payment:await service.cancelPayment(id)});},
  createAdjustment:async(request:FastifyRequest,reply:FastifyReply)=>{const input=createAdjustmentSchema.parse(request.body);const adjustment=await service.createAdjustment({...input,occurredAt:new Date(input.occurredAt)});return reply.status(201).send(successResponse({adjustment}));},
  cancelAdjustment:async(request:FastifyRequest)=>{const {id}=financeIdParamsSchema.parse(request.params);await service.cancelAdjustment(id);return successResponse({});},
};}
