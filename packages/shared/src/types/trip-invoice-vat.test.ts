import { describe, expect, it } from 'vitest';

import {
  computeTransportVat,
  domesticKmShare,
  invoiceMonthBounds,
  seriesInvoiceGroupId,
} from './trip-invoice-vat';

describe('computeTransportVat', () => {
  it('adds 10% on the whole fare when the job is in Serbia and the price is net', () => {
    expect(computeTransportVat({ amount: 20_000, priceIncludesVat: false, domesticShare: 1 })).toEqual({
      netAmount: 20_000,
      domesticNet: 20_000,
      foreignNet: 0,
      vatBase: 20_000,
      vatRate: 10,
      vatAmount: 2_000,
      grossAmount: 22_000,
      domesticShare: 1,
    });
  });

  it('backs VAT out when the typed price already includes it', () => {
    expect(
      computeTransportVat({ amount: 22_000, priceIncludesVat: true, domesticShare: 1 }),
    ).toMatchObject({
      netAmount: 20_000,
      vatAmount: 2_000,
      grossAmount: 22_000,
    });
  });

  it('taxes only the domestic kilometre share on a foreign job', () => {
    const share = domesticKmShare(100, 500);

    expect(share).toBe(0.2);
    expect(
      computeTransportVat({ amount: 20_000, priceIncludesVat: false, domesticShare: share ?? 0 }),
    ).toMatchObject({
      netAmount: 20_000,
      domesticNet: 4_000,
      foreignNet: 16_000,
      vatAmount: 400,
      grossAmount: 20_400,
    });
  });

  it('bills a worker-transport month as days times the daily net price', () => {
    const month = computeTransportVat({
      amount: 30 * 20_000,
      priceIncludesVat: false,
      domesticShare: 1,
    });

    expect(month.netAmount).toBe(600_000);
    expect(month.vatAmount).toBe(60_000);
    expect(month.grossAmount).toBe(660_000);
  });

  it('rejects a domestic kilometre figure above the total', () => {
    expect(domesticKmShare(500, 100)).toBeNull();
    expect(domesticKmShare(10, 0)).toBeNull();
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
