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

export interface TripDriverDto {
  id: string;
  firstName: string;
  lastName: string;
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
  route: string;
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
  createdAt: string;
  updatedAt: string;
}

export interface TripDto {
  id: string;
  referenceNumber: string;
  departureDate: string;
  returnDate: string | null;
  country: string | null;
  route: string;
  partnerId: string | null;
  partner: TripPartnerDto | null;
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

/** Registered partner if linked, otherwise the free-text client name. */
export const tripClientDisplayName = (trip: Pick<TripDto, 'partner' | 'clientName'>): string => {
  if (trip.partner) {
    return trip.partner.type === 'INDIVIDUAL'
      ? `${trip.partner.firstName ?? ''} ${trip.partner.lastName ?? ''}`.trim()
      : (trip.partner.companyName ?? '');
  }

  return trip.clientName ?? '';
};
