import { beforeEach, describe, expect, it, vi } from 'vitest';

const { prismaMock, createTripExpenseMock } = vi.hoisted(() => {
  const mock = {
    driverTripReport: { findFirst: vi.fn(), update: vi.fn() },
    driverTripReportExpense: { updateMany: vi.fn(), update: vi.fn(), findMany: vi.fn() },
    $transaction: vi.fn(),
  };

  return { prismaMock: mock, createTripExpenseMock: vi.fn() };
});

vi.mock('../config/prisma', () => ({ prisma: prismaMock, prismaUnscoped: prismaMock }));
vi.mock('./trip-expense.service', () => ({ createTripExpense: createTripExpenseMock }));
vi.mock('../utils/tenant-context', () => ({
  getTenantContext: () => ({ userId: 'user_1', organizationId: 'org_1' }),
}));

import {
  acceptDriverReport,
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
