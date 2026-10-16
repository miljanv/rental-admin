import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../config/prisma', () => {
  const model = () =>
    Object.fromEntries(
      ['findUnique', 'findMany', 'create', 'update', 'delete', 'deleteMany'].map((name) => [
        name,
        vi.fn(),
      ]),
    );
  const unscoped = { organization: model(), alarmThreshold: model(), $transaction: vi.fn() };

  return { prisma: { organization: model() }, prismaUnscoped: unscoped };
});

import { prisma, prismaUnscoped } from '../config/prisma';
import { createOrganization, deleteOrganization, listOrganizations } from './organization.service';

const date = new Date('2026-10-14T00:00:00Z');
const emptyCounts = {
  users: 0,
  fileObjects: 0,
  drivers: 0,
  vehicles: 0,
  companyExpenses: 0,
  suppliers: 0,
  partners: 0,
  contracts: 0,
  transactions: 0,
  tripSeries: 0,
  trips: 0,
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('listOrganizations', () => {
  it('reports headline counts for each organization', async () => {
    vi.mocked(prisma.organization.findMany).mockResolvedValue([
      {
        id: 'org-1',
        name: 'Rental Travel',
        isActive: true,
        createdAt: date,
        updatedAt: date,
        _count: { users: 2, vehicles: 14, drivers: 9, trips: 120 },
      },
    ] as never);

    await expect(listOrganizations()).resolves.toEqual([
      {
        id: 'org-1',
        name: 'Rental Travel',
        isActive: true,
        userCount: 2,
        vehicleCount: 14,
        driverCount: 9,
        tripCount: 120,
        createdAt: date.toISOString(),
        updatedAt: date.toISOString(),
      },
    ]);
  });
});

describe('createOrganization', () => {
  it('reports a taken name as a conflict', async () => {
    vi.mocked(prisma.organization.create).mockRejectedValue({ code: 'P2002' });

    await expect(
      createOrganization({ name: 'Rental Travel', isActive: true }),
    ).rejects.toMatchObject({ statusCode: 409 });
  });
});

describe('deleteOrganization', () => {
  it('refuses an organization that still has users or data', async () => {
    vi.mocked(prismaUnscoped.organization.findUnique).mockResolvedValue({
      _count: { ...emptyCounts, vehicles: 1 },
    } as never);

    await expect(deleteOrganization('org-1')).rejects.toMatchObject({ statusCode: 409 });
    expect(prismaUnscoped.$transaction).not.toHaveBeenCalled();
  });

  it('answers 404 for an unknown organization', async () => {
    vi.mocked(prismaUnscoped.organization.findUnique).mockResolvedValue(null);

    await expect(deleteOrganization('nope')).rejects.toMatchObject({ statusCode: 404 });
  });

  it('deletes an empty organization together with its alarm thresholds', async () => {
    vi.mocked(prismaUnscoped.organization.findUnique).mockResolvedValue({
      _count: emptyCounts,
    } as never);

    await expect(deleteOrganization('org-1')).resolves.toEqual({ id: 'org-1', deleted: true });
    expect(prismaUnscoped.alarmThreshold.deleteMany).toHaveBeenCalledWith({
      where: { organizationId: 'org-1' },
    });
    expect(prismaUnscoped.organization.delete).toHaveBeenCalledWith({ where: { id: 'org-1' } });
    expect(prismaUnscoped.$transaction).toHaveBeenCalledTimes(1);
  });
});
