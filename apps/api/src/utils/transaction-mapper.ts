import type {
  PaymentMethod,
  TransactionCategory,
  TransactionDto,
  TransactionDriverDto,
  TransactionSourceType,
  TransactionStatus,
  TransactionType,
} from '@rental-admin/shared';

export interface TransactionVehicleRecord {
  id: string;
  make: string;
  model: string;
  licensePlate: string;
}

export interface TransactionDriverRecord {
  id: string;
  firstName: string;
  lastName: string;
}

export interface FinanceTransactionRecord {
  id: string;
  type: TransactionType;
  category: TransactionCategory;
  amount: number;
  occurredAt: Date;
  paymentMethod: PaymentMethod;
  note: string | null;
  supplier: string | null;
  partner: string | null;
  route: string | null;
  vehicleId: string | null;
  driverId: string | null;
  contractId: string | null;
  isAdvance: boolean;
  status: TransactionStatus;
  linkedTransactionId: string | null;
  sourceType: TransactionSourceType;
  sourceId: string | null;
  createdAt: Date;
  updatedAt: Date;
  vehicle: TransactionVehicleRecord | null;
  driver: TransactionDriverRecord | null;
}

const toIsoDate = (value: Date): string => value.toISOString().slice(0, 10);

const toVehicleDto = (vehicle: TransactionVehicleRecord): TransactionDto['vehicle'] => ({
  id: vehicle.id,
  make: vehicle.make,
  model: vehicle.model,
  licensePlate: vehicle.licensePlate,
});

const toDriverDto = (driver: TransactionDriverRecord): TransactionDriverDto => ({
  id: driver.id,
  firstName: driver.firstName,
  lastName: driver.lastName,
});

export const toTransactionDto = (record: FinanceTransactionRecord): TransactionDto => ({
  id: record.id,
  type: record.type,
  category: record.category,
  amount: record.amount,
  occurredAt: toIsoDate(record.occurredAt),
  paymentMethod: record.paymentMethod,
  note: record.note,
  supplier: record.supplier,
  partner: record.partner,
  route: record.route,
  vehicle: record.vehicle ? toVehicleDto(record.vehicle) : null,
  driver: record.driver ? toDriverDto(record.driver) : null,
  contractId: record.contractId,
  isAdvance: record.isAdvance,
  status: record.status,
  linkedTransactionId: record.linkedTransactionId,
  sourceType: record.sourceType,
  sourceId: record.sourceId,
  createdAt: record.createdAt.toISOString(),
  updatedAt: record.updatedAt.toISOString(),
});
