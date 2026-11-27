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

/** "Dobro jutro" before 10, "Dobar dan" until 19, "Dobro veče" after. */
export const portalGreeting = (hour: number): string => {
  if (hour >= 3 && hour < 10) {
    return 'Dobro jutro';
  }

  return hour >= 10 && hour < 19 ? 'Dobar dan' : 'Dobro veče';
};

const WEEKDAYS = ['Nedelja', 'Ponedeljak', 'Utorak', 'Sreda', 'Četvrtak', 'Petak', 'Subota'];
const MONTHS = [
  'januar',
  'februar',
  'mart',
  'april',
  'maj',
  'jun',
  'jul',
  'avgust',
  'septembar',
  'oktobar',
  'novembar',
  'decembar',
];

/** "Petak, 27. novembar" */
export const portalDateLabel = (date: Date): string =>
  `${WEEKDAYS[date.getDay()] ?? ''}, ${date.getDate()}. ${MONTHS[date.getMonth()] ?? ''}`;

export const driverInitials = (firstName: string, lastName: string): string =>
  `${firstName.trim().charAt(0)}${lastName.trim().charAt(0)}`.toUpperCase();

const dayNumber = (isoDate: string): number => Date.parse(`${isoDate}T00:00:00Z`) / 86_400_000;

/** Which day of a multi-day trip today is: "dan 2 od 4". */
export const tripDayProgress = (
  trip: Pick<DriverPortalTripDto, 'departureDate' | 'returnDate'>,
  todayIso: string,
): { day: number; total: number } => {
  const start = dayNumber(trip.departureDate);
  const end = dayNumber(trip.returnDate ?? trip.departureDate);
  const total = Math.max(1, end - start + 1);
  const day = Math.min(total, Math.max(1, dayNumber(todayIso) - start + 1));

  return { day, total };
};

/** "25.–28.11." for a trip within one month, "30.11.–2.12." across months. */
export const shortDateRange = (
  trip: Pick<DriverPortalTripDto, 'departureDate' | 'returnDate'>,
): string => {
  const [, fromMonth = '', fromDay = ''] = trip.departureDate.split('-');
  const from = `${Number(fromDay)}.${Number(fromMonth)}.`;

  if (!trip.returnDate || trip.returnDate === trip.departureDate) {
    return from;
  }

  const [, toMonth = '', toDay = ''] = trip.returnDate.split('-');

  return fromMonth === toMonth
    ? `${Number(fromDay)}.–${Number(toDay)}.${Number(toMonth)}.`
    : `${from}–${Number(toDay)}.${Number(toMonth)}.`;
};

export const KM_STEP_FIELDS = ['garageStartKm', 'startKm', 'endKm', 'garageEndKm'] as const;

/** How many of the four odometer readings are in, over every vehicle on the trip. */
export const kmProgress = (
  vehicles: ReadonlyArray<Partial<Record<(typeof KM_STEP_FIELDS)[number], number | null>>>,
): { filled: number; total: number } => ({
  filled: vehicles.reduce(
    (sum, vehicle) =>
      sum + KM_STEP_FIELDS.filter((field) => typeof vehicle[field] === 'number').length,
    0,
  ),
  total: vehicles.length * KM_STEP_FIELDS.length,
});

/** The advance against cash the driver spent: what is left with them. Rejected costs don't count. */
export const advanceBalance = (
  advanceAmount: number | null,
  expenses: ReadonlyArray<{ amount: number; paymentMethod: string; status?: string }>,
): { received: number; cashSpent: number; remaining: number } => {
  const received = advanceAmount ?? 0;
  const cashSpent = expenses
    .filter((expense) => expense.paymentMethod === 'CASH' && expense.status !== 'REJECTED')
    .reduce((sum, expense) => sum + (Number.isFinite(expense.amount) ? expense.amount : 0), 0);

  return { received, cashSpent, remaining: received - cashSpent };
};

const amountFormatter = new Intl.NumberFormat('sr-Latn', { maximumFractionDigits: 2 });

/** "11.790" — amounts in the portal are always dinars, so the currency is written next to it. */
export const formatPortalAmount = (value: number): string => amountFormatter.format(value);

type KmStepField = (typeof KM_STEP_FIELDS)[number];

const finiteOrNull = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null;

/**
 * What is wrong with one vehicle's readings, per field: each must continue from the one before it
 * (garage → departure → drop-off → garage), and none may go under what the vehicle showed before
 * the trip day.
 */
export const kmReadingIssues = (
  values: Partial<Record<KmStepField, unknown>> | undefined,
  minKm: number | null,
): Partial<Record<KmStepField, string>> => {
  const issues: Partial<Record<KmStepField, string>> = {};
  let previous: number | null = null;

  for (const field of KM_STEP_FIELDS) {
    const value = finiteOrNull(values?.[field]);

    if (value === null) {
      continue;
    }

    if (previous !== null && value < previous) {
      issues[field] =
        `Mora biti najmanje ${formatKm(previous)}, koliko je uneto u prethodnom koraku.`;
    } else if (minKm !== null && value < minKm) {
      issues[field] = `Ne može biti manje od trenutne kilometraže (${formatKm(minKm)}).`;
    }

    previous = previous === null ? value : Math.max(previous, value);
  }

  return issues;
};
