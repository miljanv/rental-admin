import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import {
  financeExportQuerySchema,
  financeReportQuerySchema,
  listTransactionsQuerySchema,
  refineCostRequiresPaymentMethod,
  settleAdvancesSchema,
  transactionWriteSchema,
} from './transaction';

const validManual = {
  type: 'EXPENSE',
  category: 'FUEL',
  amount: 50_000,
  occurredAt: '2026-08-15',
  paymentMethod: 'ACCOUNT',
  supplier: 'OMV',
  isAdvance: true,
} as const;

describe('transactionWriteSchema', () => {
  it('accepts a fuel advance with a supplier', () => {
    const result = transactionWriteSchema.safeParse(validManual);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.isAdvance).toBe(true);
      expect(result.data.note).toBeNull();
      expect(result.data.partner).toBeNull();
      expect(result.data.route).toBeNull();
    }
  });

  it('rejects an advance without a supplier', () => {
    expect(
      transactionWriteSchema.safeParse({ ...validManual, supplier: '' }).success,
    ).toBe(false);
  });

  it('rejects an income marked as an advance', () => {
    expect(
      transactionWriteSchema.safeParse({ ...validManual, type: 'INCOME', category: 'CONTRACT' })
        .success,
    ).toBe(false);
  });

  it('rejects a zero amount', () => {
    expect(transactionWriteSchema.safeParse({ ...validManual, amount: 0 }).success).toBe(false);
  });

  it('accepts explicit nulls for optional text fields', () => {
    const result = transactionWriteSchema.safeParse({
      ...validManual,
      note: null,
      partner: null,
      route: null,
      vehicleId: null,
      driverId: null,
      contractId: null,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.note).toBeNull();
      expect(result.data.partner).toBeNull();
      expect(result.data.route).toBeNull();
    }
  });
});

describe('listTransactionsQuerySchema', () => {
  it('defaults to newest-first pagination', () => {
    expect(listTransactionsQuerySchema.parse({})).toMatchObject({
      page: 1,
      limit: 10,
      sortBy: 'occurredAt',
      sortOrder: 'desc',
    });
  });

  it('coerces isAdvance from a query string', () => {
    expect(listTransactionsQuerySchema.parse({ isAdvance: 'true' }).isAdvance).toBe(true);
    expect(listTransactionsQuerySchema.parse({ isAdvance: 'false' }).isAdvance).toBe(false);
  });
});

describe('settleAdvancesSchema', () => {
  it('accepts a settlement for a supplier', () => {
    expect(
      settleAdvancesSchema.safeParse({
        supplier: 'OMV',
        occurredAt: '2026-08-31',
        paymentMethod: 'ACCOUNT',
      }).success,
    ).toBe(true);
  });

  it('rejects a reversed date range', () => {
    expect(
      settleAdvancesSchema.safeParse({
        supplier: 'OMV',
        occurredAt: '2026-08-31',
        paymentMethod: 'CASH',
        from: '2026-08-31',
        to: '2026-08-01',
      }).success,
    ).toBe(false);
  });
});

describe('financeExportQuerySchema', () => {
  it('requires a format', () => {
    expect(financeExportQuerySchema.safeParse({}).success).toBe(false);
    expect(financeExportQuerySchema.safeParse({ format: 'pdf' }).success).toBe(true);
    expect(financeExportQuerySchema.safeParse({ format: 'xlsx', from: '2026-01-01' }).success).toBe(
      true,
    );
  });

  it('rejects a reversed range', () => {
    expect(
      financeExportQuerySchema.safeParse({
        format: 'pdf',
        from: '2026-08-31',
        to: '2026-08-01',
      }).success,
    ).toBe(false);
  });
});

describe('financeReportQuerySchema', () => {
  it('allows an empty range', () => {
    expect(financeReportQuerySchema.safeParse({}).success).toBe(true);
  });

  it('rejects a reversed range', () => {
    expect(
      financeReportQuerySchema.safeParse({ from: '2026-08-31', to: '2026-08-01' }).success,
    ).toBe(false);
  });
});

describe('refineCostRequiresPaymentMethod', () => {
  const schema = z
    .object({
      cost: z.number().nullable(),
      paymentMethod: z.enum(['ACCOUNT', 'CASH']).nullable(),
    })
    .superRefine(refineCostRequiresPaymentMethod);

  it('requires a payment method when a positive cost is set', () => {
    expect(schema.safeParse({ cost: 1200, paymentMethod: null }).success).toBe(false);
    expect(schema.safeParse({ cost: 1200, paymentMethod: 'CASH' }).success).toBe(true);
  });

  it('allows a missing payment method when there is no cost', () => {
    expect(schema.safeParse({ cost: null, paymentMethod: null }).success).toBe(true);
  });
});
