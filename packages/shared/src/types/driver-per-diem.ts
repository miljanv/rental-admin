/**
 * Non-taxable per-diem ceilings (Serbian payroll practice as stated by the employer).
 * Domestic amounts stay in RSD. Foreign amounts stay in EUR — never convert.
 */
export const DOMESTIC_PER_DIEM_RATE_RSD = 3400;
export const FOREIGN_PER_DIEM_RATE_EUR = 90;

export const PER_DIEM_HOUR_BANDS = [
  { maxExclusive: 6, units: 0 },
  { maxExclusive: 12, units: 0.5 },
  { maxExclusive: 24, units: 1 },
] as const;

export type TravelZone = 'DOMESTIC' | 'FOREIGN';

export type BorderCrossingDirection = 'OUT' | 'IN';

/** OUT = leaving Serbia; IN = returning to Serbia. */
export interface BorderCrossingInput {
  at: string;
  direction: BorderCrossingDirection;
}

export interface TravelTimelineInput {
  /** Departure date+time (local wall clock as ISO without requiring Z). */
  departureAt: string;
  returnAt: string;
  borderCrossings: BorderCrossingInput[];
}

export interface TravelDaySegment {
  date: string;
  zone: TravelZone;
  startTime: string;
  endTime: string;
  hours: number;
}

export interface TravelHoursBreakdown {
  domesticHours: number;
  foreignHours: number;
  domesticUnits: number;
  foreignUnits: number;
  domesticAmountRsd: number;
  foreignAmountEur: number;
  daySegments: TravelDaySegment[];
}

export interface DriverTripExpenseLineDto {
  id: string;
  category: string;
  amount: number;
  paymentMethod: string;
  note: string | null;
}

export interface DriverTripPerDiemDto {
  tripId: string;
  departureDate: string;
  returnDate: string | null;
  origin: string;
  destination: string;
  country: string | null;
  isDomestic: boolean;
  vehicleLabels: string[];
  /** Trip distance attributed to this job (not split among drivers). */
  distanceKm: number | null;
  perDiemAmount: number | null;
  advanceAmount: number | null;
  /**
   * Trip expenses only when this driver is the sole driver on the trip.
   * Otherwise null — we do not invent a split of tour costs.
   */
  expenses: DriverTripExpenseLineDto[] | null;
  expensesTotal: number | null;
  /** Amount of advance still open after attributing sole-driver expenses. */
  advanceOutstanding: number | null;
  travelTimeline: TravelTimelineInput | null;
}

export interface DriverPerDiemLedgerDto {
  from: string;
  to: string;
  trips: DriverTripPerDiemDto[];
  totals: {
    tripCount: number;
    distanceKm: number;
    perDiemAmount: number;
    advanceAmount: number;
  };
  rates: {
    domesticRsd: number;
    foreignEur: number;
  };
}

export interface DriverMonthlyEarningsDto {
  year: number;
  month: number;
  perDiemAmount: number;
  tripCount: number;
  distanceKm: number;
  workingDays: number;
}

export interface DriverStatisticsDto {
  from: string;
  to: string;
  /** Km on trips in the selected period. */
  distanceKm: number;
  /**
   * Distinct calendar days covered by departure–return (inclusive),
   * clamped to the period. Overlapping trips do not double-count a day.
   */
  workingDays: number;
  tripCount: number;
  perDiemAmount: number;
  /**
   * Monthly per-diem totals for the selected year (or last 12 months when
   * the period spans years). Months with zero earnings are omitted from
   * `averageMonthlyEarnings`.
   */
  monthlyEarnings: DriverMonthlyEarningsDto[];
  /** Mean of months that have at least one paid per diem. */
  averageMonthlyEarnings: number | null;
  rates: {
    domesticRsd: number;
    foreignEur: number;
  };
}

export const isDomesticCountry = (country: string | null | undefined): boolean => {
  if (country == null) {
    return true;
  }

  const normalized = country.trim().toLowerCase();

  if (normalized.length === 0) {
    return true;
  }

  return (
    normalized === 'srbija' ||
    normalized === 'serbia' ||
    normalized === 'republic of serbia' ||
    normalized === 'republika srbija' ||
    normalized === 'rs'
  );
};

/**
 * Convert a continuous hour total into per-diem units.
 * Full 24h blocks count as 1 each; the remainder uses 0 / 0.5 / 1 bands.
 */
export const perDiemUnitsFromHours = (hours: number): number => {
  if (!Number.isFinite(hours) || hours <= 0) {
    return 0;
  }

  const fullDays = Math.floor(hours / 24);
  const remainder = hours - fullDays * 24;

  let remainderUnits = 0;

  if (remainder >= 12) {
    remainderUnits = 1;
  } else if (remainder >= 6) {
    remainderUnits = 0.5;
  }

  return fullDays + remainderUnits;
};

export const tripDistanceKm = (trip: {
  distanceKm: number | null;
  startKm: number | null;
  endKm: number | null;
}): number | null => {
  if (trip.distanceKm != null && Number.isFinite(trip.distanceKm)) {
    return trip.distanceKm;
  }

  if (
    trip.startKm != null &&
    trip.endKm != null &&
    Number.isFinite(trip.startKm) &&
    Number.isFinite(trip.endKm) &&
    trip.endKm >= trip.startKm
  ) {
    return Math.round((trip.endKm - trip.startKm) * 10) / 10;
  }

  return null;
};

const toUtcDay = (iso: string): string => iso.slice(0, 10);

const parseInstant = (value: string): Date => {
  const trimmed = value.trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return new Date(`${trimmed}T00:00:00`);
  }

  // Treat bare local datetimes as local wall clock (no forced Z).
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(trimmed) && !/[zZ]|[+-]\d{2}:?\d{2}$/.test(trimmed)) {
    return new Date(trimmed);
  }

  return new Date(trimmed);
};

