import type { DriverExpensePaymentMethod } from './driver-portal';
import type { FuelLogFuelType } from './fuel-log';

/** A vehicle as the driver portal offers it in a picker. */
export interface DriverPortalVehicleOptionDto {
  id: string;
  licensePlate: string;
  make: string;
  model: string;
}

export interface WorkplaceFileDto {
  id: string;
  originalName: string;
}

// ---------------------------------------------------------------------------
// Faults (kvarovi)
// ---------------------------------------------------------------------------

export const VEHICLE_FAULT_STATUSES = ['REPORTED', 'IN_REPAIR', 'RESOLVED'] as const;
export type VehicleFaultStatus = (typeof VEHICLE_FAULT_STATUSES)[number];

export const VEHICLE_FAULT_STATUS_LABELS: Record<VehicleFaultStatus, string> = {
  REPORTED: 'Prijavljeno',
  IN_REPAIR: 'U popravci',
  RESOLVED: 'Rešeno',
};

export interface VehicleFaultDto {
  id: string;
  vehicle: DriverPortalVehicleOptionDto;
  driver: { id: string; name: string } | null;
  reportedAt: string;
  odometerKm: number;
  description: string;
  file: WorkplaceFileDto | null;
  status: VehicleFaultStatus;
  officeNote: string | null;
  resolvedAt: string | null;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Tools (zaduženje alata)
// ---------------------------------------------------------------------------

export const DRIVER_TOOL_STATUSES = [
  'PENDING',
  'CONFIRMED',
  'DECLINED',
  'LOST',
  'RETURNED',
] as const;
export type DriverToolStatus = (typeof DRIVER_TOOL_STATUSES)[number];

export const DRIVER_TOOL_SOURCES = ['OFFICE', 'DRIVER'] as const;
export type DriverToolSource = (typeof DRIVER_TOOL_SOURCES)[number];

export const DRIVER_TOOL_STATUS_LABELS: Record<DriverToolStatus, string> = {
  PENDING: 'Čeka potvrdu',
  CONFIRMED: 'Potvrđeno',
  DECLINED: 'Nije primljeno',
  LOST: 'Izgubljeno',
  RETURNED: 'Razduženo',
};

/** "Čeka vozača" or "Čeka kancelariju": who has to answer a pending tool. */
export const driverToolStatusLabel = (tool: {
  status: DriverToolStatus;
  source: DriverToolSource;
}): string =>
  tool.status === 'PENDING'
    ? tool.source === 'DRIVER'
      ? 'Čeka kancelariju'
      : 'Čeka vozača'
    : DRIVER_TOOL_STATUS_LABELS[tool.status];

export interface DriverToolDto {
  id: string;
  driverId: string;
  vehicle: { id: string; licensePlate: string } | null;
  name: string;
  quantity: number;
  source: DriverToolSource;
  status: DriverToolStatus;
  assignedAt: string;
  respondedAt: string | null;
  lostAt: string | null;
  lostNote: string | null;
  returnedAt: string | null;
  note: string | null;
}

// ---------------------------------------------------------------------------
// Free diesel entries (slobodan unos dizela)
// ---------------------------------------------------------------------------

export const DRIVER_FUEL_ENTRY_STATUSES = ['PENDING', 'ACCEPTED', 'REJECTED'] as const;
export type DriverFuelEntryStatus = (typeof DRIVER_FUEL_ENTRY_STATUSES)[number];

export const DRIVER_FUEL_ENTRY_STATUS_LABELS: Record<DriverFuelEntryStatus, string> = {
  PENDING: 'Poslato',
  ACCEPTED: 'Prihvaćeno',
  REJECTED: 'Odbijeno',
};

export interface DriverFuelEntryDto {
  id: string;
  driver: { id: string; name: string };
  vehicle: DriverPortalVehicleOptionDto;
  /** Local "yyyy-mm-ddTHH:mm". */
  fueledAt: string;
  odometerKm: number;
  liters: number;
  amount: number;
  fuelType: FuelLogFuelType;
  paymentMethod: DriverExpensePaymentMethod;
  paymentCard: { id: string; name: string } | null;
  file: WorkplaceFileDto | null;
  note: string | null;
  status: DriverFuelEntryStatus;
  rejectionReason: string | null;
  reviewedAt: string | null;
  createdAt: string;
}

/** A tool that needs the office, with whose it is. */
export interface DriverToolAttentionDto extends DriverToolDto {
  driverName: string;
}

/** What the office still has to look at, for the "Unosi vozača" badge. */
export interface DriverWorkplacePendingDto {
  faults: number;
  fuelEntries: number;
  tools: number;
}
