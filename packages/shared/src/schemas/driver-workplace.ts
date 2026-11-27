import { z } from 'zod';

import { DRIVER_EXPENSE_PAYMENT_METHODS } from '../types/driver-portal';
import {
  DRIVER_FUEL_ENTRY_STATUSES,
  DRIVER_TOOL_STATUSES,
  VEHICLE_FAULT_STATUSES,
} from '../types/driver-workplace';
import { FUEL_LOG_FUEL_TYPES } from '../types/fuel-log';
import { driverIdSchema, isoDateSchema } from './driver';
import { vehicleIdSchema } from './vehicle';
import { optionalFileId } from './vehicle-document';

const recordIdSchema = z.string().trim().min(1, 'Unos je obavezan.').max(64);

const optionalText = (max: number, label: string) =>
  z
    .union([
      z.string().trim().max(max, `${label} sme imati najviše ${max} karaktera.`),
      z.literal(''),
      z.null(),
    ])
    .optional()
    .transform((value) => (value ? value : null));

const optionalVehicleId = z
  .union([vehicleIdSchema, z.literal(''), z.null()])
  .optional()
  .transform((value) => (value ? value : null));

const odometerSchema = z
  .number({ error: 'Unesite stanje km sata.' })
  .int('Stanje km sata mora biti ceo broj.')
  .min(0, 'Stanje km sata ne može biti negativno.')
  .max(9_999_999, 'Stanje km sata nije ispravno.');

const localDateTimeSchema = z
  .string({ error: 'Unesite datum i vreme.' })
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, 'Unesite datum i vreme.');

// ---------------------------------------------------------------------------
// Faults
// ---------------------------------------------------------------------------

/** A driver reports a fault from the portal. */
export const vehicleFaultCreateSchema = z.object({
  vehicleId: vehicleIdSchema.min(1, 'Izaberite vozilo.'),
  reportedAt: isoDateSchema,
  odometerKm: odometerSchema,
  description: z
    .string()
    .trim()
    .min(5, 'Opišite kvar u par reči.')
    .max(2000, 'Opis sme imati najviše 2000 karaktera.'),
  fileId: optionalFileId,
});

export type VehicleFaultCreateInput = z.input<typeof vehicleFaultCreateSchema>;
export type VehicleFaultCreateRequest = z.output<typeof vehicleFaultCreateSchema>;

/** The office moves a fault along and leaves a note for the driver. */
export const vehicleFaultUpdateSchema = z.object({
  status: z.enum(VEHICLE_FAULT_STATUSES),
  officeNote: optionalText(1000, 'Napomena'),
});

export type VehicleFaultUpdateRequest = z.output<typeof vehicleFaultUpdateSchema>;

export const vehicleFaultListQuerySchema = z.object({
  status: z.enum(VEHICLE_FAULT_STATUSES).optional(),
  vehicleId: vehicleIdSchema.optional(),
});

export type VehicleFaultListQuery = z.output<typeof vehicleFaultListQuerySchema>;

export const vehicleFaultParamsSchema = z.object({ id: recordIdSchema });
export type VehicleFaultParams = z.output<typeof vehicleFaultParamsSchema>;

// ---------------------------------------------------------------------------
// Tools
// ---------------------------------------------------------------------------

const toolFields = {
  name: z
    .string()
    .trim()
    .min(1, 'Unesite naziv alata.')
    .max(120, 'Naziv sme imati najviše 120 karaktera.'),
  quantity: z
    .number({ error: 'Unesite količinu.' })
    .int('Količina mora biti ceo broj.')
    .min(1, 'Količina mora biti najmanje 1.')
    .max(999, 'Količina nije ispravna.'),
  vehicleId: optionalVehicleId,
  note: optionalText(500, 'Napomena'),
};

/** The office lists a tool on a driver. */
export const driverToolWriteSchema = z.object({
  ...toolFields,
  assignedAt: isoDateSchema,
});

export type DriverToolWriteInput = z.input<typeof driverToolWriteSchema>;
export type DriverToolWriteRequest = z.output<typeof driverToolWriteSchema>;

/** The driver writes down a tool they took that the office has not listed. */
export const driverPortalToolCreateSchema = z.object(toolFields);

