import { z } from 'zod';

import { VEHICLE_DOCUMENT_TYPES } from '../types/vehicle-document';
import { isoDateSchema } from './driver';
import { vehicleIdSchema } from './vehicle';

export const vehicleDocumentTypeSchema = z.enum(VEHICLE_DOCUMENT_TYPES);

export const vehicleDocumentIdSchema = z.string().trim().min(1).max(64);

export const vehicleDocumentParamsSchema = z.object({
  id: vehicleIdSchema,
  documentId: vehicleDocumentIdSchema,
});

export type VehicleDocumentParams = z.infer<typeof vehicleDocumentParamsSchema>;

export const optionalFileId = z
  .union([z.string().trim().min(1).max(64), z.literal(''), z.null()])
  .optional()
  .transform((value) => (value ? value : null));

const optionalIsoDate = z
  .union([isoDateSchema, z.literal(''), z.null()])
  .optional()
  .transform((value) => (value ? value : null));

export const vehicleDocumentWriteSchema = z.object({
  type: vehicleDocumentTypeSchema,
  issuedAt: optionalIsoDate,
  fileId: optionalFileId,
});

export type VehicleDocumentWriteInput = z.input<typeof vehicleDocumentWriteSchema>;
export type VehicleDocumentWriteRequest = z.output<typeof vehicleDocumentWriteSchema>;
