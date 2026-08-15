import type { AbsenceAttestationDto } from './absence-attestation';
import type { DriverDocumentDto } from './driver-document';

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
