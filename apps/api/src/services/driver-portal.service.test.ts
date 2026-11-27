import type { DriverPortalTripDto } from '@rental-admin/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { prismaMock, applyKmMock, auditMock } = vi.hoisted(() => {
  const mock = {
    trip: { findFirst: vi.fn(), findMany: vi.fn(), update: vi.fn() },
    tripDriver: { update: vi.fn() },
    paymentCard: { count: vi.fn() },
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
  acceptDriverAdvance,
  confirmDriverTrip,
  mergeDriverReadings,
  odometerFloorIssues,
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
  departureTime: null,
  pickupLocation: null,
  itinerary: null,
  travelTimelineSource: null,
  partner: { type: 'COMPANY', companyName: 'OŠ Čoka', firstName: null, lastName: null },
  drivers: [{ confirmedAt: null, advanceAmount: null, advanceAcceptedAt: null }],
  vehicles: [
    {
      garageStartKm: null,
      startKm: null,
      endKm: null,
      garageEndKm: null,
      vehicle: { id: 'veh_1', licensePlate: 'BG-123-AA', make: 'Setra', model: 'S 516' },
    },
  ],
  driverReports: [],
  ...overrides,
});

const noTimes = { startedAt: null, finishedAt: null, borderCrossings: [] };

const noFuel = {
  paymentCardId: null,
  vehicleId: null,
  fuelLiters: null,
  fuelType: null,
  fuelOdometerKm: null,
  fuelStation: null,
};

const pendingExpense = {
  ...noFuel,
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
  const current = new Map([
    [
      'veh_1',
      { garageStartKm: null, startKm: 100, endKm: null as number | null, garageEndKm: null },
    ],
  ]);

  it('keeps a reading the driver left empty', () => {
    expect(
      mergeDriverReadings(
        [{ vehicleId: 'veh_1', garageStartKm: null, startKm: null, endKm: 260, garageEndKm: null }],
        current,
        plates,
      ),
    ).toEqual([
      { vehicleId: 'veh_1', garageStartKm: null, startKm: 100, endKm: 260, garageEndKm: null },
    ]);
  });

  it('skips a vehicle with nothing entered', () => {
    expect(
      mergeDriverReadings(
        [
          {
            vehicleId: 'veh_1',
            garageStartKm: null,
            startKm: null,
            endKm: null,
            garageEndKm: null,
          },
        ],
        current,
        plates,
      ),
    ).toEqual([]);
  });

  it('rejects an end below the start after merging, and a vehicle not on the trip', () => {
    expect(() =>
      mergeDriverReadings(
        [{ vehicleId: 'veh_1', garageStartKm: null, startKm: null, endKm: 50, garageEndKm: null }],
        current,
        plates,
      ),
    ).toThrow('BG-123-AA: Kilometraža (završna) ne može biti manja od prethodne (početna).');
    expect(() =>
      mergeDriverReadings(
        [{ vehicleId: 'veh_9', garageStartKm: null, startKm: 1, endKm: 2, garageEndKm: null }],
        current,
        plates,
      ),
    ).toThrow('Vozilo nije dodeljeno ovoj vožnji.');
  });
});

describe('odometerWarnings', () => {
  const plates = new Map([['veh_1', 'BG-123-AA']]);
  const lastKnown = new Map([['veh_1', 184_290]]);

  it('warns about a start below the last known reading or far above it', () => {
    expect(
      odometerWarnings(
        [
          {
            vehicleId: 'veh_1',
            garageStartKm: null,
            startKm: 184_000,
            endKm: null,
            garageEndKm: null,
          },
        ],
        plates,
        lastKnown,
      ),
    ).toEqual([expect.stringContaining('manja od poslednje poznate')]);
    expect(
      odometerWarnings(
        [
          {
            vehicleId: 'veh_1',
            garageStartKm: null,
            startKm: 190_000,
            endKm: null,
            garageEndKm: null,
          },
        ],
        plates,
        lastKnown,
      ),
    ).toEqual([expect.stringContaining('veća od poslednje poznate')]);
  });

  it('says nothing about a plausible reading', () => {
    expect(
      odometerWarnings(
        [
          {
            vehicleId: 'veh_1',
            garageStartKm: null,
            startKm: 184_350,
            endKm: null,
            garageEndKm: null,
          },
        ],
        plates,
        lastKnown,
      ),
    ).toEqual([]);
  });
});

