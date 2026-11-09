import {
  ANNOUNCEMENT_KINDS,
  ANNOUNCEMENT_MESSAGE_MAX_LENGTH,
  type AnnouncementDto,
  type AnnouncementWriteRequest,
} from '@rental-admin/shared';
import { z } from 'zod';

const LOCAL_DATE_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

/** `yyyy-mm-ddThh:mm` in the browser's time zone, as the date-time field edits it. */
export const toLocalDateTime = (iso: string): string => {
  const date = new Date(iso);
  const pad = (value: number): string => String(value).padStart(2, '0');

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

/** A local date-time read in the browser's time zone, sent as an instant. */
const toInstant = (local: string): string => new Date(local).toISOString();

export const announcementFormSchema = z
  .object({
    message: z
      .string()
      .trim()
      .min(1, 'Unesite tekst obaveštenja.')
      .max(ANNOUNCEMENT_MESSAGE_MAX_LENGTH, 'Obaveštenje je predugačko.'),
    kind: z.enum(ANNOUNCEMENT_KINDS),
    startsAt: z.string().regex(LOCAL_DATE_TIME, 'Unesite početak.'),
    endsAt: z.union([z.literal(''), z.string().regex(LOCAL_DATE_TIME, 'Kraj nije ispravan.')]),
    allOrganizations: z.boolean(),
    organizationIds: z.array(z.string()),
  })
  .refine((value) => !value.endsAt || value.endsAt > value.startsAt, {
    path: ['endsAt'],
    message: 'Kraj mora biti posle početka.',
  })
  .refine((value) => value.allOrganizations || value.organizationIds.length > 0, {
    path: ['organizationIds'],
    message: 'Izaberite bar jednu firmu.',
  });

export type AnnouncementFormValues = z.output<typeof announcementFormSchema>;

export const toAnnouncementFormValues = (
  announcement: AnnouncementDto | null,
  now: Date,
): AnnouncementFormValues => ({
  message: announcement?.message ?? '',
  kind: announcement?.kind ?? 'INFO',
  startsAt: toLocalDateTime(announcement?.startsAt ?? now.toISOString()),
  endsAt: announcement?.endsAt ? toLocalDateTime(announcement.endsAt) : '',
  allOrganizations: announcement?.allOrganizations ?? true,
  organizationIds: announcement?.organizations.map((organization) => organization.id) ?? [],
});

export const toAnnouncementRequest = (
  values: AnnouncementFormValues,
): AnnouncementWriteRequest => ({
  message: values.message,
  kind: values.kind,
  startsAt: toInstant(values.startsAt),
  endsAt: values.endsAt ? toInstant(values.endsAt) : null,
  allOrganizations: values.allOrganizations,
  organizationIds: values.allOrganizations ? [] : values.organizationIds,
});
