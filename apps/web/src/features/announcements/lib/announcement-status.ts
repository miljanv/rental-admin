import type { AnnouncementDto } from '@rental-admin/shared';

export type AnnouncementStatus = 'SCHEDULED' | 'ACTIVE' | 'EXPIRED';

export const ANNOUNCEMENT_STATUS_LABELS: Record<AnnouncementStatus, string> = {
  SCHEDULED: 'Zakazano',
  ACTIVE: 'Aktivno',
  EXPIRED: 'Isteklo',
};

export const announcementStatus = (
  announcement: Pick<AnnouncementDto, 'startsAt' | 'endsAt'>,
  now: Date,
): AnnouncementStatus => {
  if (new Date(announcement.startsAt) > now) {
    return 'SCHEDULED';
  }

  if (announcement.endsAt && new Date(announcement.endsAt) <= now) {
    return 'EXPIRED';
  }

  return 'ACTIVE';
};