export type DriverPortalToolCreateInput = z.input<typeof driverPortalToolCreateSchema>;
export type DriverPortalToolCreateRequest = z.output<typeof driverPortalToolCreateSchema>;

export const driverToolRespondSchema = z.object({
  action: z.enum(['CONFIRM', 'DECLINE']),
});

export type DriverToolRespondRequest = z.output<typeof driverToolRespondSchema>;

/** The driver reports a tool lost: when and how. */
export const driverToolLostSchema = z.object({
  lostAt: isoDateSchema,
  lostNote: z
    .string()
    .trim()
    .min(3, 'Napišite kako je alat izgubljen.')
    .max(500, 'Napomena sme imati najviše 500 karaktera.'),
});

export type DriverToolLostInput = z.input<typeof driverToolLostSchema>;
export type DriverToolLostRequest = z.output<typeof driverToolLostSchema>;

/** Office: accept a tool the driver entered, or take a tool back. */
export const driverToolOfficeActionSchema = z.object({
  action: z.enum(['CONFIRM', 'RETURN']),
});

export type DriverToolOfficeActionRequest = z.output<typeof driverToolOfficeActionSchema>;

export const driverToolParamsSchema = z.object({ id: driverIdSchema, toolId: recordIdSchema });
export type DriverToolParams = z.output<typeof driverToolParamsSchema>;

export const driverPortalToolParamsSchema = z.object({ toolId: recordIdSchema });
export type DriverPortalToolParams = z.output<typeof driverPortalToolParamsSchema>;

export const driverToolStatusSchema = z.enum(DRIVER_TOOL_STATUSES);

// ---------------------------------------------------------------------------
// Free diesel entries
// ---------------------------------------------------------------------------

/** Diesel the driver filled outside an assigned trip. */
export const driverFuelEntryCreateSchema = z
  .object({
    vehicleId: vehicleIdSchema.min(1, 'Izaberite vozilo.'),
    fueledAt: localDateTimeSchema,
    odometerKm: odometerSchema,
    liters: z
      .number({ error: 'Unesite litre.' })
      .positive('Litri moraju biti veći od nule.')
      .max(2000, 'Litri nisu ispravni.'),
    amount: z
      .number({ error: 'Unesite iznos.' })
      .positive('Iznos mora biti veći od nule.')
      .max(10_000_000, 'Iznos nije ispravan.'),
    fuelType: z.enum(FUEL_LOG_FUEL_TYPES).default('DIESEL'),
    paymentMethod: z.enum(DRIVER_EXPENSE_PAYMENT_METHODS),
    paymentCardId: z
      .union([z.string().trim().min(1).max(64), z.literal(''), z.null()])
      .optional()
      .transform((value) => (value ? value : null)),
    fileId: optionalFileId,
    note: optionalText(500, 'Napomena'),
  })
  .transform((value) => ({
    ...value,
    paymentCardId: value.paymentMethod === 'COMPANY_CARD' ? value.paymentCardId : null,
  }));

export type DriverFuelEntryCreateInput = z.input<typeof driverFuelEntryCreateSchema>;
export type DriverFuelEntryCreateRequest = z.output<typeof driverFuelEntryCreateSchema>;

export const driverFuelEntryReviewSchema = z
  .object({
    action: z.enum(['ACCEPT', 'REJECT']),
    rejectionReason: optionalText(500, 'Razlog'),
  })
  .refine((value) => value.action === 'ACCEPT' || Boolean(value.rejectionReason), {
    message: 'Napišite vozaču zašto je unos odbijen.',
    path: ['rejectionReason'],
  });

export type DriverFuelEntryReviewRequest = z.output<typeof driverFuelEntryReviewSchema>;

export const driverFuelEntryListQuerySchema = z.object({
  status: z.enum(DRIVER_FUEL_ENTRY_STATUSES).optional(),
});

export type DriverFuelEntryListQuery = z.output<typeof driverFuelEntryListQuerySchema>;

export const driverFuelEntryParamsSchema = z.object({ id: recordIdSchema });
export type DriverFuelEntryParams = z.output<typeof driverFuelEntryParamsSchema>;
