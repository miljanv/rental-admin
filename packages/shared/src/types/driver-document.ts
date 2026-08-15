import type { AttachedFileDto } from './file';

export const DRIVER_DOCUMENT_TYPES = [
  'EMPLOYMENT_CONTRACT',
  'MA_FORM',
  'MEDICAL_CERTIFICATE',
  'ACCREDITATION',
  'DRIVING_LICENSE',
  'LICENSE',
] as const;

export type DriverDocumentType = (typeof DRIVER_DOCUMENT_TYPES)[number];

export const DRIVER_DOCUMENT_TYPE_LABELS: Record<DriverDocumentType, string> = {
  EMPLOYMENT_CONTRACT: 'Ugovor o radu',
  MA_FORM: 'Obrazac MA',
  MEDICAL_CERTIFICATE: 'Lekarski',
  ACCREDITATION: 'Akreditacija',
  DRIVING_LICENSE: 'Vozačka dozvola',
  LICENSE: 'Licenca',
};

export const EMPLOYMENT_CONTRACT_TYPES = ['FIXED_TERM', 'INDEFINITE'] as const;

export type EmploymentContractType = (typeof EMPLOYMENT_CONTRACT_TYPES)[number];

export const EMPLOYMENT_CONTRACT_TYPE_LABELS: Record<EmploymentContractType, string> = {
  FIXED_TERM: 'Određeno',
  INDEFINITE: 'Neodređeno',
};

export type DocumentExpiryUrgency = 'expired' | 'critical' | 'warning' | 'ok' | 'none';

export type DriverDocumentFileDto = AttachedFileDto;

export interface DriverDocumentDto {
  id: string;
  driverId: string;
  type: DriverDocumentType;
  documentNumber: string;
  issuedAt: string;
  expiresAt: string | null;
  employmentContractType: EmploymentContractType | null;
  file: DriverDocumentFileDto | null;
  createdAt: string;
  updatedAt: string;
}

export interface DriverDocumentStatusItem {
  type: DriverDocumentType;
  document: DriverDocumentDto | null;
}

export interface ExpiringDriverDocumentDto extends DriverDocumentDto {
  driver: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

export interface DeleteDriverDocumentResult {
  id: string;
  deleted: true;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const toUtcDate = (isoDate: string): number => Date.parse(`${isoDate.slice(0, 10)}T00:00:00.000Z`);

/** Calendar days from `todayIso` until expiry. Negative means already expired. */
export const daysUntilExpiry = (expiresAt: string, todayIso: string): number =>
  Math.round((toUtcDate(expiresAt) - toUtcDate(todayIso)) / MS_PER_DAY);

export const getDocumentExpiryUrgency = (
  expiresAt: string | null,
  todayIso: string,
): DocumentExpiryUrgency => {
  if (!expiresAt) {
    return 'none';
  }

  const days = daysUntilExpiry(expiresAt, todayIso);

  if (days < 0) {
    return 'expired';
  }

  if (days <= 7) {
    return 'critical';
  }

  if (days <= 30) {
    return 'warning';
  }

  return 'ok';
};

const URGENCY_RANK: Record<DocumentExpiryUrgency, number> = {
  expired: 0,
  critical: 1,
  warning: 2,
  ok: 3,
  none: 4,
};

/** Expired first, then soonest expiry. Documents without a date sort last. */
export const compareDocumentUrgency = (
  leftExpiresAt: string | null,
  rightExpiresAt: string | null,
  todayIso: string,
): number => {
  const left = getDocumentExpiryUrgency(leftExpiresAt, todayIso);
  const right = getDocumentExpiryUrgency(rightExpiresAt, todayIso);
  const rank = URGENCY_RANK[left] - URGENCY_RANK[right];

  if (rank !== 0) {
    return rank;
  }

  if (!leftExpiresAt || !rightExpiresAt) {
    return 0;
  }

  return daysUntilExpiry(leftExpiresAt, todayIso) - daysUntilExpiry(rightExpiresAt, todayIso);
};

/** Most recently issued document of each type, then sorted by expiry urgency. */
export const toDocumentStatusItems = (
  documents: DriverDocumentDto[],
  todayIso: string,
): DriverDocumentStatusItem[] => {
  const latestByType = new Map<DriverDocumentType, DriverDocumentDto>();

  for (const document of documents) {
    const current = latestByType.get(document.type);

    if (!current || document.issuedAt > current.issuedAt) {
      latestByType.set(document.type, document);
    }
  }

  return DRIVER_DOCUMENT_TYPES.map((type) => ({
    type,
    document: latestByType.get(type) ?? null,
  })).sort((left, right) => {
    const leftExpiry = left.document?.expiresAt ?? null;
    const rightExpiry = right.document?.expiresAt ?? null;

    return compareDocumentUrgency(leftExpiry, rightExpiry, todayIso);
  });
};
