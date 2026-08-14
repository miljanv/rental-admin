import { z } from 'zod';

import { DRIVER_DOCUMENT_TYPES, EMPLOYMENT_CONTRACT_TYPES } from '../types/driver-document';
import { driverIdSchema, isoDateSchema } from './driver';

export const driverDocumentTypeSchema = z.enum(DRIVER_DOCUMENT_TYPES);
export const employmentContractTypeSchema = z.enum(EMPLOYMENT_CONTRACT_TYPES);

export const driverDocumentIdSchema = z.string().trim().min(1).max(64);

export const driverDocumentParamsSchema = z.object({
  id: driverIdSchema,
  documentId: driverDocumentIdSchema,
});

export type DriverDocumentParams = z.infer<typeof driverDocumentParamsSchema>;

const requiredText = (label: string, max: number) =>
  z
    .string()
    .trim()
    .min(1, `${label} je obavezno.`)
    .max(max, `${label} sme imati najviše ${max} karaktera.`);

const optionalId = z
  .union([z.string().trim().min(1).max(64), z.literal(''), z.null()])
  .optional()
  .transform((value) => (value ? value : null));

const optionalIsoDate = z
  .union([isoDateSchema, z.literal(''), z.null()])
  .optional()
  .transform((value) => (value ? value : null));

const optionalContractType = z
  .union([employmentContractTypeSchema, z.literal(''), z.null()])
  .optional()
  .transform((value) => (value ? value : null));

export const driverDocumentWriteSchema = z
  .object({
    type: driverDocumentTypeSchema,
    documentNumber: requiredText('Broj dokumenta', 80),
    issuedAt: isoDateSchema,
    expiresAt: optionalIsoDate,
    employmentContractType: optionalContractType,
    fileId: optionalId,
  })
  .superRefine((value, ctx) => {
    if (value.type === 'EMPLOYMENT_CONTRACT') {
      if (!value.employmentContractType) {
        ctx.addIssue({
          code: 'custom',
          path: ['employmentContractType'],
          message: 'Tip ugovora je obavezan za ugovor o radu.',
        });
      }

      if (value.employmentContractType === 'INDEFINITE' && value.expiresAt) {
        ctx.addIssue({
          code: 'custom',
          path: ['expiresAt'],
          message: 'Ugovor na neodređeno nema datum isteka.',
        });
      }

      if (value.employmentContractType === 'FIXED_TERM' && !value.expiresAt) {
        ctx.addIssue({
          code: 'custom',
          path: ['expiresAt'],
          message: 'Ugovor na određeno mora imati datum isteka.',
        });
      }

      return;
    }

    if (value.employmentContractType) {
      ctx.addIssue({
        code: 'custom',
        path: ['employmentContractType'],
        message: 'Tip ugovora važi samo za ugovor o radu.',
      });
    }
  });

export type DriverDocumentWriteInput = z.input<typeof driverDocumentWriteSchema>;
export type DriverDocumentWriteRequest = z.output<typeof driverDocumentWriteSchema>;

export const expiringDocumentsQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(365).default(30),
});

export type ExpiringDocumentsQuery = z.output<typeof expiringDocumentsQuerySchema>;
export type ExpiringDocumentsQueryInput = z.input<typeof expiringDocumentsQuerySchema>;
