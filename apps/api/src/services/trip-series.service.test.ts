import { describe, expect, it, vi } from 'vitest';

vi.mock('../config/prisma', () => ({ prisma: {} }));
vi.mock('./transaction.service', () => ({ deleteOperationalTransaction: vi.fn() }));
vi.mock('./file-attachment.service', () => ({ deleteAttachedFile: vi.fn() }));

import { planSeriesShift, type ShiftableSeriesTrip } from './trip-series.service';

const day = (isoDate: string): Date => new Date(`${isoDate}T00:00:00.000Z`);

const seriesDay = (
  isoDate: string,
  overrides: Partial<ShiftableSeriesTrip> = {},
): ShiftableSeriesTrip => ({
  id: isoDate,
  departureDate: day(isoDate),
  returnDate: day(isoDate),
  invoiceSupplyDate: day('2026-11-30'),
  invoiceGroupId: 'series:s1:2026-11',
  paidAt: null,
  travelTimeline: null,
  perDiemDocumentNumber: null,
  ...overrides,
});

describe('planSeriesShift', () => {
  it('moves days, the monthly invoice and its supply date to another month', () => {
    const shifts = planSeriesShift(
      's1',
      'DAILY',
      [seriesDay('2026-11-16'), seriesDay('2026-11-30')],
      -61,
    );

    expect(shifts).toEqual([
      {
        id: '2026-11-16',
        departureDate: day('2026-09-16'),
        returnDate: day('2026-09-16'),
        invoiceSupplyDate: day('2026-09-30'),
        invoiceGroupId: 'series:s1:2026-09',
      },
      {
        id: '2026-11-30',
        departureDate: day('2026-09-30'),
        returnDate: day('2026-09-30'),
        invoiceSupplyDate: day('2026-09-30'),
        invoiceGroupId: 'series:s1:2026-09',
      },
    ]);
  });

  it('rejects a shift that splits one monthly invoice across two months', () => {
    expect(() =>
      planSeriesShift('s1', 'DAILY', [seriesDay('2026-11-16'), seriesDay('2026-11-30')], 10),
    ).toThrow('podelila na dva meseca');
  });

  it('rejects a shift that merges two monthly invoices into one month', () => {
    expect(() =>
      planSeriesShift(
        's1',
        'DAILY',
        [
          seriesDay('2026-10-20', { invoiceGroupId: 'series:s1:2026-10' }),
          seriesDay('2026-11-01', { invoiceSupplyDate: null, invoiceGroupId: 'series:s1:2026-11' }),
          seriesDay('2026-11-02', { invoiceSupplyDate: null, invoiceGroupId: 'series:s1:2026-11' }),
        ],
        -2,
      ),
    ).toThrow('spojile');
  });

  it('keeps weekly series on the same weekdays', () => {
    expect(() => planSeriesShift('s1', 'WEEKLY', [seriesDay('2026-11-16')], 3)).toThrow(
      'cele nedelje',
    );
  });

  it('refuses to move paid days or days with a per-diem calculation', () => {
    expect(() =>
      planSeriesShift('s1', 'DAILY', [seriesDay('2026-11-16', { paidAt: day('2026-11-20') })], 1),
    ).toThrow('plaćene');
    expect(() =>
      planSeriesShift('s1', 'DAILY', [seriesDay('2026-11-16', { travelTimeline: {} })], 1),
    ).toThrow('dnevnica');
  });
});
