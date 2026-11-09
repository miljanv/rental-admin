import { beforeEach, describe, expect, it, vi } from 'vitest';

const { client } = vi.hoisted(() => {
  const client = {
    announcement: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      deleteMany: vi.fn(),
    },
    announcementOrganization: { deleteMany: vi.fn() },
    announcementDismissal: { upsert: vi.fn() },
    organization: { count: vi.fn() },
    $transaction: vi.fn(),
  };

  return { client };
});

vi.mock('../config/prisma', () => ({ prismaUnscoped: client }));

import { runWithTenant } from '../utils/tenant-context';
import {
  createAnnouncement,
  deleteAnnouncement,
  dismissAnnouncement,
  listActiveAnnouncements,
  updateAnnouncement,
} from './announcement.service';

const date = new Date('2026-11-09T08:00:00.000Z');
const record = (overrides: Record<string, unknown> = {}) => ({
  id: 'ann-1',
  message: 'Održavanje u nedelju od 22h',
  kind: 'WARNING',
  startsAt: date,
  endsAt: null,
  allOrganizations: false,
  organizations: [
    { organization: { id: 'org-2', name: 'Zeta' } },
    { organization: { id: 'org-1', name: 'Alfa' } },
  ],
  createdBy: { id: 'admin-1', username: 'admin' },
  createdAt: date,
  updatedAt: date,
  ...overrides,
});
const input = {
  message: 'Održavanje u nedelju od 22h',
  kind: 'WARNING' as const,
  startsAt: '2026-11-09T08:00:00.000Z',
  endsAt: null,
  allOrganizations: false,
  organizationIds: ['org-1', 'org-2', 'org-1'],
};

beforeEach(() => {
  vi.clearAllMocks();
  client.$transaction.mockImplementation((work: (tx: typeof client) => unknown) => work(client));
});

describe('listActiveAnnouncements', () => {
  const now = new Date('2026-11-10T12:00:00.000Z');
  const whereOfCall = () => client.announcement.findMany.mock.calls[0]![0].where;

  it('shows a user what is current, meant for their organization and not closed by them', async () => {
    client.announcement.findMany.mockResolvedValue([]);

    await runWithTenant({ userId: 'user-1', organizationId: 'org-1' }, () =>
      listActiveAnnouncements('user-1', now),
    );

    expect(whereOfCall()).toEqual({
      startsAt: { lte: now },
      AND: [
        { OR: [{ endsAt: null }, { endsAt: { gt: now } }] },
        {
          OR: [
            { allOrganizations: true },
            { organizations: { some: { organizationId: 'org-1' } } },
          ],
        },
      ],
      dismissals: { none: { userId: 'user-1' } },
    });
  });

  it('shows a superadmin outside any organization only the banners for everyone', async () => {
    client.announcement.findMany.mockResolvedValue([]);

    await runWithTenant({ userId: 'admin-1', organizationId: null }, () =>
      listActiveAnnouncements('admin-1', now),
    );

    expect(whereOfCall().AND[1]).toEqual({ OR: [{ allOrganizations: true }] });
  });
});

describe('createAnnouncement', () => {
  it('stores each targeted organization once and returns them by name', async () => {
    client.organization.count.mockResolvedValue(2);
    client.announcement.create.mockResolvedValue(record());

    const dto = await createAnnouncement(input, 'admin-1');

    const data = client.announcement.create.mock.calls[0]![0].data;
    expect(data.organizations.create).toEqual([
      { organizationId: 'org-1' },
      { organizationId: 'org-2' },
    ]);
    expect(data).toMatchObject({ createdById: 'admin-1', startsAt: date, endsAt: null });
    expect(dto.organizations.map((organization) => organization.name)).toEqual(['Alfa', 'Zeta']);
  });

  it('ignores the selection when the banner is for everyone', async () => {
    client.announcement.create.mockResolvedValue(
      record({ allOrganizations: true, organizations: [] }),
    );

    await createAnnouncement({ ...input, allOrganizations: true }, 'admin-1');

    expect(client.organization.count).not.toHaveBeenCalled();
    expect(client.announcement.create.mock.calls[0]![0].data.organizations.create).toEqual([]);
  });

  it('refuses an organization that does not exist', async () => {
    client.organization.count.mockResolvedValue(1);

    await expect(createAnnouncement(input, 'admin-1')).rejects.toMatchObject({ statusCode: 400 });
    expect(client.announcement.create).not.toHaveBeenCalled();
  });
});

describe('updateAnnouncement', () => {
  it('replaces the targeted organizations', async () => {
    client.announcement.findUnique.mockResolvedValue({ id: 'ann-1' });
    client.organization.count.mockResolvedValue(1);
    client.announcement.update.mockResolvedValue(record());

    await updateAnnouncement('ann-1', { ...input, organizationIds: ['org-3'] });

    expect(client.announcementOrganization.deleteMany).toHaveBeenCalledWith({
      where: { announcementId: 'ann-1' },
    });
    expect(client.announcement.update.mock.calls[0]![0].data.organizations.create).toEqual([
      { organizationId: 'org-3' },
    ]);
  });

  it('returns 404 for an unknown announcement', async () => {
    client.announcement.findUnique.mockResolvedValue(null);

    await expect(updateAnnouncement('nope', input)).rejects.toMatchObject({ statusCode: 404 });
  });
});

describe('deleteAnnouncement', () => {
  it('returns 404 when nothing was deleted', async () => {
    client.announcement.deleteMany.mockResolvedValue({ count: 0 });

    await expect(deleteAnnouncement('nope')).rejects.toMatchObject({ statusCode: 404 });
  });
});

describe('dismissAnnouncement', () => {
  it('remembers the dismissal for the user, once', async () => {
    client.announcement.findUnique.mockResolvedValue({ id: 'ann-1' });

    await expect(dismissAnnouncement('ann-1', 'user-1')).resolves.toEqual({
      id: 'ann-1',
      dismissed: true,
    });
    expect(client.announcementDismissal.upsert).toHaveBeenCalledWith({
      where: { announcementId_userId: { announcementId: 'ann-1', userId: 'user-1' } },
      create: { announcementId: 'ann-1', userId: 'user-1' },
      update: {},
    });
  });

  it('returns 404 for an unknown announcement', async () => {
    client.announcement.findUnique.mockResolvedValue(null);

    await expect(dismissAnnouncement('nope', 'user-1')).rejects.toMatchObject({ statusCode: 404 });
  });
});
