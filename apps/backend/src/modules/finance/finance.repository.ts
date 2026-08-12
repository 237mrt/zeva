import type { Prisma } from '../../generated/prisma/client.js';
import { prisma } from '../../lib/prisma.js';
import type { AccountDetailSource, AccountSource, AdjustmentRecord, AdjustmentWriteInput, FinanceRepository, PaymentListQuery, PaymentRecord, PaymentWriteInput, StatementQuery, StatementSource, StatementType } from './finance.types.js';

const customerSelect = { id: true, name: true } as const;
const paymentSelect = { id: true, customerId: true, amount: true, method: true, paidAt: true, referenceNo: true, notes: true, cancelledAt: true, createdAt: true, updatedAt: true, customer: { select: customerSelect } } as const;
const adjustmentSelect = { id: true, customerId: true, type: true, amount: true, occurredAt: true, description: true, cancelledAt: true, createdAt: true, updatedAt: true, customer: { select: customerSelect } } as const;
type PaymentRow = Prisma.PaymentGetPayload<{ select: typeof paymentSelect }>;
type AdjustmentRow = Prisma.AccountAdjustmentGetPayload<{ select: typeof adjustmentSelect }>;
const paymentRecord = (row: PaymentRow): PaymentRecord => ({ ...row, amount: row.amount.toFixed(2) });
const adjustmentRecord = (row: AdjustmentRow): AdjustmentRecord => ({ ...row, amount: row.amount.toFixed(2) });
const adjustmentStatementType = (type: 'DEBIT' | 'CREDIT'): StatementType => type === 'DEBIT' ? 'ADJUSTMENT_DEBIT' : 'ADJUSTMENT_CREDIT';

function paymentWhere(query: PaymentListQuery): Prisma.PaymentWhereInput {
  return {
    ...(query.customerId ? { customerId: query.customerId } : {}), ...(query.method ? { method: query.method } : {}),
    ...(query.cancelled === undefined ? {} : { cancelledAt: query.cancelled ? { not: null } : null }),
    ...(query.paidFrom || query.paidTo ? { paidAt: { ...(query.paidFrom ? { gte: query.paidFrom } : {}), ...(query.paidTo ? { lte: query.paidTo } : {}) } } : {}),
    ...(query.q ? { OR: [{ customer: { name: { contains: query.q } } }, { referenceNo: { contains: query.q } }, { notes: { contains: query.q } }] } : {}),
  };
}

async function groupedTotals(customerIds: string[]) {
  const [workOrders, payments, adjustments] = await Promise.all([
    prisma.workOrder.groupBy({ by: ['customerId'], where: { customerId: { in: customerIds }, deletedAt: null, status: { not: 'CANCELLED' } }, _sum: { totalAmount: true }, _max: { updatedAt: true } }),
    prisma.payment.groupBy({ by: ['customerId'], where: { customerId: { in: customerIds }, cancelledAt: null }, _sum: { amount: true }, _max: { paidAt: true } }),
    prisma.accountAdjustment.groupBy({ by: ['customerId','type'], where: { customerId: { in: customerIds }, cancelledAt: null }, _sum: { amount: true }, _max: { occurredAt: true } }),
  ]);
  return { workOrders, payments, adjustments };
}

export class PrismaFinanceRepository implements FinanceRepository {
  public findActiveCustomer(id: string) { return prisma.customer.findFirst({ where: { id, deletedAt: null }, select: customerSelect }); }
  public async listPayments(query: PaymentListQuery) { const where=paymentWhere(query); const [items,total]=await Promise.all([prisma.payment.findMany({ where, select: paymentSelect, orderBy:[{paidAt:'desc'},{id:'desc'}], skip:(query.page-1)*query.pageSize, take:query.pageSize }), prisma.payment.count({where})]); return {items:items.map(paymentRecord),total}; }
  public async findPayment(id: string) { const row=await prisma.payment.findUnique({where:{id},select:paymentSelect}); return row?paymentRecord(row):null; }
  public async createPayment(input: PaymentWriteInput) { const row=await prisma.payment.create({data:input,select:paymentSelect}); return paymentRecord(row); }
  public async cancelPayment(id: string) { return prisma.$transaction(async (tx) => { const exists=await tx.payment.findUnique({where:{id},select:{cancelledAt:true}}); if(!exists)return 'not_found'; if(exists.cancelledAt)return 'already_cancelled'; const result=await tx.payment.updateMany({where:{id,cancelledAt:null},data:{cancelledAt:new Date()}}); return result.count===1?'cancelled':'already_cancelled'; }); }
  public async createAdjustment(input: AdjustmentWriteInput) { const row=await prisma.accountAdjustment.create({data:input,select:adjustmentSelect}); return adjustmentRecord(row); }
  public async cancelAdjustment(id: string) { return prisma.$transaction(async (tx) => { const exists=await tx.accountAdjustment.findUnique({where:{id},select:{cancelledAt:true}}); if(!exists)return 'not_found'; if(exists.cancelledAt)return 'already_cancelled'; const result=await tx.accountAdjustment.updateMany({where:{id,cancelledAt:null},data:{cancelledAt:new Date()}}); return result.count===1?'cancelled':'already_cancelled'; }); }

