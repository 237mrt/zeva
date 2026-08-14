import { useQuery } from '@tanstack/react-query';
import { reportingApi } from './reporting.api';
import type { CustomerReportParams, DateRange, DeliveryReportParams, WorkOrderReportParams } from './reporting.types';
export const reportingKeys = { all: ['reporting'] as const, dashboard: () => [...reportingKeys.all, 'dashboard'] as const, workOrders: (params: WorkOrderReportParams) => [...reportingKeys.all, 'work-orders', params] as const, deliveries: (params: DeliveryReportParams) => [...reportingKeys.all, 'deliveries', params] as const, finance: (params: DateRange) => [...reportingKeys.all, 'finance', params] as const, customers: (params: CustomerReportParams) => [...reportingKeys.all, 'customers', params] as const };
export const useDashboard = () => useQuery({ queryKey: reportingKeys.dashboard(), queryFn: reportingApi.dashboard });
export const useWorkOrderReport = (params: WorkOrderReportParams, enabled = true) => useQuery({ queryKey: reportingKeys.workOrders(params), queryFn: () => reportingApi.workOrders(params), enabled, placeholderData: (data) => data });
export const useDeliveryReport = (params: DeliveryReportParams, enabled = true) => useQuery({ queryKey: reportingKeys.deliveries(params), queryFn: () => reportingApi.deliveries(params), enabled, placeholderData: (data) => data });
export const useFinanceReport = (params: DateRange, enabled = true) => useQuery({ queryKey: reportingKeys.finance(params), queryFn: () => reportingApi.finance(params), enabled });
export const useCustomerReport = (params: CustomerReportParams, enabled = true) => useQuery({ queryKey: reportingKeys.customers(params), queryFn: () => reportingApi.customers(params), enabled, placeholderData: (data) => data });
