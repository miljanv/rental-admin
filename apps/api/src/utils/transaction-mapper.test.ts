import { describe, expect, it } from 'vitest';

import { toTransactionDto, type FinanceTransactionRecord } from './transaction-mapper';

const record: FinanceTransactionRecord = {
  id: 'txn_1',
  type: 'EXPENSE',
  category: 'FUEL',
  amount: 50_000,
  occurredAt: new Date('2026-08-15T00:00:00.000Z'),
  paymentMethod: 'ACCOUNT',
  note: 'OMV avans',
  supplier: 'OMV',
  partner: null,
  partnerId: null,
  route: null,
  vehicleId: 'veh_1',
  driverId: null,
  contractId: null,
  isAdvance: true,
  status: 'OPEN',
  linkedTransactionId: null,
  sourceType: 'MANUAL',
  sourceId: null,
  statementNumber: null,
  bankReference: null,
  paymentAllocations: [],
  createdAt: new Date('2026-08-15T10:00:00.000Z'),
  updatedAt: new Date('2026-08-15T10:00:00.000Z'),
  vehicle: { id: 'veh_1', make: 'Mercedes', model: 'Sprinter', licensePlate: 'NS-123-AB' },
  driver: null,
};

describe('toTransactionDto', () => {
  it('exposes occurredAt as YYYY-MM-DD and maps the vehicle', () => {
    expect(toTransactionDto(record)).toMatchObject({
      id: 'txn_1',
      type: 'EXPENSE',
      category: 'FUEL',
      amount: 50_000,
      occurredAt: '2026-08-15',
      paymentMethod: 'ACCOUNT',
      supplier: 'OMV',
      isAdvance: true,
      status: 'OPEN',
      allocatedAmount: 0,
      unallocatedAmount: 50_000,
      allocationCount: 0,
      vehicle: { id: 'veh_1', licensePlate: 'NS-123-AB' },
      driver: null,
    });
  });

  it('sums payment allocations', () => {
    expect(
      toTransactionDto({
        ...record,
        amount: 100_000,
        paymentAllocations: [{ amount: 30_000 }, { amount: 20_000 }],
      }),
    ).toMatchObject({
      allocatedAmount: 50_000,
      unallocatedAmount: 50_000,
      allocationCount: 2,
    });
  });

  it('maps a driver when present', () => {
    expect(
      toTransactionDto({
        ...record,
        driverId: 'drv_1',
        driver: { id: 'drv_1', firstName: 'Marko', lastName: 'Marković' },
      }).driver,
    ).toEqual({ id: 'drv_1', firstName: 'Marko', lastName: 'Marković' });
  });
});
