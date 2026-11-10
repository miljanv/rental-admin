import { beforeEach, describe, expect, it, vi } from 'vitest';

const { prismaMock, createTripExpenseMock, createFuelLogMock, auditMock } = vi.hoisted(() => {
  const mock = {
    driverTripReport: { findFirst: vi.fn(), update: vi.fn(), count: vi.fn() },
    tripDriver: { findMany: vi.fn() },
    driverTripReportExpense: { updateMany: vi.fn(), update: vi.fn(), findMany: vi.fn() },
    $transaction: vi.fn(),
  };

  return {
    prismaMock: mock,
    createTripExpenseMock: vi.fn(),
    createFuelLogMock: vi.fn(),
    auditMock: vi.fn(),
  };
});

vi.mock('../config/prisma', () => ({ prisma: prismaMock, prismaUnscoped: prismaMock }));
vi.mock('./trip-expense.service', () => ({ createTripExpense: createTripExpenseMock }));
vi.mock('./fuel-log.service', () => ({ createFuelLog: createFuelLogMock }));
vi.mock('./audit.service', () => ({ recordAuditEvent: auditMock }));
vi.mock('../utils/tenant-context', () => ({
  getTenantContext: () => ({ userId: 'user_1', organizationId: 'org_1' }),
}));

import {
  acceptDriverReport,
  listMissingDriverReports,
  returnDriverReport,
  reviewedReportStatus,
  toDriverReportAdminDto,
} from './driver-report.service';

const NOW = new Date('2026-11-10T09:00:00.000Z');

const expense = (overrides: Record<string, unknown> = {}) => ({
  id: 'exp_1',
  reportId: 'rep_1',
  category: 'TOLL',
  amount: 1_250,
  paymentMethod: 'CASH',
  note: null,
  fileId: 'file_1',
  status: 'PENDING',
  tripExpenseId: null,
  createdAt: NOW,
  updatedAt: NOW,
  file: { id: 'file_1', originalName: 'racun.jpg', mimeType: 'image/jpeg' },
  vehicleId: null,
  fuelLiters: null,
  fuelType: null,
  fuelOdometerKm: null,
  fuelStation: null,
  fuelLogId: null,
  ...overrides,
});

const report = (expenses = [expense()]) => ({
  id: 'rep_1',
  organizationId: 'org_1',
  tripId: 'trip_1',
  driverId: 'drv_1',
  note: null,
  status: 'SUBMITTED',
  adminComment: null,
  submittedAt: NOW,
  updatedAt: NOW,
  reviewedAt: null,
  reviewedById: null,
  reviewedBy: null,
  driver: { id: 'drv_1', firstName: 'Marko', lastName: 'Marković' },
  trip: {
    id: 'trip_1',
    departureDate: NOW,
    returnDate: null,
    origin: 'Čoka',
    destination: 'Novi Sad',
    clientName: null,
    partner: null,
    vehicles: [{ vehicleId: 'veh_1', kmSource: 'DRIVER', vehicle: { licensePlate: 'BG-1' } }],
  },
  vehicles: [{ vehicleId: 'veh_1', startKm: 100, endKm: 260 }],
  expenses,
});

beforeEach(() => {
  vi.clearAllMocks();
  prismaMock.$transaction.mockImplementation((work: (tx: typeof prismaMock) => unknown) =>
    work(prismaMock),
  );
  prismaMock.driverTripReport.findFirst.mockResolvedValue(report());
  prismaMock.driverTripReportExpense.updateMany.mockResolvedValue({ count: 1 });
  prismaMock.driverTripReportExpense.update.mockResolvedValue({});
  prismaMock.driverTripReportExpense.findMany.mockResolvedValue([{ status: 'ACCEPTED' }]);
  createTripExpenseMock.mockResolvedValue({ id: 'te_1' });
});

