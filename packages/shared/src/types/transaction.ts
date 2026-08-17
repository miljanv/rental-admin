export const TRANSACTION_TYPES = ['INCOME', 'EXPENSE'] as const;

export type TransactionType = (typeof TRANSACTION_TYPES)[number];

export const TRANSACTION_TYPE_LABELS: Record<TransactionType, string> = {
  INCOME: 'Prihod',
  EXPENSE: 'Rashod',
};

export const TRANSACTION_CATEGORIES = [
  'CONTRACT',
  'FUEL',
  'PARTS',
  'TECHNICAL_INSPECTION',
  'TACHOGRAPH',
  'FIRE_EXTINGUISHER',
  'SALARY',
  'OTHER',
] as const;

export type TransactionCategory = (typeof TRANSACTION_CATEGORIES)[number];

export const TRANSACTION_CATEGORY_LABELS: Record<TransactionCategory, string> = {
  CONTRACT: 'Ugovor',
  FUEL: 'Gorivo',
  PARTS: 'Delovi',
  TECHNICAL_INSPECTION: 'Tehnički pregled',
  TACHOGRAPH: 'Tahograf',
  FIRE_EXTINGUISHER: 'PP aparat',
  SALARY: 'Zarada',
  OTHER: 'Ostalo',
};

export const PAYMENT_METHODS = ['ACCOUNT', 'CASH'] as const;

export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  ACCOUNT: 'Račun',
  CASH: 'Keš',
};

export const TRANSACTION_STATUSES = ['OPEN', 'SETTLED'] as const;

export type TransactionStatus = (typeof TRANSACTION_STATUSES)[number];

export const TRANSACTION_STATUS_LABELS: Record<TransactionStatus, string> = {
  OPEN: 'Nerazdužen',
  SETTLED: 'Razdužen',
};

export const TRANSACTION_SOURCE_TYPES = [
  'MANUAL',
  'FUEL_LOG',
  'MAINTENANCE',
  'INSPECTION',
  'CALIBRATION',
  'SAFETY_EQUIPMENT',
  'TRIP_EXPENSE',
  'TRIP_REVENUE',
  'TRIP_DRIVER_PER_DIEM',
  'TRIP_DRIVER_ADVANCE',
] as const;

export type TransactionSourceType = (typeof TRANSACTION_SOURCE_TYPES)[number];

export const TRANSACTION_SOURCE_TYPE_LABELS: Record<TransactionSourceType, string> = {
  MANUAL: 'Ručno',
  FUEL_LOG: 'Točenje',
  MAINTENANCE: 'Zamena dela',
  INSPECTION: 'Tehnički pregled',
  CALIBRATION: 'Kalibracija tahografa',
  SAFETY_EQUIPMENT: 'PP aparat',
  TRIP_EXPENSE: 'Trošak vožnje',
  TRIP_REVENUE: 'Prihod od vožnje',
  TRIP_DRIVER_PER_DIEM: 'Dnevnica vozača',
  TRIP_DRIVER_ADVANCE: 'Akontacija vozača',
};

export const FINANCE_EXPORT_FORMATS = ['pdf', 'xlsx'] as const;

export type FinanceExportFormat = (typeof FINANCE_EXPORT_FORMATS)[number];

export interface TransactionVehicleDto {
  id: string;
  make: string;
  model: string;
  licensePlate: string;
}

export interface TransactionDriverDto {
  id: string;
  firstName: string;
  lastName: string;
}

export interface TransactionDto {
  id: string;
  type: TransactionType;
  category: TransactionCategory;
  amount: number;
  occurredAt: string;
  paymentMethod: PaymentMethod;
  note: string | null;
  supplier: string | null;
  partner: string | null;
  route: string | null;
  vehicle: TransactionVehicleDto | null;
  driver: TransactionDriverDto | null;
  contractId: string | null;
  isAdvance: boolean;
  status: TransactionStatus;
  linkedTransactionId: string | null;
  sourceType: TransactionSourceType;
  sourceId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DeleteTransactionResult {
  id: string;
  deleted: true;
}

export interface UnsettledAdvanceGroupDto {
  supplier: string;
  total: number;
  count: number;
  advances: TransactionDto[];
}

export interface UnsettledAdvancesDto {
  groups: UnsettledAdvanceGroupDto[];
}

export interface SettleAdvancesResult {
  settlement: TransactionDto;
  settledCount: number;
  settledTotal: number;
}