  public async listAccountSources(q?: string): Promise<AccountSource[]> {
    const customers=await prisma.customer.findMany({where:{deletedAt:null,...(q?{name:{contains:q}}:{})},select:customerSelect,orderBy:[{name:'asc'},{id:'asc'}]});
    const ids=customers.map((item)=>item.id); if(!ids.length)return [];
    const {workOrders,payments,adjustments}=await groupedTotals(ids);
    return customers.map((customer)=>{
      const work=workOrders.find((row)=>row.customerId===customer.id); const pay=payments.find((row)=>row.customerId===customer.id);
      const debit=adjustments.find((row)=>row.customerId===customer.id&&row.type==='DEBIT'); const credit=adjustments.find((row)=>row.customerId===customer.id&&row.type==='CREDIT');
      const dates=[work?._max.updatedAt,pay?._max.paidAt,debit?._max.occurredAt,credit?._max.occurredAt].filter((value):value is Date=>Boolean(value));
      return {customer,workOrderTotal:work?._sum.totalAmount?.toFixed(2)??'0.00',paymentsTotal:pay?._sum.amount?.toFixed(2)??'0.00',debitAdjustments:debit?._sum.amount?.toFixed(2)??'0.00',creditAdjustments:credit?._sum.amount?.toFixed(2)??'0.00',lastPaymentAt:pay?._max.paidAt??null,lastActivityAt:dates.sort((a,b)=>b.getTime()-a.getTime())[0]??null};
    });
  }

  public async getAccountDetail(customerId: string, query: StatementQuery): Promise<AccountDetailSource|null> {
    const customer=await this.findActiveCustomer(customerId); if(!customer)return null;
    const sourceLimit=query.page*query.pageSize;
    const dateWhere={...(query.from?{gte:query.from}:{}),...(query.to?{lte:query.to}:{})};
    const wants=(...types: string[])=>!query.type||types.includes(query.type);
    const [workOrders,payments,adjustments,totals]=await Promise.all([
      wants('WORK_ORDER')?prisma.workOrder.findMany({where:{customerId,deletedAt:null,status:{not:'CANCELLED'},...(query.from||query.to?{receivedAt:dateWhere}:{})},select:{id:true,productName:true,totalAmount:true,receivedAt:true},orderBy:[{receivedAt:'desc'},{id:'desc'}],take:sourceLimit}):[],
      wants('PAYMENT')?prisma.payment.findMany({where:{customerId,...(query.from||query.to?{paidAt:dateWhere}:{})},select:{id:true,amount:true,method:true,paidAt:true,cancelledAt:true},orderBy:[{paidAt:'desc'},{id:'desc'}],take:sourceLimit}):[],
      wants('ADJUSTMENT_DEBIT','ADJUSTMENT_CREDIT')?prisma.accountAdjustment.findMany({where:{customerId,...(query.type==='ADJUSTMENT_DEBIT'?{type:'DEBIT'}:query.type==='ADJUSTMENT_CREDIT'?{type:'CREDIT'}:{}),...(query.from||query.to?{occurredAt:dateWhere}:{})},select:{id:true,type:true,amount:true,occurredAt:true,description:true,cancelledAt:true},orderBy:[{occurredAt:'desc'},{id:'desc'}],take:sourceLimit}):[],
      groupedTotals([customerId]),
    ]);
    const statements:StatementSource[]=[...workOrders.map((row)=>({id:`WORK_ORDER:${row.id}`,sourceId:row.id,type:'WORK_ORDER' as const,occurredAt:row.receivedAt,description:`İş Emri · ${row.productName}`,amount:row.totalAmount.toFixed(2),cancelledAt:null})),...payments.map((row)=>({id:`PAYMENT:${row.id}`,sourceId:row.id,type:'PAYMENT' as const,occurredAt:row.paidAt,description:`Tahsilat · ${row.method}`,amount:row.amount.toFixed(2),cancelledAt:row.cancelledAt})),...adjustments.map((row)=>({id:`ADJUSTMENT:${row.id}`,sourceId:row.id,type:adjustmentStatementType(row.type),occurredAt:row.occurredAt,description:row.description,amount:row.amount.toFixed(2),cancelledAt:row.cancelledAt}))].sort((a,b)=>b.occurredAt.getTime()-a.occurredAt.getTime()||b.id.localeCompare(a.id));
    const start=(query.page-1)*query.pageSize; const work=totals.workOrders[0]; const pay=totals.payments[0]; const debit=totals.adjustments.find((row)=>row.type==='DEBIT'); const credit=totals.adjustments.find((row)=>row.type==='CREDIT');
    const statementTotal=await Promise.all([wants('WORK_ORDER')?prisma.workOrder.count({where:{customerId,deletedAt:null,status:{not:'CANCELLED'},...(query.from||query.to?{receivedAt:dateWhere}:{})}}):0,wants('PAYMENT')?prisma.payment.count({where:{customerId,...(query.from||query.to?{paidAt:dateWhere}:{})}}):0,wants('ADJUSTMENT_DEBIT','ADJUSTMENT_CREDIT')?prisma.accountAdjustment.count({where:{customerId,...(query.type==='ADJUSTMENT_DEBIT'?{type:'DEBIT'}:query.type==='ADJUSTMENT_CREDIT'?{type:'CREDIT'}:{}),...(query.from||query.to?{occurredAt:dateWhere}:{})}}):0]);
    return {customer,workOrderTotal:work?._sum.totalAmount?.toFixed(2)??'0.00',paymentsTotal:pay?._sum.amount?.toFixed(2)??'0.00',debitAdjustments:debit?._sum.amount?.toFixed(2)??'0.00',creditAdjustments:credit?._sum.amount?.toFixed(2)??'0.00',lastPaymentAt:pay?._max.paidAt??null,statements:statements.slice(start,start+query.pageSize),statementTotal:statementTotal.reduce((sum,value)=>sum+value,0)};
  }
  public async getMonthPaymentsTotal(start: Date,end: Date){const result=await prisma.payment.aggregate({where:{cancelledAt:null,paidAt:{gte:start,lt:end}},_sum:{amount:true}});return result._sum.amount?.toFixed(2)??'0.00';}
}
export const financeRepository=new PrismaFinanceRepository();
