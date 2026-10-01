export const SUPPLIER_SORT_FIELDS = ['createdAt', 'name'] as const;

export type SupplierSortField = (typeof SUPPLIER_SORT_FIELDS)[number];

export interface SupplierBankAccountDto {
  id: string;
  accountNumber: string;
}

export interface SupplierDto {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  pib: string | null;
  registrationNumber: string | null;
  address: string | null;
  city: string | null;
  contactPerson: string | null;
  note: string | null;
  bankAccounts: SupplierBankAccountDto[];
  createdAt: string;
  updatedAt: string;
}

export interface DeleteSupplierResult {
  id: string;
  deleted: true;
}

export const SUPPLIER_LEDGER_ENTRY_TYPES = [
  'COMPANY_EXPENSE',
  'FUEL_LOG',
  'MAINTENANCE',
  'FINANCE_PAYMENT',
] as const;

export type SupplierLedgerEntryType = (typeof SUPPLIER_LEDGER_ENTRY_TYPES)[number];

export const SUPPLIER_LEDGER_ENTRY_TYPE_LABELS: Record<SupplierLedgerEntryType, string> = {
  COMPANY_EXPENSE: 'Račun troška',
  FUEL_LOG: 'Gorivo',
  MAINTENANCE: 'Održavanje',
  FINANCE_PAYMENT: 'Plaćanje',
};

export interface SupplierLedgerEntryDto {
  id: string;
  type: SupplierLedgerEntryType;
  postedAt: string;
  documentNumber: string | null;
  description: string;
  debit: number;
  credit: number;
  balance: number;
  sourceId: string;
}

export interface SupplierLedgerSummaryDto {
  openingBalance: number;
  periodDebit: number;
  periodCredit: number;
  endingBalance: number;
}

export interface SupplierLedgerDto {
  supplier: SupplierDto;
  from: string;
  to: string;
  summary: SupplierLedgerSummaryDto;
  entries: SupplierLedgerEntryDto[];
}

export const supplierLabel = (supplier: Pick<SupplierDto, 'name' | 'pib'>): string =>
  supplier.pib ? `${supplier.name} · PIB ${supplier.pib}` : supplier.name;
