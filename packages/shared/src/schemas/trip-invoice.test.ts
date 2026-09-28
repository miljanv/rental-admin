import { describe, expect, it } from 'vitest';

import { tripInvoiceWriteSchema } from './trip';

describe('tripInvoiceWriteSchema', () => {
  it('requires a domestic or foreign price and clears an empty reference number', () => {
    const result = tripInvoiceWriteSchema.safeParse({
      domesticPrice: 511_280,
      foreignPrice: 237_160,
      paymentMethod: 'ACCOUNT',
      invoicedAt: '2026-09-26',
      referenceNumber: '',
    });

    expect(result.success).toBe(true);
    expect(result.data?.referenceNumber).toBeNull();
    expect(result.data?.priceIncludesVat).toBe(false);
    expect(result.data?.foreignPrice).toBe(237_160);
    expect(result.data?.billSeriesMonth).toBe(false);
    expect(result.data?.description).toBeNull();
  });

  it('accepts a foreign fare on its own', () => {
    const result = tripInvoiceWriteSchema.safeParse({
      foreignPrice: 237_160,
      paymentMethod: 'ACCOUNT',
      invoicedAt: '2026-09-26',
    });

    expect(result.success).toBe(true);
    expect(result.data?.domesticPrice).toBeNull();
  });

  it('rejects an invoice without either price', () => {
    expect(
      tripInvoiceWriteSchema.safeParse({
        domesticPrice: '',
        foreignPrice: '',
        paymentMethod: 'CASH',
        invoicedAt: '2026-09-26',
      }).success,
    ).toBe(false);
  });
});
