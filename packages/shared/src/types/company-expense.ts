import type { PaymentMethod } from './transaction';

export interface CompanyExpenseVehicleDto {
  id: string;
  make: string;
  model: string;
  licensePlate: string;
}

export interface CompanyExpenseDto {
  id: string;
  issuedAt: string;
  paidAt: string | null;
  supplier: string;
  description: string;
  amount: number;
  paymentMethod: PaymentMethod | null;
  vehicleId: string | null;
  vehicle: CompanyExpenseVehicleDto | null;
  odometerKm: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface DeleteCompanyExpenseResult {
  id: string;
  deleted: true;
}

export interface CompanyExpenseSummaryDto {
  total: number;
  paidTotal: number;
  unpaidTotal: number;
  count: number;
  paidCount: number;
  unpaidCount: number;
}
