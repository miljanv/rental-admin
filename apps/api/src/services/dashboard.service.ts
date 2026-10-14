import type {
  AlarmItemDto,
  DashboardExpiredItemsDto,
  DashboardFuelConsumptionDto,
  DashboardOpenCounterpartyDto,
  DashboardOpenItemsDto,
  DashboardStats,
  DashboardTodayTripDto,
  SettlementTargetDto,
} from '@rental-admin/shared';

import { prisma } from '../config/prisma';
import { listAlarms } from './alarm.service';
import { listAllSettlementTargets } from './transaction.service';

const DASHBOARD_LIST_LIMIT = 5;
const DASHBOARD_TIME_ZONE = 'Europe/Belgrade';

const round = (value: number, decimals = 2): number => {
  const factor = 10 ** decimals;

  return Math.round(value * factor) / factor;
};

const localDateParts = (now: Date): { year: number; month: number; day: number; iso: string } => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: DASHBOARD_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const value = (type: Intl.DateTimeFormatPartTypes): number =>
    Number(parts.find((part) => part.type === type)?.value ?? 0);
  const year = value('year');
  const month = value('month');
  const day = value('day');

  return {
    year,
    month,
    day,
    iso: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
  };
};

const toDatabaseDate = (year: number, month: number, day: number): Date =>
  new Date(Date.UTC(year, month - 1, day));

