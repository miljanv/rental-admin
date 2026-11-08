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
  'SUBCONTRACTOR',
  'BANK',
  'OTHER',
  'VAT',
  'TRANSFER',
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
  SUBCONTRACTOR: 'Podizvođač',
  BANK: 'Banka',
  OTHER: 'Ostalo',
  VAT: 'PDV',
  TRANSFER: 'Prenos između računa',
};

/**
 * Money moved between the company's own accounts is never matched to anything and stays out of
 * the unallocated-payments queue. (VAT payments are matched, but only to a VAT return.) Both VAT
 * and TRANSFER stay out of customer/supplier analytics; TRANSFER is also out of income/expense.
 */
export const UNALLOCATABLE_TRANSACTION_CATEGORIES = [
  'TRANSFER',
] as const satisfies readonly TransactionCategory[];

export const isUnallocatableCategory = (category: TransactionCategory): boolean =>
  (UNALLOCATABLE_TRANSACTION_CATEGORIES as readonly TransactionCategory[]).includes(category);

export const CURRENCIES = ['RSD', 'EUR'] as const;

export type Currency = (typeof CURRENCIES)[number];

export const CURRENCY_LABELS: Record<Currency, string> = {
  RSD: 'Dinar (RSD)',
  EUR: 'Evro (EUR)',
};

const roundCurrency = (value: number): number => Math.round(value * 100) / 100;

/** Dinar value of a foreign-currency amount at the given rate, rounded to the para. */
export const toDinars = (amount: number, exchangeRate: number): number =>
  roundCurrency(amount * exchangeRate);

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
  'OPENING_BALANCE',
  'MANUAL',
  'BANK_STATEMENT',
  'FUEL_LOG',
  'MAINTENANCE',
  'INSPECTION',
  'CALIBRATION',
  'SAFETY_EQUIPMENT',
  'TRIP_EXPENSE',
  'TRIP_REVENUE',
  'TRIP_DRIVER_PER_DIEM',
  'TRIP_DRIVER_ADVANCE',
  'COMPANY_EXPENSE',
] as const;

export type TransactionSourceType = (typeof TRANSACTION_SOURCE_TYPES)[number];

export const TRANSACTION_SOURCE_TYPE_LABELS: Record<TransactionSourceType, string> = {
  OPENING_BALANCE: 'Početna pretplata',
  MANUAL: 'Ručno',
  BANK_STATEMENT: 'Izvod banke',
  FUEL_LOG: 'Točenje',
  MAINTENANCE: 'Zamena dela',
  INSPECTION: 'Tehnički pregled',
  CALIBRATION: 'Kalibracija tahografa',
  SAFETY_EQUIPMENT: 'PP aparat',
  TRIP_EXPENSE: 'Trošak vožnje',
  TRIP_REVENUE: 'Prihod od vožnje',
  TRIP_DRIVER_PER_DIEM: 'Dnevnica vozača',
  TRIP_DRIVER_ADVANCE: 'Akontacija vozača',
  COMPANY_EXPENSE: 'Trošak firme',
};

export const SETTLEMENT_TARGET_TYPES = [
  'OPENING_BALANCE',
  'COMPANY_EXPENSE',
  'TRIP_INVOICE',
  'TRIP_SERIES_INVOICE',
  'VAT_RETURN',
] as const;

export type SettlementTargetType = (typeof SETTLEMENT_TARGET_TYPES)[number];

