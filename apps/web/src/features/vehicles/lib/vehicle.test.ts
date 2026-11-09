import { describe, expect, it } from 'vitest';

import { selectableVehicles } from './vehicle';

const vehicles = [
  { id: 'veh-1', isEnabled: true },
  { id: 'veh-2', isEnabled: false },
  { id: 'veh-3', isEnabled: false },
];

describe('selectableVehicles', () => {
  it('offers only enabled vehicles for a new record', () => {
    expect(selectableVehicles(vehicles).map((vehicle) => vehicle.id)).toEqual(['veh-1']);
  });

  it('keeps a disabled vehicle the edited record already uses', () => {
    expect(
      selectableVehicles(vehicles, ['veh-3', undefined, null]).map((vehicle) => vehicle.id),
    ).toEqual(['veh-1', 'veh-3']);
  });
});
