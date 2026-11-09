import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../config/prisma', () => ({ prisma: {}, prismaUnscoped: {} }));

import { assertWithinLimit } from './organization-limit.service';

const tx = {
  $queryRaw: vi.fn(),
  user: { count: vi.fn() },
  vehicle: { count: vi.fn() },
};

const limits = (maxVehicles: number | null, maxUsers: number | null) => [{ maxVehicles, maxUsers }];

beforeEach(() => {
  vi.clearAllMocks();
});

describe('assertWithinLimit', () => {
  it('lets a vehicle in below the limit', async () => {
    tx.$queryRaw.mockResolvedValue(limits(5, null));
    tx.vehicle.count.mockResolvedValue(4);

    await expect(assertWithinLimit(tx as never, 'org-1', 'vehicles')).resolves.toBeUndefined();
  });

  it('rejects a vehicle at the limit with LIMIT_REACHED', async () => {
    tx.$queryRaw.mockResolvedValue(limits(5, null));
    tx.vehicle.count.mockResolvedValue(5);

    await expect(assertWithinLimit(tx as never, 'org-1', 'vehicles')).rejects.toMatchObject({
      statusCode: 409,
      code: 'LIMIT_REACHED',
      message: expect.stringContaining('limit vozila'),
    });
  });

  it('counts only active regular users against the user limit', async () => {
    tx.$queryRaw.mockResolvedValue(limits(null, 2));
    tx.user.count.mockResolvedValue(2);

    await expect(assertWithinLimit(tx as never, 'org-1', 'users')).rejects.toMatchObject({
      code: 'LIMIT_REACHED',
    });
    expect(tx.user.count).toHaveBeenCalledWith({
      where: { organizationId: 'org-1', isActive: true, role: 'USER' },
    });
  });

  it('treats a null limit as unlimited without counting', async () => {
    tx.$queryRaw.mockResolvedValue(limits(null, null));

    await expect(assertWithinLimit(tx as never, 'org-1', 'vehicles')).resolves.toBeUndefined();
    await expect(assertWithinLimit(tx as never, 'org-1', 'users')).resolves.toBeUndefined();
    expect(tx.vehicle.count).not.toHaveBeenCalled();
    expect(tx.user.count).not.toHaveBeenCalled();
  });

  it('rejects an organization that does not exist', async () => {
    tx.$queryRaw.mockResolvedValue([]);

    await expect(assertWithinLimit(tx as never, 'nope', 'vehicles')).rejects.toMatchObject({
      statusCode: 400,
    });
  });
});
