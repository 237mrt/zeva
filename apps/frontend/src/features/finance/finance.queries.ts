import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { financeApi } from './finance.api';
import { reportingKeys } from '../reporting/reporting.queries';
import type { AccountListParams, AdjustmentInput, PaymentInput, PaymentListParams, StatementParams } from './finance.types';

export const financeKeys = {
  all: ['finance'] as const,
  accounts: () => [...financeKeys.all, 'accounts'] as const,
  accountList: (params: AccountListParams) => [...financeKeys.accounts(), 'list', params] as const,
  account: (id: string, params: StatementParams) => [...financeKeys.accounts(), 'detail', id, params] as const,
  payments: () => [...financeKeys.all, 'payments'] as const,
  paymentList: (params: PaymentListParams) => [...financeKeys.payments(), 'list', params] as const,
  payment: (id: string) => [...financeKeys.payments(), 'detail', id] as const,
};
export const useAccountList = (params: AccountListParams) => useQuery({ queryKey: financeKeys.accountList(params), queryFn: () => financeApi.listAccounts(params), placeholderData: (data) => data });
export const useAccountDetail = (id: string | null, params: StatementParams = { page: 1, pageSize: 20 }) => useQuery({ queryKey: financeKeys.account(id ?? '', params), queryFn: () => financeApi.getAccount(id ?? '', params), enabled: Boolean(id) });
export const usePaymentList = (params: PaymentListParams) => useQuery({ queryKey: financeKeys.paymentList(params), queryFn: () => financeApi.listPayments(params), placeholderData: (data) => data });
export const usePaymentDetail = (id: string | null) => useQuery({ queryKey: financeKeys.payment(id ?? ''), queryFn: () => financeApi.getPayment(id ?? ''), enabled: Boolean(id) });
function useInvalidateFinance() { const client = useQueryClient(); return () => Promise.all([client.invalidateQueries({ queryKey: financeKeys.all }), client.invalidateQueries({ queryKey: reportingKeys.all })]); }
export function useCreatePayment() { const invalidate = useInvalidateFinance(); return useMutation({ mutationFn: (input: PaymentInput) => financeApi.createPayment(input), onSuccess: invalidate }); }
export function useCancelPayment() { const invalidate = useInvalidateFinance(); return useMutation({ mutationFn: financeApi.cancelPayment, onSuccess: invalidate }); }
export function useCreateAdjustment() { const invalidate = useInvalidateFinance(); return useMutation({ mutationFn: (input: AdjustmentInput) => financeApi.createAdjustment(input), onSuccess: invalidate }); }
export function useCancelAdjustment() { const invalidate = useInvalidateFinance(); return useMutation({ mutationFn: financeApi.cancelAdjustment, onSuccess: invalidate }); }
