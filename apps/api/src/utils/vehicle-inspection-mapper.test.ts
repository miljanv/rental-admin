import { describe, expect, it } from 'vitest';

import { toVehicleInspectionDto, type VehicleInspectionRecord } from './vehicle-inspection-mapper';

const record: VehicleInspectionRecord = {
  id: 'insp_1',
  vehicleId: 'veh_1',
  type: 'REGULAR',
  inspectedAt: new Date('2026-08-14T00:00:00.000Z'),
  expiresAt: new Date('2027-08-14T00:00:00.000Z'),
  createdAt: new Date('2026-08-14T10:00:00.000Z'),
  updatedAt: new Date('2026-08-14T10:00:00.000Z'),
};

describe('toVehicleInspectionDto', () => {
  it('exposes inspectedAt/expiresAt as YYYY-MM-DD', () => {
    expect(toVehicleInspectionDto(record)).toMatchObject({
      id: 'insp_1',
      vehicleId: 'veh_1',
      type: 'REGULAR',
      inspectedAt: '2026-08-14',
      expiresAt: '2027-08-14',
    });
  });
});
