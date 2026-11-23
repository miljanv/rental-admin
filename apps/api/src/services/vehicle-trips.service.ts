import type {
  TripStatus,
  VehicleTripRevenueSource,
  VehicleTripRowDto,
  VehicleTripsMonthDto,
  VehicleTripsQuery,
  VehicleTripsSummaryDto,
  VehicleTripsTotalsDto,
} from '@rental-admin/shared';

import { prisma } from '../config/prisma';
import { notFound } from '../utils/app-error';

const parseDate = (isoDate: string): Date => new Date(`${isoDate}T00:00:00.000Z`);
const toIsoDate = (value: Date): string => value.toISOString().slice(0, 10);
const roundMoney = (value: number): number => Math.round(value * 100) / 100;
const roundKm = (value: number): number => Math.round(value * 10) / 10;

export interface TripVehicleKmInput {
  vehicleId: string;
  startKm: number | null;
  endKm: number | null;
  garageStartKm: number | null;
  garageEndKm: number | null;
}

export interface VehicleTripInput {
  id: string;
  referenceNumber: string | null;
  departureDate: string;
  returnDate: string | null;
  route: string;
  client: string;
  status: TripStatus;
  drivers: string[];
  distanceKm: number | null;
  startKm: number | null;
  endKm: number | null;
  price: number | null;
  invoiceGrossAmount: number | null;
  cashAmount: number | null;
  vehicles: TripVehicleKmInput[];
  /** Non-fuel trip expenses; fuel is counted through the vehicle's fuel logs. */
  expenseTotal: number;
}

export interface VehicleCostInput {
  date: string;
  amount: number;
  liters?: number;
}

const span = (start: number | null, end: number | null): number | null =>
  start !== null && end !== null && end >= start ? end - start : null;

/**
 * Km one vehicle drove on a trip: garage to garage when entered, else the job's own odometer
 * pair. A single-vehicle trip may fall back to the trip-level distance.
 */
export const tripVehicleKm = (
  trip: VehicleTripInput,
  vehicle: TripVehicleKmInput,
): number | null => {
  const own =
    span(vehicle.garageStartKm, vehicle.garageEndKm) ?? span(vehicle.startKm, vehicle.endKm);

  if (own !== null) {
    return own;
  }

  if (trip.vehicles.length <= 1) {
    return trip.distanceKm ?? span(trip.startKm, trip.endKm);
  }

  return null;
};

/**
 * Share of the trip that belongs to `vehicleId`: proportional to km when every assigned
 * vehicle has km, otherwise an equal split.
 */
export const tripVehicleShare = (trip: VehicleTripInput, vehicleId: string): number => {
  const count = Math.max(1, trip.vehicles.length);
  const kms = trip.vehicles.map((vehicle) => ({
    vehicleId: vehicle.vehicleId,
    km: tripVehicleKm(trip, vehicle),
  }));
  const total = kms.reduce((sum, row) => sum + (row.km ?? 0), 0);

  if (kms.some((row) => row.km === null) || total <= 0) {
    return 1 / count;
  }

  return (kms.find((row) => row.vehicleId === vehicleId)?.km ?? 0) / total;
};

export const tripRevenue = (
  trip: Pick<VehicleTripInput, 'status' | 'invoiceGrossAmount' | 'cashAmount' | 'price'>,
): { amount: number; source: VehicleTripRevenueSource } => {
  if (trip.status === 'FREE') {
    return { amount: 0, source: 'NONE' };
  }

  if (trip.invoiceGrossAmount !== null) {
    return { amount: trip.invoiceGrossAmount, source: 'INVOICE' };
  }

  if (trip.cashAmount !== null) {
    return { amount: trip.cashAmount, source: 'CASH' };
  }

  if (trip.price !== null) {
    return { amount: trip.price, source: 'PRICE' };
  }

  return { amount: 0, source: 'NONE' };
};

const monthsBetween = (from: string, to: string): string[] => {
  const months: string[] = [];
  let year = Number(from.slice(0, 4));
  let month = Number(from.slice(5, 7));
  const lastYear = Number(to.slice(0, 4));
  const lastMonth = Number(to.slice(5, 7));

  while (year < lastYear || (year === lastYear && month <= lastMonth)) {
    months.push(`${year}-${String(month).padStart(2, '0')}`);
    month += 1;

    if (month > 12) {
      month = 1;
      year += 1;
    }
  }

  return months;
};

