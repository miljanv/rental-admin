import { z } from 'zod';

import { ANNOUNCEMENT_KINDS } from '../types/announcement';

export const ANNOUNCEMENT_MESSAGE_MAX_LENGTH = 500;

const instantSchema = z.iso.datetime({ message: 'Datum i vreme nisu ispravni.' });

export const announcementWriteSchema = z
  .object({
    message: z
      .string()
      .trim()
      .min(1, 'Unesite tekst obaveštenja.')
      .max(ANNOUNCEMENT_MESSAGE_MAX_LENGTH, 'Obaveštenje je predugačko.'),
    kind: z.enum(ANNOUNCEMENT_KINDS),
    startsAt: instantSchema,
    endsAt: instantSchema.nullable(),
    allOrganizations: z.boolean(),
    organizationIds: z.array(z.string().trim().min(1).max(64)).max(500),
  })
  .refine((value) => !value.endsAt || Date.parse(value.endsAt) > Date.parse(value.startsAt), {
    path: ['endsAt'],
    message: 'Kraj mora biti posle početka.',
  })
  .refine((value) => value.allOrganizations || value.organizationIds.length > 0, {
    path: ['organizationIds'],
    message: 'Izaberite bar jednu firmu.',
  });

export type AnnouncementWriteRequest = z.output<typeof announcementWriteSchema>;

export const announcementIdParamsSchema = z.object({
  id: z.string().trim().min(1).max(64),
});

export type AnnouncementIdParams = z.output<typeof announcementIdParamsSchema>;
