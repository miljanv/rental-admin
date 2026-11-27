import { beforeEach, describe, expect, it, vi } from 'vitest';

const { prismaMock, auditMock, createFuelLogMock, assertReceiptMock, lastKnownMock } = vi.hoisted(
  () => ({
    prismaMock: {
      vehicle: { findUnique: vi.fn() },
      vehicleFault: { create: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
      driverTool: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        updateMany: vi.fn(),
      },
      driverFuelEntry: { findUnique: vi.fn(), update: vi.fn() },
    },
    auditMock: vi.fn(),
    createFuelLogMock: vi.fn(),
    assertReceiptMock: vi.fn(),
    lastKnownMock: vi.fn(),
  }),
);

vi.mock('../config/prisma', () => ({ prisma: prismaMock, prismaUnscoped: prismaMock }));
vi.mock('./audit.service', () => ({ recordAuditEvent: auditMock }));
vi.mock('./fuel-log.service', () => ({ createFuelLog: createFuelLogMock }));
vi.mock('./driver-portal.service', () => ({
  assertReceipt: assertReceiptMock,
  lastKnownOdometerKm: lastKnownMock,
  portalTodayIso: () => '2026-11-27',
}));
vi.mock('../utils/tenant-context', () => ({ requireOrganizationId: () => 'org_1' }));

import {
  applyDriverToolAction,
  confirmAllTools,
  reportToolLost,
  reportVehicleFault,
  respondToTool,
  reviewDriverFuelEntry,
  updateDriverTool,
  updateVehicleFault,
} from './driver-workplace.service';

const NOW = new Date('2026-11-27T10:00:00.000Z');

const vehicle = { id: 'veh_1', licensePlate: 'NS 754-RT', make: 'VDL', model: 'Magiq' };

const faultRecord = {
  id: 'fault_1',
  reportedAt: new Date('2026-11-27T00:00:00.000Z'),
  odometerKm: 958120,
  description: 'Lampica motora svetli',
  status: 'REPORTED' as const,
  officeNote: null,
  resolvedAt: null,
  createdAt: NOW,
  vehicle,
  driver: { id: 'drv_1', firstName: 'Milenko', lastName: 'Simić' },
  file: null,
};

const toolRecord = (overrides: Record<string, unknown> = {}) => ({
  id: 'tool_1',
  driverId: 'drv_1',
  name: 'Dizalica',
  quantity: 1,
  source: 'OFFICE',
  status: 'PENDING',
  assignedAt: new Date('2026-11-20T00:00:00.000Z'),
  respondedAt: null,
  lostAt: null,
  lostNote: null,
  returnedAt: null,
  note: null,
  vehicle: null,
  ...overrides,
});

const fuelRecord = (overrides: Record<string, unknown> = {}) => ({
  id: 'fuel_1',
  driverId: 'drv_1',
  vehicleId: 'veh_1',
  fueledAt: '2026-11-26T11:00',
  odometerKm: 958900,
  liters: 50,
  amount: 9250,
  fuelType: 'DIESEL',
  paymentMethod: 'CASH',
  note: null,
  status: 'PENDING',
  rejectionReason: null,
  reviewedAt: null,
  createdAt: NOW,
  vehicle,
  driver: { id: 'drv_1', firstName: 'Milenko', lastName: 'Simić' },
  paymentCard: null,
  file: null,
  ...overrides,
});

beforeEach(() => {
  vi.clearAllMocks();
  prismaMock.vehicle.findUnique.mockResolvedValue({ isEnabled: true });
  prismaMock.driverTool.findMany.mockResolvedValue([]);
  lastKnownMock.mockResolvedValue(null);
});

