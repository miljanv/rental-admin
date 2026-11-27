'use client';

import type {
  DriverFuelEntryCreateRequest,
  DriverPortalToolCreateRequest,
  DriverToolDto,
  DriverToolLostRequest,
  VehicleFaultCreateRequest,
} from '@rental-admin/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import {
  addPortalTool,
  confirmAllPortalTools,
  fetchPortalFaults,
  fetchPortalFuelEntries,
  fetchPortalTools,
  fetchPortalVehicles,
  reportPortalFault,
  reportPortalToolLost,
  respondToPortalTool,
  submitPortalFuelEntry,
} from '@/features/driver-portal/api/portal-workplace-api';
import { isDriverLinkInvalid } from '@/features/driver-portal/lib/portal';
import { getApiErrorMessage } from '@/lib/api-error';
import { queryKeys } from '@/lib/query-keys';

const retry = (failureCount: number, error: unknown) =>
  !isDriverLinkInvalid(error) && failureCount < 2;

const showError = (error: unknown) =>
  toast.error('Nije sačuvano.', { description: getApiErrorMessage(error) });

export const usePortalVehicles = (token: string) =>
  useQuery({
    queryKey: queryKeys.driverPortal.vehicles(token),
    queryFn: ({ signal }) => fetchPortalVehicles(token, signal),
    staleTime: 5 * 60_000,
    retry,
  });

export const usePortalFaults = (token: string) =>
  useQuery({
    queryKey: queryKeys.driverPortal.faults(token),
    queryFn: ({ signal }) => fetchPortalFaults(token, signal),
    retry,
  });

export const useReportPortalFault = (token: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: VehicleFaultCreateRequest) => reportPortalFault(token, input),
    onSuccess: async () => {
      toast.success('Kvar je prijavljen kancelariji.');
      await queryClient.invalidateQueries({ queryKey: queryKeys.driverPortal.faults(token) });
    },
    onError: showError,
  });
};

export const usePortalTools = (token: string) =>
  useQuery({
    queryKey: queryKeys.driverPortal.tools(token),
    queryFn: ({ signal }) => fetchPortalTools(token, signal),
    retry,
  });

type ToolAction =
  | { kind: 'confirm-all' }
  | { kind: 'respond'; toolId: string; action: 'CONFIRM' | 'DECLINE' }
  | { kind: 'lost'; toolId: string; input: DriverToolLostRequest }
  | { kind: 'add'; input: DriverPortalToolCreateRequest };

const TOOL_SUCCESS: Record<ToolAction['kind'], string> = {
  'confirm-all': 'Alat je potvrđen.',
  respond: 'Odgovor je poslat kancelariji.',
  lost: 'Gubitak je prijavljen kancelariji.',
  add: 'Alat je upisan. Kancelarija će ga potvrditi.',
};

/** Every answer the driver gives about their tools; the server sends back the whole list. */
export const usePortalToolAction = (token: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (action: ToolAction): Promise<DriverToolDto[]> => {
      switch (action.kind) {
        case 'confirm-all':
          return confirmAllPortalTools(token);
        case 'respond':
          return respondToPortalTool(token, action.toolId, action.action);
        case 'lost':
          return reportPortalToolLost(token, action.toolId, action.input);
        case 'add':
          return addPortalTool(token, action.input);
      }
    },
    onSuccess: (tools, action) => {
      toast.success(TOOL_SUCCESS[action.kind]);
      queryClient.setQueryData(queryKeys.driverPortal.tools(token), tools);
    },
    onError: showError,
  });
};

export const usePortalFuelEntries = (token: string) =>
  useQuery({
    queryKey: queryKeys.driverPortal.fuelEntries(token),
    queryFn: ({ signal }) => fetchPortalFuelEntries(token, signal),
    retry,
  });

export const useSubmitPortalFuelEntry = (token: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: DriverFuelEntryCreateRequest) => submitPortalFuelEntry(token, input),
    onSuccess: async () => {
      toast.success('Sipanje je poslato kancelariji.');
      await queryClient.invalidateQueries({ queryKey: queryKeys.driverPortal.fuelEntries(token) });
    },
    onError: showError,
  });
};
