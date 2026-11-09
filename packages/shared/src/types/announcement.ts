/** Mirrors the `AnnouncementKind` Prisma enum. */
export const ANNOUNCEMENT_KINDS = ['INFO', 'WARNING'] as const;

export type AnnouncementKind = (typeof ANNOUNCEMENT_KINDS)[number];

export const ANNOUNCEMENT_KIND_LABELS: Record<AnnouncementKind, string> = {
  INFO: 'Informacija',
  WARNING: 'Upozorenje',
};

/** A banner as the superadmin manages it. */
export interface AnnouncementDto {
  id: string;
  message: string;
  kind: AnnouncementKind;
  startsAt: string;
  /** Null keeps it up until someone deletes it or sets an end. */
  endsAt: string | null;
  allOrganizations: boolean;
  /** The targeted organizations; empty when `allOrganizations`. */
  organizations: { id: string; name: string }[];
  createdBy: { id: string; username: string } | null;
  createdAt: string;
}

/** A banner as a signed-in user sees it. */
export interface ActiveAnnouncementDto {
  id: string;
  message: string;
  kind: AnnouncementKind;
}
