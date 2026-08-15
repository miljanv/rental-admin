import { z } from 'zod';

import { ABSENCE_REASONS } from '../types/absence-attestation';
import { COMPANY } from '../company';
import { driverIdSchema, isoDateSchema } from './driver';

export const absenceReasonSchema = z.enum(ABSENCE_REASONS);

export const absenceAttestationIdSchema = z.string().trim().min(1).max(64);

export const absenceAttestationParamsSchema = z.object({
  id: driverIdSchema,
  attestationId: absenceAttestationIdSchema,
});

export type AbsenceAttestationParams = z.infer<typeof absenceAttestationParamsSchema>;

const requiredText = (label: string, max: number) =>
  z
    .string()
    .trim()
    .min(1, `${label} je obavezno.`)
    .max(max, `${label} sme imati najviše ${max} karaktera.`);

const optionalText = (max: number) =>
  z
    .union([z.string().trim().max(max), z.literal(''), z.null()])
    .optional()
    .transform((value) => (value ? value : null));

/**
 * Wall-clock datetime from `<input type="datetime-local">`. Stored as UTC so
 * 19:30 stays 19:30 regardless of the API host timezone.
 */
export const isoDateTimeLocalSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, 'Datum i vreme moraju biti u formatu GGGG-MM-DDTHH:mm.')
  .refine((value) => {
    const date = new Date(`${value}:00.000Z`);
    return !Number.isNaN(date.getTime());
  }, 'Unesite ispravan datum i vreme.');

export const generateAbsenceAttestationSchema = z
  .object({
    periodFrom: isoDateTimeLocalSchema,
    periodTo: isoDateTimeLocalSchema,
    reason: absenceReasonSchema,
    otherReason: optionalText(200),
    place: requiredText('Mesto', 80).default(COMPANY.city),
    issuedAt: isoDateSchema,
    startedWorkAt: isoDateSchema,
    passportNumber: optionalText(40),
  })
  .superRefine((value, ctx) => {
    if (value.periodTo <= value.periodFrom) {
      ctx.addIssue({
        code: 'custom',
        path: ['periodTo'],
        message: 'Kraj perioda mora biti posle početka.',
      });
    }

    if (value.reason === 'OTHER' && !value.otherReason) {
      ctx.addIssue({
        code: 'custom',
        path: ['otherReason'],
        message: 'Opišite razlog odsustva.',
      });
    }

    if (value.reason !== 'OTHER' && value.otherReason) {
      ctx.addIssue({
        code: 'custom',
        path: ['otherReason'],
        message: 'Opis važi samo za razlog „drugo“.',
      });
    }
  });

export type GenerateAbsenceAttestationInput = z.input<typeof generateAbsenceAttestationSchema>;
export type GenerateAbsenceAttestationRequest = z.output<typeof generateAbsenceAttestationSchema>;
