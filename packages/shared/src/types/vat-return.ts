export const VAT_RETURN_KINDS = ['PAYABLE', 'REFUND'] as const;

export type VatReturnKind = (typeof VAT_RETURN_KINDS)[number];

export const VAT_RETURN_KIND_LABELS: Record<VatReturnKind, string> = {
  PAYABLE: 'Za uplatu',
  REFUND: 'Za povraćaj',
};

/** A filed monthly VAT return and how much of it has been paid or refunded so far. */
export interface VatReturnDto {
  id: string;
  year: number;
  month: number;
  kind: VatReturnKind;
  amount: number;
  documentNumber: string | null;
  filedAt: string | null;
  note: string | null;
  /** Paid to the state (PAYABLE) or received back (REFUND) through linked VAT transactions. */
  settledAmount: number;
  openAmount: number;
  createdAt: string;
  updatedAt: string;
}

export interface DeleteVatReturnResult {
  id: string;
  deleted: true;
}
