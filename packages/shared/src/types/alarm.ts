import {
  DRIVER_DOCUMENT_TYPE_LABELS,
  daysUntilExpiry,
  getDocumentExpiryUrgency,
  URGENCY_RANK,
  DEFAULT_EXPIRY_THRESHOLDS,
  type DriverDocumentType,
  type ExpiryThresholds,
} from './driver-document';
import { SAFETY_EQUIPMENT_TYPE_LABELS, type SafetyEquipmentType } from './vehicle-safety-equipment';
import { VEHICLE_INSPECTION_TYPE_LABELS, type VehicleInspectionType } from './vehicle-inspection';

export const ALARM_TOP_N = 8;

export const ALARM_CATEGORIES = ['DRIVER', 'VEHICLE'] as const;

export type AlarmCategory = (typeof ALARM_CATEGORIES)[number];

export const ALARM_CATEGORY_LABELS: Record<AlarmCategory, string> = {
  DRIVER: 'Vozač',
  VEHICLE: 'Vozilo',
};

export const ALARM_KINDS = [
  'DRIVER_EMPLOYMENT_CONTRACT',
  'DRIVER_MA_FORM',
  'DRIVER_MEDICAL_CERTIFICATE',
  'DRIVER_ACCREDITATION',
  'DRIVER_DRIVING_LICENSE',
  'DRIVER_LICENSE',
  'VEHICLE_INSPECTION_REGULAR',
  'VEHICLE_INSPECTION_SEMI_ANNUAL',
  'VEHICLE_INSPECTION_MONTHLY',
  'VEHICLE_TACHOGRAPH',
  'VEHICLE_FIRE_EXTINGUISHER',
  'VEHICLE_FIRST_AID_KIT',
] as const;

export type AlarmKind = (typeof ALARM_KINDS)[number];

export const ALARM_KIND_LABELS: Record<AlarmKind, string> = {
  DRIVER_EMPLOYMENT_CONTRACT: DRIVER_DOCUMENT_TYPE_LABELS.EMPLOYMENT_CONTRACT,
  DRIVER_MA_FORM: DRIVER_DOCUMENT_TYPE_LABELS.MA_FORM,
  DRIVER_MEDICAL_CERTIFICATE: DRIVER_DOCUMENT_TYPE_LABELS.MEDICAL_CERTIFICATE,
  DRIVER_ACCREDITATION: DRIVER_DOCUMENT_TYPE_LABELS.ACCREDITATION,
  DRIVER_DRIVING_LICENSE: DRIVER_DOCUMENT_TYPE_LABELS.DRIVING_LICENSE,
  DRIVER_LICENSE: DRIVER_DOCUMENT_TYPE_LABELS.LICENSE,
  VEHICLE_INSPECTION_REGULAR: `Tehnički pregled · ${VEHICLE_INSPECTION_TYPE_LABELS.REGULAR}`,
  VEHICLE_INSPECTION_SEMI_ANNUAL: `Tehnički pregled · ${VEHICLE_INSPECTION_TYPE_LABELS.SEMI_ANNUAL}`,
  VEHICLE_INSPECTION_MONTHLY: `Tehnički pregled · ${VEHICLE_INSPECTION_TYPE_LABELS.MONTHLY}`,
  VEHICLE_TACHOGRAPH: 'Kalibracija tahografa',
  VEHICLE_FIRE_EXTINGUISHER: SAFETY_EQUIPMENT_TYPE_LABELS.FIRE_EXTINGUISHER,
  VEHICLE_FIRST_AID_KIT: SAFETY_EQUIPMENT_TYPE_LABELS.FIRST_AID_KIT,
};

export const ALARM_KIND_GROUPS: Array<{ category: AlarmCategory; kinds: AlarmKind[] }> = [
  {
    category: 'DRIVER',
    kinds: [
      'DRIVER_EMPLOYMENT_CONTRACT',
      'DRIVER_MA_FORM',
      'DRIVER_MEDICAL_CERTIFICATE',
      'DRIVER_ACCREDITATION',
      'DRIVER_DRIVING_LICENSE',
      'DRIVER_LICENSE',
    ],
  },
  {
    category: 'VEHICLE',
    kinds: [
      'VEHICLE_INSPECTION_REGULAR',
      'VEHICLE_INSPECTION_SEMI_ANNUAL',
      'VEHICLE_INSPECTION_MONTHLY',
      'VEHICLE_TACHOGRAPH',
      'VEHICLE_FIRE_EXTINGUISHER',
      'VEHICLE_FIRST_AID_KIT',
    ],
  },
];

export const ALARM_URGENCIES = ['expired', 'critical', 'warning', 'ok'] as const;

export type AlarmUrgency = (typeof ALARM_URGENCIES)[number];

export const ALARM_URGENCY_LABELS: Record<AlarmUrgency, string> = {
  expired: 'Isteklo',
  critical: 'Crveno',
  warning: 'Žuto',
  ok: 'U roku',
};

export const DRIVER_DOCUMENT_ALARM_KIND: Record<DriverDocumentType, AlarmKind> = {
  EMPLOYMENT_CONTRACT: 'DRIVER_EMPLOYMENT_CONTRACT',
  MA_FORM: 'DRIVER_MA_FORM',
  MEDICAL_CERTIFICATE: 'DRIVER_MEDICAL_CERTIFICATE',
  ACCREDITATION: 'DRIVER_ACCREDITATION',
  DRIVING_LICENSE: 'DRIVER_DRIVING_LICENSE',
  LICENSE: 'DRIVER_LICENSE',
};

