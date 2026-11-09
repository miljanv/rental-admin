import { beforeEach, describe, expect, it, vi } from 'vitest';

const { prismaMock, assertWithinLimit } = vi.hoisted(() => {
  const client: Record<string, unknown> = {
    vehicle: { findUnique: vi.fn(), update: vi.fn() },
  };
  client.$transaction = vi.fn((callback: (tx: unknown) => unknown) => callback(client));

  return { prismaMock: client, assertWithinLimit: vi.fn() };
});

vi.mock('../config/prisma', () => ({ prisma: prismaMock }));
vi.mock('../utils/tenant-context', () => ({ requireOrganizationId: () => 'org-1' }));
vi.mock('./organization-limit.service', () => ({ assertWithinLimit }));
vi.mock('./tachograph-calibration.service', () => ({ deleteFilesForVehicle: vi.fn() }));
vi.mock('./vehicle-document.service', () => ({ deleteFilesForVehicle: vi.fn() }));
vi.mock('./vehicle-inspection.service', () => ({ deleteFilesForVehicle: vi.fn() }));
vi.mock('./vehicle-safety-equipment.service', () => ({ deleteFilesForVehicle: vi.fn() }));

import { setVehicleEnabled } from './vehicle.service';

const vehicle = prismaMock.vehicle as {
  findUnique: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
};

const date = new Date('2026-11-01T00:00:00Z');
const record = (isEnabled: boolean) => ({
  id: 'veh-1',
  make: 'Setra',
  model: 'S 515',
  year: 2020,
  licensePlate: 'BG-001-AA',
  vin: 'VIN1',
  engineNumber: null,
  enginePower: null,
  engineDisplacement: null,
  mass: null,
  seatCount: 50,
  standingCapacity: null,
  type: 'BUS',
  fuelType: 'DIESEL',
  tachographType: 'DIGITAL',
  status: 'ACTIVE',
  isEnabled,
  initialMileageKm: 0,
  currentMileage: 0,
  createdAt: date,
  updatedAt: date,
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe('setVehicleEnabled', () => {
  it('disables a vehicle without checking the limit', async () => {
    vehicle.findUnique.mockResolvedValue({ isEnabled: true });
    vehicle.update.mockResolvedValue(record(false));

    await expect(setVehicleEnabled('veh-1', false)).resolves.toMatchObject({ isEnabled: false });
    expect(assertWithinLimit).not.toHaveBeenCalled();
    expect(vehicle.update).toHaveBeenCalledWith({
      where: { id: 'veh-1' },
      data: { isEnabled: false },
    });
  });

  it('checks the vehicle limit before enabling a disabled vehicle', async () => {
    vehicle.findUnique.mockResolvedValue({ isEnabled: false });
    vehicle.update.mockResolvedValue(record(true));

    await setVehicleEnabled('veh-1', true);
    expect(assertWithinLimit).toHaveBeenCalledWith(prismaMock, 'org-1', 'vehicles');
  });

  it('keeps the vehicle disabled when the limit is reached', async () => {
    vehicle.findUnique.mockResolvedValue({ isEnabled: false });
    assertWithinLimit.mockRejectedValueOnce(new Error('limit'));

    await expect(setVehicleEnabled('veh-1', true)).rejects.toThrow('limit');
    expect(vehicle.update).not.toHaveBeenCalled();
  });

  it('returns 404 for an unknown vehicle', async () => {
    vehicle.findUnique.mockResolvedValue(null);

    await expect(setVehicleEnabled('nope', true)).rejects.toMatchObject({ statusCode: 404 });
  });
});
