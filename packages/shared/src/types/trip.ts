import type { PartnerType } from './partner';
import type { PaymentMethod } from './transaction';

export const TRIP_STATUSES = ['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'FREE'] as const;

export type TripStatus = (typeof TRIP_STATUSES)[number];

export const TRIP_STATUS_LABELS: Record<TripStatus, string> = {
  PLANNED: 'Planirano',
  IN_PROGRESS: 'U toku',
  COMPLETED: 'Završeno',
  CANCELLED: 'Otkazano / Storno',
  FREE: 'Gratis',
};

export const TRIP_SERIES_FREQUENCIES = ['DAILY', 'WEEKLY'] as const;

export type TripSeriesFrequency = (typeof TRIP_SERIES_FREQUENCIES)[number];

export const TRIP_SERIES_FREQUENCY_LABELS: Record<TripSeriesFrequency, string> = {
  DAILY: 'Svaki dan',
  WEEKLY: 'Određeni dani u nedelji',
};

/** 0 = Sunday .. 6 = Saturday, matching JS `Date#getUTCDay()`. */
export const WEEKDAYS = [0, 1, 2, 3, 4, 5, 6] as const;

export const WEEKDAY_LABELS: Record<number, string> = {
  0: 'Nedelja',
  1: 'Ponedeljak',
  2: 'Utorak',
  3: 'Sreda',
  4: 'Četvrtak',
  5: 'Petak',
  6: 'Subota',
};

export const WEEKDAY_SHORT_LABELS: Record<number, string> = {
  0: 'Ned',
  1: 'Pon',
  2: 'Uto',
  3: 'Sre',
  4: 'Čet',
  5: 'Pet',
  6: 'Sub',
};

export interface TripVehicleDto {
  id: string;
  make: string;
  model: string;
  licensePlate: string;
}

/** Hard cap on drivers assigned to one trip (and therefore on per-diem rows). */
export const MAX_TRIP_DRIVERS = 3;

export interface TripDriverDto {
  id: string;
  firstName: string;
  lastName: string;
  perDiemAmount: number | null;
  advanceAmount: number | null;
}

export interface TripPartnerDto {
  id: string;
  type: PartnerType;
  companyName: string | null;
  firstName: string | null;
  lastName: string | null;
}

export interface TripContractDto {
  id: string;
  origin: string;
  destination: string;
}

/** A date range within the series that generation skips — e.g. collective annual leave. */
export interface TripSeriesPauseDto {
  id: string;
  startDate: string;
  endDate: string;
  reason: string | null;
}

export interface TripSeriesDto {
  id: string;
  name: string | null;
  frequency: TripSeriesFrequency;
  daysOfWeek: number[];
  startDate: string;
  endDate: string;
  isActive: boolean;
  terminatedAt: string | null;
  pauses: TripSeriesPauseDto[];
  createdAt: string;
  updatedAt: string;
}

export interface TripDto {
  id: string;
  /** Assigned once invoicing happens — most trips start out without one. */
  referenceNumber: string | null;
  departureDate: string;
  returnDate: string | null;
  country: string | null;
  origin: string;
  destination: string;
  passengerCount: number | null;
  partnerId: string | null;
  partner: TripPartnerDto | null;
  carrierId: string | null;
  carrier: TripPartnerDto | null;
  paidAt: string | null;
  clientName: string | null;
  notes: string | null;
  price: number | null;
  paymentMethod: PaymentMethod | null;
  status: TripStatus;
  contractId: string | null;
  contract: TripContractDto | null;
  distanceKm: number | null;
  seriesId: string | null;
  vehicles: TripVehicleDto[];
  drivers: TripDriverDto[];
  createdAt: string;
  updatedAt: string;
}

export interface DeleteTripResult {
  id: string;
  deleted: true;
}

export interface DeleteTripSeriesResult {
  id: string;
  deleted: true;
}

export interface GenerateTripSeriesResult {
  series: TripSeriesDto;
  trips: TripDto[];
  generatedCount: number;
}

export interface BulkUpdateTripSeriesResult {
  updatedCount: number;
}

export interface TerminateTripSeriesResult {
  series: TripSeriesDto;
  deletedCount: number;
}

/** "Polazište - Odredište" — the two-field split displayed as one route string. */
export const tripRouteLabel = (trip: Pick<TripDto, 'origin' | 'destination'>): string =>
  `${trip.origin} - ${trip.destination}`;

/** Registered partner if linked, otherwise the free-text client name. */
export const tripClientDisplayName = (trip: Pick<TripDto, 'partner' | 'clientName'>): string => {
  if (trip.partner) {
    return trip.partner.type === 'INDIVIDUAL'
      ? `${trip.partner.firstName ?? ''} ${trip.partner.lastName ?? ''}`.trim()
      : (trip.partner.companyName ?? '');
  }

  return trip.clientName ?? '';
};
