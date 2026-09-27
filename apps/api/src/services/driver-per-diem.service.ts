import {
  averageMonthlyEarnings,
  buildTravelHoursBreakdown,
  COMPANY,
  DOMESTIC_PER_DIEM_RATE_RSD,
  FOREIGN_PER_DIEM_RATE_EUR,
  isDomesticCountry,
  tripDistanceKm,
  utcMonthRangeIso,
  workingDaysInRange,
  type DriverPerDiemLedgerDto,
  type DriverStatisticsDto,
  type DriverTripPerDiemDto,
  type GenerateDriverMonthlyPayoutRequest,
  type GenerateDriverPerDiemDocumentRequest,
  type ListDriverPerDiemsQuery,
  type ListDriverStatisticsQuery,
  type TravelTimelineInput,
} from '@rental-admin/shared';

import { prisma } from '../config/prisma';
import type { Prisma } from '../generated/prisma/client';
import { badRequest, notFound } from '../utils/app-error';
import type { XlsxCell, XlsxSheet } from '../utils/xlsx';
import { buildXlsx } from '../utils/xlsx';
import { driverFullName, formatSerbianDate, formatSerbianMoney } from './pdf/format';
import { buildTravelDecisionPdf } from './pdf/travel-decision-pdf';

const parseDate = (isoDate: string): Date => new Date(`${isoDate}T00:00:00.000Z`);

const endOfDay = (isoDate: string): Date => new Date(`${isoDate}T23:59:59.999Z`);

const resolveRange = (query: { from?: string; to?: string }): { from: string; to: string } => {
  const fallback = utcMonthRangeIso();

  return {
    from: query.from ?? fallback.from,
    to: query.to ?? fallback.to,
  };
};

const assertDriverExists = async (driverId: string) => {
  const driver = await prisma.driver.findUnique({ where: { id: driverId } });

  if (!driver) {
    throw notFound('Zaposleni nije pronađen.');
  }

  return driver;
};

const parseStoredTimeline = (value: unknown): TravelTimelineInput | null => {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const record = value as Record<string, unknown>;
  const departureAt = typeof record.departureAt === 'string' ? record.departureAt : null;
  const returnAt = typeof record.returnAt === 'string' ? record.returnAt : null;
  const crossings = Array.isArray(record.borderCrossings) ? record.borderCrossings : [];

  if (!departureAt || !returnAt) {
    return null;
  }

  return {
    departureAt,
    returnAt,
    borderCrossings: crossings
      .map((item) => {
        if (!item || typeof item !== 'object') {
          return null;
        }

        const crossing = item as Record<string, unknown>;
        const at = typeof crossing.at === 'string' ? crossing.at : null;
        const direction = crossing.direction === 'OUT' || crossing.direction === 'IN' ? crossing.direction : null;

        return at && direction ? { at, direction } : null;
      })
      .filter((item): item is { at: string; direction: 'OUT' | 'IN' } => item != null),
  };
};

const vehicleLabel = (vehicle: { make: string; model: string; licensePlate: string }): string =>
  `${vehicle.licensePlate} (${vehicle.make} ${vehicle.model})`;

const mapTripRow = (assignment: {
  perDiemAmount: number | null;
  advanceAmount: number | null;
  trip: {
    id: string;
    departureDate: Date;
    returnDate: Date | null;
    origin: string;
    destination: string;
    country: string | null;
    distanceKm: number | null;
    startKm: number | null;
    endKm: number | null;
    travelTimeline: unknown;
    vehicles: Array<{ vehicle: { make: string; model: string; licensePlate: string } }>;
    drivers: Array<{ driverId: string }>;
    expenses: Array<{
      id: string;
      category: string;
      amount: number;
      paymentMethod: string;
      note: string | null;
    }>;
  };
}): DriverTripPerDiemDto => {
  const soleDriver = assignment.trip.drivers.length === 1;
  const expenses = soleDriver
    ? assignment.trip.expenses.map((expense) => ({
        id: expense.id,
        category: expense.category,
        amount: expense.amount,
        paymentMethod: expense.paymentMethod,
        note: expense.note,
      }))
    : null;
  const expensesTotal = expenses
    ? Math.round(expenses.reduce((sum, expense) => sum + expense.amount, 0) * 100) / 100
    : null;
  const advance = assignment.advanceAmount ?? 0;
  const advanceOutstanding =
    expensesTotal == null
      ? assignment.advanceAmount
      : Math.round(Math.max(0, advance - expensesTotal) * 100) / 100;

  return {
    tripId: assignment.trip.id,
    departureDate: assignment.trip.departureDate.toISOString().slice(0, 10),
    returnDate: assignment.trip.returnDate?.toISOString().slice(0, 10) ?? null,
    origin: assignment.trip.origin,
    destination: assignment.trip.destination,
    country: assignment.trip.country,
    isDomestic: isDomesticCountry(assignment.trip.country),
    vehicleLabels: assignment.trip.vehicles.map((row) => vehicleLabel(row.vehicle)),
    distanceKm: tripDistanceKm(assignment.trip),
    perDiemAmount: assignment.perDiemAmount,
    advanceAmount: assignment.advanceAmount,
    expenses,
    expensesTotal,
    advanceOutstanding,
    travelTimeline: parseStoredTimeline(assignment.trip.travelTimeline),
  };
};

