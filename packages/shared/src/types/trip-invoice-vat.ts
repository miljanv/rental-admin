/** Passenger transport VAT. Only the domestic share of the fare is taxed. */
export const TRANSPORT_VAT_RATE = 10;

export interface TransportVatInput {
  /** Amount the user typed: either net or gross, depending on `priceIncludesVat`. */
  amount: number;
  priceIncludesVat: boolean;
  /**
   * 1 when the whole job is in Serbia.
   * For a foreign job, domestic kilometres divided by total kilometres.
   */
  domesticShare: number;
}

export interface TransportVatResult {
  netAmount: number;
  domesticNet: number;
  foreignNet: number;
  vatBase: number;
  vatRate: number;
  vatAmount: number;
  grossAmount: number;
  domesticShare: number;
}

const roundMoney = (value: number): number => Math.round(value * 100) / 100;

export const domesticKmShare = (
  domesticKm: number,
  totalKm: number,
): number | null => {
  if (!Number.isFinite(domesticKm) || !Number.isFinite(totalKm) || totalKm <= 0) {
    return null;
  }

  if (domesticKm < 0 || domesticKm > totalKm) {
    return null;
  }

  return domesticKm / totalKm;
};

/**
 * Split a transport fare into net, 10% VAT on the domestic share, and gross.
 * Foreign kilometres stay untaxed. Amounts are not converted between currencies.
 */
export const computeTransportVat = (input: TransportVatInput): TransportVatResult => {
  const share = Math.min(1, Math.max(0, input.domesticShare));
  const amount = roundMoney(input.amount);
  const rate = TRANSPORT_VAT_RATE / 100;

  const netAmount = input.priceIncludesVat
    ? roundMoney(amount / (1 + rate * share))
    : amount;
  const domesticNet = roundMoney(netAmount * share);
  const foreignNet = roundMoney(netAmount - domesticNet);
  const vatAmount = roundMoney(domesticNet * rate);
  const grossAmount = input.priceIncludesVat ? amount : roundMoney(netAmount + vatAmount);

  return {
    netAmount,
    domesticNet,
    foreignNet,
    vatBase: domesticNet,
    vatRate: TRANSPORT_VAT_RATE,
    vatAmount,
    grossAmount,
    domesticShare: share,
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
