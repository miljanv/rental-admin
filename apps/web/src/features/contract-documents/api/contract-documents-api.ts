import type {
  ApiResponse,
  ContractDocumentDto,
  DeleteContractDocumentResult,
  GeneratedContractDocumentResult,
} from '@rental-admin/shared';

import { apiClient, unwrap } from '@/lib/api-client';

export const fetchContractDocuments = async (
  contractId: string,
  signal?: AbortSignal,
): Promise<ContractDocumentDto[]> => {
  const response = await apiClient.get<ApiResponse<ContractDocumentDto[]>>(
    `/contracts/${contractId}/documents`,
    { signal },
  );

  return unwrap(response.data);
};

export const generateContractDocument = async (
  contractId: string,
): Promise<GeneratedContractDocumentResult> => {
  const response = await apiClient.post<ApiResponse<GeneratedContractDocumentResult>>(
    `/contracts/${contractId}/documents/generate`,
  );

  return unwrap(response.data);
};

export const deleteContractDocument = async (
  contractId: string,
  documentId: string,
): Promise<DeleteContractDocumentResult> => {
  const response = await apiClient.delete<ApiResponse<DeleteContractDocumentResult>>(
    `/contracts/${contractId}/documents/${documentId}`,
  );

  return unwrap(response.data);
};
