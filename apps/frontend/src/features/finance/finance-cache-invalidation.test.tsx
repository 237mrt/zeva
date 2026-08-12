import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { customerApi } from '../customers/customer.api';
import { useUpdateCustomer } from '../customers/customer.queries';
import { workOrderApi } from '../work-orders/work-order.api';
import { useUpdateWorkOrder } from '../work-orders/work-order.queries';
import { financeKeys } from './finance.queries';

vi.mock('../customers/customer.api', () => ({
  customerApi: {
    update: vi.fn(),
  },
}));

vi.mock('../work-orders/work-order.api', () => ({
  workOrderApi: {
    update: vi.fn(),
  },
}));

function setup() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
  const wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  return { invalidate, wrapper };
}

describe('Finance cache invalidation', () => {
  beforeEach(() => vi.clearAllMocks());

  it('müşteri bilgisi değiştiğinde cari hesap cache’ini geçersiz kılar', async () => {
    vi.mocked(customerApi.update).mockResolvedValue({ id: 'customer-1' } as never);
    const { invalidate, wrapper } = setup();
    const { result } = renderHook(() => useUpdateCustomer(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ id: 'customer-1', input: {} as never });
    });

    expect(invalidate).toHaveBeenCalledWith({ queryKey: financeKeys.all });
  });

  it('iş emri tutarı değiştiğinde cari hesap cache’ini geçersiz kılar', async () => {
    vi.mocked(workOrderApi.update).mockResolvedValue({ id: 'work-order-1' } as never);
    const { invalidate, wrapper } = setup();
    const { result } = renderHook(() => useUpdateWorkOrder(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ id: 'work-order-1', input: {} as never });
    });

    expect(invalidate).toHaveBeenCalledWith({ queryKey: financeKeys.all });
  });
});
