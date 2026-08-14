import type { FuelLogDto } from '@rental-admin/shared';

export const fuelLogDriverLabel = (driver: FuelLogDto['driver']): string =>
  driver ? `${driver.firstName} ${driver.lastName}` : '—';
