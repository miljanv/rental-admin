import type { AbsenceAttestationDto } from './absence-attestation';
import type { DriverDocumentDto } from './driver-document';
import { addUtcDays } from './vehicle-inspection';

export const GENDERS = ['MALE', 'FEMALE'] as const;

export type Gender = (typeof GENDERS)[number];

export const GENDER_LABELS: Record<Gender, string> = {
  MALE: 'Muški',
  FEMALE: 'Ženski',
};

export const MA_EMPLOYMENT_KINDS = ['PERMANENT', 'FIXED_TERM'] as const;

export type MaEmploymentKind = (typeof MA_EMPLOYMENT_KINDS)[number];

export const MA_EMPLOYMENT_KIND_LABELS: Record<MaEmploymentKind, string> = {
  PERMANENT: 'Stalno',
  FIXED_TERM: 'Na određeno',
};

/** CROSO M/A header — this generator always files a registration, never an odjava/izmena. */
export const MA_REGISTRATION_TYPE = 'PRIJAVA' as const;

export type MaRegistrationType = typeof MA_REGISTRATION_TYPE;

/**
 * Next delovodni broj: the largest purely-numeric existing number + 1.
 * Stamped values like `MA-20260616-abc` are ignored so a paper sequence can start at 1.
 */
export const nextSequentialDocumentNumber = (existing: string[]): string => {
  let max = 0;

  for (const value of existing) {
    const trimmed = value.trim();
    if (/^\d+$/.test(trimmed)) {
      max = Math.max(max, Number(trimmed));
    }
  }

  return String(max + 1);
};

/** Day after the employment-contract signing date, at a daytime office hour. */
export const defaultMaRegisteredAt = (signedAt: string): string => {
  const date = addUtcDays(signedAt.slice(0, 10), 1);
  return `${date}T09:15`;
};

export interface GeneratedPdfDownload {
  downloadUrl: string;
  fileName: string;
  expiresIn: number;
}

export interface GeneratedDriverDocumentResult extends GeneratedPdfDownload {
  document: DriverDocumentDto;
}

export interface GeneratedAbsenceAttestationResult extends GeneratedPdfDownload {
  attestation: AbsenceAttestationDto;
}
