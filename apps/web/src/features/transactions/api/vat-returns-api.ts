import type {
  ApiResponse,
  DeleteVatReturnResult,
  VatReturnDto,
  VatReturnWriteRequest,
} from '@rental-admin/shared';

import { apiClient, unwrap } from '@/lib/api-client';

export const createVatReturn = async (body: VatReturnWriteRequest): Promise<VatReturnDto> => {
  const response = await apiClient.post<ApiResponse<VatReturnDto>>('/vat-returns', body);

  return unwrap(response.data);
};

export const updateVatReturn = async (
  id: string,
  body: VatReturnWriteRequest,
): Promise<VatReturnDto> => {
  const response = await apiClient.patch<ApiResponse<VatReturnDto>>(`/vat-returns/${id}`, body);

  return unwrap(response.data);
};

export const deleteVatReturn = async (id: string): Promise<DeleteVatReturnResult> => {
  const response = await apiClient.delete<ApiResponse<DeleteVatReturnResult>>(`/vat-returns/${id}`);

  return unwrap(response.data);
};
