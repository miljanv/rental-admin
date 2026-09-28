import { describe, expect, it } from 'vitest';

import {
  computeSplitTransportFare,
  invoiceMonthBounds,
  scaleTransportFare,
  seriesInvoiceGroupId,
} from './trip-invoice-vat';

describe('computeSplitTransportFare', () => {
  it('adds 10% only to a net domestic fare and leaves the foreign fare untaxed', () => {
    expect(
      computeSplitTransportFare({
        domesticAmount: 511_280,
        domesticIncludesVat: false,
        foreignAmount: 237_160,
      }),
    ).toEqual({
      netAmount: 748_440,
      domesticNet: 511_280,
      foreignNet: 237_160,
      domesticGross: 562_408,
      vatBase: 511_280,
      vatRate: 10,
      vatAmount: 51_128,
      grossAmount: 799_568,
    });
  });

  it('backs VAT out of a domestic fare that was typed with VAT, then adds the foreign fare', () => {
    expect(
      computeSplitTransportFare({
        domesticAmount: 562_408,
        domesticIncludesVat: true,
        foreignAmount: 237_160,
      }),
    ).toMatchObject({
      domesticNet: 511_280,
      vatAmount: 51_128,
      domesticGross: 562_408,
      grossAmount: 799_568,
    });
  });

  it('taxes a Serbia-only fare and treats a missing foreign amount as zero', () => {
    expect(
      computeSplitTransportFare({
        domesticAmount: 20_000,
        domesticIncludesVat: false,
        foreignAmount: 0,
      }),
    ).toMatchObject({
      domesticNet: 20_000,
      foreignNet: 0,
      vatAmount: 2_000,
      grossAmount: 22_000,
    });
  });

  it('leaves an abroad-only fare without VAT', () => {
    expect(
      computeSplitTransportFare({
        domesticAmount: 0,
        domesticIncludesVat: false,
        foreignAmount: 237_160,
      }),
    ).toMatchObject({
      vatAmount: 0,
      grossAmount: 237_160,
    });
  });

  it('scales a daily fare across the days of a worker-transport month', () => {
    const day = computeSplitTransportFare({
      domesticAmount: 20_000,
      domesticIncludesVat: false,
      foreignAmount: 0,
    });
    const month = scaleTransportFare(day, 30);

    expect(month.netAmount).toBe(600_000);
    expect(month.vatAmount).toBe(60_000);
    expect(month.grossAmount).toBe(660_000);
  });
});

describe('invoiceMonthBounds', () => {
  it('covers September 2026', () => {
    expect(invoiceMonthBounds('2026-09-14')).toEqual({
      from: '2026-09-01',
      to: '2026-09-30',
      year: 2026,
      month: 9,
    });
    expect(seriesInvoiceGroupId('series_1', '2026-09-14')).toBe('series:series_1:2026-09');
  });
});
