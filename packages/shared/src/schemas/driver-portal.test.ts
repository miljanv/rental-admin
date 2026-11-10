import { describe, expect, it } from 'vitest';

import { driverReportWriteSchema } from './driver-portal';

describe('driverReportWriteSchema', () => {
  it('accepts readings and expenses, defaulting empty lists', () => {
    expect(driverReportWriteSchema.parse({})).toEqual({ vehicles: [], expenses: [], note: null });

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