const formatTime = (date: Date): string => {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  return `${hours}:${minutes}`;
};

const formatDay = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

const addDays = (day: string, amount: number): string => {
  const date = new Date(`${day}T12:00:00`);
  date.setDate(date.getDate() + amount);

  return formatDay(date);
};

/**
 * Distinct calendar days covered by [from, to] inclusive, clipped to [rangeFrom, rangeTo].
 */
export const workingDaysInRange = (
  windows: Array<{ from: string; to: string }>,
  rangeFrom: string,
  rangeTo: string,
): number => {
  const days = new Set<string>();

  for (const window of windows) {
    let cursor = toUtcDay(window.from);
    const end = toUtcDay(window.to);

    while (cursor <= end) {
      if (cursor >= rangeFrom && cursor <= rangeTo) {
        days.add(cursor);
      }

      cursor = addDays(cursor, 1);
    }
  }

  return days.size;
};

/**
 * Average of monthly per-diem totals. Months with zero are omitted.
 */
export const averageMonthlyEarnings = (months: Array<{ perDiemAmount: number }>): number | null => {
  const withPay = months.filter((month) => month.perDiemAmount > 0);

  if (withPay.length === 0) {
    return null;
  }

  const sum = withPay.reduce((total, month) => total + month.perDiemAmount, 0);

  return Math.round((sum / withPay.length) * 100) / 100;
};

interface TimelinePoint {
  at: Date;
  zoneAfter: TravelZone;
}

/**
 * Build day-by-day Serbia / abroad segments from departure, return and border crossings.
 * Starts in Serbia. OUT switches to FOREIGN; IN switches back to DOMESTIC.
 */
export const buildTravelHoursBreakdown = (timeline: TravelTimelineInput): TravelHoursBreakdown => {
  const departure = parseInstant(timeline.departureAt);
  const ret = parseInstant(timeline.returnAt);

  if (!(departure.getTime() < ret.getTime())) {
    throw new Error('Vreme povratka mora biti posle vremena polaska.');
  }

  const crossings = [...timeline.borderCrossings]
    .map((crossing) => ({
      at: parseInstant(crossing.at),
      direction: crossing.direction,
    }))
    .sort((left, right) => left.at.getTime() - right.at.getTime());

  for (const crossing of crossings) {
    if (crossing.at.getTime() <= departure.getTime() || crossing.at.getTime() >= ret.getTime()) {
      throw new Error('Prelaz granice mora biti između polaska i povratka.');
    }
  }

  const points: TimelinePoint[] = [{ at: departure, zoneAfter: 'DOMESTIC' }];
  let zone: TravelZone = 'DOMESTIC';

  for (const crossing of crossings) {
    zone = crossing.direction === 'OUT' ? 'FOREIGN' : 'DOMESTIC';
    points.push({ at: crossing.at, zoneAfter: zone });
  }

  const daySegments: TravelDaySegment[] = [];
  let domesticHours = 0;
  let foreignHours = 0;

  for (let index = 0; index < points.length; index += 1) {
    const start = points[index]!;
    const end = index + 1 < points.length ? points[index + 1]!.at : ret;
    const segmentZone = start.zoneAfter;

    let cursor = new Date(start.at);

    while (cursor.getTime() < end.getTime()) {
      const day = formatDay(cursor);
      const nextMidnight = new Date(`${addDays(day, 1)}T00:00:00`);
      const sliceEnd = nextMidnight.getTime() < end.getTime() ? nextMidnight : end;
      const hours = (sliceEnd.getTime() - cursor.getTime()) / (1000 * 60 * 60);
      const rounded = Math.round(hours * 100) / 100;

      if (rounded > 0) {
        daySegments.push({
          date: day,
          zone: segmentZone,
          startTime: formatTime(cursor),
          endTime:
            sliceEnd.getHours() === 0 &&
            sliceEnd.getMinutes() === 0 &&
            sliceEnd.getTime() > cursor.getTime()
              ? '24:00'
              : formatTime(sliceEnd),
          hours: rounded,
        });

        if (segmentZone === 'DOMESTIC') {
          domesticHours += rounded;
        } else {
          foreignHours += rounded;
        }
      }

      cursor = sliceEnd;
    }
  }

  domesticHours = Math.round(domesticHours * 100) / 100;
  foreignHours = Math.round(foreignHours * 100) / 100;

  const domesticUnits = perDiemUnitsFromHours(domesticHours);
  const foreignUnits = perDiemUnitsFromHours(foreignHours);

  return {
    domesticHours,
    foreignHours,
    domesticUnits,
    foreignUnits,
    domesticAmountRsd: Math.round(domesticUnits * DOMESTIC_PER_DIEM_RATE_RSD * 100) / 100,
    foreignAmountEur: Math.round(foreignUnits * FOREIGN_PER_DIEM_RATE_EUR * 100) / 100,
    daySegments,
  };
};

/** Domestic entered amount vs non-taxable ceiling. */
export const splitDomesticTaxable = (
  enteredRsd: number,
): { withinCap: number; aboveCap: number } => {
  if (!Number.isFinite(enteredRsd) || enteredRsd <= 0) {
    return { withinCap: 0, aboveCap: 0 };
  }

  const withinCap = Math.min(enteredRsd, DOMESTIC_PER_DIEM_RATE_RSD);
  const aboveCap = Math.max(0, enteredRsd - DOMESTIC_PER_DIEM_RATE_RSD);

  return {
    withinCap: Math.round(withinCap * 100) / 100,
    aboveCap: Math.round(aboveCap * 100) / 100,
  };
};
