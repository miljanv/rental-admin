'use client';

import { useQuery } from '@tanstack/react-query';

import { checkContractAvailability } from '@/features/contracts/api/contracts-api';
import { queryKeys, type ContractAvailabilityParams } from '@/lib/query-keys';

/** Enabled only once a period and at least one of vehicle/driver are chosen — the wizard's step 3. */
export const useContractAvailability = (params: ContractAvailabilityParams) =>
  useQuery({
    queryKey: queryKeys.contracts.availability(params),
    queryFn: ({ signal }) => checkContractAvailability(params, signal),
    enabled:
      Boolean(params.serviceStartDate) &&
      Boolean(params.serviceEndDate) &&
      Boolean(params.vehicleId ?? params.driverId),
  });
