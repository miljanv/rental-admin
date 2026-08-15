export const ABSENCE_REASONS = [
  'SICK_LEAVE',
  'ANNUAL_LEAVE',
  'LEAVE_OR_REST',
  'OTHER',
] as const;

export type AbsenceReason = (typeof ABSENCE_REASONS)[number];

export const ABSENCE_REASON_LABELS: Record<AbsenceReason, string> = {
  SICK_LEAVE: 'Bolovanje',
  ANNUAL_LEAVE: 'Godišnji odmor',
  LEAVE_OR_REST: 'Odsustvo ili slobodni dani',
  OTHER: 'Drugo',
};

export interface AbsenceAttestationFileDto {
  id: string;
  originalName: string;
  mimeType: string;
  size: number;
}

export interface AbsenceAttestationDto {
  id: string;
  driverId: string;
  periodFrom: string;
  periodTo: string;
  reason: AbsenceReason;
  otherReason: string | null;
  place: string;
  issuedAt: string;
  startedWorkAt: string;
  file: AbsenceAttestationFileDto | null;
  createdAt: string;
  updatedAt: string;
}

export interface DeleteAbsenceAttestationResult {
  id: string;
  deleted: true;
}
