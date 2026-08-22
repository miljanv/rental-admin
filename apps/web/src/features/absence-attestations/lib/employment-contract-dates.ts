import type { DriverDocumentDto } from '@rental-admin/shared';

const isoDate = (value: unknown): string =>
  typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value) ? value.slice(0, 10) : '';

/** Latest generated employment contract — start of work and signing date. */
export const employmentContractDates = (
  documents: DriverDocumentDto[],
): { startsAt: string; signedAt: string } => {
  const latest = documents
    .filter((document) => document.type === 'EMPLOYMENT_CONTRACT')
    .reduce<DriverDocumentDto | null>((current, document) => {
      if (!current || document.issuedAt > current.issuedAt) {
        return document;
      }

      return current;
    }, null);

  const data = latest?.generationData ?? {};

  return {
    startsAt: isoDate(data.startsAt),
    signedAt: isoDate(data.signedAt),
  };
};
