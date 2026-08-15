import { describe, expect, it } from 'vitest';

import { toVehicleMaintenanceDto, type VehicleMaintenanceRecord } from './vehicle-maintenance-mapper';

const record: VehicleMaintenanceRecord = {
  id: 'maint_1',
  vehicleId: 'veh_1',
  date: new Date('2026-08-14T00:00:00.000Z'),
  odometerKm: 150_000,
  partName: 'Kočione pločice',
  supplier: 'AutoDelovi d.o.o.',
  cost: 8500,
  paymentMethod: 'ACCOUNT',
  mechanic: 'Petar Petrović',
  createdAt: new Date('2026-08-14T10:00:00.000Z'),
  updatedAt: new Date('2026-08-14T10:00:00.000Z'),
};

describe('toVehicleMaintenanceDto', () => {
  it('exposes date as YYYY-MM-DD', () => {
    expect(toVehicleMaintenanceDto(record)).toMatchObject({
      id: 'maint_1',
      date: '2026-08-14',
      partName: 'Kočione pločice',
      cost: 8500,
    });
  });
});