const emptyMonth = (month: string): VehicleTripsMonthDto => ({
  month,
  tripCount: 0,
  km: 0,
  revenue: 0,
  estimatedRevenue: 0,
  tripExpenses: 0,
  fuelExpense: 0,
  maintenanceExpense: 0,
  totalExpense: 0,
  result: 0,
});

export const buildVehicleTripsSummary = (input: {
  vehicleId: string;
  from: string;
  to: string;
  trips: VehicleTripInput[];
  fuel: VehicleCostInput[];
  maintenance: VehicleCostInput[];
}): VehicleTripsSummaryDto => {
  const months = new Map(monthsBetween(input.from, input.to).map((m) => [m, emptyMonth(m)]));
  const monthOf = (date: string): VehicleTripsMonthDto => {
    const key = date.slice(0, 7);
    const existing = months.get(key);

    if (existing) {
      return existing;
    }

    const created = emptyMonth(key);
    months.set(key, created);
    return created;
  };

  let fuelLiters = 0;

  const trips: VehicleTripRowDto[] = input.trips.map((trip) => {
    const own = trip.vehicles.find((vehicle) => vehicle.vehicleId === input.vehicleId);
    const km = own ? tripVehicleKm(trip, own) : null;
    const share = tripVehicleShare(trip, input.vehicleId);
    const revenue = tripRevenue(trip);
    const revenueShare = roundMoney(revenue.amount * share);
    const expenseShare = roundMoney(trip.expenseTotal * share);
    const month = monthOf(trip.departureDate);

    month.tripCount += 1;
    month.km += km ?? 0;
    month.revenue += revenueShare;
    month.estimatedRevenue += revenue.source === 'PRICE' ? revenueShare : 0;
    month.tripExpenses += expenseShare;

    return {
      tripId: trip.id,
      referenceNumber: trip.referenceNumber,
      departureDate: trip.departureDate,
      returnDate: trip.returnDate,
      route: trip.route,
      client: trip.client,
      status: trip.status,
      drivers: trip.drivers,
      vehicleCount: Math.max(1, trip.vehicles.length),
      km: km === null ? null : roundKm(km),
      share: Math.round(share * 1000) / 1000,
      revenue: revenueShare,
      revenueSource: revenue.source,
      tripExpenses: expenseShare,
      result: roundMoney(revenueShare - expenseShare),
    };
  });

  for (const log of input.fuel) {
    monthOf(log.date).fuelExpense += log.amount;
    fuelLiters += log.liters ?? 0;
  }

  for (const record of input.maintenance) {
    monthOf(record.date).maintenanceExpense += record.amount;
  }

  const monthRows = [...months.values()]
    .sort((left, right) => left.month.localeCompare(right.month))
    .map((month) => {
      const totalExpense = month.tripExpenses + month.fuelExpense + month.maintenanceExpense;

      return {
        month: month.month,
        tripCount: month.tripCount,
        km: roundKm(month.km),
        revenue: roundMoney(month.revenue),
        estimatedRevenue: roundMoney(month.estimatedRevenue),
        tripExpenses: roundMoney(month.tripExpenses),
        fuelExpense: roundMoney(month.fuelExpense),
        maintenanceExpense: roundMoney(month.maintenanceExpense),
        totalExpense: roundMoney(totalExpense),
        result: roundMoney(month.revenue - totalExpense),
      };
    });

  const sum = (key: keyof Omit<VehicleTripsMonthDto, 'month'>): number =>
    monthRows.reduce((total, month) => total + month[key], 0);
  const km = roundKm(sum('km'));
  const revenue = roundMoney(sum('revenue'));
  const totalExpense = roundMoney(sum('totalExpense'));
  const totals: VehicleTripsTotalsDto = {
    tripCount: sum('tripCount'),
    km,
    revenue,
    estimatedRevenue: roundMoney(sum('estimatedRevenue')),
    tripExpenses: roundMoney(sum('tripExpenses')),
    fuelExpense: roundMoney(sum('fuelExpense')),
    fuelLiters: roundKm(fuelLiters),
    maintenanceExpense: roundMoney(sum('maintenanceExpense')),
    totalExpense,
    result: roundMoney(revenue - totalExpense),
    revenuePerKm: km > 0 ? roundMoney(revenue / km) : null,
    costPerKm: km > 0 ? roundMoney(totalExpense / km) : null,
  };

  return {
    from: input.from,
    to: input.to,
    totals,
    months: monthRows,
    trips: trips.sort(
      (left, right) =>
        right.departureDate.localeCompare(left.departureDate) ||
        left.tripId.localeCompare(right.tripId),
    ),
  };
};

