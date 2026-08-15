import {
  evaluateAetrCompliance,
  utcMonthRangeIso,
  type DriverWorkRecordsDto,
  type DriverWorkSummaryDto,
  type ListDriverWorkRecordsQuery,
} from '@rental-admin/shared';

import { prisma } from '../config/prisma';
import { notFound } from '../utils/app-error';
import { toDriverDriveDto, type DriverWorkFuelLogRecord } from '../utils/driver-work-mapper';

const parseDate = (isoDate: string): Date => new Date(`${isoDate}T00:00:00.000Z`);

const endOfDay = (isoDate: string): Date => new Date(`${isoDate}T23:59:59.999Z`);

const resolveRange = (query: ListDriverWorkRecordsQuery): { from: string; to: string } => {
  const fallback = utcMonthRangeIso();

  return {
    from: query.from ?? fallback.from,
    to: query.to ?? fallback.to,
  };
};

const assertDriverExists = async (driverId: string): Promise<void> => {
  const driver = await prisma.driver.findUnique({ where: { id: driverId }, select: { id: true } });

  if (!driver) {
    throw notFound('Vozač nije pronađen.');
  }
};

const dieselWhere = (driverId: string, from: string, to: string) => ({
  driverId,
  fuelType: 'DIESEL' as const,
  fueledAt: { gte: parseDate(from), lte: parseDate(to) },
});

export const summarizeDriverWork = async (
  driverId: string,
  from: string,
  to: string,
): Promise<DriverWorkSummaryDto> => {
  const where = dieselWhere(driverId, from, to);
  const [kmAggregate, driveCount] = await Promise.all([
    prisma.fuelLog.aggregate({
      where: { ...where, kmDriven: { not: null } },
      _sum: { kmDriven: true },
    }),
    prisma.fuelLog.count({ where }),
  ]);

  return {
    from,
    to,
    kmDriven: kmAggregate._sum.kmDriven ?? 0,
    hoursWorked: null,
    driveCount,
  };
};

export const getDriverWorkRecords = async (
  driverId: string,
  query: ListDriverWorkRecordsQuery,
): Promise<DriverWorkRecordsDto> => {
  await assertDriverExists(driverId);

  const { from, to } = resolveRange(query);
  const rangeStart = parseDate(from);
  const rangeEnd = endOfDay(to);

  const [summary, driveRecords, absences] = await Promise.all([
    summarizeDriverWork(driverId, from, to),
    prisma.fuelLog.findMany({
      where: dieselWhere(driverId, from, to),
      include: { vehicle: { select: { id: true, make: true, model: true, licensePlate: true } } },
      orderBy: { fueledAt: 'desc' },
    }),
    prisma.driverAbsenceAttestation.findMany({
      where: {
        driverId,
        periodTo: { gte: rangeStart },
        periodFrom: { lte: rangeEnd },
      },
      select: { periodFrom: true, periodTo: true, reason: true },
    }),
  ]);

  const drives = driveRecords.map((record: DriverWorkFuelLogRecord) => toDriverDriveDto(record));

  return {
    summary,
    drives,
    aetr: evaluateAetrCompliance(
      drives.map((drive) => drive.fueledAt),
      absences.map((absence) => ({
        periodFrom: absence.periodFrom.toISOString(),
        periodTo: absence.periodTo.toISOString(),
        reason: absence.reason,
      })),
    ),
  };
};
