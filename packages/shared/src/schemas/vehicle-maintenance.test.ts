import { describe, expect, it } from 'vitest';

import { vehicleMaintenanceWriteSchema } from './vehicle-maintenance';

const validRecord = {
  date: '2026-08-14',
  odometerKm: 150_000,
  partName: 'Kočione pločice',
  supplier: 'AutoDelovi d.o.o.',
  cost: 8500,
  mechanic: 'Petar Petrović',
} as const;

describe('vehicleMaintenanceWriteSchema', () => {
  it('accepts a complete maintenance payload', () => {
    expect(vehicleMaintenanceWriteSchema.safeParse(validRecord).success).toBe(true);
  });

  it('rejects a negative cost', () => {
    expect(vehicleMaintenanceWriteSchema.safeParse({ ...validRecord, cost: -1 }).success).toBe(
      false,
    );
  });

  it('accepts zero cost (e.g. warranty replacement)', () => {
    expect(vehicleMaintenanceWriteSchema.safeParse({ ...validRecord, cost: 0 }).success).toBe(
      true,
    );
  });

  it('rejects a blank part name', () => {
    expect(vehicleMaintenanceWriteSchema.safeParse({ ...validRecord, partName: '' }).success).toBe(
      false,
    );
  });
});