describe('reviewedReportStatus', () => {
  it('stays open while something is pending, otherwise reflects rejections', () => {
    expect(reviewedReportStatus(['ACCEPTED', 'PENDING'])).toBe('SUBMITTED');
    expect(reviewedReportStatus(['ACCEPTED', 'ACCEPTED'])).toBe('ACCEPTED');
    expect(reviewedReportStatus(['ACCEPTED', 'REJECTED'])).toBe('PARTIALLY_ACCEPTED');
    expect(reviewedReportStatus([])).toBe('ACCEPTED');
  });
});

describe('toDriverReportAdminDto', () => {
  it('adds plates, distances and the pending total', () => {
    const dto = toDriverReportAdminDto(report() as never);

    expect(dto.vehicles).toEqual([
      {
        vehicleId: 'veh_1',
        licensePlate: 'BG-1',
        startKm: 100,
        endKm: 260,
        distanceKm: 160,
        currentKmSource: 'DRIVER',
      },
    ]);
    expect(dto).toMatchObject({ pendingCount: 1, pendingTotal: 1_250 });
  });
});

describe('acceptDriverReport', () => {
  it('turns an accepted expense into a trip expense with the corrected amount', async () => {
    await acceptDriverReport('rep_1', {
      expenses: [{ id: 'exp_1', accept: true, amount: 1_840 }],
      comment: null,
    });

    expect(prismaMock.driverTripReportExpense.updateMany).toHaveBeenCalledWith({
      where: { id: 'exp_1', reportId: 'rep_1', status: 'PENDING' },
      data: { status: 'ACCEPTED', amount: 1_840 },
    });
    expect(createTripExpenseMock).toHaveBeenCalledWith('trip_1', {
      category: 'TOLL',
      amount: 1_840,
      paymentMethod: 'CASH',
      note: null,
      fileId: 'file_1',
    });
    expect(prismaMock.driverTripReportExpense.update).toHaveBeenCalledWith({
      where: { id: 'exp_1' },
      data: { tripExpenseId: 'te_1' },
    });
    expect(prismaMock.driverTripReport.update).toHaveBeenCalledWith({
      where: { id: 'rep_1' },
      data: expect.objectContaining({ status: 'ACCEPTED', reviewedById: 'user_1' }),
    });
  });

  it('rejects without creating anything', async () => {
    prismaMock.driverTripReportExpense.findMany.mockResolvedValue([{ status: 'REJECTED' }]);

    await acceptDriverReport('rep_1', {
      expenses: [{ id: 'exp_1', accept: false }],
      comment: null,
    });

    expect(createTripExpenseMock).not.toHaveBeenCalled();
    expect(prismaMock.driverTripReport.update).toHaveBeenCalledWith({
      where: { id: 'rep_1' },
      data: expect.objectContaining({ status: 'PARTIALLY_ACCEPTED' }),
    });
  });

  it('refuses an expense that was already handled, e.g. a second click', async () => {
    prismaMock.driverTripReport.findFirst.mockResolvedValue(
      report([expense({ status: 'ACCEPTED' })]),
    );

    await expect(
      acceptDriverReport('rep_1', { expenses: [{ id: 'exp_1', accept: true }], comment: null }),
    ).rejects.toThrow('već obrađen');
    expect(createTripExpenseMock).not.toHaveBeenCalled();
  });

  it('refuses when another request claimed the expense first', async () => {
    prismaMock.driverTripReportExpense.updateMany.mockResolvedValue({ count: 0 });

    await expect(
      acceptDriverReport('rep_1', { expenses: [{ id: 'exp_1', accept: true }], comment: null }),
    ).rejects.toThrow('već obrađen');
    expect(createTripExpenseMock).not.toHaveBeenCalled();
  });

  it('puts the expense back to pending when the trip expense cannot be created', async () => {
    createTripExpenseMock.mockRejectedValue(new Error('Vožnja nije pronađena.'));

    await expect(
      acceptDriverReport('rep_1', { expenses: [{ id: 'exp_1', accept: true }], comment: null }),
    ).rejects.toThrow('Vožnja nije pronađena.');
    expect(prismaMock.driverTripReportExpense.update).toHaveBeenCalledWith({
      where: { id: 'exp_1' },
      data: { status: 'PENDING' },
    });
  });

  it('refuses an expense from another report', async () => {
    await expect(
      acceptDriverReport('rep_1', { expenses: [{ id: 'exp_9', accept: true }], comment: null }),
    ).rejects.toThrow('ne pripada');
  });
});

