import type { DriverDocumentStatusItem } from './driver-document';

export interface DriverMonthlyActivityDto {
  year: number;
  month: number;
  /** Sum of diesel `kmDriven` attributed to this driver in the month. */
  kmDriven: number;
  /**
   * Driving hours are not stored yet (no tachograph / timesheet import).
   * Always `null` until that domain exists.
   */
  hoursWorked: number | null;
  fuelLogCount: number;
}

export interface DriverStatusOverviewDto {
  documents: DriverDocumentStatusItem[];
  monthlyActivity: DriverMonthlyActivityDto;
}
