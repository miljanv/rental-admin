import type { DriverSortField, DriverStatus, FileSortField, SortOrder } from '@rental-admin/shared';

export interface FileListQueryParams {
  page: number;
  limit: number;
  search?: string;
  sortBy: FileSortField;
  sortOrder: SortOrder;
}

export interface DriverListQueryParams {
  page: number;
  limit: number;
  search?: string;
  sortBy: DriverSortField;
  sortOrder: SortOrder;
  status?: DriverStatus;
}

/**
 * Central query key factory. Mutations invalidate the `all` key for a domain,
 * which covers every list page and related details.
 */
export const queryKeys = {
  files: {
    all: ['files'] as const,
    list: (params: FileListQueryParams) => ['files', 'list', params] as const,
  },
  dashboard: {
    all: ['dashboard'] as const,
    stats: () => ['dashboard', 'stats'] as const,
  },
  drivers: {
    all: ['drivers'] as const,
    list: (params: DriverListQueryParams) => ['drivers', 'list', params] as const,
    detail: (id: string) => ['drivers', 'detail', id] as const,
  },
} as const;