const clientLabel = (trip: {
  clientName: string | null;
  partner: {
    type: string;
    companyName: string | null;
    firstName: string | null;
    lastName: string | null;
  } | null;
}): string => {
  if (trip.clientName?.trim()) {
    return trip.clientName.trim();
  }

  if (!trip.partner) {
    return 'Bez kupca';
  }

  const name =
    trip.partner.type === 'INDIVIDUAL'
      ? `${trip.partner.firstName ?? ''} ${trip.partner.lastName ?? ''}`.trim()
      : (trip.partner.companyName ?? '').trim();

  return name || 'Bez kupca';
};

/** Default period: the current calendar year. */
const defaultRange = (): { from: string; to: string } => {
  const year = new Date().getUTCFullYear();

  return { from: `${year}-01-01`, to: `${year}-12-31` };
};

export const getVehicleTripsSummary = async (
  vehicleId: string,
  query: VehicleTripsQuery,
): Promise<VehicleTripsSummaryDto> => {
  const vehicle = await prisma.vehicle.findUnique({
    where: { id: vehicleId },
    select: { id: true },
  });

  if (!vehicle) {
    throw notFound('Vozilo nije pronađeno.');
  }

  const defaults = defaultRange();
  const from = query.from ?? defaults.from;
  const to = query.to ?? defaults.to;
  const range = { gte: parseDate(from), lte: parseDate(to) };

  const [tripRows, fuelLogs, maintenance, companyExpenses] = await Promise.all([
    prisma.trip.findMany({
      where: {
        departureDate: range,
        status: { not: 'CANCELLED' },
        vehicles: { some: { vehicleId } },
      },
      select: {
        id: true,
        referenceNumber: true,
        departureDate: true,
        returnDate: true,
        origin: true,
        destination: true,
        clientName: true,
        status: true,
        distanceKm: true,
        startKm: true,
        endKm: true,
        price: true,
        invoiceGrossAmount: true,
        cashAmount: true,
        partner: { select: { type: true, companyName: true, firstName: true, lastName: true } },
        vehicles: {
          select: {
            vehicleId: true,
            startKm: true,
            endKm: true,
            garageStartKm: true,
            garageEndKm: true,
          },
        },
        drivers: { select: { driver: { select: { firstName: true, lastName: true } } } },
        expenses: { where: { category: { not: 'FUEL' } }, select: { amount: true } },
      },
    }),
    prisma.fuelLog.findMany({
      where: { vehicleId, fueledAt: range },
      select: { fueledAt: true, cost: true, litersFilled: true },
    }),
    prisma.vehicleMaintenance.findMany({
      where: { vehicleId, date: range },
      select: { date: true, cost: true },
    }),
    prisma.companyExpense.findMany({
      where: {
        vehicleId,
        OR: [{ supplyDate: range }, { supplyDate: null, issuedAt: range }],
      },
      select: { supplyDate: true, issuedAt: true, amountWithVat: true },
    }),
  ]);

  return buildVehicleTripsSummary({
    vehicleId,
    from,
    to,
    trips: tripRows.map((trip) => ({
      id: trip.id,
      referenceNumber: trip.referenceNumber,
      departureDate: toIsoDate(trip.departureDate),
      returnDate: trip.returnDate ? toIsoDate(trip.returnDate) : null,
      route: `${trip.origin} – ${trip.destination}`,
      client: clientLabel(trip),
      status: trip.status,
      drivers: trip.drivers.map(({ driver }) => `${driver.firstName} ${driver.lastName}`.trim()),
      distanceKm: trip.distanceKm,
      startKm: trip.startKm,
      endKm: trip.endKm,
      price: trip.price,
      invoiceGrossAmount: trip.invoiceGrossAmount,
      cashAmount: trip.cashAmount,
      vehicles: trip.vehicles,
      expenseTotal: trip.expenses.reduce((total, expense) => total + expense.amount, 0),
    })),
    fuel: fuelLogs.map((log) => ({
      date: toIsoDate(log.fueledAt),
      amount: log.cost ?? 0,
      liters: log.litersFilled,
    })),
    maintenance: [
      ...maintenance.map((record) => ({ date: toIsoDate(record.date), amount: record.cost })),
      ...companyExpenses.map((expense) => ({
        date: toIsoDate(expense.supplyDate ?? expense.issuedAt),
        amount: expense.amountWithVat,
      })),
    ],
  });
};
