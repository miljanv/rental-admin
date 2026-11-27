'use client';

import type {
  DriverFuelEntryReviewRequest,
  DriverFuelEntryStatus,
  DriverToolOfficeActionRequest,
  DriverToolWriteRequest,
  VehicleFaultStatus,
  VehicleFaultUpdateRequest,
} from '@rental-admin/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import {
  applyDriverToolAction,
  createDriverTool,
  deleteDriverTool,
  fetchDriverFuelEntries,
  fetchDriverTools,
  fetchToolsNeedingOffice,
  fetchVehicleFaults,
  fetchWorkplacePending,
  reviewDriverFuelEntry,
  updateDriverTool,
  updateVehicleFault,
} from '@/features/driver-workplace/api/driver-workplace-api';
import { getApiErrorMessage } from '@/lib/api-error';
import { queryKeys } from '@/lib/query-keys';

const showError = (error: unknown) =>
  toast.error('Nije sačuvano.', { description: getApiErrorMessage(error) });

/** Counts for the "Unosi vozača" menu badge; polled like the trip reports. */
export const useWorkplacePending = () =>
  useQuery({
    queryKey: queryKeys.driverWorkplace.pendingCount(),
    queryFn: ({ signal }) => fetchWorkplacePending(signal),
    refetchInterval: 60_000,
    retry: false,
  });

export const useVehicleFaults = (status?: VehicleFaultStatus) =>
  useQuery({
    queryKey: queryKeys.driverWorkplace.faults(status),
    queryFn: ({ signal }) => fetchVehicleFaults(status, signal),
    placeholderData: (previous) => previous,
  });

export const useUpdateVehicleFault = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: VehicleFaultUpdateRequest }) =>
      updateVehicleFault(id, input),
    onSuccess: async () => {
      toast.success('Prijava kvara je sačuvana.');
      await queryClient.invalidateQueries({ queryKey: queryKeys.driverWorkplace.all });
    },
    onError: showError,
  });
};

export const useDriverFuelEntries = (status?: DriverFuelEntryStatus) =>
  useQuery({
    queryKey: queryKeys.driverWorkplace.fuelEntries(status),
    queryFn: ({ signal }) => fetchDriverFuelEntries(status, signal),
    placeholderData: (previous) => previous,
  });

export const useReviewDriverFuelEntry = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: DriverFuelEntryReviewRequest }) =>
      reviewDriverFuelEntry(id, input),
    onSuccess: async (_entry, { input }) => {
      toast.success(
        input.action === 'ACCEPT' ? 'Sipanje je upisano u evidenciju goriva.' : 'Unos je odbijen.',
      );
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.driverWorkplace.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.fuelLogs.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.vehicles.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all }),
      ]);
    },
    onError: showError,
  });
};

export const useToolsNeedingOffice = () =>
  useQuery({
    queryKey: queryKeys.driverWorkplace.toolsNeedingOffice(),
    queryFn: ({ signal }) => fetchToolsNeedingOffice(signal),
  });

export const useDriverTools = (driverId: string) =>
  useQuery({
    queryKey: queryKeys.driverWorkplace.driverTools(driverId),
    queryFn: ({ signal }) => fetchDriverTools(driverId, signal),
  });

type ToolMutation =
  | { kind: 'create'; input: DriverToolWriteRequest }
  | { kind: 'update'; toolId: string; input: DriverToolWriteRequest }
  | { kind: 'action'; toolId: string; input: DriverToolOfficeActionRequest }
  | { kind: 'delete'; toolId: string };

const TOOL_SUCCESS: Record<ToolMutation['kind'], string> = {
  create: 'Alat je zadužen. Vozač ga potvrđuje u portalu.',
  update: 'Alat je sačuvan.',
  action: 'Sačuvano.',
  delete: 'Alat je obrisan.',
};

/** Every office change to a driver's tools. */
export const useDriverToolMutation = (driverId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (mutation: ToolMutation): Promise<void> => {
      switch (mutation.kind) {
        case 'create':
          await createDriverTool(driverId, mutation.input);
          return;
        case 'update':
          await updateDriverTool(driverId, mutation.toolId, mutation.input);
          return;
        case 'action':
          await applyDriverToolAction(driverId, mutation.toolId, mutation.input);
          return;
        case 'delete':
          await deleteDriverTool(driverId, mutation.toolId);
      }
    },
    onSuccess: async (_result, mutation) => {
      toast.success(TOOL_SUCCESS[mutation.kind]);
      await queryClient.invalidateQueries({ queryKey: queryKeys.driverWorkplace.all });
    },
    onError: showError,
  });
};
