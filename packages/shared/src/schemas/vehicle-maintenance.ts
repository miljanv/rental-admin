import { z } from 'zod';

import { isoDateSchema } from './driver';
import { vehicleIdSchema } from './vehicle';

export const vehicleMaintenanceIdSchema = z.string().trim().min(1).max(64);

export const vehicleMaintenanceParamsSchema = z.object({
  id: vehicleIdSchema,
  maintenanceId: vehicleMaintenanceIdSchema,
});

export type VehicleMaintenanceParams = z.infer<typeof vehicleMaintenanceParamsSchema>;

const requiredText = (label: string, max: number) =>
  z
    .string()
    .trim()
    .min(1, `${label} je obavezno.`)
    .max(max, `${label} sme imati najviše ${max} karaktera.`);

export const vehicleMaintenanceWriteSchema = z.object({
  date: isoDateSchema,
  odometerKm: z
    .number()
    .int('Km na satu mora biti ceo broj.')
    .min(0, 'Km na satu ne može biti negativno.')
    .max(10_000_000, 'Km na satu nije ispravno.'),
  partName: requiredText('Naziv dela', 120),
  supplier: requiredText('Dobavljač', 120),
  cost: z
    .number()
    .min(0, 'Cena ne može biti negativna.')
    .max(10_000_000, 'Cena nije ispravna.'),
  mechanic: requiredText('Majstor', 120),
});

export type VehicleMaintenanceWriteInput = z.input<typeof vehicleMaintenanceWriteSchema>;
export type VehicleMaintenanceWriteRequest = z.output<typeof vehicleMaintenanceWriteSchema>;

export const listVehicleMaintenanceQuerySchema = z.object({
  from: isoDateSchema.optional(),
  to: isoDateSchema.optional(),
  supplier: z.string().trim().min(1).max(120).optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type ListVehicleMaintenanceQuery = z.output<typeof listVehicleMaintenanceQuerySchema>;
export type ListVehicleMaintenanceQueryInput = z.input<typeof listVehicleMaintenanceQuerySchema>;

/**
 * Not vehicle-scoped by path — `vehicleId` is an optional filter so the same
 * endpoint can answer "cost for this vehicle", "cost this quarter fleet-wide",
 * or "cost by supplier", the three axes the task calls for.
 */
export const maintenanceCostSummaryQuerySchema = z.object({
  vehicleId: vehicleIdSchema.optional(),
  from: isoDateSchema.optional(),
  to: isoDateSchema.optional(),
  supplier: z.string().trim().min(1).max(120).optional(),
});

export type MaintenanceCostSummaryQuery = z.output<typeof maintenanceCostSummaryQuerySchema>;
export type MaintenanceCostSummaryQueryInput = z.input<typeof maintenanceCostSummaryQuerySchema>;
