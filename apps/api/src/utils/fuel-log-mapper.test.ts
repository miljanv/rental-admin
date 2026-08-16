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
  cost: 8_400,
  paymentMethod: 'ACCOUNT',
  supplier: 'NIS',
  note: 'Grupni račun',
  kmDriven: 500,
  consumptionPer100Km: 8,
  createdAt: new Date('2026-08-14T10:00:00.000Z'),
  updatedAt: new Date('2026-08-14T10:00:00.000Z'),
  driver: { id: 'drv_1', firstName: 'Marko', lastName: 'Marković' },
  vehicle: { id: 'veh_1', make: 'Setra', model: 'S 516', licensePlate: 'NS-001-AA' },
};

describe('toFuelLogDto', () => {
  it('maps a fuel log with driver, vehicle and derived fields', () => {
    expect(toFuelLogDto(record)).toMatchObject({
      id: 'log_1',
      fueledAt: '2026-08-14',
      supplier: 'NIS',
      note: 'Grupni račun',
      driver: { id: 'drv_1', firstName: 'Marko', lastName: 'Marković' },
      vehicle: { id: 'veh_1', licensePlate: 'NS-001-AA' },
      kmDriven: 500,
      consumptionPer100Km: 8,
    });
  });

  it('maps a null driver', () => {
    expect(toFuelLogDto({ ...record, driverId: null, driver: null }).driver).toBeNull();
  });
});
