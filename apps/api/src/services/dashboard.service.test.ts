import { describe, expect, it } from 'vitest';

import { summarizeOpenItems, summarizeVehicleFuelConsumption } from './dashboard.service';

describe('summarizeOpenItems', () => {
  it('groups open documents by counterparty and ranks counterparties by total debt', () => {
    const result = summarizeOpenItems([
      {
        targetType: 'TRIP_INVOICE',
        targetId: 'invoice-1',
        counterpartyId: 'partner-a',
        recommended: false,
        label: 'Račun 1',
        counterparty: 'Partner A',
        issuedAt: '2026-10-01',
        totalAmount: 600,
        allocatedAmount: 100,
        remainingAmount: 500,
      },
      {
        targetType: 'TRIP_INVOICE',
        targetId: 'invoice-2',
        counterpartyId: 'partner-a',
        recommended: false,
        label: 'Račun 2',
        counterparty: 'Partner A',
        issuedAt: '2026-10-03',
        totalAmount: 400,
        allocatedAmount: 0,
        remainingAmount: 400,
      },
      {
        targetType: 'TRIP_INVOICE',
        targetId: 'invoice-3',
        counterpartyId: 'partner-b',
        recommended: false,
        label: 'Račun 3',
        counterparty: 'Partner B',
        issuedAt: '2026-10-02',
        totalAmount: 700,
        allocatedAmount: 0,
        remainingAmount: 700,
      },
      {
        targetType: 'TRIP_INVOICE',
        targetId: 'invoice-4',
        counterpartyId: null,
        recommended: false,
        label: 'Račun 4',
        counterparty: '  PARTNER C  ',
        issuedAt: '2026-10-04',
        totalAmount: 100,
        allocatedAmount: 0,
        remainingAmount: 100,
      },
      {
        targetType: 'TRIP_INVOICE',
        targetId: 'invoice-5',
        counterpartyId: null,
        recommended: false,
        label: 'Račun 5',
        counterparty: 'Partner C',
        issuedAt: '2026-10-05',
        totalAmount: 50,
        allocatedAmount: 0,
        remainingAmount: 50,
      },
    ]);

    expect(result).toEqual({
      total: 1750,
      count: 5,
      counterpartyCount: 3,
      items: [
        {
          counterpartyKey: 'id:partner-a',
          counterpartyId: 'partner-a',
          counterparty: 'Partner A',
          openItemCount: 2,
          latestIssuedAt: '2026-10-03',
          totalAmount: 1000,
          allocatedAmount: 100,
          remainingAmount: 900,
        },
        {
          counterpartyKey: 'id:partner-b',
          counterpartyId: 'partner-b',
          counterparty: 'Partner B',
          openItemCount: 1,
          latestIssuedAt: '2026-10-02',
          totalAmount: 700,
          allocatedAmount: 0,
          remainingAmount: 700,
        },
        {
          counterpartyKey: 'name:partner c',
          counterpartyId: null,
          counterparty: 'PARTNER C',
          openItemCount: 2,
          latestIssuedAt: '2026-10-05',
          totalAmount: 150,
          allocatedAmount: 0,
          remainingAmount: 150,
        },
      ],
    });
  });
});

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
        fillUpCount: 2,
        litersFilled: 80,
        kmDriven: 400,
        avgConsumptionPer100Km: 20,
      },
      {
        vehicleId: 'bus-b',
        vehicleLabel: 'MAN Lion · NS-002-BB',
        fillUpCount: 1,
        litersFilled: 50,
        kmDriven: 200,
        avgConsumptionPer100Km: 25,
      },
    ]);
  });
});
