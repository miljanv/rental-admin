import { describe, expect, it } from 'vitest';

import {
  toVehicleSafetyEquipmentDto,
  type VehicleSafetyEquipmentRecord,
} from './vehicle-safety-equipment-mapper';

const record: VehicleSafetyEquipmentRecord = {
  id: 'eq_1',
  vehicleId: 'veh_1',
  type: 'FIRE_EXTINGUISHER',
  checkedAt: new Date('2026-08-14T00:00:00.000Z'),
  expiresAt: new Date('2027-02-10T00:00:00.000Z'),
  fileId: null,
  createdAt: new Date('2026-08-14T10:00:00.000Z'),
  updatedAt: new Date('2026-08-14T10:00:00.000Z'),
  file: null,
};

describe('toVehicleSafetyEquipmentDto', () => {
  it('exposes checkedAt/expiresAt as YYYY-MM-DD', () => {
    expect(toVehicleSafetyEquipmentDto(record)).toMatchObject({
      id: 'eq_1',
      vehicleId: 'veh_1',
      type: 'FIRE_EXTINGUISHER',
      checkedAt: '2026-08-14',
      expiresAt: '2027-02-10',
    });
  });
});
