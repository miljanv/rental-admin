import { z } from 'zod';

import { SAFETY_EQUIPMENT_TYPES } from '../types/vehicle-safety-equipment';
import { isoDateSchema } from './driver';
import { vehicleIdSchema } from './vehicle';

export const safetyEquipmentTypeSchema = z.enum(SAFETY_EQUIPMENT_TYPES);

export const vehicleSafetyEquipmentIdSchema = z.string().trim().min(1).max(64);

export const vehicleSafetyEquipmentParamsSchema = z.object({
  id: vehicleIdSchema,
  equipmentId: vehicleSafetyEquipmentIdSchema,
});

export type VehicleSafetyEquipmentParams = z.infer<typeof vehicleSafetyEquipmentParamsSchema>;

const optionalIsoDate = z
  .union([isoDateSchema, z.literal(''), z.null()])
  .optional()
  .transform((value) => (value ? value : null));

/**
 * `expiresAt` behavior depends on `type`:
 * - FIRE_EXTINGUISHER: always computed server-side (checkedAt + 180 days) —
 *   a client-supplied value is rejected.
 * - FIRST_AID_KIT: no fixed interval, always manual (printed on the box) —
 *   required.
 */
export const vehicleSafetyEquipmentWriteSchema = z
  .object({
    type: safetyEquipmentTypeSchema,
    checkedAt: isoDateSchema,
    expiresAt: optionalIsoDate,
  })
  .superRefine((value, ctx) => {
    if (value.type === 'FIRST_AID_KIT' && !value.expiresAt) {
      ctx.addIssue({
        code: 'custom',
        path: ['expiresAt'],
        message: 'Datum isteka je obavezan za prvu pomoć (piše na kutiji).',
      });
    }

    if (value.type === 'FIRE_EXTINGUISHER' && value.expiresAt) {
      ctx.addIssue({
        code: 'custom',
        path: ['expiresAt'],
        message: 'Rok za PP aparat se računa automatski (+180 dana), ne unosi se ručno.',
      });
    }
  });

export type VehicleSafetyEquipmentWriteInput = z.input<typeof vehicleSafetyEquipmentWriteSchema>;
export type VehicleSafetyEquipmentWriteRequest = z.output<typeof vehicleSafetyEquipmentWriteSchema>;

export const expiringSafetyEquipmentQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(365).default(30),
});

export type ExpiringSafetyEquipmentQuery = z.output<typeof expiringSafetyEquipmentQuerySchema>;
export type ExpiringSafetyEquipmentQueryInput = z.input<typeof expiringSafetyEquipmentQuerySchema>;
