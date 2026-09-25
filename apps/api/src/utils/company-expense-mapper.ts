import type { CompanyExpenseDto, PaymentMethod } from '@rental-admin/shared';

export interface CompanyExpenseVehicleRecord {
  id: string;
  make: string;
  model: string;
  licensePlate: string;
}

export interface CompanyExpenseRecord {
  id: string;
  issuedAt: Date;
  invoiceNumber: string | null;
  supplier: string;
  description: string;
  amount: number;
  amountWithoutVat: number;
  vatAmount: number;
  amountWithVat: number;
  paymentMethod: PaymentMethod;
  vehicleId: string | null;
  vehicle: CompanyExpenseVehicleRecord | null;
  odometerKm: number | null;
  createdAt: Date;
  updatedAt: Date;
}

const toIsoDate = (value: Date): string => value.toISOString().slice(0, 10);

export const toCompanyExpenseDto = (record: CompanyExpenseRecord): CompanyExpenseDto => ({
  id: record.id,
  issuedAt: toIsoDate(record.issuedAt),
  invoiceNumber: record.invoiceNumber,
  supplier: record.supplier,
  description: record.description,
  amount: record.amount,
  amountWithoutVat: record.amountWithoutVat,
  vatAmount: record.vatAmount,
  amountWithVat: record.amountWithVat,
  paymentMethod: record.paymentMethod,
  vehicleId: record.vehicleId,
  vehicle: record.vehicle
    ? {
        id: record.vehicle.id,
        make: record.vehicle.make,
        model: record.vehicle.model,
        licensePlate: record.vehicle.licensePlate,
      }
    : null,
  odometerKm: record.odometerKm,
  createdAt: record.createdAt.toISOString(),
  updatedAt: record.updatedAt.toISOString(),
});
