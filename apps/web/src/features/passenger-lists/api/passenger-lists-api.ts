import type {
  ApiResponse,
  DeletePassengerListResult,
  DeletePassengerResult,
  PassengerDto,
  PassengerListDto,
  PassengerListWriteRequest,
  PassengerWriteRequest,
} from '@rental-admin/shared';

import { apiClient, unwrap } from '@/lib/api-client';

export const fetchPassengerLists = async (
  contractId: string,
  signal?: AbortSignal,
): Promise<PassengerListDto[]> => {
  const response = await apiClient.get<ApiResponse<PassengerListDto[]>>(
    `/contracts/${contractId}/passenger-lists`,
    { signal },
  );

  return unwrap(response.data);
};

export const createPassengerList = async (
  contractId: string,
  body: PassengerListWriteRequest,
): Promise<PassengerListDto> => {
  const response = await apiClient.post<ApiResponse<PassengerListDto>>(
    `/contracts/${contractId}/passenger-lists`,
    body,
  );

  return unwrap(response.data);
};

export const deletePassengerList = async (
  contractId: string,
  listId: string,
): Promise<DeletePassengerListResult> => {
  const response = await apiClient.delete<ApiResponse<DeletePassengerListResult>>(
    `/contracts/${contractId}/passenger-lists/${listId}`,
  );

  return unwrap(response.data);
};

export const addPassenger = async (
  contractId: string,
  listId: string,
  body: PassengerWriteRequest,
): Promise<PassengerDto> => {
  const response = await apiClient.post<ApiResponse<PassengerDto>>(
    `/contracts/${contractId}/passenger-lists/${listId}/passengers`,
    body,
  );

  return unwrap(response.data);
};

export const deletePassenger = async (
  contractId: string,
  listId: string,
  passengerId: string,
): Promise<DeletePassengerResult> => {
  const response = await apiClient.delete<ApiResponse<DeletePassengerResult>>(
    `/contracts/${contractId}/passenger-lists/${listId}/passengers/${passengerId}`,
  );

  return unwrap(response.data);
};
