import {
  COMPANY,
  generateAbsenceAttestationSchema,
  type GenerateAbsenceAttestationInput,
} from '@rental-admin/shared';

import { localTodayIso } from '@/features/driver-documents/lib/document';

export const absenceAttestationFormSchema = generateAbsenceAttestationSchema;

export type AbsenceAttestationFormValues = GenerateAbsenceAttestationInput;

const localDateTime = (hour: string): string => `${localTodayIso()}T${hour}`;

export const EMPTY_ABSENCE_FORM: AbsenceAttestationFormValues = {
  periodFrom: localDateTime('08:00'),
  periodTo: localDateTime('16:00'),
  reason: 'LEAVE_OR_REST',
  otherReason: '',
  place: COMPANY.city,
  issuedAt: localTodayIso(),
  startedWorkAt: '',
  contractSignedAt: '',
  passportNumber: '',
};
