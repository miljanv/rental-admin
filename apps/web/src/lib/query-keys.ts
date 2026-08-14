import type {
  DriverSortField,
  DriverStatus,
  FileSortField,
  SortOrder,
  VehicleSortField,
  VehicleStatus,
  VehicleType,
} from '@rental-admin/shared';

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

export interface VehicleListQueryParams {
  page: number;
  limit: number;
  search?: string;
  sortBy: VehicleSortField;
  sortOrder: SortOrder;
  status?: VehicleStatus;
  type?: VehicleType;
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
    documents: (driverId: string) => ['drivers', driverId, 'documents'] as const,
    expiring: (days: number) => ['drivers', 'expiring-documents', days] as const,
  },
  vehicles: {
    all: ['vehicles'] as const,
    list: (params: VehicleListQueryParams) => ['vehicles', 'list', params] as const,
    detail: (id: string) => ['vehicles', 'detail', id] as const,
  },
} as const;
