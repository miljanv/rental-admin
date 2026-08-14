import { z } from 'zod';

import { isoDateSchema } from './driver';
import { vehicleIdSchema } from './vehicle';
import { optionalFileId } from './vehicle-document';

export const tachographCalibrationIdSchema = z.string().trim().min(1).max(64);

export const tachographCalibrationParamsSchema = z.object({
  id: vehicleIdSchema,
  calibrationId: tachographCalibrationIdSchema,
});

export type TachographCalibrationParams = z.infer<typeof tachographCalibrationParamsSchema>;

/**
 * `expiresAt` is not part of the write payload — it is always computed
 * server-side from the vehicle's `tachographType` + `calibratedAt`.
 */
export const tachographCalibrationWriteSchema = z.object({
  calibratedAt: isoDateSchema,
  fileId: optionalFileId,
});

export type TachographCalibrationWriteInput = z.input<typeof tachographCalibrationWriteSchema>;
export type TachographCalibrationWriteRequest = z.output<typeof tachographCalibrationWriteSchema>;

export const expiringCalibrationsQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(365).default(30),
});

export type ExpiringCalibrationsQuery = z.output<typeof expiringCalibrationsQuerySchema>;
export type ExpiringCalibrationsQueryInput = z.input<typeof expiringCalibrationsQuerySchema>;
