import { describe, expect, it } from 'vitest';

import { tripInvoiceWriteSchema } from './trip';

describe('tripInvoiceWriteSchema', () => {
  it('requires a domestic or foreign price and clears an empty reference number', () => {
    const result = tripInvoiceWriteSchema.safeParse({
      domesticPrice: 511_280,
      foreignPrice: 237_160,
      paymentMethod: 'ACCOUNT',
      invoicedAt: '2026-09-26',
      supplyDate: '2026-09-30',
      referenceNumber: '',
    });

    expect(result.success).toBe(true);
    expect(result.data?.referenceNumber).toBeNull();
    expect(result.data?.priceIncludesVat).toBe(false);
    expect(result.data?.foreignPrice).toBe(237_160);
    expect(result.data?.billSeriesMonth).toBe(false);
    expect(result.data?.description).toBeNull();
    expect(result.data?.supplyDate).toBe('2026-09-30');
  });

  it('accepts a foreign fare on its own', () => {
    const result = tripInvoiceWriteSchema.safeParse({
      foreignPrice: 237_160,
      paymentMethod: 'ACCOUNT',
      invoicedAt: '2026-09-26',
      supplyDate: '2026-09-26',
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

  it('requires a supply date for an account invoice', () => {
    expect(
      tripInvoiceWriteSchema.safeParse({
        domesticPrice: 25_000,
        paymentMethod: 'ACCOUNT',
        invoicedAt: '2026-10-05',
      }).success,
    ).toBe(false);
  });

  it('requires a cash recipient and keeps cash trips out of monthly series billing', () => {
    expect(
      tripInvoiceWriteSchema.safeParse({
        domesticPrice: 25_000,
        paymentMethod: 'CASH',
        invoicedAt: '2026-09-26',
      }).success,
    ).toBe(false);

    expect(
      tripInvoiceWriteSchema.safeParse({
        domesticPrice: 25_000,
        paymentMethod: 'CASH',
        cashRecipient: 'Marko Marković',
        invoicedAt: '2026-09-26',
        billSeriesMonth: true,
      }).success,
    ).toBe(false);

    expect(
      tripInvoiceWriteSchema.safeParse({
        domesticPrice: 25_000,
        paymentMethod: 'CASH',
        cashRecipient: 'Marko Marković',
        invoicedAt: '2026-09-26',
      }).success,
    ).toBe(true);
  });
});

describe('tripInvoiceWriteSchema currency', () => {
  const base = {
    invoicedAt: '2026-09-20',
    supplyDate: '2026-09-20',
    domesticPrice: 430,
    foreignPrice: 1_670,
    paymentMethod: 'ACCOUNT' as const,
  };

  it('defaults to dinars without a rate', () => {
    const result = tripInvoiceWriteSchema.parse(base);

    expect(result.currency).toBe('RSD');
    expect(result.exchangeRate).toBeNull();
  });

  it('requires the invoice rate for EUR', () => {
    const result = tripInvoiceWriteSchema.safeParse({ ...base, currency: 'EUR' });

    expect(result.success).toBe(false);
    expect(result.error?.issues.map((issue) => issue.path.join('.'))).toContain('exchangeRate');
  });

  it('accepts an EUR invoice with a rate and rejects it for cash or a series month', () => {
    expect(
      tripInvoiceWriteSchema.safeParse({ ...base, currency: 'EUR', exchangeRate: 117.4007 })
        .success,
    ).toBe(true);
    expect(
      tripInvoiceWriteSchema.safeParse({
        ...base,
        currency: 'EUR',
        exchangeRate: 117.4007,
        billSeriesMonth: true,
      }).success,
    ).toBe(false);
  });
});
