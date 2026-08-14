'use client';

import { useQuery } from '@tanstack/react-query';

import { fetchVehicleDocuments } from '@/features/vehicle-documents/api/vehicle-documents-api';
import { queryKeys } from '@/lib/query-keys';

export const useVehicleDocuments = (vehicleId: string) =>
  useQuery({
    queryKey: queryKeys.vehicles.documents(vehicleId),
    queryFn: ({ signal }) => fetchVehicleDocuments(vehicleId, signal),
    enabled: vehicleId.length > 0,
  });
