import { sumTripVehicleDistanceKm, type DriverReportAdminDto } from '@rental-admin/shared';

import { formatDateTime } from '@/lib/format';

const kmFormatter = new Intl.NumberFormat('sr-RS', { maximumFractionDigits: 1 });

export const formatReportKm = (value: number | null): string =>
  value === null ? '—' : `${kmFormatter.format(value)} km`;

/** Kilometers the driver reported across all vehicles, or null when none is complete. */
export const driverReportKm = (report: Pick<DriverReportAdminDto, 'vehicles'>): number | null =>
  sumTripVehicleDistanceKm(report.vehicles);

/** "Obrađeno (marko, 10. nov 2026, 14:05)" style suffix, empty parts left out. */
export const reviewedLabel = (
  report: Pick<DriverReportAdminDto, 'reviewedBy' | 'reviewedAt'>,
): string => {
  const parts = [
    report.reviewedBy?.username,
    report.reviewedAt ? formatDateTime(report.reviewedAt) : null,
  ].filter(Boolean);

  return parts.length > 0 ? `Unos je obrađen (${parts.join(', ')}).` : 'Unos je obrađen.';
};
