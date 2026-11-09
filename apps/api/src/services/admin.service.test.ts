import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../config/prisma', () => ({
  prismaUnscoped: {
    organization: { groupBy: vi.fn() },
    vehicle: { count: vi.fn() },
    user: { count: vi.fn() },
  },
}));

import { prismaUnscoped } from '../config/prisma';
import { getAdminSummary } from './admin.service';

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(prismaUnscoped.vehicle.count).mockResolvedValue(42);
  vi.mocked(prismaUnscoped.user.count).mockResolvedValue(17);
});

describe('getAdminSummary', () => {
  it('splits organizations by status and totals what counts against limits', async () => {
    vi.mocked(prismaUnscoped.organization.groupBy).mockResolvedValue([
      { isActive: true, _count: { _all: 5 } },
      { isActive: false, _count: { _all: 2 } },
    ] as never);

    await expect(getAdminSummary()).resolves.toEqual({
      activeOrganizations: 5,
      suspendedOrganizations: 2,
      enabledVehicles: 42,
      activeUsers: 17,
    });
    expect(prismaUnscoped.vehicle.count).toHaveBeenCalledWith({ where: { isEnabled: true } });
    expect(prismaUnscoped.user.count).toHaveBeenCalledWith({
      where: { isActive: true, role: 'USER', organizationId: { not: null } },
    });
  });

  it('reports zero for a status no organization has', async () => {
    vi.mocked(prismaUnscoped.organization.groupBy).mockResolvedValue([
      { isActive: true, _count: { _all: 3 } },
    ] as never);

    await expect(getAdminSummary()).resolves.toMatchObject({ suspendedOrganizations: 0 });
  });
});
