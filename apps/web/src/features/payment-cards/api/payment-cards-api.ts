import type {
  ApiResponse,
  PaymentCardDto,
  PaymentCardWriteRequest,
} from '@rental-admin/shared';

import { apiClient, unwrap } from '@/lib/api-client';

export const fetchPaymentCards = async (signal?: AbortSignal): Promise<PaymentCardDto[]> => {
  const response = await apiClient.get<ApiResponse<PaymentCardDto[]>>('/payment-cards', {
    signal,
  });

  return unwrap(response.data);
};

export const createPaymentCard = async (body: PaymentCardWriteRequest): Promise<PaymentCardDto> => {
  const response = await apiClient.post<ApiResponse<PaymentCardDto>>('/payment-cards', body);

  return unwrap(response.data);
};

export const updatePaymentCard = async ({
  id,
  body,
}: {
  id: string;
  body: PaymentCardWriteRequest;
}): Promise<PaymentCardDto> => {
  const response = await apiClient.patch<ApiResponse<PaymentCardDto>>(`/payment-cards/${id}`, body);

  return unwrap(response.data);
};