export const SETTLEMENT_TARGET_TYPE_LABELS: Record<SettlementTargetType, string> = {
  OPENING_BALANCE: 'Početni dug',
  COMPANY_EXPENSE: 'Račun dobavljača',
  TRIP_INVOICE: 'Faktura vožnje',
  TRIP_SERIES_INVOICE: 'Mesečna faktura serije',
  VAT_RETURN: 'PDV prijava',
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
  supplierId: string | null;
  partner: string | null;
  partnerId: string | null;
  route: string | null;
  vehicle: TransactionVehicleDto | null;
  driver: TransactionDriverDto | null;
  contractId: string | null;
  isAdvance: boolean;
  status: TransactionStatus;
  linkedTransactionId: string | null;
  sourceType: TransactionSourceType;
  sourceId: string | null;
  statementNumber: string | null;
  bankReference: string | null;
  /** `amount` is always dinars. For EUR, `currencyAmount` is the EUR figure at `exchangeRate`. */
  currency: Currency;
  currencyAmount: number | null;
  exchangeRate: number | null;
  /** EUR still free to link to an EUR invoice; null for dinar payments. */
  unallocatedCurrencyAmount: number | null;
  allocatedAmount: number;
  unallocatedAmount: number;
  allocationCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface BankStatementImportResult {
  statementNumber: string | null;
  accountNumber: string | null;
  imported: number;
  skipped: number;
  duplicateSkipped: number;
  invalidSkipped: number;
  matchedPartners: number;
  matchedSuppliers: number;
  allocated: number;
  unallocated: number;
  transactions: TransactionDto[];
}

export const BANK_STATEMENT_PREVIEW_STATUSES = [
  'READY',
  'REVIEW',
  'PARTIAL',
  'UNALLOCATED',
  'DUPLICATE',
  'INVALID',
] as const;

export type BankStatementPreviewStatus = (typeof BANK_STATEMENT_PREVIEW_STATUSES)[number];

export const BANK_STATEMENT_MATCH_METHODS = ['BANK_ACCOUNT', 'NAME', 'NONE'] as const;

export type BankStatementMatchMethod = (typeof BANK_STATEMENT_MATCH_METHODS)[number];

export interface BankStatementPreviewAllocationDto {
  targetType: SettlementTargetType;
  targetId: string;
  label: string;
  counterparty: string;
  amount: number;
}

export interface BankStatementPreviewRowDto {
  id: string;
  type: TransactionType;
  category: TransactionCategory;
  amount: number;
  occurredAt: string;
  payeeName: string | null;
  accountNumber: string | null;
  reference: string | null;
  purpose: string | null;
  counterpartyId: string | null;
  counterpartyName: string | null;
  matchMethod: BankStatementMatchMethod;
  matchReason: string;
  willRememberAccount: boolean;
  allocations: BankStatementPreviewAllocationDto[];
  allocatedAmount: number;
  unallocatedAmount: number;
  status: BankStatementPreviewStatus;
}

export interface BankStatementPreviewResult {
  statementNumber: string | null;
  accountNumber: string | null;
  rows: BankStatementPreviewRowDto[];
  summary: {
    total: number;
    ready: number;
    review: number;
    partial: number;
    unallocated: number;
    duplicates: number;
    invalid: number;
  };
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

export interface PaymentAllocationDto {
  id: string;
  transactionId: string;
  targetType: SettlementTargetType;
  targetId: string;
  /** Dinars closed on the invoice, at the invoice's rate. */
  amount: number;
  /** EUR covered, when an EUR payment closes an EUR invoice. */
  currencyAmount: number | null;
  /** Exchange-rate gain (+) or loss (-) in dinars. */
  exchangeDifference: number | null;
  note: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SettlementTargetDto {
  targetType: SettlementTargetType;
  targetId: string;
  counterpartyId: string | null;
  recommended: boolean;
  label: string;
  counterparty: string;
  issuedAt: string;
  totalAmount: number;
  allocatedAmount: number;
  remainingAmount: number;
  /** Invoice currency. For EUR the `currency*` fields hold the EUR figures. */
  currency: Currency;
  exchangeRate: number | null;
  currencyTotalAmount: number | null;
  currencyRemainingAmount: number | null;
}

export interface SettlementTargetsDto {
  targets: SettlementTargetDto[];
}

export interface CreatePaymentAllocationResult {
  allocation: PaymentAllocationDto;
  transaction: TransactionDto;
}
