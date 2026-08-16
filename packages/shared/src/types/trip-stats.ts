import type { PaymentMethod } from './transaction';
import type { TripStatus } from './trip';

export interface TripStatsQuery {
  from: string;
  to: string;
}

export interface TripStatusCount {
  status: TripStatus;
  count: number;
}

export interface TripMonthlyPoint {
  year: number;
  month: number;
  count: number;
  distanceKm: number;
  revenue: number;
}

export interface TripPaymentMethodTotal {
  paymentMethod: PaymentMethod;
  count: number;
  revenue: number;
}

export interface TripRouteCount {
  route: string;
  count: number;
}

export interface TripPartnerCount {
  /** Registered partner id, or null when every trip on this row used a free-text client name. */
  partnerId: string | null;
  label: string;
  count: number;
}

export interface TripStatsDto {
  from: string;
  to: string;
  totalTrips: number;
  totalDistanceKm: number;
  totalRevenue: number;
  byStatus: TripStatusCount[];
  byPaymentMethod: TripPaymentMethodTotal[];
  monthly: TripMonthlyPoint[];
  topRoutes: TripRouteCount[];
  topPartners: TripPartnerCount[];
}

export interface TripStatsRow {
  status: TripStatus;
  departureDate: string;
  route: string;
  price: number | null;
  paymentMethod: PaymentMethod | null;
  distanceKm: number | null;
  partnerId: string | null;
  partnerLabel: string | null;
  clientName: string | null;
}

const TOP_N = 10;

const toIsoDate = (value: Date): string => value.toISOString().slice(0, 10);

/** Inclusive UTC range covering the current calendar month through today. */
export const defaultTripStatsRange = (now = new Date()): { from: string; to: string } => {
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  const from = new Date(Date.UTC(year, month, 1));
  const to = new Date(Date.UTC(year, month, now.getUTCDate()));

  return { from: toIsoDate(from), to: toIsoDate(to) };
};

const monthKey = (departureDate: string): string => departureDate.slice(0, 7);

const listMonthsInclusive = (from: string, to: string): Array<{ year: number; month: number; key: string }> => {
  const start = new Date(`${from.slice(0, 7)}-01T00:00:00.000Z`);
  const end = new Date(`${to.slice(0, 7)}-01T00:00:00.000Z`);
  const months: Array<{ year: number; month: number; key: string }> = [];
  const cursor = new Date(start);

  while (cursor.getTime() <= end.getTime()) {
    const year = cursor.getUTCFullYear();
    const month = cursor.getUTCMonth() + 1;
    months.push({ year, month, key: `${year}-${String(month).padStart(2, '0')}` });
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }

  return months;
};

/** Builds the trips statistics payload from already date-filtered rows. */
export const buildTripStats = (rows: TripStatsRow[], from: string, to: string): TripStatsDto => {
  const statusCounts = new Map<TripStatus, number>();
  const paymentTotals = new Map<PaymentMethod, { count: number; revenue: number }>();
  const monthlyPoints = new Map<string, TripMonthlyPoint>();
  const routeCounts = new Map<string, number>();
  const partnerCounts = new Map<string, { partnerId: string | null; label: string; count: number }>();

  for (const month of listMonthsInclusive(from, to)) {
    monthlyPoints.set(month.key, { year: month.year, month: month.month, count: 0, distanceKm: 0, revenue: 0 });
  }

  let totalDistanceKm = 0;
  let totalRevenue = 0;

  for (const row of rows) {
    statusCounts.set(row.status, (statusCounts.get(row.status) ?? 0) + 1);

    const isCancelled = row.status === 'CANCELLED';
    const revenue = !isCancelled && row.price ? row.price : 0;
    const distance = row.distanceKm ?? 0;

    totalDistanceKm += distance;
    totalRevenue += revenue;

    if (row.paymentMethod && !isCancelled) {
      const bucket = paymentTotals.get(row.paymentMethod) ?? { count: 0, revenue: 0 };
      bucket.count += 1;
      bucket.revenue += revenue;
      paymentTotals.set(row.paymentMethod, bucket);
    }

    const key = monthKey(row.departureDate);
    const point = monthlyPoints.get(key);
    if (point) {
      point.count += 1;
      point.distanceKm += distance;
      point.revenue += revenue;
    }

    routeCounts.set(row.route, (routeCounts.get(row.route) ?? 0) + 1);

    const partnerKey = row.partnerId ?? `client:${row.clientName ?? ''}`;
    const partnerLabel = row.partnerLabel ?? row.clientName ?? '';
    if (partnerLabel) {
      const bucket = partnerCounts.get(partnerKey) ?? { partnerId: row.partnerId, label: partnerLabel, count: 0 };
      bucket.count += 1;
      partnerCounts.set(partnerKey, bucket);
    }
  }

  return {
    from,
    to,
    totalTrips: rows.length,
    totalDistanceKm,
    totalRevenue,
    byStatus: Array.from(statusCounts.entries()).map(([status, count]) => ({ status, count })),
    byPaymentMethod: Array.from(paymentTotals.entries()).map(([paymentMethod, split]) => ({
      paymentMethod,
      ...split,
    })),
    monthly: Array.from(monthlyPoints.values()).sort((a, b) => a.year - b.year || a.month - b.month),
    topRoutes: Array.from(routeCounts.entries())
      .map(([route, count]) => ({ route, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, TOP_N),
    topPartners: Array.from(partnerCounts.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, TOP_N),
  };
};
