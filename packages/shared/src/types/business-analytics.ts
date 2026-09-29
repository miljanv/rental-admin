export interface BusinessAnalyticsQuery {
  from: string;
  to: string;
}

export interface BusinessSummaryDto {
  tripCount: number;
  tripDistanceKm: number;
  invoicedRevenue: number;
  collectedRevenue: number;
  openReceivables: number;
  supplierDebt: number;
  supplierPaid: number;
  openPayables: number;
  fuelExpense: number;
  maintenanceExpense: number;
  tripExpense: number;
  driverPayouts: number;
  totalExpense: number;
  invoicedProfit: number;
  collectedProfit: number;
}

export interface VehicleAnalyticsRowDto {
  vehicleId: string;
  vehicleLabel: string;
  tripCount: number;
  distanceKm: number;
  invoicedRevenue: number;
  collectedRevenue: number;
  openReceivables: number;
  fuelExpense: number;
  maintenanceExpense: number;
  tripExpense: number;
  driverPayouts: number;
  totalExpense: number;
  invoicedProfit: number;
  collectedProfit: number;
}

export interface PartnerAnalyticsRowDto {
  partnerKey: string;
  partnerLabel: string;
  tripCount: number;
  invoicedRevenue: number;
  collectedRevenue: number;
  openReceivables: number;
}

export interface SupplierAnalyticsRowDto {
  supplierKey: string;
  supplierLabel: string;
  invoiceTotal: number;
  paidTotal: number;
  openTotal: number;
  fuelExpense: number;
  maintenanceExpense: number;
  transactionExpense: number;
}

export interface DriverAnalyticsRowDto {
  driverId: string;
  driverName: string;
  tripCount: number;
  distanceKm: number;
  perDiemAmount: number;
  advanceAmount: number;
  totalPayout: number;
}

export interface BusinessAnalyticsDto {
  from: string;
  to: string;
  summary: BusinessSummaryDto;
  vehicles: VehicleAnalyticsRowDto[];
  partners: PartnerAnalyticsRowDto[];
  suppliers: SupplierAnalyticsRowDto[];
  drivers: DriverAnalyticsRowDto[];
}
