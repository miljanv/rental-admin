import { describe, expect, it } from 'vitest';

import { summarizeVehicleFuelConsumption } from './dashboard.service';

describe('summarizeVehicleFuelConsumption', () => {
  it('uses total liters over total distance and sorts vehicles from lowest consumption', () => {
    const result = summarizeVehicleFuelConsumption([
      {
        vehicleId: 'bus-a',
        litersFilled: 20,
        kmDriven: 100,
        vehicle: { make: 'Setra', model: 'S 415', licensePlate: 'NS-001-AA' },
      },
      {
        vehicleId: 'bus-a',
        litersFilled: 60,
        kmDriven: 300,
        vehicle: { make: 'Setra', model: 'S 415', licensePlate: 'NS-001-AA' },
      },
      {
        vehicleId: 'bus-b',
        litersFilled: 50,
        kmDriven: 200,
        vehicle: { make: 'MAN', model: 'Lion', licensePlate: 'NS-002-BB' },
      },
      {
        vehicleId: 'bus-c',
        litersFilled: 30,
        kmDriven: null,
        vehicle: { make: 'Neoplan', model: 'Tourliner', licensePlate: 'NS-003-CC' },
      },
    ]);

    expect(result).toEqual([
      {
        vehicleId: 'bus-a',
        vehicleLabel: 'Setra S 415 · NS-001-AA',
        litersFilled: 80,
        kmDriven: 400,
        avgConsumptionPer100Km: 20,
      },
      {
        vehicleId: 'bus-b',
        vehicleLabel: 'MAN Lion · NS-002-BB',
        litersFilled: 50,
        kmDriven: 200,
        avgConsumptionPer100Km: 25,
      },
    ]);
  });
});
