import type { DriverPortalTripDto } from '@rental-admin/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { prismaMock, applyKmMock, auditMock } = vi.hoisted(() => {
  const mock = {
    trip: { findFirst: vi.fn(), findMany: vi.fn() },
    tripVehicle: { aggregate: vi.fn() },
    fuelLog: { aggregate: vi.fn() },
    vehicleMaintenance: { aggregate: vi.fn() },
    vehicle: { findUnique: vi.fn() },
    fileObject: { findUnique: vi.fn() },
    driverTripReport: { create: vi.fn(), update: vi.fn() },
    driverTripReportExpense: { create: vi.fn(), update: vi.fn(), deleteMany: vi.fn() },
    driverTripReportVehicle: { upsert: vi.fn() },
    $transaction: vi.fn(),
  };

  return { prismaMock: mock, applyKmMock: vi.fn(), auditMock: vi.fn() };
});

vi.mock('../config/prisma', () => ({ prisma: prismaMock, prismaUnscoped: prismaMock }));
vi.mock('./trip-vehicle-km.service', () => ({ applyTripVehicleKm: applyKmMock }));
vi.mock('./audit.service', () => ({ recordAuditEvent: auditMock }));
vi.mock('./file-attachment.service', () => ({ deleteAttachedFile: vi.fn() }));
vi.mock('./file.service', () => ({ createPresignedUpload: vi.fn(), confirmUpload: vi.fn() }));
vi.mock('../utils/tenant-context', () => ({ requireOrganizationId: () => 'org_1' }));

import {
  mergeDriverReadings,
  odometerWarnings,
  portalTodayIso,
  portalTripGroup,
  submitDriverReport,
} from './driver-portal.service';

const NOW = new Date('2026-11-10T09:00:00.000Z');

const tripRecord = (overrides: Record<string, unknown> = {}) => ({
  id: 'trip_1',
  departureDate: new Date('2026-11-10T00:00:00.000Z'),
  returnDate: null,
  origin: 'Čoka',
  destination: 'Novi Sad',
  clientName: null,
  partner: { type: 'COMPANY', companyName: 'OŠ Čoka', firstName: null, lastName: null },
  vehicles: [
    {
      startKm: null,
      endKm: null,
      vehicle: { id: 'veh_1', licensePlate: 'BG-123-AA', make: 'Setra', model: 'S 516' },
    },
  ],
  driverReports: [],
  ...overrides,
});

const pendingExpense = {
  id: 'exp_1',
  category: 'TOLL',
  amount: 1_250,
  paymentMethod: 'CASH',
  note: null,
  status: 'PENDING',
  fileId: null,
  file: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  prismaMock.$transaction.mockImplementation((work: (tx: typeof prismaMock) => unknown) =>
    work(prismaMock),
  );
  prismaMock.tripVehicle.aggregate.mockResolvedValue({ _max: { startKm: null, endKm: 184_290 } });
  prismaMock.fuelLog.aggregate.mockResolvedValue({ _max: { odometerKm: null } });
  prismaMock.vehicleMaintenance.aggregate.mockResolvedValue({ _max: { odometerKm: null } });
  prismaMock.vehicle.findUnique.mockResolvedValue({ initialMileageKm: 100_000 });
  prismaMock.driverTripReport.create.mockResolvedValue({ id: 'rep_1' });
  prismaMock.driverTripReport.update.mockResolvedValue({ id: 'rep_1' });
});

describe('portalTodayIso', () => {
  it('uses the Belgrade calendar date', () => {
    expect(portalTodayIso(new Date('2026-11-10T23:30:00.000Z'))).toBe('2026-11-11');
  });
});

describe('portalTripGroup', () => {
  const base = { returnDate: null, report: null } as unknown as DriverPortalTripDto;

  it('sorts trips into today, upcoming, pending and submitted', () => {
    const today = '2026-11-10';

    expect(portalTripGroup({ ...base, departureDate: '2026-11-10' }, today)).toBe('today');
    expect(
      portalTripGroup({ ...base, departureDate: '2026-11-08', returnDate: '2026-11-11' }, today),
    ).toBe('today');
    expect(portalTripGroup({ ...base, departureDate: '2026-11-12' }, today)).toBe('upcoming');
    expect(portalTripGroup({ ...base, departureDate: '2026-11-08' }, today)).toBe('pending');
    expect(
      portalTripGroup(
        { ...base, departureDate: '2026-11-08', report: { status: 'SUBMITTED' } } as never,
        today,
      ),
    ).toBe('submitted');
    expect(
      portalTripGroup(
        { ...base, departureDate: '2026-11-08', report: { status: 'RETURNED' } } as never,
        today,
      ),
    ).toBe('pending');
  });
});

describe('mergeDriverReadings', () => {
  const plates = new Map([['veh_1', 'BG-123-AA']]);
  const current = new Map([['veh_1', { startKm: 100, endKm: null as number | null }]]);

  it('keeps a reading the driver left empty', () => {
    expect(
      mergeDriverReadings([{ vehicleId: 'veh_1', startKm: null, endKm: 260 }], current, plates),
    ).toEqual([{ vehicleId: 'veh_1', startKm: 100, endKm: 260 }]);
  });

  it('skips a vehicle with nothing entered', () => {
    expect(
      mergeDriverReadings([{ vehicleId: 'veh_1', startKm: null, endKm: null }], current, plates),
    ).toEqual([]);
  });

  it('rejects an end below the start after merging, and a vehicle not on the trip', () => {
    expect(() =>
      mergeDriverReadings([{ vehicleId: 'veh_1', startKm: null, endKm: 50 }], current, plates),
    ).toThrow('BG-123-AA: završna kilometraža ne može biti manja od početne.');
    expect(() =>
      mergeDriverReadings([{ vehicleId: 'veh_9', startKm: 1, endKm: 2 }], current, plates),
    ).toThrow('Vozilo nije dodeljeno ovoj vožnji.');
  });
});

