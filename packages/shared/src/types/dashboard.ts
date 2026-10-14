import type { AlarmKind } from './alarm';
import type { TripStatus } from './trip';

export interface DashboardTodayTripDto {
  id: string;
  referenceNumber: string | null;
  route: string;
  client: string;
  status: TripStatus;
  vehicles: string[];
  drivers: string[];
}

export interface DashboardTodayTripsDto {
  total: number;
  items: DashboardTodayTripDto[];
}

export interface DashboardOpenCounterpartyDto {
  counterpartyKey: string;
  counterpartyId: string | null;
  counterparty: string;
  openItemCount: number;
  latestIssuedAt: string;
  totalAmount: number;
  allocatedAmount: number;
  remainingAmount: number;
}

export interface DashboardOpenItemsDto {
  total: number;
  count: number;
  counterpartyCount: number;
  items: DashboardOpenCounterpartyDto[];
}

export interface DashboardExpiredItemDto {
  id: string;
  kind: AlarmKind;
  subject: string;
  title: string;
  expiresAt: string;
  daysOverdue: number;
  href: string;
}

export interface DashboardExpiredItemsDto {
  total: number;
  items: DashboardExpiredItemDto[];
}

export interface DashboardFuelConsumptionDto {
  vehicleId: string;
  vehicleLabel: string;
  fillUpCount: number;
  litersFilled: number;
  kmDriven: number;
  avgConsumptionPer100Km: number;
}

export interface DashboardStats {
  today: string;
  todayTrips: DashboardTodayTripsDto;
  receivables: DashboardOpenItemsDto;
  payables: DashboardOpenItemsDto;
  expiredDriverActivities: DashboardExpiredItemsDto;
  expiredVehicleActivities: DashboardExpiredItemsDto;
  fuelConsumption: {
    from: string;
    to: string;
    items: DashboardFuelConsumptionDto[];
  };
}