export const getDriverPerDiemLedger = async (
  driverId: string,
  query: ListDriverPerDiemsQuery,
): Promise<DriverPerDiemLedgerDto> => {
  await assertDriverExists(driverId);
  const { from, to } = resolveRange(query);

  const rows = await prisma.tripDriver.findMany({
    where: {
      driverId,
      trip: {
        departureDate: { gte: parseDate(from), lte: endOfDay(to) },
      },
    },
    include: {
      trip: {
        include: {
          vehicles: {
            include: {
              vehicle: { select: { make: true, model: true, licensePlate: true } },
            },
          },
          drivers: { select: { driverId: true } },
          expenses: {
            select: {
              id: true,
              category: true,
              amount: true,
              paymentMethod: true,
              note: true,
            },
          },
        },
      },
    },
    orderBy: { trip: { departureDate: 'desc' } },
  });

  const trips = rows.map((row) => mapTripRow(row));

  return {
    from,
    to,
    trips,
    totals: {
      tripCount: trips.length,
      distanceKm: Math.round(trips.reduce((sum, trip) => sum + (trip.distanceKm ?? 0), 0) * 10) / 10,
      perDiemAmount:
        Math.round(trips.reduce((sum, trip) => sum + (trip.perDiemAmount ?? 0), 0) * 100) / 100,
      advanceAmount:
        Math.round(trips.reduce((sum, trip) => sum + (trip.advanceAmount ?? 0), 0) * 100) / 100,
    },
    rates: {
      domesticRsd: DOMESTIC_PER_DIEM_RATE_RSD,
      foreignEur: FOREIGN_PER_DIEM_RATE_EUR,
    },
  };
};

export const summarizeDriverTripKm = async (
  driverId: string,
  from: string,
  to: string,
): Promise<{ kmDriven: number; tripCount: number }> => {
  const rows = await prisma.tripDriver.findMany({
    where: {
      driverId,
      trip: {
        departureDate: { gte: parseDate(from), lte: endOfDay(to) },
      },
    },
    include: {
      trip: { select: { distanceKm: true, startKm: true, endKm: true } },
    },
  });

  const kmDriven =
    Math.round(rows.reduce((sum, row) => sum + (tripDistanceKm(row.trip) ?? 0), 0) * 10) / 10;

  return { kmDriven, tripCount: rows.length };
};