describe('returnDriverReport', () => {
  it('sends the report back with the comment', async () => {
    await returnDriverReport('rep_1', { comment: 'Fali račun za putarinu.' });

    expect(prismaMock.driverTripReport.update).toHaveBeenCalledWith({
      where: { id: 'rep_1' },
      data: expect.objectContaining({
        status: 'RETURNED',
        adminComment: 'Fali račun za putarinu.',
      }),
    });
  });
});

describe('acceptDriverReport fuel log', () => {
  const fuelExpense = expense({
    category: 'FUEL',
    amount: 18_400,
    paymentMethod: 'COMPANY_CARD',
    vehicleId: 'veh_1',
    fuelLiters: 210.5,
    fuelType: 'DIESEL',
    fuelOdometerKm: 184_500,
    fuelStation: 'NIS Čoka',
  });

  it('records the fill-up without a cost, so the money is booked only once', async () => {
    prismaMock.driverTripReport.findFirst.mockResolvedValue(report([fuelExpense]));
    createFuelLogMock.mockResolvedValue({ id: 'fl_1' });

    await acceptDriverReport('rep_1', {
      expenses: [{ id: 'exp_1', accept: true, addFuelLog: true }],
      comment: null,
    });

    expect(createFuelLogMock).toHaveBeenCalledWith(
      expect.objectContaining({
        vehicleId: 'veh_1',
        litersFilled: 210.5,
        odometerKm: 184_500,
        driverId: 'drv_1',
        cost: null,
        paymentMethod: null,
        supplier: 'NIS Čoka',
      }),
    );
    expect(prismaMock.driverTripReportExpense.update).toHaveBeenCalledWith({
      where: { id: 'exp_1' },
      data: { fuelLogId: 'fl_1' },
    });
    expect(auditMock).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'DRIVER_REPORT_ACCEPTED', entityId: 'trip_1' }),
    );
  });

  it('keeps the accepted expense when the fuel log cannot be written', async () => {
    prismaMock.driverTripReport.findFirst.mockResolvedValue(report([fuelExpense]));
    createFuelLogMock.mockRejectedValue(new Error('Vozilo je deaktivirano.'));

    await expect(
      acceptDriverReport('rep_1', {
        expenses: [{ id: 'exp_1', accept: true, addFuelLog: true }],
        comment: null,
      }),
    ).resolves.toBeDefined();
    expect(createTripExpenseMock).toHaveBeenCalled();
  });

  it('refuses a fuel log for an expense without liters or km', async () => {
    await expect(
      acceptDriverReport('rep_1', {
        expenses: [{ id: 'exp_1', accept: true, addFuelLog: true }],
        comment: null,
      }),
    ).rejects.toThrow('nedostaju');
    expect(createTripExpenseMock).not.toHaveBeenCalled();
  });
});

describe('listMissingDriverReports', () => {
  const row = (tripId: string, driverId: string, reporters: string[], returnDate?: Date) => ({
    driver: { id: driverId, firstName: 'Marko', lastName: 'Marković' },
    trip: {
      id: tripId,
      departureDate: new Date('2026-11-08T00:00:00.000Z'),
      returnDate: returnDate ?? null,
      origin: 'Čoka',
      destination: 'Novi Sad',
      driverReports: reporters.map((id) => ({ driverId: id })),
    },
  });

  it('lists finished trips where that driver sent nothing', async () => {
    prismaMock.tripDriver.findMany.mockResolvedValue([
      row('trip_1', 'drv_1', []),
      row('trip_2', 'drv_1', ['drv_1']),
      row('trip_3', 'drv_2', ['drv_1']),
      row('trip_4', 'drv_1', [], new Date('2026-11-12T00:00:00.000Z')),
    ]);

    const missing = await listMissingDriverReports(NOW);

    expect(missing.map((entry) => entry.tripId)).toEqual(['trip_1', 'trip_3']);
  });
});
