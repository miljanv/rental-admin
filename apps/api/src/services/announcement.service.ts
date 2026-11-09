import type {
  ActiveAnnouncementDto,
  AnnouncementDto,
  AnnouncementWriteRequest,
} from '@rental-admin/shared';

import { prismaUnscoped } from '../config/prisma';
import type { Prisma } from '../generated/prisma/client';
import { badRequest, notFound } from '../utils/app-error';
import { getTenantContext } from '../utils/tenant-context';

const NOT_FOUND_MESSAGE = 'Obaveštenje nije pronađeno.';

const announcementInclude = {
  organizations: { select: { organization: { select: { id: true, name: true } } } },
  createdBy: { select: { id: true, username: true } },
} as const;

type AnnouncementRecord = Prisma.AnnouncementGetPayload<{ include: typeof announcementInclude }>;

const toAnnouncementDto = (record: AnnouncementRecord): AnnouncementDto => ({
  id: record.id,
  message: record.message,
  kind: record.kind,
  startsAt: record.startsAt.toISOString(),
  endsAt: record.endsAt?.toISOString() ?? null,
  allOrganizations: record.allOrganizations,
  organizations: record.organizations
    .map(({ organization }) => organization)
    .sort((a, b) => a.name.localeCompare(b.name, 'sr')),
  createdBy: record.createdBy,
  createdAt: record.createdAt.toISOString(),
});

/** The targeted organizations, deduplicated; refuses ids that do not exist. */
const resolveTargets = async (input: AnnouncementWriteRequest): Promise<string[]> => {
  if (input.allOrganizations) {
    return [];
  }

  const ids = [...new Set(input.organizationIds)];
  const found = await prismaUnscoped.organization.count({ where: { id: { in: ids } } });

  if (found !== ids.length) {
    throw badRequest('Neka od izabranih firmi ne postoji.');
  }

  return ids;
};

const toData = (input: AnnouncementWriteRequest) => ({
  message: input.message,
  kind: input.kind,
  startsAt: new Date(input.startsAt),
  endsAt: input.endsAt ? new Date(input.endsAt) : null,
  allOrganizations: input.allOrganizations,
});

export const listAnnouncements = async (): Promise<AnnouncementDto[]> => {
  const records = await prismaUnscoped.announcement.findMany({
    include: announcementInclude,
    orderBy: [{ startsAt: 'desc' }, { id: 'desc' }],
  });

  return records.map(toAnnouncementDto);
};

export const createAnnouncement = async (
  input: AnnouncementWriteRequest,
  createdById: string,
): Promise<AnnouncementDto> => {
  const organizationIds = await resolveTargets(input);
  const record = await prismaUnscoped.announcement.create({
    data: {
      ...toData(input),
      createdById,
      organizations: { create: organizationIds.map((organizationId) => ({ organizationId })) },
    },
    include: announcementInclude,
  });

  return toAnnouncementDto(record);
};

export const updateAnnouncement = async (
  id: string,
  input: AnnouncementWriteRequest,
): Promise<AnnouncementDto> => {
  const existing = await prismaUnscoped.announcement.findUnique({
    where: { id },
    select: { id: true },
  });

  if (!existing) {
    throw notFound(NOT_FOUND_MESSAGE);
  }

  const organizationIds = await resolveTargets(input);
  const record = await prismaUnscoped.$transaction(async (tx) => {
    await tx.announcementOrganization.deleteMany({ where: { announcementId: id } });

    return tx.announcement.update({
      where: { id },
      data: {
        ...toData(input),
        organizations: { create: organizationIds.map((organizationId) => ({ organizationId })) },
      },
      include: announcementInclude,
    });
  });

  return toAnnouncementDto(record);
};

export const deleteAnnouncement = async (id: string): Promise<{ id: string; deleted: true }> => {
  const { count } = await prismaUnscoped.announcement.deleteMany({ where: { id } });

  if (count === 0) {
    throw notFound(NOT_FOUND_MESSAGE);
  }

  return { id, deleted: true };
};

/**
 * What a user sees right now: inside its period, meant for everyone or for the
 * organization they work in, and not closed by them on any device.
 */
export const listActiveAnnouncements = async (
  userId: string,
  now: Date = new Date(),
): Promise<ActiveAnnouncementDto[]> => {
  const organizationId = getTenantContext()?.organizationId ?? null;

  return prismaUnscoped.announcement.findMany({
    where: {
      startsAt: { lte: now },
      AND: [
        { OR: [{ endsAt: null }, { endsAt: { gt: now } }] },
        {
          OR: [
            { allOrganizations: true },
            ...(organizationId ? [{ organizations: { some: { organizationId } } }] : []),
          ],
        },
      ],
      dismissals: { none: { userId } },
    },
    select: { id: true, message: true, kind: true },
    orderBy: [{ kind: 'desc' }, { startsAt: 'desc' }],
  });
};

export const dismissAnnouncement = async (
  id: string,
  userId: string,
): Promise<{ id: string; dismissed: true }> => {
  const existing = await prismaUnscoped.announcement.findUnique({
    where: { id },
    select: { id: true },
  });

  if (!existing) {
    throw notFound(NOT_FOUND_MESSAGE);
  }

  await prismaUnscoped.announcementDismissal.upsert({
    where: { announcementId_userId: { announcementId: id, userId } },
    create: { announcementId: id, userId },
    update: {},
  });

  return { id, dismissed: true };
};
