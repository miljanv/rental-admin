import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../config/prisma', () => {
  const model = () =>
    Object.fromEntries(
      ['findUnique', 'findMany', 'create', 'update', 'delete', 'deleteMany'].map((name) => [
        name,
        vi.fn(),
      ]),
    );
  const unscoped = {
    organization: model(),
    alarmThreshold: model(),
    user: { count: vi.fn(), groupBy: vi.fn(), aggregate: vi.fn() },
    vehicle: { count: vi.fn(), groupBy: vi.fn() },
    driver: { count: vi.fn() },
    trip: { count: vi.fn() },
    tripBillingDocument: { count: vi.fn() },
    fileObject: { aggregate: vi.fn() },
    $queryRaw: vi.fn(),
    $transaction: vi.fn(),
  };

  return { prisma: { organization: model() }, prismaUnscoped: unscoped };
});

import { prisma, prismaUnscoped } from '../config/prisma';
import {
  createOrganization,
  deleteOrganization,
  getOrganizationOverview,
  listOrganizations,
  updateOrganization,
  updateOrganizationProfile,
} from './organization.service';

const date = new Date('2026-10-14T00:00:00Z');
const noProfile = {
  taxId: null,
  registrationNumber: null,
  address: null,
  contactName: null,
  contactPhone: null,
  contactEmail: null,
};
const organizationRecord = (overrides: Record<string, unknown> = {}) => ({
  id: 'org-1',
  name: 'Rental Travel',
  isActive: true,
  maxVehicles: 20,
  maxUsers: 5,
  ...noProfile,
  createdAt: date,
  updatedAt: date,
  _count: { users: 2, vehicles: 14, drivers: 9, trips: 120 },
  ...overrides,
});
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
        maxVehicles: 20,
        maxUsers: null,
        ...noProfile,
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
        profile: noProfile,
        usage: { vehicles: 14, maxVehicles: 20, users: 2, maxUsers: null },
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

describe('getOrganizationOverview', () => {
  beforeEach(() => {
    vi.mocked(prisma.organization.findUnique).mockResolvedValue(organizationRecord() as never);
    vi.mocked(prismaUnscoped.vehicle.groupBy).mockResolvedValue([
      { isEnabled: true, _count: { _all: 14 } },
      { isEnabled: false, _count: { _all: 3 } },
    ] as never);
    vi.mocked(prismaUnscoped.user.groupBy).mockResolvedValue([
      { isActive: true, _count: { _all: 2 } },
    ] as never);
    vi.mocked(prismaUnscoped.driver.count).mockResolvedValue(9);
    vi.mocked(prismaUnscoped.trip.count).mockResolvedValue(120);
    vi.mocked(prismaUnscoped.tripBillingDocument.count).mockResolvedValue(40);
    vi.mocked(prismaUnscoped.fileObject.aggregate).mockResolvedValue({
      _count: { _all: 6 },
      _sum: { size: 3_145_728 },
    } as never);
    vi.mocked(prismaUnscoped.user.aggregate).mockResolvedValue({
      _max: { lastLoginAt: date },
    } as never);
  });

  it('adds up usage, statistics, storage and the last sign-in', async () => {
    const overview = await getOrganizationOverview('org-1');

    expect(overview).toMatchObject({
      vehicles: { enabled: 14, disabled: 3, max: 20 },
      users: { active: 2, inactive: 0, max: 5 },
      drivers: 9,
      trips: 120,
      invoices: 40,
      files: 6,
      storageBytes: 3_145_728,
      lastActivityAt: date.toISOString(),
    });
  });

  it('counts only this organization, and only issued invoices and uploaded files', async () => {
    await getOrganizationOverview('org-1');

    expect(vi.mocked(prismaUnscoped.vehicle.groupBy).mock.calls[0]![0].where).toEqual({
      organizationId: 'org-1',
    });
    expect(vi.mocked(prismaUnscoped.tripBillingDocument.count).mock.calls[0]![0]).toEqual({
      where: { type: 'RACUN', trip: { organizationId: 'org-1' } },
    });
    expect(vi.mocked(prismaUnscoped.fileObject.aggregate).mock.calls[0]![0].where).toEqual({
      organizationId: 'org-1',
      status: 'UPLOADED',
    });
  });

  it('reports an empty organization as zeros', async () => {
    vi.mocked(prismaUnscoped.vehicle.groupBy).mockResolvedValue([] as never);
    vi.mocked(prismaUnscoped.user.groupBy).mockResolvedValue([] as never);
    vi.mocked(prismaUnscoped.fileObject.aggregate).mockResolvedValue({
      _count: { _all: 0 },
      _sum: { size: null },
    } as never);
    vi.mocked(prismaUnscoped.user.aggregate).mockResolvedValue({
      _max: { lastLoginAt: null },
    } as never);

    await expect(getOrganizationOverview('org-1')).resolves.toMatchObject({
      vehicles: { enabled: 0, disabled: 0 },
      users: { active: 0, inactive: 0 },
      storageBytes: 0,
      lastActivityAt: null,
    });
  });

  it('answers 404 for an unknown organization', async () => {
    vi.mocked(prisma.organization.findUnique).mockResolvedValue(null);

    await expect(getOrganizationOverview('nope')).rejects.toMatchObject({ statusCode: 404 });
  });
});

