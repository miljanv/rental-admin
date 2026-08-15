import { describe, expect, it } from 'vitest';

import { toDriverDriveDto, toVehicleLabel } from './driver-work-mapper';

const record = {
  id: 'log_1',
  fueledAt: new Date('2026-08-10T00:00:00.000Z'),
  location: 'Novi Sad',
  kmDriven: 420,
  fuelType: 'DIESEL' as const,
  vehicle: {
    id: 'veh_1',
    make: 'Setra',
    model: 'S 516',
    licensePlate: 'NS-123-AB',
  },
};

describe('toVehicleLabel', () => {
  it('joins make, model and plate', () => {
    expect(toVehicleLabel(record.vehicle)).toBe('Setra S 516 · NS-123-AB');
  });
});

describe('toDriverDriveDto', () => {
  it('maps a diesel fill-up to a drive row', () => {
    expect(toDriverDriveDto(record)).toEqual({
      id: 'log_1',
      fueledAt: '2026-08-10',
      vehicleId: 'veh_1',
      vehicleLabel: 'Setra S 516 · NS-123-AB',
      location: 'Novi Sad',
      kmDriven: 420,
      fuelType: 'DIESEL',
    });
  });
});
