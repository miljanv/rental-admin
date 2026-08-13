import type { FileSortField, SortOrder } from '@rental-admin/shared';

export interface FileListQueryParams {
  page: number;
  limit: number;
  search?: string;
  sortBy: FileSortField;
  sortOrder: SortOrder;
}

/**
 * Central query key factory. Mutations invalidate `files.all` and
 * `dashboard.all`, which covers every list page and the dashboard counters.
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
} as const;