describe('reportVehicleFault', () => {
  const input = {
    vehicleId: 'veh_1',
    reportedAt: '2026-11-27',
    odometerKm: 958120,
    description: 'Lampica motora svetli',
    fileId: null,
  };

  it('saves the fault for the driver of the link in their firm', async () => {
    prismaMock.vehicleFault.create.mockResolvedValue(faultRecord);

    const result = await reportVehicleFault('drv_1', input, NOW);

    expect(prismaMock.vehicleFault.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ organizationId: 'org_1', driverId: 'drv_1' }),
      }),
    );
    expect(result).toMatchObject({ reportedAt: '2026-11-27', driver: { name: 'Milenko Simić' } });
    expect(auditMock).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'VEHICLE_FAULT_REPORTED', actorUserId: null }),
    );
  });

  it('refuses a date in the future and a disabled vehicle', async () => {
    await expect(
      reportVehicleFault('drv_1', { ...input, reportedAt: '2026-11-28' }, NOW),
    ).rejects.toThrow('budućnosti');

    prismaMock.vehicle.findUnique.mockResolvedValue({ isEnabled: false });
    await expect(reportVehicleFault('drv_1', input, NOW)).rejects.toThrow('Vozilo');
    expect(prismaMock.vehicleFault.create).not.toHaveBeenCalled();
  });

  it('refuses an odometer reading below what the vehicle showed before that day', async () => {
    lastKnownMock.mockResolvedValue(958500);

    await expect(reportVehicleFault('drv_1', input, NOW)).rejects.toThrow('manja od trenutne');
    expect(lastKnownMock).toHaveBeenCalledWith(
      'veh_1',
      null,
      new Date('2026-11-27T00:00:00.000Z'),
      false,
    );
    expect(prismaMock.vehicleFault.create).not.toHaveBeenCalled();
  });

  it('checks an attached photo', async () => {
    prismaMock.vehicleFault.create.mockResolvedValue(faultRecord);

    await reportVehicleFault('drv_1', { ...input, fileId: 'file_1' }, NOW);

    expect(assertReceiptMock).toHaveBeenCalledWith('file_1');
  });
});

describe('updateVehicleFault', () => {
  it('stamps the resolve time once and clears it when reopened', async () => {
    prismaMock.vehicleFault.findUnique.mockResolvedValue({ status: 'IN_REPAIR', resolvedAt: null });
    prismaMock.vehicleFault.update.mockResolvedValue(faultRecord);

    await updateVehicleFault('fault_1', { status: 'RESOLVED', officeNote: null });
    expect(prismaMock.vehicleFault.update.mock.calls[0]?.[0].data.resolvedAt).toBeInstanceOf(Date);

    prismaMock.vehicleFault.findUnique.mockResolvedValue({
      status: 'RESOLVED',
      resolvedAt: NOW,
    });
    await updateVehicleFault('fault_1', { status: 'IN_REPAIR', officeNote: 'Servis u ponedeljak' });
    expect(prismaMock.vehicleFault.update.mock.calls[1]?.[0].data).toMatchObject({
      resolvedAt: null,
      officeNote: 'Servis u ponedeljak',
    });
  });
});

