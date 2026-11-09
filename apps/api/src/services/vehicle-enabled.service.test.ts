import { beforeEach, describe, expect, it, vi } from 'vitest';

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: { vehicle: { count: vi.fn() } },
}));

vi.mock('../config/prisma', () => ({ prisma: prismaMock, prismaUnscoped: prismaMock }));

import { assertVehiclesEnabled } from './vehicle-enabled.service';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('assertVehiclesEnabled', () => {
  it('accepts enabled vehicles', async () => {
    prismaMock.vehicle.count.mockResolvedValue(0);

    await expect(assertVehiclesEnabled(['veh-1', 'veh-2'])).resolves.toBeUndefined();
    expect(prismaMock.vehicle.count).toHaveBeenCalledWith({
      where: { id: { in: ['veh-1', 'veh-2'] }, isEnabled: false },
    });
  });

  it('rejects a disabled vehicle with 422', async () => {
    prismaMock.vehicle.count.mockResolvedValue(1);

    await expect(assertVehiclesEnabled(['veh-1'])).rejects.toMatchObject({
      statusCode: 422,
      code: 'VEHICLE_DISABLED',
      message: 'Vozilo je deaktivirano.',
    });
  });

  it('skips vehicles the record already uses', async () => {
    prismaMock.vehicle.count.mockResolvedValue(0);

    await assertVehiclesEnabled(['veh-old', 'veh-new'], ['veh-old']);
    expect(prismaMock.vehicle.count).toHaveBeenCalledWith({
      where: { id: { in: ['veh-new'] }, isEnabled: false },
    });
  });

  it('does not query when nothing new is linked', async () => {
    await assertVehiclesEnabled(['veh-old'], ['veh-old']);
    await assertVehiclesEnabled([]);

    expect(prismaMock.vehicle.count).not.toHaveBeenCalled();
  });
});
