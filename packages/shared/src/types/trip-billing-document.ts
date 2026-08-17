import type { AttachedFileDto } from './file';
import type { GeneratedPdfDownload } from './generated-document';

export const TRIP_BILLING_DOCUMENT_TYPES = ['PREDRACUN', 'RACUN'] as const;

export type TripBillingDocumentType = (typeof TRIP_BILLING_DOCUMENT_TYPES)[number];

export const TRIP_BILLING_DOCUMENT_TYPE_LABELS: Record<TripBillingDocumentType, string> = {
  PREDRACUN: 'Predračun',
  RACUN: 'Račun',
};

/**
 * Internal record-keeping documents — not fiscal invoices. If real
 * fiscalization (SEF e-fakture / fiskalna kasa) is ever needed, that's a
 * separate integration, not this.
 */
export interface TripBillingDocumentDto {
  id: string;
  tripId: string;
  type: TripBillingDocumentType;
  documentNumber: string;
  issuedAt: string;
  file: AttachedFileDto | null;
  createdAt: string;
  updatedAt: string;
}

export interface GeneratedTripBillingDocumentResult extends GeneratedPdfDownload {
  document: TripBillingDocumentDto;
}
