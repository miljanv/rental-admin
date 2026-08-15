import { z } from 'zod';

import { PASSENGER_LIST_TYPES } from '../types/passenger-list';
import { contractIdSchema } from './contract';

export const passengerListTypeSchema = z.enum(PASSENGER_LIST_TYPES);

export const passengerListIdSchema = z.string().trim().min(1).max(64);

export const passengerListParamsSchema = z.object({
  id: contractIdSchema,
  listId: passengerListIdSchema,
});

export type PassengerListParams = z.infer<typeof passengerListParamsSchema>;

export const passengerIdSchema = z.string().trim().min(1).max(64);

export const passengerParamsSchema = z.object({
  id: contractIdSchema,
  listId: passengerListIdSchema,
  passengerId: passengerIdSchema,
});

export type PassengerParams = z.infer<typeof passengerParamsSchema>;

export const passengerListWriteSchema = z.object({ type: passengerListTypeSchema });

export type PassengerListWriteRequest = z.output<typeof passengerListWriteSchema>;

const requiredText = (label: string, max: number) =>
  z
    .string()
    .trim()
    .min(1, `${label} je obavezno.`)
    .max(max, `${label} sme imati najviše ${max} karaktera.`);

export const passengerWriteSchema = z.object({
  firstName: requiredText('Ime', 80),
  lastName: requiredText('Prezime', 80),
  documentNumber: requiredText('Broj dokumenta', 40),
});

export type PassengerWriteInput = z.input<typeof passengerWriteSchema>;
export type PassengerWriteRequest = z.output<typeof passengerWriteSchema>;
