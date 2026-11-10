import type { TripExpenseCategory, TripExpensePaymentMethod } from './trip-expense';
import type { TripKmSource } from './trip';

/** Header the driver portal sends the personal link token in. */
export const DRIVER_ACCESS_HEADER = 'X-Driver-Token';

/** Driver portal sees trips this many days back and ahead of today. */
export const DRIVER_PORTAL_DAYS_BACK = 7;
export const DRIVER_PORTAL_DAYS_AHEAD = 7;

/** Most expenses a driver can report on one trip. */
export const MAX_DRIVER_REPORT_EXPENSES = 20;

/** A start reading this far above the last known one is probably a typo. */
export const DRIVER_KM_JUMP_WARNING = 2_000;

export const DRIVER_REPORT_STATUSES = [
  'SUBMITTED',
  'ACCEPTED',
  'PARTIALLY_ACCEPTED',
  'RETURNED',
] as const;
export type DriverReportStatus = (typeof DRIVER_REPORT_STATUSES)[number];

export const DRIVER_REPORT_STATUS_LABELS: Record<DriverReportStatus, string> = {
  SUBMITTED: 'Poslato',
  ACCEPTED: 'Prihvaćeno',
  PARTIALLY_ACCEPTED: 'Delimično prihvaćeno',
  RETURNED: 'Vraćeno',
};

export const DRIVER_REPORT_EXPENSE_STATUSES = ['PENDING', 'ACCEPTED', 'REJECTED'] as const;
export type DriverReportExpenseStatus = (typeof DRIVER_REPORT_EXPENSE_STATUSES)[number];

export const DRIVER_REPORT_EXPENSE_STATUS_LABELS: Record<DriverReportExpenseStatus, string> = {
  PENDING: 'Čeka prihvatanje',
  ACCEPTED: 'Prihvaćeno',
  REJECTED: 'Odbijeno',
};

/** A driver pays on the road in cash or with the company card; invoices go through the office. */
export const DRIVER_EXPENSE_PAYMENT_METHODS = [
  'CASH',
  'COMPANY_CARD',
] as const satisfies readonly TripExpensePaymentMethod[];
export type DriverExpensePaymentMethod = (typeof DRIVER_EXPENSE_PAYMENT_METHODS)[number];

/** Receipt photos and scans a driver may upload. */
export const DRIVER_RECEIPT_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
] as const;

export const isDriverReceiptMimeType = (value: string): boolean =>
  (DRIVER_RECEIPT_MIME_TYPES as readonly string[]).includes(value);

/** State of a driver's personal link, as the office sees it. The token itself is never shown again. */
export interface DriverAccessLinkDto {
  active: boolean;
  createdAt: string | null;
  lastUsedAt: string | null;
}

/** Returned once, when a link is created. The web app builds the URL from the token. */
export interface DriverAccessLinkCreatedDto {
  token: string;
  createdAt: string;
}

export interface DriverPortalMeDto {
  driver: { id: string; firstName: string; lastName: string };
  organizationName: string;
}

export interface DriverPortalVehicleDto {
  id: string;
  licensePlate: string;
  make: string;
  model: string;
  startKm: number | null;
  endKm: number | null;
  distanceKm: number | null;
  /** Highest odometer reading known before this trip; only filled on the trip detail. */
  lastKnownKm: number | null;
}

export interface DriverPortalExpenseDto {
  id: string;
  category: TripExpenseCategory;
  amount: number;
  paymentMethod: TripExpensePaymentMethod;
  note: string | null;
  file: { id: string; originalName: string } | null;
  status: DriverReportExpenseStatus;
}

export interface DriverPortalReportDto {
  id: string;
  status: DriverReportStatus;
  note: string | null;
  /** Why the office returned the report, if it did. */
  adminComment: string | null;
  submittedAt: string;
  updatedAt: string;
  reviewedAt: string | null;
  expenses: DriverPortalExpenseDto[];
}

export interface DriverPortalTripDto {
  id: string;
  departureDate: string;
  returnDate: string | null;
  origin: string;
  destination: string;
  /** Customer name only; no prices, invoices or contact details reach the driver. */
  clientName: string | null;
  vehicles: DriverPortalVehicleDto[];
  report: DriverPortalReportDto | null;
  /** False for a trip that has not started yet: nothing can be sent before the day of the trip. */
  canSubmit: boolean;
}

export interface DriverPortalTripListDto {
  /** Trips running today. */
  today: DriverPortalTripDto[];
  /** Finished trips with nothing sent yet, or returned by the office. */
  pending: DriverPortalTripDto[];
  /** Finished trips the driver already reported. */
  submitted: DriverPortalTripDto[];
  upcoming: DriverPortalTripDto[];
}

export interface DriverPortalReportResultDto {
  trip: DriverPortalTripDto;
  /** Readings that look wrong but were still saved, e.g. a start below the last known one. */
  warnings: string[];
}

export interface DriverPortalUploadDto {
  fileId: string;
  uploadUrl: string;
  expiresIn: number;
}

export interface DriverPortalFileDto {
  id: string;
  originalName: string;
}

/** Expense categories a driver can pick; per diems are settled by the office. */
export const DRIVER_EXPENSE_CATEGORIES = [
  'FUEL',
  'TOLL',
  'PARKING',
  'FOOD',
  'LODGING',
  'ROADSIDE_REPAIR',
  'VISA_PERMIT',
  'OTHER',
] as const satisfies readonly TripExpenseCategory[];

/** A driver report as the office reviews it. */
export interface DriverReportAdminExpenseDto {
  id: string;
  category: TripExpenseCategory;
  amount: number;
  paymentMethod: TripExpensePaymentMethod;
  note: string | null;
  status: DriverReportExpenseStatus;
  file: { id: string; originalName: string; mimeType: string } | null;
  /** The trip expense created when the office accepted it. */
  tripExpenseId: string | null;
}

export interface DriverReportAdminDto {
  id: string;
  status: DriverReportStatus;
  note: string | null;
  adminComment: string | null;
  submittedAt: string;
  updatedAt: string;
  reviewedAt: string | null;
  reviewedBy: { id: string; username: string } | null;
  driver: { id: string; firstName: string; lastName: string };
  trip: {
    id: string;
    departureDate: string;
    returnDate: string | null;
    origin: string;
    destination: string;
    clientName: string | null;
  };
  /** Readings as the driver sent them, with what is on the trip now. */
  vehicles: Array<{
    vehicleId: string;
    licensePlate: string;
    startKm: number | null;
    endKm: number | null;
    distanceKm: number | null;
    /** Who wrote the reading that is on the trip now. */
    currentKmSource: TripKmSource | null;
  }>;
  expenses: DriverReportAdminExpenseDto[];
  pendingCount: number;
  pendingTotal: number;
}
