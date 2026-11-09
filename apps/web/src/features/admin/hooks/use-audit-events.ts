'use client';

import type { ListAuditEventsQueryInput } from '@rental-admin/shared';
import { useQuery } from '@tanstack/react-query';

import { fetchAuditEvents, fetchFinanceAuditEvents } from '@/features/admin/api/audit-api';
import { queryKeys } from '@/lib/query-keys';

export const useAuditEvents = (params: ListAuditEventsQueryInput, enabled = true) =>
  useQuery({
    queryKey: queryKeys.organizations.auditEvents(params),
    queryFn: ({ signal }) => fetchAuditEvents(params, signal),
    placeholderData: (previous) => previous,
    enabled,
  });

export const useFinanceAuditEvents = (params: ListAuditEventsQueryInput, enabled = true) =>
  useQuery({
    queryKey: queryKeys.organizations.financeAuditEvents(params),
    queryFn: ({ signal }) => fetchFinanceAuditEvents(params, signal),
    placeholderData: (previous) => previous,
    enabled,
  });