export const getDriverStatistics = async (
  driverId: string,
  query: ListDriverStatisticsQuery,
): Promise<DriverStatisticsDto> => {
  await assertDriverExists(driverId);
  const { from, to } = resolveRange(query);

  const rows = await prisma.tripDriver.findMany({
    where: {
      driverId,
      trip: {
        OR: [
          {
            departureDate: { gte: parseDate(from), lte: endOfDay(to) },
          },
          {
            returnDate: { gte: parseDate(from), lte: endOfDay(to) },
          },
          {
            AND: [
              { departureDate: { lte: endOfDay(to) } },
              {
                OR: [{ returnDate: null }, { returnDate: { gte: parseDate(from) } }],
              },
            ],
          },
        ],
      },
    },
    include: {
      trip: {
        select: {
          departureDate: true,
          returnDate: true,
          distanceKm: true,
          startKm: true,
          endKm: true,
        },
      },
    },
  });

  const year = Number(from.slice(0, 4));
  const yearFrom = `${year}-01-01`;
  const yearTo = `${year}-12-31`;

  const yearRows = await prisma.tripDriver.findMany({
    where: {
      driverId,
      trip: {
        departureDate: { gte: parseDate(yearFrom), lte: endOfDay(yearTo) },
      },
    },
    include: {
      trip: {
        select: {
          departureDate: true,
          returnDate: true,
          distanceKm: true,
          startKm: true,
          endKm: true,
        },
      },
    },
  });

  const workingDays = workingDaysInRange(
    rows.map((row) => ({
      from: row.trip.departureDate.toISOString().slice(0, 10),
      to: (row.trip.returnDate ?? row.trip.departureDate).toISOString().slice(0, 10),
    })),
    from,
    to,
  );

  const periodTrips = rows.filter((row) => {
    const day = row.trip.departureDate.toISOString().slice(0, 10);

    return day >= from && day <= to;
  });

  const distanceKm =
    Math.round(periodTrips.reduce((sum, row) => sum + (tripDistanceKm(row.trip) ?? 0), 0) * 10) / 10;
  const perDiemAmount =
    Math.round(periodTrips.reduce((sum, row) => sum + (row.perDiemAmount ?? 0), 0) * 100) / 100;

  const monthlyMap = new Map<
    string,
    { year: number; month: number; perDiemAmount: number; tripCount: number; distanceKm: number; days: Set<string> }
  >();

  for (let month = 1; month <= 12; month += 1) {
    const key = `${year}-${String(month).padStart(2, '0')}`;
    monthlyMap.set(key, {
      year,
      month,
      perDiemAmount: 0,
      tripCount: 0,
      distanceKm: 0,
      days: new Set(),
    });
  }

  for (const row of yearRows) {
    const departure = row.trip.departureDate.toISOString().slice(0, 10);
    const monthKey = departure.slice(0, 7);
    const bucket = monthlyMap.get(monthKey);

    if (!bucket) {
      continue;
    }

    bucket.tripCount += 1;
    bucket.perDiemAmount += row.perDiemAmount ?? 0;
    bucket.distanceKm += tripDistanceKm(row.trip) ?? 0;

    const end = (row.trip.returnDate ?? row.trip.departureDate).toISOString().slice(0, 10);
    const monthStart = `${monthKey}-01`;
    const monthEndDate = new Date(Date.UTC(bucket.year, bucket.month, 0));
    const monthEnd = monthEndDate.toISOString().slice(0, 10);
    let cursor = departure < monthStart ? monthStart : departure;
    const last = end > monthEnd ? monthEnd : end;

    while (cursor <= last) {
      bucket.days.add(cursor);
      const next = new Date(`${cursor}T12:00:00.000Z`);
      next.setUTCDate(next.getUTCDate() + 1);
      cursor = next.toISOString().slice(0, 10);
    }
  }

  const monthlyEarnings = [...monthlyMap.values()].map((bucket) => ({
    year: bucket.year,
    month: bucket.month,
    perDiemAmount: Math.round(bucket.perDiemAmount * 100) / 100,
    tripCount: bucket.tripCount,
    distanceKm: Math.round(bucket.distanceKm * 10) / 10,
    workingDays: bucket.days.size,
  }));

  return {
    from,
    to,
    distanceKm,
    workingDays,
    tripCount: periodTrips.length,
    perDiemAmount,
    monthlyEarnings,
    averageMonthlyEarnings: averageMonthlyEarnings(monthlyEarnings),
    rates: {
      domesticRsd: DOMESTIC_PER_DIEM_RATE_RSD,
      foreignEur: FOREIGN_PER_DIEM_RATE_EUR,
    },
  };
};

const loadTripForDriver = async (driverId: string, tripId: string) => {
  const assignment = await prisma.tripDriver.findUnique({
    where: { tripId_driverId: { tripId, driverId } },
    include: {
      trip: {
        include: {
          vehicles: {
            include: { vehicle: { select: { make: true, model: true, licensePlate: true } } },
          },
          drivers: { select: { driverId: true } },
        },
      },
      driver: true,
    },
  });

  if (!assignment) {
    throw notFound('Vožnja nije pronađena za ovog vozača.');
  }

  return assignment;
};

