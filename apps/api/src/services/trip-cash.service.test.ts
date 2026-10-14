import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../config/prisma', () => ({
  prisma: {
    $transaction: vi.fn(),
    trip: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    tripCashPayment: {
      aggregate: vi.fn(),
      create: vi.fn(),
    },
  },
}));
vi.mock('./transaction.service', () => ({ deleteOperationalTransaction: vi.fn() }));
vi.mock('./file-attachment.service', () => ({ deleteAttachedFile: vi.fn() }));

import { prisma } from '../config/prisma';
import { createTripCashPayment, listCashTripLedger } from './trip.service';

const paidAt = new Date('2026-10-14T00:00:00.000Z');

describe('cash trip ledger', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(prisma.$transaction).mockImplementation((callback) => {
      if (typeof callback !== 'function') throw new Error('Expected transaction callback');
      return callback(prisma);
    });
  });

  it('calculates charged, collected and remaining cash totals', async () => {
    vi.mocked(prisma.trip.findMany).mockResolvedValue([
      {
        id: 'trip-1',
        referenceNumber: 'RN-1',
        departureDate: new Date('2026-10-10T00:00:00.000Z'),
        cashRecordedAt: new Date('2026-10-10T00:00:00.000Z'),
        origin: 'Novi Sad',
        destination: 'Beograd',
        clientName: null,
        cashRecipient: 'Petar Petrović',
        cashAmount: 100_000,
        price: 100_000,
        partner: {
          type: 'COMPANY',
          companyName: 'Kupac DOO',
          firstName: null,
          lastName: null,
        },
        cashPayments: [
          {
            id: 'payment-1',
            tripId: 'trip-1',
            amount: 40_000,
            paidAt,
            note: 'Prva rata',
            createdAt: paidAt,
            updatedAt: paidAt,
          },
        ],
      },
    ] as never);

    const result = await listCashTripLedger({ page: 1, limit: 10, search: undefined });

    expect(result.summary).toEqual({
      tripCount: 1,
      totalCharged: 100_000,
      totalCollected: 40_000,
      totalRemaining: 60_000,
    });
    expect(result.items[0]).toMatchObject({
      customer: 'Kupac DOO',
      cashRecipient: 'Petar Petrović',
      status: 'PARTIAL',
      remainingAmount: 60_000,
    });
  });

  it('marks a cash trip paid only after the full remaining amount is collected', async () => {
    vi.mocked(prisma.trip.findUnique).mockResolvedValue({
      paymentMethod: 'CASH',
      cashRecordedAt: paidAt,
      cashAmount: 100_000,
      price: 100_000,
    } as never);
    vi.mocked(prisma.tripCashPayment.aggregate).mockResolvedValue({
      _sum: { amount: 40_000 },
    } as never);
    vi.mocked(prisma.tripCashPayment.create).mockResolvedValue({
      id: 'payment-2',
      tripId: 'trip-1',
      amount: 60_000,
      paidAt,
      note: null,
      createdAt: paidAt,
      updatedAt: paidAt,
    } as never);

    await createTripCashPayment('trip-1', {
      amount: 60_000,
      paidAt: '2026-10-14',
      note: null,
    });

    expect(prisma.trip.update).toHaveBeenCalledWith({
      where: { id: 'trip-1' },
      data: { paidAt },
    });
  });
});