describe('tools', () => {
  it('lets the driver confirm or decline only a tool the office is waiting on', async () => {
    prismaMock.driverTool.findFirst.mockResolvedValue({
      id: 'tool_1',
      status: 'PENDING',
      source: 'OFFICE',
    });

    await respondToTool('drv_1', 'tool_1', { action: 'DECLINE' }, NOW);
    expect(prismaMock.driverTool.update).toHaveBeenCalledWith({
      where: { id: 'tool_1' },
      data: { status: 'DECLINED', respondedAt: NOW },
    });

    prismaMock.driverTool.findFirst.mockResolvedValue({
      id: 'tool_2',
      status: 'PENDING',
      source: 'DRIVER',
    });
    await expect(respondToTool('drv_1', 'tool_2', { action: 'CONFIRM' }, NOW)).rejects.toThrow();
  });

  it('confirms every pending office tool at once', async () => {
    prismaMock.driverTool.findMany
      .mockResolvedValueOnce([{ id: 'tool_1' }, { id: 'tool_2' }])
      .mockResolvedValueOnce([toolRecord({ status: 'CONFIRMED' })]);

    const result = await confirmAllTools('drv_1', NOW);

    expect(prismaMock.driverTool.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ['tool_1', 'tool_2'] } },
      data: { status: 'CONFIRMED', respondedAt: NOW },
    });
    expect(auditMock).toHaveBeenCalledTimes(2);
    expect(result[0]?.status).toBe('CONFIRMED');
  });

  it('reports only a confirmed tool lost', async () => {
    prismaMock.driverTool.findFirst.mockResolvedValue({
      id: 'tool_1',
      status: 'PENDING',
      source: 'OFFICE',
    });
    await expect(
      reportToolLost('drv_1', 'tool_1', { lostAt: '2026-11-26', lostNote: 'Ostala na pumpi' }, NOW),
    ).rejects.toThrow();

    prismaMock.driverTool.findFirst.mockResolvedValue({
      id: 'tool_1',
      status: 'CONFIRMED',
      source: 'OFFICE',
    });
    await reportToolLost(
      'drv_1',
      'tool_1',
      { lostAt: '2026-11-26', lostNote: 'Ostala na pumpi' },
      NOW,
    );
    expect(prismaMock.driverTool.update.mock.calls[0]?.[0].data).toMatchObject({
      status: 'LOST',
      lostNote: 'Ostala na pumpi',
    });
  });

  it('asks the driver to confirm again when the office changes what was handed over', async () => {
    prismaMock.driverTool.findFirst.mockResolvedValue({
      name: 'Dizalica',
      quantity: 1,
      status: 'CONFIRMED',
      source: 'OFFICE',
    });
    prismaMock.driverTool.update.mockResolvedValue(toolRecord());

    await updateDriverTool('drv_1', 'tool_1', {
      name: 'Dizalica',
      quantity: 2,
      vehicleId: null,
      assignedAt: '2026-11-20',
      note: null,
    });

    expect(prismaMock.driverTool.update.mock.calls[0]?.[0].data).toMatchObject({
      status: 'PENDING',
      respondedAt: null,
    });
  });

  it('lets the office confirm only a tool the driver wrote down', async () => {
    prismaMock.driverTool.findFirst.mockResolvedValue({
      id: 'tool_1',
      status: 'PENDING',
      source: 'OFFICE',
    });

    await expect(
      applyDriverToolAction('drv_1', 'tool_1', { action: 'CONFIRM' }, NOW),
    ).rejects.toThrow();

    prismaMock.driverTool.update.mockResolvedValue(toolRecord({ status: 'RETURNED' }));
    await applyDriverToolAction('drv_1', 'tool_1', { action: 'RETURN' }, NOW);
    expect(prismaMock.driverTool.update.mock.calls[0]?.[0].data).toMatchObject({
      status: 'RETURNED',
    });
  });
});

describe('reviewDriverFuelEntry', () => {
  it('records liters and km in the fuel log without the amount when accepted', async () => {
    prismaMock.driverFuelEntry.findUnique.mockResolvedValue(fuelRecord());
    prismaMock.driverFuelEntry.update.mockResolvedValue(fuelRecord({ status: 'ACCEPTED' }));
    createFuelLogMock.mockResolvedValue({ id: 'log_1' });

    await reviewDriverFuelEntry('fuel_1', { action: 'ACCEPT', rejectionReason: null }, NOW);

    expect(createFuelLogMock).toHaveBeenCalledWith(
      expect.objectContaining({
        vehicleId: 'veh_1',
        fueledAt: '2026-11-26',
        litersFilled: 50,
        odometerKm: 958900,
        cost: null,
      }),
    );
    expect(prismaMock.driverFuelEntry.update.mock.calls[0]?.[0].data).toMatchObject({
      status: 'ACCEPTED',
      fuelLogId: 'log_1',
    });
  });

  it('rejects without touching the fuel log, and refuses a second review', async () => {
    prismaMock.driverFuelEntry.findUnique.mockResolvedValue(fuelRecord());
    prismaMock.driverFuelEntry.update.mockResolvedValue(fuelRecord({ status: 'REJECTED' }));

    await reviewDriverFuelEntry(
      'fuel_1',
      { action: 'REJECT', rejectionReason: 'Nema računa' },
      NOW,
    );
    expect(createFuelLogMock).not.toHaveBeenCalled();

    prismaMock.driverFuelEntry.findUnique.mockResolvedValue(fuelRecord({ status: 'ACCEPTED' }));
    await expect(
      reviewDriverFuelEntry('fuel_1', { action: 'ACCEPT', rejectionReason: null }, NOW),
    ).rejects.toThrow('već obrađen');
  });
});