const hoursLabel = (hours: number): string => {
  const totalMinutes = Math.round(hours * 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;

  return `${h}:${String(m).padStart(2, '0')}`;
};

const buildOrderSheet = (params: {
  driverName: string;
  jobTitle: string;
  country: string;
  destination: string;
  departureDate: string;
  returnDate: string;
  documentNumber: string;
  year: string;
  advance: number;
  isDomestic: boolean;
  vehicleLabel: string;
}): XlsxSheet => ({
  name: params.documentNumber || 'Nalog',
  rows: [
    [COMPANY.legalName],
    [COMPANY.streetAddressShort.toUpperCase()],
    [COMPANY.city.toUpperCase()],
    [],
    [null, null, null, null, 'N  A  L  O  G'],
    [null, null, null, params.isDomestic ? 'ZA SLUŽBENI PUT U ZEMLJI' : 'ZA SLUŽBENI PUT U INOSTRANSTVO'],
    [],
    [null, null, null, null, 'BROJ', null, `${params.documentNumber}-${params.year}`],
    [],
    [null, 1, 'Ime i prezime zaposlenog koji putuje', null, null, null, null, params.driverName],
    [null, 2, 'Radno mesto', null, null, null, null, null, params.jobTitle],
    [null, 3, 'Cilj putovanja', null, null, null, null, null, params.jobTitle],
    [
      null,
      4,
      'Naziv države i mesto u koju putuje',
      null,
      null,
      null,
      null,
      null,
      `${params.country} / ${params.destination}`,
    ],
    [null, 5, 'Dan polaska na putovanje', null, null, null, null, null, formatSerbianDate(params.departureDate)],
    [
      null,
      6,
      'Trajenje putovanja u danima ( planiran )',
      null,
      null,
      null,
      null,
      null,
      params.returnDate === params.departureDate
        ? '1'
        : String(
            Math.max(
              1,
              Math.round(
                (Date.parse(`${params.returnDate}T00:00:00Z`) -
                  Date.parse(`${params.departureDate}T00:00:00Z`)) /
                  86_400_000,
              ) + 1,
            ),
          ),
    ],
    [null, 7, 'Prevozna sredstva koja se mogu koristiti', null, null, null, null, null, params.vehicleLabel],
    [
      null,
      8,
      'Zaposlenom pripada akontacija u iznosu od',
      null,
      null,
      null,
      null,
      null,
      params.isDomestic ? `${formatSerbianMoney(params.advance)} RSD` : `${params.advance} EUR`,
    ],
    [
      null,
      9,
      'Visina dnevnice u inostranstvu',
      null,
      null,
      null,
      null,
      `${FOREIGN_PER_DIEM_RATE_EUR} EURA`,
    ],
    [
      null,
      10,
      'Visina dnevnice u zemlji',
      null,
      null,
      null,
      `${DOMESTIC_PER_DIEM_RATE_RSD} DINARA`,
    ],
    [],
    [],
    [],
    [],
    [],
    [null, null, null, `U ${COMPANY.city}`, null, null, null, null, '___________________________'],
    [null, null, null, null, null, null, null, null, 'Nalogodavac-ovlašćeno lice'],
  ],
});

const buildSettlementSheet = (params: {
  driverName: string;
  vehicleLabel: string;
  documentNumber: string;
  year: string;
  orderNumber: string;
  breakdown: ReturnType<typeof buildTravelHoursBreakdown>;
}): XlsxSheet => {
  const byDate = new Map<string, { domestic: string[]; foreign: string[]; domesticHours: number; foreignHours: number }>();

  for (const segment of params.breakdown.daySegments) {
    const row = byDate.get(segment.date) ?? {
      domestic: [],
      foreign: [],
      domesticHours: 0,
      foreignHours: 0,
    };

    if (segment.zone === 'DOMESTIC') {
      row.domestic.push(`${segment.startTime}-${segment.endTime}`);
      row.domesticHours += segment.hours;
    } else {
      row.foreign.push(`${segment.startTime}-${segment.endTime}`);
      row.foreignHours += segment.hours;
    }

    byDate.set(segment.date, row);
  }

  const dayRows: XlsxCell[][] = [...byDate.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([date, row]) => [
      formatSerbianDate(date),
      row.domestic[0] ?? '',
      row.domestic[1] ?? '',
      hoursLabel(row.domesticHours),
      row.foreign[0] ?? '',
      row.foreign[1] ?? '',
      hoursLabel(row.foreignHours),
    ]);

  while (dayRows.length < 16) {
    dayRows.push(['', '', '', '', '', '', '']);
  }

  return {
    name: params.documentNumber || 'Obracun',
    rows: [
      [params.driverName, null, params.vehicleLabel],
      [],
      [
        'OBRAČUN DNEVNICE ZA SLUŽBENI PUT BROJ:',
        null,
        null,
        null,
        params.documentNumber,
        null,
        null,
        `-${params.year}`,
      ],
      [],
      [`PO PUTNOM NALOGU BROJ: ${params.orderNumber}`, null, null, null, 'OD', null, `${params.year}. GODINE`],
      ['DATUM', 'SRBIJA', null, 'SATI UKUPNO:', 'INOSTRANSTVO', null, 'SATI UKUPNO:'],
      [null, 'vreme 1', 'vreme 2', null, 'vreme 1', 'vreme 2', null],
      ...dayRows,
      [
        'UKUPNO:',
        hoursLabel(params.breakdown.domesticHours),
        null,
        null,
        hoursLabel(params.breakdown.foreignHours),
      ],
      [],
      [],
      [],
      [`BROJ DNEVNICA RSD:`, null, params.breakdown.domesticUnits],
      [`BROJ DNEVNICA INO:`, null, params.breakdown.foreignUnits],
      [],
      [],
      [`VREDNOST RSD DNEVNICE:`, null, DOMESTIC_PER_DIEM_RATE_RSD, 'DINARA'],
      [`VREDNOST INO DNEVNICE:`, null, FOREIGN_PER_DIEM_RATE_EUR, 'EURA'],
      [],
      [],
      [`UKUPAN IZNOS RSD DNEVNICE:`, null, params.breakdown.domesticAmountRsd, 'dinara'],
      [`UKUPAN IZNOS INO DNEVNICE:`, null, params.breakdown.foreignAmountEur, 'eura'],
      [],
      [`U ${COMPANY.city}`, null, null, `${params.year}. godine`],
      [],
      [
        'Pravilo sati: 0–6h = 0 dnevnica, 6–12h = 0,5 dnevnica, 12–24h = 1 dnevnica (posebno za zemlju i inostranstvo).',
      ],
      [
        `Neoporezivi iznosi: ${DOMESTIC_PER_DIEM_RATE_RSD} RSD (zemlja), ${FOREIGN_PER_DIEM_RATE_EUR} EUR (inostranstvo). Bez konverzije EUR/RSD.`,
      ],
    ],
  };
};

export const generateTravelDecision = async (
  driverId: string,
  input: GenerateDriverPerDiemDocumentRequest,
): Promise<{ buffer: Buffer; fileName: string; mimeType: string }> => {
  const assignment = await loadTripForDriver(driverId, input.tripId);
  const trip = assignment.trip;
  const domestic = isDomesticCountry(trip.country);
  const documentNumber = input.documentNumber ?? '1';
  const year = trip.departureDate.toISOString().slice(0, 4);
  const advance = input.advanceAmount ?? assignment.advanceAmount ?? 0;

  await prisma.trip.update({
    where: { id: trip.id },
    data: { travelTimeline: input.timeline as Prisma.InputJsonValue },
  });

  const buffer = await buildTravelDecisionPdf({
    driver: assignment.driver,
    trip,
    documentNumber,
    year,
    advance,
    isDomestic: domestic,
  });

  return {
    buffer,
    fileName: `Odluka-o-upucivanju-${documentNumber}-${year}.pdf`,
    mimeType: 'application/pdf',
  };
};

export const generateTravelOrder = async (
  driverId: string,
  input: GenerateDriverPerDiemDocumentRequest,
): Promise<{ buffer: Buffer; fileName: string; mimeType: string }> => {
  const assignment = await loadTripForDriver(driverId, input.tripId);
  const trip = assignment.trip;
  const documentNumber = input.documentNumber ?? '1';
  const year = trip.departureDate.toISOString().slice(0, 4);
  const advance = input.advanceAmount ?? assignment.advanceAmount ?? 0;
  const plate = trip.vehicles[0]?.vehicle.licensePlate ?? '—';

  await prisma.trip.update({
    where: { id: trip.id },
    data: { travelTimeline: input.timeline as Prisma.InputJsonValue },
  });

  const buffer = buildXlsx([
    buildOrderSheet({
      driverName: driverFullName(assignment.driver).toUpperCase(),
      jobTitle: assignment.driver.jobTitle,
      country: trip.country?.toUpperCase() ?? 'SRBIJA',
      destination: `${trip.origin} - ${trip.destination}`,
      departureDate: trip.departureDate.toISOString().slice(0, 10),
      returnDate: (trip.returnDate ?? trip.departureDate).toISOString().slice(0, 10),
      documentNumber,
      year,
      advance,
      isDomestic: isDomesticCountry(trip.country),
      vehicleLabel: plate,
    }),
  ]);

  return {
    buffer,
    fileName: `Nalog-za-sluzbeni-put-${documentNumber}-${year}.xlsx`,
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  };
};

export const generateTravelSettlement = async (
  driverId: string,
  input: GenerateDriverPerDiemDocumentRequest,
): Promise<{ buffer: Buffer; fileName: string; mimeType: string }> => {
  const assignment = await loadTripForDriver(driverId, input.tripId);
  const trip = assignment.trip;
  const documentNumber = input.documentNumber ?? '1';
  const year = trip.departureDate.toISOString().slice(0, 4);
  const plate = trip.vehicles[0]?.vehicle.licensePlate ?? '—';

  let breakdown;

  try {
    breakdown = buildTravelHoursBreakdown(input.timeline);
  } catch (error) {
    throw badRequest(error instanceof Error ? error.message : 'Vremenska linija puta nije ispravna.');
  }

  await prisma.trip.update({
    where: { id: trip.id },
    data: { travelTimeline: input.timeline as Prisma.InputJsonValue },
  });

  const buffer = buildXlsx([
    buildSettlementSheet({
      driverName: driverFullName(assignment.driver),
      vehicleLabel: plate,
      documentNumber,
      year,
      orderNumber: documentNumber,
      breakdown,
    }),
  ]);

  return {
    buffer,
    fileName: `Obracun-dnevnica-${documentNumber}-${year}.xlsx`,
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  };
};

export const generateMonthlyPayout = async (
  driverId: string,
  input: GenerateDriverMonthlyPayoutRequest,
): Promise<{ buffer: Buffer; fileName: string; mimeType: string }> => {
  const driver = await assertDriverExists(driverId);
  const yearFrom = `${input.year}-01-01`;
  const yearTo = `${input.year}-12-31`;
  const stats = await getDriverStatistics(driverId, { from: yearFrom, to: yearTo });

  const header: XlsxCell[] = ['R.B.', 'VOZAČ', 'MESEC'];
  const monthNames = [
    'JANUAR',
    'FEBRUAR',
    'MART',
    'APRIL',
    'MAJ',
    'JUN',
    'JUL',
    'AVGUST',
    'SEPTEMBAR',
    'OKTOBAR',
    'NOVEMBAR',
    'DECEMBAR',
  ];

  const monthHeader: XlsxCell[] = [null, null, ...monthNames.flatMap((name) => [name, null])];
  const currencyHeader: XlsxCell[] = [
    null,
    null,
    ...monthNames.flatMap(() => ['DINARA (uneseno)', 'EUR (obračun sati)']),
  ];

  const amounts: XlsxCell[] = [1, driverFullName(driver).toUpperCase()];

  for (const month of stats.monthlyEarnings) {
    amounts.push(month.perDiemAmount);
    amounts.push(null);
  }

  const buffer = buildXlsx([
    {
      name: `ISPLATA DNEVNICA ${input.year}`,
      rows: [
        header,
        monthHeader,
        currencyHeader,
        amounts,
        [],
        [
          'Napomena: kolona DINARA su unete dnevnice sa obračuna vožnji (RSD). Kolona EUR ostaje za ino obračun po satima (bez konverzije).',
        ],
        [
          `Neoporezivi deo: ${DOMESTIC_PER_DIEM_RATE_RSD} RSD / dan (zemlja), ${FOREIGN_PER_DIEM_RATE_EUR} EUR / dan (inostranstvo).`,
        ],
        [
          `Prosečna mesečna zarada (samo meseci sa isplatom): ${
            stats.averageMonthlyEarnings == null
              ? '—'
              : `${formatSerbianMoney(stats.averageMonthlyEarnings)} RSD`
          }`,
        ],
      ],
    },
  ]);

  return {
    buffer,
    fileName: `Isplata-dnevnica-${driver.lastName}-${input.year}.xlsx`,
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  };
};
