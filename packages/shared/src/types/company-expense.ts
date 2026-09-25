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
  invoiceNumber: string | null;
  supplier: string;
  description: string;
  amount: number;
  amountWithoutVat: number;
  vatAmount: number;
  amountWithVat: number;
  paymentMethod: PaymentMethod;
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
  totalWithoutVat: number;
  totalVat: number;
  count: number;
}

export interface CompanyExpenseSuppliersDto {
  suppliers: string[];
}
