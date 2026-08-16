import { describe, expect, it } from 'vitest';

import { toVehicleDto, type VehicleRecord } from './vehicle-mapper';

const record: VehicleRecord = {
  id: 'veh_1',
  make: 'Mercedes-Benz',
  model: 'Sprinter',
  year: 2019,
  licensePlate: 'NS-123-AB',
  vin: 'WDB9066331R123456',
  engineNumber: null,
  enginePower: null,
  engineDisplacement: null,
  mass: null,
  seatCount: 19,
  standingCapacity: null,
  initialMileageKm: 118_500,
  type: 'VAN',
  fuelType: 'DIESEL',
  tachographType: 'DIGITAL',
  status: 'ACTIVE',
  currentMileage: 120_000,
  createdAt: new Date('2026-08-14T10:00:00.000Z'),
  updatedAt: new Date('2026-08-14T10:00:00.000Z'),
};

describe('toVehicleDto', () => {
  it('maps a vehicle record to ISO timestamps', () => {
    expect(toVehicleDto(record)).toMatchObject({
      id: 'veh_1',
      make: 'Mercedes-Benz',
      vin: 'WDB9066331R123456',
      status: 'ACTIVE',
      createdAt: '2026-08-14T10:00:00.000Z',
    });
  });
});
