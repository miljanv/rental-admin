import { describe, expect, it } from 'vitest';

import { toTripExpenseDto, type TripExpenseRecord } from './trip-expense-mapper';

const record: TripExpenseRecord = {
  id: 'exp_1',
  tripId: 'trip_1',
  category: 'FUEL',
  amount: 12_500,
  paymentMethod: 'CASH',
  note: 'OMV Subotica',
  fileId: null,
  createdAt: new Date('2026-08-16T10:00:00.000Z'),
  updatedAt: new Date('2026-08-16T10:00:00.000Z'),
  file: null,
};

describe('toTripExpenseDto', () => {
  it('maps scalars and drops a missing file', () => {
    expect(toTripExpenseDto(record)).toEqual({
      id: 'exp_1',
      tripId: 'trip_1',
      category: 'FUEL',
      amount: 12_500,
      paymentMethod: 'CASH',
      note: 'OMV Subotica',
      file: null,
      createdAt: '2026-08-16T10:00:00.000Z',
      updatedAt: '2026-08-16T10:00:00.000Z',
    });
  });
});
