import type { AbsenceReason } from './absence-attestation';
import type { FuelLogFuelType } from './fuel-log';
import { addUtcDays } from './vehicle-inspection';

export const AETR_FINDING_CODES = ['DRIVE_DURING_ABSENCE', 'WEEKLY_REST_GAP'] as const;

export type AetrFindingCode = (typeof AETR_FINDING_CODES)[number];

export type AetrSeverity = 'warning' | 'breach';

export type AetrStatus = 'ok' | 'warning' | 'breach';

export const AETR_STATUS_LABELS: Record<AetrStatus, string> = {
  ok: 'Nema uočenih odstupanja',
  warning: 'Proveriti nedeljni odmor',
  breach: 'Sukob sa potvrdom o odsustvu',
};

export const AETR_FINDING_LABELS: Record<AetrFindingCode, string> = {
  DRIVE_DURING_ABSENCE:
    'Točenje je evidentirano tokom perioda pokrivenog potvrdom o odsustvu.',
  WEEKLY_REST_GAP:
    'Više od šest uzastopnih dana sa vožnjom, bez evidentiranog nedeljnog odmora.',
};

export interface AetrFinding {
  code: AetrFindingCode;
  severity: AetrSeverity;
  detail: string;
}

export interface AetrComplianceDto {
  status: AetrStatus;
  findings: AetrFinding[];
  /** Daily driving / rest hours cannot be checked without tachograph data. */
  hoursAvailable: false;
}

export interface DriverDriveDto {
  id: string;
  fueledAt: string;
  vehicleId: string;
  vehicleLabel: string;
  location: string;
  kmDriven: number | null;
  fuelType: FuelLogFuelType;
}

export interface DriverWorkSummaryDto {
  from: string;
  to: string;
  kmDriven: number;
  hoursWorked: number | null;
  driveCount: number;
}

export interface DriverWorkRecordsDto {
  summary: DriverWorkSummaryDto;
  drives: DriverDriveDto[];
  aetr: AetrComplianceDto;
}

export interface AetrAbsenceWindow {
  periodFrom: string;
  periodTo: string;
  reason: AbsenceReason;
}

const toUtcDay = (iso: string): string => iso.slice(0, 10);

export const utcMonthRangeIso = (now = new Date()): { from: string; to: string } => {
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  const from = new Date(Date.UTC(year, month, 1)).toISOString().slice(0, 10);
  const to = new Date(Date.UTC(year, month + 1, 0)).toISOString().slice(0, 10);

  return { from, to };
};

export const dayOverlapsPeriod = (day: string, periodFrom: string, periodTo: string): boolean => {
  const value = toUtcDay(day);

  return value >= toUtcDay(periodFrom) && value <= toUtcDay(periodTo);
};

export const longestConsecutiveDays = (isoDates: string[]): number => {
  const unique = [...new Set(isoDates.map(toUtcDay))].sort();

  if (unique.length === 0) {
    return 0;
  }

  let longest = 1;
  let current = 1;

  for (let index = 1; index < unique.length; index += 1) {
    const previous = unique[index - 1];
    const next = unique[index];

    if (!previous || !next) {
      continue;
    }

    if (addUtcDays(previous, 1) === next) {
      current += 1;
      longest = Math.max(longest, current);
    } else {
      current = 1;
    }
  }

  return longest;
};

/**
 * Best-effort AETR check from data we already store: diesel fill-up days
 * (proxy for driving) and absence attestations (documented rest / leave).
 * Daily 9h / 11h limits cannot be evaluated without tachograph timestamps.
 */
export const evaluateAetrCompliance = (
  driveDates: string[],
  absences: AetrAbsenceWindow[],
): AetrComplianceDto => {
  const findings: AetrFinding[] = [];
  const uniqueDriveDays = [...new Set(driveDates.map(toUtcDay))].sort();

  for (const day of uniqueDriveDays) {
    const conflict = absences.find((absence) =>
      dayOverlapsPeriod(day, absence.periodFrom, absence.periodTo),
    );

    if (conflict) {
      findings.push({
        code: 'DRIVE_DURING_ABSENCE',
        severity: 'breach',
        detail: day,
      });
    }
  }

  const streak = longestConsecutiveDays(uniqueDriveDays);

  if (streak >= 7) {
    findings.push({
      code: 'WEEKLY_REST_GAP',
      severity: 'warning',
      detail: String(streak),
    });
  }

  const status: AetrStatus = findings.some((finding) => finding.severity === 'breach')
    ? 'breach'
    : findings.some((finding) => finding.severity === 'warning')
      ? 'warning'
      : 'ok';

  return { status, findings, hoursAvailable: false };
};
