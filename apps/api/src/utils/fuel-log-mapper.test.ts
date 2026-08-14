import { describe, expect, it } from 'vitest';

import { toFuelLogDto, type FuelLogRecord } from './fuel-log-mapper';

const record: FuelLogRecord = {
  id: 'log_1',
  vehicleId: 'veh_1',
  fueledAt: new Date('2026-08-14T00:00:00.000Z'),
  location: 'NIS pumpa, Novi Sad',
  driverId: 'drv_1',
  fuelType: 'DIESEL',
  litersFilled: 40,
  odometerKm: 100_500,
  kmDriven: 500,
  consumptionPer100Km: 8,
  createdAt: new Date('2026-08-14T10:00:00.000Z'),
  updatedAt: new Date('2026-08-14T10:00:00.000Z'),
  driver: { id: 'drv_1', firstName: 'Marko', lastName: 'Marković' },
};

describe('toFuelLogDto', () => {
  it('maps a fuel log with driver and derived fields', () => {
    expect(toFuelLogDto(record)).toMatchObject({
      id: 'log_1',
      fueledAt: '2026-08-14',
      driver: { id: 'drv_1', firstName: 'Marko', lastName: 'Marković' },
      kmDriven: 500,
      consumptionPer100Km: 8,
    });
  });

  it('maps a null driver', () => {
    expect(toFuelLogDto({ ...record, driverId: null, driver: null }).driver).toBeNull();
  });
});
