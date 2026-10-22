import type {
  ApiResponse,
  AllocationPlanDto,
  AllocationPlanRequest,
  ConfirmAllocationPlanRequest,
  CounterpartyRequest,
  LinkCounterpartyRequest,
  OpeningBalanceDto,
  OpeningBalanceWriteRequest,
  PaymentAllocationsDto,
  TransactionDto,
} from '@rental-admin/shared';
import { apiClient, unwrap } from '@/lib/api-client';

export const fetchOpeningBalances = async (
  party: CounterpartyRequest,
  signal?: AbortSignal,
): Promise<OpeningBalanceDto[]> =>
  unwrap(
    (
      await apiClient.get<ApiResponse<OpeningBalanceDto[]>>('/opening-balances', {
        params: party,
        signal,
      })
    ).data,
  );
export const saveOpeningBalance = async ({
  id,
  body,
}: {
  id?: string;
  body: OpeningBalanceWriteRequest;
}): Promise<{ id: string }> =>
  unwrap(
    (id
      ? await apiClient.patch<ApiResponse<{ id: string }>>(`/opening-balances/${id}`, body)
      : await apiClient.post<ApiResponse<{ id: string }>>('/opening-balances', body)
    ).data,
  );
export const confirmOpeningBalance = async (id: string): Promise<{ id: string }> =>
  unwrap(
    (
      await apiClient.post<ApiResponse<{ id: string }>>(`/opening-balances/${id}/confirm`, {
        acknowledgeUnrecordedBalance: true,
      })
    ).data,
  );
export const reverseOpeningBalance = async ({
  id,
  reason,
}: {
  id: string;
  reason: string;
}): Promise<{ id: string }> =>
  unwrap(
    (
      await apiClient.post<ApiResponse<{ id: string }>>(`/opening-balances/${id}/reverse`, {
        reason,
      })
    ).data,
  );
export const linkCounterparty = async ({
  id,
  body,
}: {
  id: string;
  body: LinkCounterpartyRequest;
}): Promise<TransactionDto> =>
  unwrap(
    (await apiClient.patch<ApiResponse<TransactionDto>>(`/transactions/${id}/counterparty`, body))
      .data,
  );
export const previewAllocationPlan = async ({
  id,
  body,
}: {
  id: string;
  body: AllocationPlanRequest;
}): Promise<AllocationPlanDto> =>
  unwrap(
    (
      await apiClient.post<ApiResponse<AllocationPlanDto>>(
        `/transactions/${id}/allocation-plan`,
        body,
      )
    ).data,
  );
export const confirmAllocationPlan = async ({
  id,
  body,
}: {
  id: string;
  body: ConfirmAllocationPlanRequest;
}): Promise<TransactionDto> =>
  unwrap(
    (await apiClient.post<ApiResponse<TransactionDto>>(`/transactions/${id}/allocate-oldest`, body))
      .data,
  );
export const fetchPaymentAllocations = async (
  id: string,
  signal?: AbortSignal,
): Promise<PaymentAllocationsDto> =>
  unwrap(
    (
      await apiClient.get<ApiResponse<PaymentAllocationsDto>>(`/transactions/${id}/allocations`, {
        signal,
      })
    ).data,
  );
export const reverseAllocation = async ({
  id,
  allocationId,
  reason,
}: {
  id: string;
  allocationId: string;
  reason: string;
}): Promise<TransactionDto> =>
  unwrap(
    (
      await apiClient.post<ApiResponse<TransactionDto>>(
        `/transactions/${id}/allocations/${allocationId}/reverse`,
        { reason },
      )
    ).data,
  );
