import type {
  AdminFinanceAuditEventDto,
  ApiPaginatedResponse,
  AuditEventDto,
  ListAuditEventsQueryInput,
  PaginationMeta,
} from '@rental-admin/shared';

import { apiClient } from '@/lib/api-client';

export interface AuditEventPage<T> {
  events: T[];
  pagination: PaginationMeta;
}

export const fetchAuditEvents = async (
  params: ListAuditEventsQueryInput,
  signal?: AbortSignal,
): Promise<AuditEventPage<AuditEventDto>> => {
  const response = await apiClient.get<ApiPaginatedResponse<AuditEventDto>>('/admin/audit-events', {
    params,
    signal,
  });

  return { events: response.data.data, pagination: response.data.pagination };
};

export const fetchFinanceAuditEvents = async (
  params: ListAuditEventsQueryInput,
  signal?: AbortSignal,
): Promise<AuditEventPage<AdminFinanceAuditEventDto>> => {
  const response = await apiClient.get<ApiPaginatedResponse<AdminFinanceAuditEventDto>>(
    '/admin/finance-audit-events',
    { params, signal },
  );

  return { events: response.data.data, pagination: response.data.pagination };
};
