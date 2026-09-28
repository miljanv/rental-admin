/** Passenger transport VAT. 10% applies only to the domestic fare. The foreign fare is never taxed. */
export const TRANSPORT_VAT_RATE = 10;

export interface SplitTransportFareInput {
  /** Domestic fare as typed: net, or already gross when `domesticIncludesVat` is set. */
  domesticAmount: number;
  domesticIncludesVat: boolean;
  /** Foreign fare. Always net. VAT is never added. */
  foreignAmount: number;
}

export interface TransportVatResult {
  netAmount: number;
  domesticNet: number;
  foreignNet: number;
  /** Domestic amount the customer pays, including 10% VAT. */
  domesticGross: number;
  vatBase: number;
  vatRate: number;
  vatAmount: number;
  /** Domestic gross plus the untaxed foreign fare. */
  grossAmount: number;
}

const roundMoney = (value: number): number => Math.round(value * 100) / 100;

/**
 * Domestic fare can be typed with or without 10% VAT. The foreign fare is added as-is.
 * The amount due is those two figures added together.
 */
export const computeSplitTransportFare = (input: SplitTransportFareInput): TransportVatResult => {
  const rate = TRANSPORT_VAT_RATE / 100;
  const foreignNet = roundMoney(Math.max(0, input.foreignAmount));
  const typedDomestic = roundMoney(Math.max(0, input.domesticAmount));

  const domesticNet = input.domesticIncludesVat
    ? roundMoney(typedDomestic / (1 + rate))
    : typedDomestic;
  const vatAmount = input.domesticIncludesVat
    ? roundMoney(typedDomestic - domesticNet)
    : roundMoney(domesticNet * rate);
  const domesticGross = input.domesticIncludesVat
    ? typedDomestic
    : roundMoney(domesticNet + vatAmount);

  return {
    netAmount: roundMoney(domesticNet + foreignNet),
    domesticNet,
    foreignNet,
    domesticGross,
    vatBase: domesticNet,
    vatRate: TRANSPORT_VAT_RATE,
    vatAmount,
    grossAmount: roundMoney(domesticGross + foreignNet),
  };
};

export const scaleTransportFare = (fare: TransportVatResult, days: number): TransportVatResult => {
  const count = Number.isFinite(days) && days > 0 ? days : 0;
  const scale = (value: number): number => roundMoney(value * count);

  return {
    ...fare,
    netAmount: scale(fare.netAmount),
    domesticNet: scale(fare.domesticNet),
    foreignNet: scale(fare.foreignNet),
    domesticGross: scale(fare.domesticGross),
    vatBase: scale(fare.vatBase),
    vatAmount: scale(fare.vatAmount),
    grossAmount: scale(fare.grossAmount),
  };
};

/** First and last calendar day of the month that contains `isoDate` (`YYYY-MM-DD`). */
export const invoiceMonthBounds = (
  isoDate: string,
): { from: string; to: string; year: number; month: number } => {
  const year = Number(isoDate.slice(0, 4));
  const month = Number(isoDate.slice(5, 7));
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const monthText = String(month).padStart(2, '0');

  return {
    from: `${year}-${monthText}-01`,
    to: `${year}-${monthText}-${String(lastDay).padStart(2, '0')}`,
    year,
    month,
  };
};

export const seriesInvoiceGroupId = (seriesId: string, isoDate: string): string =>
  `series:${seriesId}:${isoDate.slice(0, 7)}`;
