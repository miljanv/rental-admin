import type { AlarmKind } from './alarm';
import type { SettlementTargetDto } from './transaction';
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

export interface DashboardOpenItemsDto {
  total: number;
  count: number;
  items: SettlementTargetDto[];
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