describe('odometerFloorIssues', () => {
  const plates = new Map([['veh_1', 'BG-123-AA']]);
  const reading = (garageStartKm: number | null, startKm: number | null) => ({
    vehicleId: 'veh_1',
    garageStartKm,
    startKm,
    endKm: null,
    garageEndKm: null,
  });

  it('refuses any reading below what the vehicle showed before the trip day', () => {
    expect(odometerFloorIssues([reading(950, 1000)], plates, new Map([['veh_1', 990]]))).toEqual([
      expect.stringContaining('BG-123-AA: kilometraža ne može biti manja od trenutne'),
    ]);
  });

  it('accepts readings at or above it, and anything when nothing is known', () => {
    expect(odometerFloorIssues([reading(990, 1000)], plates, new Map([['veh_1', 990]]))).toEqual(
      [],
    );
    expect(odometerFloorIssues([reading(5, 10)], plates, new Map([['veh_1', null]]))).toEqual([]);
  });
});

describe('submitDriverReport', () => {
  it('writes odometer readings at once and stores expenses as pending', async () => {
    prismaMock.trip.findFirst.mockResolvedValue(tripRecord());

    const result = await submitDriverReport(
      'drv_1',
      'trip_1',
      {
        vehicles: [
          {
            vehicleId: 'veh_1',
            garageStartKm: null,
            startKm: 184_350,
            endKm: 184_512,
            garageEndKm: null,
          },
        ],
        expenses: [
          {
            ...noFuel,
            id: null,
            category: 'TOLL',
            amount: 1_250,
            paymentMethod: 'CASH',
            note: null,
            fileId: null,
          },
        ],
        note: null,
        ...noTimes,
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
      [
        {
          vehicleId: 'veh_1',
          garageStartKm: null,
          startKm: 184_350,
          endKm: 184_512,
          garageEndKm: null,
        },
      ],
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
      submitDriverReport(
        'drv_1',
        'trip_1',
        { vehicles: [], expenses: [], note: null, ...noTimes },
        NOW,
      ),
    ).rejects.toThrow('Podaci se unose na dan vožnje ili posle nje.');
  });

  it('refuses a trip the driver is not on', async () => {
    prismaMock.trip.findFirst.mockResolvedValue(null);

    await expect(
      submitDriverReport(
        'drv_1',
        'trip_1',
        { vehicles: [], expenses: [], note: null, ...noTimes },
        NOW,
      ),
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
              ...noFuel,
              id: 'exp_1',
              category: 'TOLL',
              amount: 9_999,
              paymentMethod: 'CASH',
              note: null,
              fileId: null,
            },
          ],
          note: null,
          ...noTimes,
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
      { vehicles: [], expenses: [], note: 'Ispravljeno', ...noTimes },
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
              ...noFuel,
              id: null,
              category: 'FUEL',
              amount: 18_400,
              paymentMethod: 'COMPANY_CARD',
              note: null,
              fileId: 'file_1',
            },
          ],
          note: null,
          ...noTimes,
        },
        NOW,
      ),
    ).rejects.toThrow('Račun nije pronađen');
  });
});

describe('trip times from the driver', () => {
  const times = {
    startedAt: '2026-11-10T06:30',
    finishedAt: '2026-11-10T21:10',
    borderCrossings: [{ at: '2026-11-10T09:00', direction: 'OUT' as const }],
  };

  it('stores them on the report and fills the trip timeline for the per diem', async () => {
    prismaMock.trip.findFirst.mockResolvedValue(tripRecord());

    await submitDriverReport(
      'drv_1',
      'trip_1',
      { vehicles: [], expenses: [], note: null, ...times },
      NOW,
    );

    expect(prismaMock.driverTripReport.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        startedAt: '2026-11-10T06:30',
        finishedAt: '2026-11-10T21:10',
        borderCrossings: times.borderCrossings,
      }),
      select: { id: true },
    });
    expect(prismaMock.trip.update).toHaveBeenCalledWith({
      where: { id: 'trip_1' },
      data: {
        travelTimeline: {
          departureAt: '2026-11-10T06:30',
          returnAt: '2026-11-10T21:10',
          borderCrossings: times.borderCrossings,
        },
        travelTimelineSource: 'DRIVER',
      },
    });
  });

  it('never overwrites the timeline the office entered', async () => {
    prismaMock.trip.findFirst.mockResolvedValue(tripRecord({ travelTimelineSource: 'ADMIN' }));

    await submitDriverReport(
      'drv_1',
      'trip_1',
      { vehicles: [], expenses: [], note: null, ...times },
      NOW,
    );

    expect(prismaMock.trip.update).not.toHaveBeenCalled();
  });
});

