import { z } from 'zod';

import { VEHICLE_INSPECTION_TYPES } from '../types/vehicle-inspection';
import { isoDateSchema } from './driver';
import { vehicleIdSchema } from './vehicle';
import { optionalFileId } from './vehicle-document';

export const vehicleInspectionTypeSchema = z.enum(VEHICLE_INSPECTION_TYPES);

export const vehicleInspectionIdSchema = z.string().trim().min(1).max(64);

export const vehicleInspectionParamsSchema = z.object({
  id: vehicleIdSchema,
  inspectionId: vehicleInspectionIdSchema,
});

export type VehicleInspectionParams = z.infer<typeof vehicleInspectionParamsSchema>;

/**
 * `expiresAt` is deliberately not part of the write payload — it is always
 * computed server-side from `type` + `inspectedAt` (see `computeInspectionExpiry`).
 * The form shows the same computation client-side as a live preview only.
 */
export const vehicleInspectionWriteSchema = z.object({
  type: vehicleInspectionTypeSchema,
  inspectedAt: isoDateSchema,
  fileId: optionalFileId,
});

export type VehicleInspectionWriteInput = z.input<typeof vehicleInspectionWriteSchema>;
export type VehicleInspectionWriteRequest = z.output<typeof vehicleInspectionWriteSchema>;

export const expiringInspectionsQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(365).default(30),
});

export type ExpiringInspectionsQuery = z.output<typeof expiringInspectionsQuerySchema>;
export type ExpiringInspectionsQueryInput = z.input<typeof expiringInspectionsQuerySchema>;
