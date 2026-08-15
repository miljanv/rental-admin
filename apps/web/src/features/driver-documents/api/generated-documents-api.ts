import type {
  ApiResponse,
  GenerateEmploymentContractRequest,
  GenerateMaFormRequest,
  GeneratedDriverDocumentResult,
} from '@rental-admin/shared';

import { apiClient, unwrap } from '@/lib/api-client';

export const generateEmploymentContract = async (
  driverId: string,
  body: GenerateEmploymentContractRequest,
): Promise<GeneratedDriverDocumentResult> => {
  const response = await apiClient.post<ApiResponse<GeneratedDriverDocumentResult>>(
    `/drivers/${driverId}/generated-documents/employment-contract`,
    body,
  );

  return unwrap(response.data);
};

export const generateMaForm = async (
  driverId: string,
  body: GenerateMaFormRequest,
): Promise<GeneratedDriverDocumentResult> => {
  const response = await apiClient.post<ApiResponse<GeneratedDriverDocumentResult>>(
    `/drivers/${driverId}/generated-documents/ma-form`,
    body,
  );

  return unwrap(response.data);
};
