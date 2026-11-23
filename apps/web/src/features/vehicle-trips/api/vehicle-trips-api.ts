import type { ApiResponse, VehicleTripsSummaryDto } from '@rental-admin/shared';

import { apiClient, unwrap } from '@/lib/api-client';
import type { VehicleTripsQueryParams } from '@/lib/query-keys';

export const fetchVehicleTripsSummary = async (
  vehicleId: string,
  params: VehicleTripsQueryParams,
  signal?: AbortSignal,
): Promise<VehicleTripsSummaryDto> => {
  const response = await apiClient.get<ApiResponse<VehicleTripsSummaryDto>>(
    `/vehicles/${vehicleId}/trips-summary`,
    { params, signal },
  );

  return unwrap(response.data);
};
