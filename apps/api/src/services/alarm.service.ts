import type {
  AlarmItemDto,
  AlarmKind,
  AlarmThresholdDto,
  AlarmThresholdsWriteRequest,
  AlarmsDto,
  AlarmThresholdsDto,
} from '@rental-admin/shared';
import {
  buildAlarmItem,
  countAlarms,
  DEFAULT_EXPIRY_THRESHOLDS,
  DRIVER_DOCUMENT_ALARM_KIND,
  INSPECTION_ALARM_KIND,
  mergeAlarmThresholds,
  SAFETY_EQUIPMENT_ALARM_KIND,
  sortAlarms,
  thresholdMap,
} from '@rental-admin/shared';

import { prisma } from '../config/prisma';

const toIsoDate = (value: Date): string => value.toISOString().slice(0, 10);

const todayUtcIso = (now = new Date()): string =>
  new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
    .toISOString()
    .slice(0, 10);

const vehicleLabel = (vehicle: {
  make: string;
  model: string;
  licensePlate: string;
}): string => `${vehicle.make} ${vehicle.model} (${vehicle.licensePlate})`;

const driverLabel = (driver: { firstName: string; lastName: string }): string =>
  `${driver.firstName} ${driver.lastName}`.trim();

const latestBy = <T>(
  rows: T[],
  key: (row: T) => string,
  issuedAt: (row: T) => string,
): T[] => {
  const map = new Map<string, T>();

  for (const row of rows) {
    const current = map.get(key(row));

    if (!current || issuedAt(row) > issuedAt(current)) {
      map.set(key(row), row);
    }
  }

  return [...map.values()];
};

const loadThresholds = async (): Promise<AlarmThresholdDto[]> => {
  const rows = await prisma.alarmThreshold.findMany();

  return mergeAlarmThresholds(
    rows.map((row) => ({
      kind: row.kind as AlarmKind,
      criticalDays: row.criticalDays,
      warningDays: row.warningDays,
    })),
  );
};

export const listAlarms = async (): Promise<AlarmsDto> => {
  const today = todayUtcIso();
  const thresholds = await loadThresholds();
  const byKind = thresholdMap(thresholds);
  const thresholdsFor = (kind: AlarmKind) => byKind[kind] ?? DEFAULT_EXPIRY_THRESHOLDS;

  const [documents, inspections, calibrations, equipment] = await Promise.all([
    prisma.driverDocument.findMany({
      where: { expiresAt: { not: null } },
      select: {
        id: true,
        type: true,
        issuedAt: true,
        expiresAt: true,
        driver: { select: { id: true, firstName: true, lastName: true } },
      },
    }),
    prisma.vehicleInspection.findMany({
      select: {
        id: true,
        type: true,
        inspectedAt: true,
        expiresAt: true,
        vehicle: { select: { id: true, make: true, model: true, licensePlate: true } },
      },
    }),
    prisma.tachographCalibration.findMany({
      select: {
        id: true,
        calibratedAt: true,
        expiresAt: true,
        vehicle: { select: { id: true, make: true, model: true, licensePlate: true } },
      },
    }),
    prisma.vehicleSafetyEquipment.findMany({
      select: {
        id: true,
        type: true,
        checkedAt: true,
        expiresAt: true,
        vehicle: { select: { id: true, make: true, model: true, licensePlate: true } },
      },
    }),
  ]);

  const items: AlarmItemDto[] = [];

  for (const document of latestBy(
    documents.filter((row) => row.expiresAt),
    (row) => `${row.driver.id}:${row.type}`,
    (row) => toIsoDate(row.issuedAt),
  )) {
    if (!document.expiresAt) {
      continue;
    }

    const kind = DRIVER_DOCUMENT_ALARM_KIND[document.type];
    items.push(
      buildAlarmItem({
        id: document.id,
        kind,
        expiresAt: toIsoDate(document.expiresAt),
        todayIso: today,
        thresholds: thresholdsFor(kind),
        href: `/drivers/${document.driver.id}`,
        driver: { id: document.driver.id, label: driverLabel(document.driver) },
      }),
    );
  }

  for (const inspection of latestBy(
    inspections,
    (row) => `${row.vehicle.id}:${row.type}`,
    (row) => toIsoDate(row.inspectedAt),
  )) {
    const kind = INSPECTION_ALARM_KIND[inspection.type];
    items.push(
      buildAlarmItem({
        id: inspection.id,
        kind,
        expiresAt: toIsoDate(inspection.expiresAt),
        todayIso: today,
        thresholds: thresholdsFor(kind),
        href: `/vehicles/${inspection.vehicle.id}`,
        vehicle: { id: inspection.vehicle.id, label: vehicleLabel(inspection.vehicle) },
      }),
    );
  }

  for (const calibration of latestBy(
    calibrations,
    (row) => row.vehicle.id,
    (row) => toIsoDate(row.calibratedAt),
  )) {
    items.push(
      buildAlarmItem({
        id: calibration.id,
        kind: 'VEHICLE_TACHOGRAPH',
        expiresAt: toIsoDate(calibration.expiresAt),
        todayIso: today,
        thresholds: thresholdsFor('VEHICLE_TACHOGRAPH'),
        href: `/vehicles/${calibration.vehicle.id}`,
        vehicle: { id: calibration.vehicle.id, label: vehicleLabel(calibration.vehicle) },
      }),
    );
  }

  for (const item of latestBy(
    equipment,
    (row) => `${row.vehicle.id}:${row.type}`,
    (row) => toIsoDate(row.checkedAt),
  )) {
    const kind = SAFETY_EQUIPMENT_ALARM_KIND[item.type];
    items.push(
      buildAlarmItem({
        id: item.id,
        kind,
        expiresAt: toIsoDate(item.expiresAt),
        todayIso: today,
        thresholds: thresholdsFor(kind),
        href: `/vehicles/${item.vehicle.id}`,
        vehicle: { id: item.vehicle.id, label: vehicleLabel(item.vehicle) },
      }),
    );
  }

  const sorted = sortAlarms(items);

  return {
    today,
    items: sorted,
    counts: countAlarms(sorted),
    thresholds,
  };
};

export const getAlarmThresholds = async (): Promise<AlarmThresholdsDto> => ({
  thresholds: await loadThresholds(),
});

export const updateAlarmThresholds = async (
  input: AlarmThresholdsWriteRequest,
): Promise<AlarmThresholdsDto> => {
  await prisma.$transaction(
    input.thresholds.map((row) =>
      prisma.alarmThreshold.upsert({
        where: { kind: row.kind },
        create: {
          kind: row.kind,
          criticalDays: row.criticalDays,
          warningDays: row.warningDays,
        },
        update: {
          criticalDays: row.criticalDays,
          warningDays: row.warningDays,
        },
      }),
    ),
  );

  return getAlarmThresholds();
};
