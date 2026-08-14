import { describe, expect, it } from 'vitest';

import { computeSafetyEquipmentExpiry } from './vehicle-safety-equipment';

describe('computeSafetyEquipmentExpiry', () => {
  it('fire extinguishers expire 180 days after the check date', () => {
    expect(computeSafetyEquipmentExpiry('FIRE_EXTINGUISHER', '2026-08-14', null)).toBe(
      '2027-02-10',
    );
  });

  it('first aid kits use the manually entered expiry date', () => {
    expect(computeSafetyEquipmentExpiry('FIRST_AID_KIT', '2026-08-14', '2028-01-01')).toBe(
      '2028-01-01',
    );
  });
});
