import type {
  ApiResponse,
  AbsenceAttestationDto,
  DeleteAbsenceAttestationResult,
  GenerateAbsenceAttestationRequest,
  GeneratedAbsenceAttestationResult,
} from '@rental-admin/shared';

import { apiClient, unwrap } from '@/lib/api-client';

export const fetchAbsenceAttestations = async (
  driverId: string,
  signal?: AbortSignal,
): Promise<AbsenceAttestationDto[]> => {
  const response = await apiClient.get<ApiResponse<AbsenceAttestationDto[]>>(
    `/drivers/${driverId}/absence-attestations`,
    { signal },
  );

  return unwrap(response.data);
};

export const generateAbsenceAttestation = async (
  driverId: string,
  body: GenerateAbsenceAttestationRequest,
): Promise<GeneratedAbsenceAttestationResult> => {
  const response = await apiClient.post<ApiResponse<GeneratedAbsenceAttestationResult>>(
    `/drivers/${driverId}/absence-attestations`,
    body,
  );

  return unwrap(response.data);
};

export const deleteAbsenceAttestation = async (
  driverId: string,
  attestationId: string,
): Promise<DeleteAbsenceAttestationResult> => {
  const response = await apiClient.delete<ApiResponse<DeleteAbsenceAttestationResult>>(
    `/drivers/${driverId}/absence-attestations/${attestationId}`,
  );

  return unwrap(response.data);
};
