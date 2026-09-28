import { describe, expect, it } from 'vitest';

import {
  companyExpenseFinanceCategory,
  companyExpenseFinanceNote,
  inferCompanyExpenseVatRate,
  splitCompanyExpenseAmount,
} from './company-expense';

describe('splitCompanyExpenseAmount', () => {
  it('keeps the entered total and splits 20% VAT', () => {
    expect(splitCompanyExpenseAmount(12_000, 20)).toEqual({
      amountWithoutVat: 10_000,
      vatAmount: 2_000,
      amountWithVat: 12_000,
    });
  });

  it('splits 10% VAT', () => {
    expect(splitCompanyExpenseAmount(11_000, 10)).toEqual({
      amountWithoutVat: 10_000,
      vatAmount: 1_000,
      amountWithVat: 11_000,
    });
  });

  it('puts the whole amount in net when the rate is 0%', () => {
    expect(splitCompanyExpenseAmount(8_000, 0)).toEqual({
      amountWithoutVat: 8_000,
      vatAmount: 0,
      amountWithVat: 8_000,
    });
  });
});

describe('companyExpenseFinanceCategory', () => {
  it('sorts vehicle invoices into the finance categories', () => {
    expect(companyExpenseFinanceCategory('SOFTVER ZA TAHOGRAF')).toBe('TACHOGRAPH');
    expect(companyExpenseFinanceCategory('PP APARATI - servis')).toBe('FIRE_EXTINGUISHER');
    expect(companyExpenseFinanceCategory('TEHNIČKI PREGLED MESEČNI')).toBe('TECHNICAL_INSPECTION');
    expect(companyExpenseFinanceCategory('GUME KOMPLET, 4 x Michelin')).toBe('PARTS');
    expect(companyExpenseFinanceCategory('USLUGA MONTAZE GUMA')).toBe('PARTS');
    expect(companyExpenseFinanceCategory('PLOČICE, FILTERI, SENZOR')).toBe('PARTS');
    expect(companyExpenseFinanceCategory('KAZNA NS 882-RT')).toBe('OTHER');
  });
});

describe('companyExpenseFinanceNote', () => {
  it('keeps the invoice number in front of the description', () => {
    expect(
      companyExpenseFinanceNote({
        invoiceNumber: '12-2026',
        description: 'Gume komplet',
      }),
    ).toBe('12-2026 — Gume komplet');
    expect(companyExpenseFinanceNote({ invoiceNumber: null, description: ' Kazna ' })).toBe('Kazna');
  });
});

describe('inferCompanyExpenseVatRate', () => {
  it('recovers the rate from stored amounts', () => {
    expect(
      inferCompanyExpenseVatRate({
        amountWithoutVat: 10_000,
        vatAmount: 2_000,
        amountWithVat: 12_000,
      }),
    ).toBe(20);
    expect(
      inferCompanyExpenseVatRate({
        amountWithoutVat: 10_000,
        vatAmount: 1_000,
        amountWithVat: 11_000,
      }),
    ).toBe(10);
    expect(
      inferCompanyExpenseVatRate({
        amountWithoutVat: 8_000,
        vatAmount: 0,
        amountWithVat: 8_000,
      }),
    ).toBe(0);
  });
});