export const INSPECTION_ALARM_KIND: Record<VehicleInspectionType, AlarmKind> = {
  REGULAR: 'VEHICLE_INSPECTION_REGULAR',
  SEMI_ANNUAL: 'VEHICLE_INSPECTION_SEMI_ANNUAL',
  MONTHLY: 'VEHICLE_INSPECTION_MONTHLY',
};

export const SAFETY_EQUIPMENT_ALARM_KIND: Record<SafetyEquipmentType, AlarmKind> = {
  FIRE_EXTINGUISHER: 'VEHICLE_FIRE_EXTINGUISHER',
  FIRST_AID_KIT: 'VEHICLE_FIRST_AID_KIT',
};

export interface AlarmSubjectDto {
  id: string;
  label: string;
}

export interface AlarmItemDto {
  id: string;
  kind: AlarmKind;
  category: AlarmCategory;
  title: string;
  expiresAt: string;
  daysUntil: number;
  urgency: AlarmUrgency;
  href: string;
  driver: AlarmSubjectDto | null;
  vehicle: AlarmSubjectDto | null;
}

export interface AlarmThresholdDto {
  kind: AlarmKind;
  criticalDays: number;
  warningDays: number;
}

export interface AlarmCounts {
  expired: number;
  critical: number;
  warning: number;
  ok: number;
  total: number;
}

export interface AlarmsDto {
  today: string;
  items: AlarmItemDto[];
  counts: AlarmCounts;
  thresholds: AlarmThresholdDto[];
}

export interface AlarmThresholdsDto {
  thresholds: AlarmThresholdDto[];
}

export const defaultThresholdForKind = (kind: AlarmKind): AlarmThresholdDto => ({
  kind,
  criticalDays: DEFAULT_EXPIRY_THRESHOLDS.criticalDays,
  warningDays: DEFAULT_EXPIRY_THRESHOLDS.warningDays,
});

export const mergeAlarmThresholds = (rows: AlarmThresholdDto[]): AlarmThresholdDto[] => {
  const byKind = new Map(rows.map((row) => [row.kind, row]));

  return ALARM_KINDS.map((kind) => byKind.get(kind) ?? defaultThresholdForKind(kind));
};

export const thresholdMap = (rows: AlarmThresholdDto[]): Record<AlarmKind, ExpiryThresholds> => {
  const merged = mergeAlarmThresholds(rows);
  const map = {} as Record<AlarmKind, ExpiryThresholds>;

  for (const row of merged) {
    map[row.kind] = { criticalDays: row.criticalDays, warningDays: row.warningDays };
  }

  return map;
};

export const toAlarmUrgency = (
  expiresAt: string,
  todayIso: string,
  thresholds: ExpiryThresholds,
): AlarmUrgency => {
  const urgency = getDocumentExpiryUrgency(expiresAt, todayIso, thresholds);

  return urgency === 'none' ? 'ok' : urgency;
};

export const compareAlarmItems = (left: AlarmItemDto, right: AlarmItemDto): number => {
  const rank = URGENCY_RANK[left.urgency] - URGENCY_RANK[right.urgency];

  if (rank !== 0) {
    return rank;
  }

  return left.daysUntil - right.daysUntil || left.title.localeCompare(right.title, 'sr');
};

export const countAlarms = (items: AlarmItemDto[]): AlarmCounts => {
  const counts: AlarmCounts = { expired: 0, critical: 0, warning: 0, ok: 0, total: items.length };

  for (const item of items) {
    counts[item.urgency] += 1;
  }

  return counts;
};

export const sortAlarms = (items: AlarmItemDto[]): AlarmItemDto[] =>
  [...items].sort(compareAlarmItems);

export const topAlarms = (items: AlarmItemDto[], limit = ALARM_TOP_N): AlarmItemDto[] =>
  sortAlarms(items).slice(0, limit);

export const filterAlarms = (
  items: AlarmItemDto[],
  filters: {
    kind?: AlarmKind;
    category?: AlarmCategory;
    urgency?: AlarmUrgency;
    driverId?: string;
    vehicleId?: string;
  },
): AlarmItemDto[] =>
  items.filter((item) => {
    if (filters.kind && item.kind !== filters.kind) {
      return false;
    }

    if (filters.category && item.category !== filters.category) {
      return false;
    }

    if (filters.urgency && item.urgency !== filters.urgency) {
      return false;
    }

    if (filters.driverId && item.driver?.id !== filters.driverId) {
      return false;
    }

    if (filters.vehicleId && item.vehicle?.id !== filters.vehicleId) {
      return false;
    }

    return true;
  });

export const buildAlarmItem = (input: {
  id: string;
  kind: AlarmKind;
  expiresAt: string;
  todayIso: string;
  thresholds: ExpiryThresholds;
  href: string;
  driver?: AlarmSubjectDto | null;
  vehicle?: AlarmSubjectDto | null;
}): AlarmItemDto => {
  const daysUntil = daysUntilExpiry(input.expiresAt, input.todayIso);
  const category: AlarmCategory = input.kind.startsWith('DRIVER_') ? 'DRIVER' : 'VEHICLE';

  return {
    id: input.id,
    kind: input.kind,
    category,
    title: ALARM_KIND_LABELS[input.kind],
    expiresAt: input.expiresAt,
    daysUntil,
    urgency: toAlarmUrgency(input.expiresAt, input.todayIso, input.thresholds),
    href: input.href,
    driver: input.driver ?? null,
    vehicle: input.vehicle ?? null,
  };
};
