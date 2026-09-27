import type { DriverDocumentStatusItem } from './driver-document';

export interface DriverMonthlyActivityDto {
  year: number;
  month: number;
  /** Sum of trip distances for this driver in the month. */
  kmDriven: number;
  /**
   * Driving hours are not stored yet (no tachograph / timesheet import).
   * Always `null` until that domain exists.
   */
  hoursWorked: number | null;
  /** Number of trips this driver drove in the month (legacy field name kept for clients). */
  fuelLogCount: number;
}

export interface DriverStatusOverviewDto {
  documents: DriverDocumentStatusItem[];
  monthlyActivity: DriverMonthlyActivityDto;
  /** Suggested delovodni broj for a new Obrazac MA (company-wide sequence). */
  nextMaDocumentNumber: string;
}
