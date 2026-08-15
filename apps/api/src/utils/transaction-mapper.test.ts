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
  route: null,
  vehicleId: 'veh_1',
  driverId: null,
  contractId: null,
  isAdvance: true,
  status: 'OPEN',
  linkedTransactionId: null,
  sourceType: 'MANUAL',
  sourceId: null,
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
      vehicle: { id: 'veh_1', licensePlate: 'NS-123-AB' },
      driver: null,
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