describe('odometerWarnings', () => {
  const plates = new Map([['veh_1', 'BG-123-AA']]);
  const lastKnown = new Map([['veh_1', 184_290]]);

  it('warns about a start below the last known reading or far above it', () => {
    expect(
      odometerWarnings([{ vehicleId: 'veh_1', startKm: 184_000, endKm: null }], plates, lastKnown),
    ).toEqual([expect.stringContaining('manja od poslednje poznate')]);
    expect(
      odometerWarnings([{ vehicleId: 'veh_1', startKm: 190_000, endKm: null }], plates, lastKnown),
    ).toEqual([expect.stringContaining('veća od poslednje poznate')]);
  });

  it('says nothing about a plausible reading', () => {
    expect(
      odometerWarnings([{ vehicleId: 'veh_1', startKm: 184_350, endKm: null }], plates, lastKnown),
    ).toEqual([]);
  });
});

describe('submitDriverReport', () => {
  it('writes odometer readings at once and stores expenses as pending', async () => {
    prismaMock.trip.findFirst.mockResolvedValue(tripRecord());

    const result = await submitDriverReport(
      'drv_1',
      'trip_1',
      {
        vehicles: [{ vehicleId: 'veh_1', startKm: 184_350, endKm: 184_512 }],
        expenses: [
          {
            id: null,
            category: 'TOLL',
            amount: 1_250,
            paymentMethod: 'CASH',
            note: null,
            fileId: null,
          },
        ],
        note: null,
      },
      NOW,
    );

    expect(prismaMock.driverTripReport.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ tripId: 'trip_1', driverId: 'drv_1', status: 'SUBMITTED' }),
      select: { id: true },
    });
    expect(prismaMock.driverTripReportExpense.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ reportId: 'rep_1', category: 'TOLL', amount: 1_250 }),
    });
    expect(applyKmMock).toHaveBeenCalledWith(
      'trip_1',
      [{ vehicleId: 'veh_1', startKm: 184_350, endKm: 184_512 }],
      'DRIVER',
      prismaMock,
    );
    expect(result.warnings).toEqual([]);
    expect(auditMock).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'DRIVER_REPORT_SUBMITTED', actorUserId: null }),
    );
  });

  it('refuses a trip that has not started yet', async () => {
    prismaMock.trip.findFirst.mockResolvedValue(
      tripRecord({ departureDate: new Date('2026-11-12T00:00:00.000Z') }),
    );

    await expect(
      submitDriverReport('drv_1', 'trip_1', { vehicles: [], expenses: [], note: null }, NOW),
    ).rejects.toThrow('Podaci se unose na dan vožnje ili posle nje.');
  });

  it('refuses a trip the driver is not on', async () => {
    prismaMock.trip.findFirst.mockResolvedValue(null);

    await expect(
      submitDriverReport('drv_1', 'trip_1', { vehicles: [], expenses: [], note: null }, NOW),
    ).rejects.toThrow('Vožnja nije pronađena.');
  });

  it('does not let the driver change an expense the office already handled', async () => {
    prismaMock.trip.findFirst.mockResolvedValue(
      tripRecord({
        driverReports: [
          {
            id: 'rep_1',
            status: 'ACCEPTED',
            note: null,
            adminComment: null,
            submittedAt: NOW,
            updatedAt: NOW,
            reviewedAt: NOW,
            expenses: [{ ...pendingExpense, status: 'ACCEPTED' }],
          },
        ],
      }),
    );

    await expect(
      submitDriverReport(
        'drv_1',
        'trip_1',
        {
          vehicles: [],
          expenses: [
            {
              id: 'exp_1',
              category: 'TOLL',
              amount: 9_999,
              paymentMethod: 'CASH',
              note: null,
              fileId: null,
            },
          ],
          note: null,
        },
        NOW,
      ),
    ).rejects.toThrow('već obradila');
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it('drops a pending expense the driver removed and reopens a returned report', async () => {
    prismaMock.trip.findFirst.mockResolvedValue(
      tripRecord({
        driverReports: [
          {
            id: 'rep_1',
            status: 'RETURNED',
            note: null,
            adminComment: 'Fali račun',
            submittedAt: NOW,
            updatedAt: NOW,
            reviewedAt: NOW,
            expenses: [pendingExpense],
          },
        ],
      }),
    );

    await submitDriverReport(
      'drv_1',
      'trip_1',
      { vehicles: [], expenses: [], note: 'Ispravljeno' },
      NOW,
    );

    expect(prismaMock.driverTripReportExpense.deleteMany).toHaveBeenCalledWith({
      where: { reportId: 'rep_1', id: { in: ['exp_1'] } },
    });
    expect(prismaMock.driverTripReport.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'SUBMITTED', note: 'Ispravljeno' }),
      }),
    );
    expect(applyKmMock).not.toHaveBeenCalled();
  });

  it('rejects a receipt that was not uploaded', async () => {
    prismaMock.trip.findFirst.mockResolvedValue(tripRecord());
    prismaMock.fileObject.findUnique.mockResolvedValue({
      status: 'PENDING',
      mimeType: 'image/jpeg',
    });

    await expect(
      submitDriverReport(
        'drv_1',
        'trip_1',
        {
          vehicles: [],
          expenses: [
            {
              id: null,
              category: 'FUEL',
              amount: 18_400,
              paymentMethod: 'COMPANY_CARD',
              note: null,
              fileId: 'file_1',
            },
          ],
          note: null,
        },
        NOW,
      ),
    ).rejects.toThrow('Račun nije pronađen');
  });
});
