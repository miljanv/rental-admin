import { describe, expect, it } from 'vitest';

import { vehicleSafetyEquipmentWriteSchema } from './vehicle-safety-equipment';

describe('vehicleSafetyEquipmentWriteSchema', () => {
  it('requires expiresAt for a first aid kit', () => {
    const result = vehicleSafetyEquipmentWriteSchema.safeParse({
      type: 'FIRST_AID_KIT',
      checkedAt: '2026-08-14',
    });

    expect(result.success).toBe(false);
  });

  it('accepts a first aid kit with an expiresAt', () => {
    const result = vehicleSafetyEquipmentWriteSchema.safeParse({
      type: 'FIRST_AID_KIT',
      checkedAt: '2026-08-14',
      expiresAt: '2028-01-01',
    });

    expect(result.success).toBe(true);
    expect(result.data?.expiresAt).toBe('2028-01-01');
  });

  it('rejects a client-supplied expiresAt for a fire extinguisher', () => {
    const result = vehicleSafetyEquipmentWriteSchema.safeParse({
      type: 'FIRE_EXTINGUISHER',
      checkedAt: '2026-08-14',
      expiresAt: '2028-01-01',
    });

    expect(result.success).toBe(false);
  });

  it('accepts a fire extinguisher without expiresAt', () => {
    const result = vehicleSafetyEquipmentWriteSchema.safeParse({
      type: 'FIRE_EXTINGUISHER',
      checkedAt: '2026-08-14',
    });

    expect(result.success).toBe(true);
    expect(result.data?.expiresAt).toBeNull();
  });
});
