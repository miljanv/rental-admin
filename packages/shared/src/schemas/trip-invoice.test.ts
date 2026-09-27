import { describe, expect, it } from 'vitest';

import { tripInvoiceWriteSchema } from './trip';

describe('tripInvoiceWriteSchema', () => {
  it('requires a price and payment method and clears an empty reference number', () => {
    const result = tripInvoiceWriteSchema.safeParse({
      price: 45_000,
      paymentMethod: 'ACCOUNT',
      invoicedAt: '2026-09-26',
      referenceNumber: '',
    });

    expect(result.success).toBe(true);
    expect(result.data?.referenceNumber).toBeNull();
    expect(result.data?.priceIncludesVat).toBe(false);
    expect(result.data?.billSeriesMonth).toBe(false);
    expect(result.data?.description).toBeNull();
  });

  it('rejects an invoice without a price', () => {
    expect(
      tripInvoiceWriteSchema.safeParse({
        price: '',
        paymentMethod: 'CASH',
        invoicedAt: '2026-09-26',
      }).success,
    ).toBe(false);
  });
});