describe('company cards on expenses', () => {
  const cardExpense = {
    ...noFuel,
    id: null,
    category: 'FUEL' as const,
    amount: 9_000,
    paymentMethod: 'COMPANY_CARD' as const,
    paymentCardId: 'card_omv',
    note: null,
    fileId: null,
  };

  it('keeps the card of a company-card payment', async () => {
    prismaMock.trip.findFirst.mockResolvedValue(tripRecord());
    prismaMock.paymentCard.count.mockResolvedValue(1);

    await submitDriverReport(
      'drv_1',
      'trip_1',
      { vehicles: [], expenses: [cardExpense], note: null, ...noTimes },
      NOW,
    );

    expect(prismaMock.driverTripReportExpense.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ paymentCardId: 'card_omv' }),
    });
  });

  it('refuses a card of another firm and drops a card on a cash payment', async () => {
    prismaMock.trip.findFirst.mockResolvedValue(tripRecord());
    prismaMock.paymentCard.count.mockResolvedValue(0);

    await expect(
      submitDriverReport(
        'drv_1',
        'trip_1',
        { vehicles: [], expenses: [cardExpense], note: null, ...noTimes },
        NOW,
      ),
    ).rejects.toThrow('kartica nije pronađena');

    await submitDriverReport(
      'drv_1',
      'trip_1',
      {
        vehicles: [],
        expenses: [{ ...cardExpense, paymentMethod: 'CASH' }],
        note: null,
        ...noTimes,
      },
      NOW,
    );
    expect(prismaMock.driverTripReportExpense.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ paymentMethod: 'CASH', paymentCardId: null }),
    });
  });
});

describe('assignment confirmation and advance', () => {
  it('records the confirmation once, also for an upcoming trip', async () => {
    prismaMock.trip.findFirst.mockResolvedValue(
      tripRecord({ departureDate: new Date('2026-11-12T00:00:00.000Z') }),
    );

    await confirmDriverTrip('drv_1', 'trip_1', NOW);

    expect(prismaMock.tripDriver.update).toHaveBeenCalledWith({
      where: { tripId_driverId: { tripId: 'trip_1', driverId: 'drv_1' } },
      data: { confirmedAt: NOW },
    });
    expect(auditMock).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'DRIVER_TRIP_CONFIRMED', actorUserId: null }),
    );

    vi.clearAllMocks();
    prismaMock.trip.findFirst.mockResolvedValue(
      tripRecord({ drivers: [{ confirmedAt: NOW, advanceAmount: null, advanceAcceptedAt: null }] }),
    );
    await confirmDriverTrip('drv_1', 'trip_1', NOW);
    expect(prismaMock.tripDriver.update).not.toHaveBeenCalled();
  });

  it('accepts an advance only when there is one', async () => {
    prismaMock.trip.findFirst.mockResolvedValue(
      tripRecord({
        drivers: [{ confirmedAt: null, advanceAmount: 20_000, advanceAcceptedAt: null }],
      }),
    );

    await acceptDriverAdvance('drv_1', 'trip_1', NOW);

    expect(prismaMock.tripDriver.update).toHaveBeenCalledWith({
      where: { tripId_driverId: { tripId: 'trip_1', driverId: 'drv_1' } },
      data: { advanceAcceptedAt: NOW },
    });

    prismaMock.trip.findFirst.mockResolvedValue(tripRecord());
    await expect(acceptDriverAdvance('drv_1', 'trip_1', NOW)).rejects.toThrow('nema akontacije');
  });
});
