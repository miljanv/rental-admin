export const DRIVER_DOCUMENT_TYPES = [
  'EMPLOYMENT_CONTRACT',
  'MEDICAL_CERTIFICATE',
  'ACCREDITATION',
  'DRIVING_LICENSE',
  'LICENSE',
] as const;

export type DriverDocumentType = (typeof DRIVER_DOCUMENT_TYPES)[number];

export const DRIVER_DOCUMENT_TYPE_LABELS: Record<DriverDocumentType, string> = {
  EMPLOYMENT_CONTRACT: 'Ugovor o radu',
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

export interface DriverDocumentFileDto {
  id: string;
  originalName: string;
  mimeType: string;
  size: number;
}

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
