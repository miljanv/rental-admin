import { API_ERROR_CODES, type DriverPortalTripDto } from '@rental-admin/shared';

import { parseApiError } from '@/lib/api-error';

/** The link was revoked, mistyped, or the driver is no longer active. */
export const isDriverLinkInvalid = (error: unknown): boolean =>
  parseApiError(error).code === API_ERROR_CODES.DRIVER_LINK_INVALID;

export const portalRouteLabel = (trip: Pick<DriverPortalTripDto, 'origin' | 'destination'>) =>
  `${trip.origin} → ${trip.destination}`;

const kmFormatter = new Intl.NumberFormat('sr-RS', { maximumFractionDigits: 1 });

export const formatKm = (value: number | null): string =>
  value === null ? '—' : `${kmFormatter.format(value)} km`;

/** Portal addresses keep the token in the path; every link inside the portal is built here. */
export const portalHref = (token: string, tripId?: string): string =>
  tripId
    ? `/v/${encodeURIComponent(token)}/${encodeURIComponent(tripId)}`
    : `/v/${encodeURIComponent(token)}`;
