import type {
  DriverSortField,
  DriverStatus,
  FileSortField,
  FuelLogFuelType,
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

export interface FuelLogListQueryParams {
  from?: string;
  to?: string;
  fuelType?: FuelLogFuelType;
  sortOrder?: SortOrder;
}

export interface MaintenanceCostSummaryParams {
  vehicleId?: string;
  from?: string;
  to?: string;
  supplier?: string;
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
    inspections: (vehicleId: string) => ['vehicles', vehicleId, 'inspections'] as const,
    expiringInspections: (days: number) => ['vehicles', 'expiring-inspections', days] as const,
    calibrations: (vehicleId: string) => ['vehicles', vehicleId, 'calibrations'] as const,
    expiringCalibrations: (days: number) => ['vehicles', 'expiring-calibrations', days] as const,
    safetyEquipment: (vehicleId: string) => ['vehicles', vehicleId, 'safety-equipment'] as const,
    expiringSafetyEquipment: (days: number) =>
      ['vehicles', 'expiring-safety-equipment', days] as const,
    fuelLogs: (vehicleId: string, params?: FuelLogListQueryParams) =>
      ['vehicles', vehicleId, 'fuel-logs', params] as const,
    maintenance: (vehicleId: string) => ['vehicles', vehicleId, 'maintenance'] as const,
    maintenanceCostSummary: (params?: MaintenanceCostSummaryParams) =>
      ['vehicles', 'maintenance-cost-summary', params] as const,
    documents: (vehicleId: string) => ['vehicles', vehicleId, 'documents'] as const,
  },
} as const;
