import { describe, expect, it } from 'vitest';

import { driverReportWriteSchema } from './driver-portal';

describe('driverReportWriteSchema trip times', () => {
  it('keeps start, end and border crossings and rejects an end before the start', () => {
    const ok = driverReportWriteSchema.safeParse({
      startedAt: '2026-11-19T06:30',
      finishedAt: '2026-11-21T22:15',
      borderCrossings: [
        { at: '2026-11-19T11:00', direction: 'OUT' },
        { at: '2026-11-21T18:40', direction: 'IN' },
      ],
    });
    expect(ok.success).toBe(true);
    expect(ok.data?.borderCrossings).toHaveLength(2);

    const backwards = driverReportWriteSchema.safeParse({
      startedAt: '2026-11-19T06:30',
      finishedAt: '2026-11-19T06:00',
    });
    expect(backwards.success).toBe(false);
    expect(backwards.error?.issues[0]?.path).toEqual(['finishedAt']);
  });
});

describe('driverReportWriteSchema', () => {
  it('accepts readings and expenses, defaulting empty lists', () => {
    expect(driverReportWriteSchema.parse({})).toEqual({
      vehicles: [],
      expenses: [],
      note: null,
      startedAt: null,
      finishedAt: null,
      borderCrossings: [],
    });

    const result = driverReportWriteSchema.safeParse({
      vehicles: [{ vehicleId: 'veh_1', startKm: 184_350, endKm: '' }],
      expenses: [{ category: 'TOLL', amount: 1_250, paymentMethod: 'CASH', fileId: '' }],
      note: '',
    });

    expect(result.success).toBe(true);
    expect(result.data?.expenses[0]).toMatchObject({ id: null, fileId: null, note: null });
  });

  it('rejects an invoice payment, a zero amount and an end below the start', () => {
    expect(
      driverReportWriteSchema.safeParse({
        expenses: [{ category: 'TOLL', amount: 100, paymentMethod: 'INVOICE' }],
      }).success,
    ).toBe(false);
    expect(
      driverReportWriteSchema.safeParse({
        expenses: [{ category: 'TOLL', amount: 0, paymentMethod: 'CASH' }],
      }).success,
    ).toBe(false);
    expect(
      driverReportWriteSchema.safeParse({
        vehicles: [{ vehicleId: 'veh_1', startKm: 200, endKm: 100 }],
      }).success,
    ).toBe(false);
  });

  it('rejects the same receipt on two expenses', () => {
    const result = driverReportWriteSchema.safeParse({
      expenses: [
        { category: 'TOLL', amount: 100, paymentMethod: 'CASH', fileId: 'file_1' },
        { category: 'PARKING', amount: 200, paymentMethod: 'CASH', fileId: 'file_1' },
      ],
    });

    expect(result.success).toBe(false);
  });
});

describe('driverReportWriteSchema fuel details', () => {
  const fuel = { category: 'FUEL', amount: 18_400, paymentMethod: 'COMPANY_CARD' } as const;

  it('treats empty fuel fields as not given', () => {
    const result = driverReportWriteSchema.parse({
      expenses: [{ ...fuel, fuelLiters: Number.NaN, fuelOdometerKm: '', fuelType: '' }],
    });

    expect(result.expenses[0]).toMatchObject({
      fuelLiters: null,
      fuelOdometerKm: null,
      fuelType: null,
      vehicleId: null,
      fuelStation: null,
    });
  });

  it('keeps valid fuel details and rejects broken ones', () => {
    expect(
      driverReportWriteSchema.parse({
        expenses: [
          {
            ...fuel,
            vehicleId: 'veh_1',
            fuelLiters: 210.5,
            fuelType: 'DIESEL',
            fuelOdometerKm: 184_500,
          },
        ],
      }).expenses[0],
    ).toMatchObject({ fuelLiters: 210.5, fuelOdometerKm: 184_500, fuelType: 'DIESEL' });
    expect(
      driverReportWriteSchema.safeParse({ expenses: [{ ...fuel, fuelLiters: -5 }] }).success,
    ).toBe(false);
    expect(
      driverReportWriteSchema.safeParse({ expenses: [{ ...fuel, fuelOdometerKm: 10.5 }] }).success,
    ).toBe(false);
  });
});