const partnerLabel = (trip: {
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

  if (trip.partner.type === 'INDIVIDUAL') {
    return `${trip.partner.firstName ?? ''} ${trip.partner.lastName ?? ''}`.trim() || 'Bez kupca';
  }

  return trip.partner.companyName?.trim() || 'Bez kupca';
};

const normalizeCounterparty = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLocaleLowerCase('sr-Latn');

export const summarizeOpenItems = (items: SettlementTargetDto[]): DashboardOpenItemsDto => {
  const grouped = new Map<string, DashboardOpenCounterpartyDto>();

  for (const item of items) {
    const normalizedName = normalizeCounterparty(item.counterparty) || 'bez-naziva';
    const counterpartyKey = item.counterpartyId
      ? `id:${item.counterpartyId}`
      : `name:${normalizedName}`;
    const current = grouped.get(counterpartyKey) ?? {
      counterpartyKey,
      counterpartyId: item.counterpartyId,
      counterparty: item.counterparty.trim() || 'Bez partnera',
      openItemCount: 0,
      latestIssuedAt: item.issuedAt,
      totalAmount: 0,
      allocatedAmount: 0,
      remainingAmount: 0,
    };

    current.openItemCount += 1;
    current.latestIssuedAt =
      item.issuedAt > current.latestIssuedAt ? item.issuedAt : current.latestIssuedAt;
    current.totalAmount += item.totalAmount;
    current.allocatedAmount += item.allocatedAmount;
    current.remainingAmount += item.remainingAmount;
    grouped.set(counterpartyKey, current);
  }

  const sorted = [...grouped.values()]
    .map((item) => ({
      ...item,
      totalAmount: round(item.totalAmount),
      allocatedAmount: round(item.allocatedAmount),
      remainingAmount: round(item.remainingAmount),
    }))
    .sort(
      (left, right) =>
        right.remainingAmount - left.remainingAmount ||
        left.counterparty.localeCompare(right.counterparty, 'sr'),
    );

  return {
    total: round(items.reduce((sum, item) => sum + item.remainingAmount, 0)),
    count: items.length,
    counterpartyCount: sorted.length,
    items: sorted,
  };
};

const summarizeExpired = (
  items: AlarmItemDto[],
  category: AlarmItemDto['category'],
): DashboardExpiredItemsDto => {
  const expired = items
    .filter((item) => item.category === category && item.daysUntil < 0)
    .sort((left, right) => right.expiresAt.localeCompare(left.expiresAt));

  return {
    total: expired.length,
    items: expired.slice(0, DASHBOARD_LIST_LIMIT).map((item) => ({
      id: item.id,
      kind: item.kind,
      subject: item.driver?.label ?? item.vehicle?.label ?? '—',
      title: item.title,
      expiresAt: item.expiresAt,
      daysOverdue: Math.abs(item.daysUntil),
      href: item.href,
    })),
  };
};

interface FuelRow {
  vehicleId: string;
  litersFilled: number;
  kmDriven: number | null;
  vehicle: { make: string; model: string; licensePlate: string };
}

export const summarizeVehicleFuelConsumption = (rows: FuelRow[]): DashboardFuelConsumptionDto[] => {
  const byVehicle = new Map<
    string,
    { vehicleLabel: string; fillUpCount: number; litersFilled: number; kmDriven: number }
  >();

  for (const row of rows) {
    if (row.kmDriven === null || row.kmDriven <= 0) {
      continue;
    }

    const current = byVehicle.get(row.vehicleId) ?? {
      vehicleLabel: `${row.vehicle.make} ${row.vehicle.model} · ${row.vehicle.licensePlate}`,
      fillUpCount: 0,
      litersFilled: 0,
      kmDriven: 0,
    };
    current.fillUpCount += 1;
    current.litersFilled += row.litersFilled;
    current.kmDriven += row.kmDriven;
    byVehicle.set(row.vehicleId, current);
  }

  return [...byVehicle.entries()]
    .map(([vehicleId, value]) => ({
      vehicleId,
      vehicleLabel: value.vehicleLabel,
      fillUpCount: value.fillUpCount,
      litersFilled: round(value.litersFilled),
      kmDriven: value.kmDriven,
      avgConsumptionPer100Km: round((value.litersFilled / value.kmDriven) * 100),
    }))
    .sort(
      (left, right) =>
        left.avgConsumptionPer100Km - right.avgConsumptionPer100Km ||
        left.vehicleLabel.localeCompare(right.vehicleLabel, 'sr'),
    );
};

export const getDashboardStats = async (now = new Date()): Promise<DashboardStats> => {
  const today = localDateParts(now);
  const todayDate = toDatabaseDate(today.year, today.month, today.day);
  const monthStart = toDatabaseDate(today.year, today.month, 1);
  const nextMonthStart = toDatabaseDate(today.year, today.month + 1, 1);

  const [todayTripTotal, tripRows, receivableRows, payableRows, alarms, fuelRows] =
    await Promise.all([
      prisma.trip.count({
        where: { departureDate: todayDate, status: { not: 'CANCELLED' } },
      }),
      prisma.trip.findMany({
        where: { departureDate: todayDate, status: { not: 'CANCELLED' } },
        select: {
          id: true,
          referenceNumber: true,
          origin: true,
          destination: true,
          clientName: true,
          status: true,
          partner: {
            select: { type: true, companyName: true, firstName: true, lastName: true },
          },
          vehicles: {
            select: { vehicle: { select: { licensePlate: true } } },
          },
          drivers: {
            select: { driver: { select: { firstName: true, lastName: true } } },
          },
        },
        orderBy: [{ referenceNumber: 'asc' }, { createdAt: 'asc' }],
      }),
      listAllSettlementTargets('INCOME'),
      listAllSettlementTargets('EXPENSE'),
      listAlarms(),
      prisma.fuelLog.findMany({
        where: {
          fuelType: 'DIESEL',
          fueledAt: { gte: monthStart, lt: nextMonthStart },
          kmDriven: { gt: 0 },
          consumptionPer100Km: { not: null },
        },
        select: {
          vehicleId: true,
          litersFilled: true,
          kmDriven: true,
          vehicle: { select: { make: true, model: true, licensePlate: true } },
        },
      }),
    ]);

  const todayTrips: DashboardTodayTripDto[] = tripRows.map((trip) => ({
    id: trip.id,
    referenceNumber: trip.referenceNumber,
    route: `${trip.origin} – ${trip.destination}`,
    client: partnerLabel(trip),
    status: trip.status,
    vehicles: trip.vehicles.map((assignment) => assignment.vehicle.licensePlate),
    drivers: trip.drivers.map((assignment) =>
      `${assignment.driver.firstName} ${assignment.driver.lastName}`.trim(),
    ),
  }));

  return {
    today: today.iso,
    todayTrips: { total: todayTripTotal, items: todayTrips },
    receivables: summarizeOpenItems(receivableRows),
    payables: summarizeOpenItems(payableRows),
    expiredDriverActivities: summarizeExpired(alarms.items, 'DRIVER'),
    expiredVehicleActivities: summarizeExpired(alarms.items, 'VEHICLE'),
    fuelConsumption: {
      from: monthStart.toISOString().slice(0, 10),
      to: today.iso,
      items: summarizeVehicleFuelConsumption(fuelRows),
    },
  };
};