describe('updateOrganizationProfile', () => {
  it('stores the company details and returns them', async () => {
    vi.mocked(prisma.organization.findUnique).mockResolvedValue(organizationRecord() as never);
    vi.mocked(prisma.organization.update).mockResolvedValue(
      organizationRecord({ taxId: '101234567' }) as never,
    );
    const input = { ...noProfile, taxId: '101234567' };

    const dto = await updateOrganizationProfile('org-1', input);

    expect(vi.mocked(prisma.organization.update).mock.calls[0]![0].data).toEqual(input);
    expect(dto.profile.taxId).toBe('101234567');
  });
});

describe('createOrganization', () => {
  it('reports a taken name as a conflict', async () => {
    vi.mocked(prisma.organization.create).mockRejectedValue({ code: 'P2002' });

    await expect(
      createOrganization({
        name: 'Rental Travel',
        isActive: true,
        maxVehicles: null,
        maxUsers: null,
      }),
    ).rejects.toMatchObject({ statusCode: 409 });
  });

  it('starts an organization with the given limits', async () => {
    vi.mocked(prisma.organization.create).mockResolvedValue({
      id: 'org-1',
      name: 'Rental Travel',
      isActive: true,
      maxVehicles: 5,
      maxUsers: 3,
      createdAt: date,
      updatedAt: date,
      _count: { users: 0, vehicles: 0, drivers: 0, trips: 0 },
    } as never);

    await createOrganization({
      name: 'Rental Travel',
      isActive: true,
      maxVehicles: 5,
      maxUsers: 3,
    });

    expect(vi.mocked(prisma.organization.create).mock.calls[0]![0].data).toMatchObject({
      maxVehicles: 5,
      maxUsers: 3,
    });
  });
});

describe('updateOrganization', () => {
  const stored = {
    id: 'org-1',
    name: 'Rental Travel',
    isActive: true,
    maxVehicles: null,
    maxUsers: null,
    createdAt: date,
    updatedAt: date,
    _count: { users: 3, vehicles: 6, drivers: 0, trips: 0 },
  };
  const input = { name: 'Rental Travel', isActive: true, maxVehicles: 10, maxUsers: 3 };

  beforeEach(() => {
    vi.mocked(prisma.organization.findUnique).mockResolvedValue(stored as never);
    vi.mocked(prismaUnscoped.$transaction).mockImplementationOnce(((
      callback: (tx: unknown) => unknown,
    ) => callback(prismaUnscoped)) as never);
    vi.mocked(prismaUnscoped.$queryRaw).mockResolvedValue([
      { maxVehicles: null, maxUsers: null },
    ] as never);
    vi.mocked(prismaUnscoped.vehicle.count).mockResolvedValue(6);
    vi.mocked(prismaUnscoped.user.count).mockResolvedValue(3);
  });

  it('sets limits at or above what the organization already uses', async () => {
    vi.mocked(prismaUnscoped.organization.update).mockResolvedValue({
      ...stored,
      maxVehicles: 10,
      maxUsers: 3,
    } as never);

    await expect(updateOrganization('org-1', input)).resolves.toMatchObject({
      usage: { vehicles: 6, maxVehicles: 10, users: 3, maxUsers: 3 },
    });
  });

  it('refuses a vehicle limit below the current vehicle count', async () => {
    await expect(updateOrganization('org-1', { ...input, maxVehicles: 5 })).rejects.toMatchObject({
      statusCode: 409,
      message: expect.stringContaining('(6)'),
    });
    expect(prismaUnscoped.organization.update).not.toHaveBeenCalled();
  });

  it('refuses a user limit below the active user count', async () => {
    await expect(updateOrganization('org-1', { ...input, maxUsers: 2 })).rejects.toMatchObject({
      statusCode: 409,
    });
    expect(prismaUnscoped.organization.update).not.toHaveBeenCalled();
  });

  it('clears the limits when they are left empty', async () => {
    vi.mocked(prismaUnscoped.organization.update).mockResolvedValue(stored as never);

    await updateOrganization('org-1', { ...input, maxVehicles: null, maxUsers: null });

    expect(vi.mocked(prismaUnscoped.organization.update).mock.calls[0]![0].data).toMatchObject({
      maxVehicles: null,
      maxUsers: null,
    });
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
