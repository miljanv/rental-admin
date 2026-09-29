import type { SupplierDto } from '@rental-admin/shared';

export interface SupplierRecord {
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
  bankAccounts: Array<{ id: string; accountNumber: string }>;
  createdAt: Date;
  updatedAt: Date;
}

export const toSupplierDto = (record: SupplierRecord): SupplierDto => ({
  id: record.id,
  name: record.name,
  email: record.email,
  phone: record.phone,
  pib: record.pib,
  registrationNumber: record.registrationNumber,
  address: record.address,
  city: record.city,
  contactPerson: record.contactPerson,
  note: record.note,
  bankAccounts: record.bankAccounts.map((account) => ({
    id: account.id,
    accountNumber: account.accountNumber,
  })),
  createdAt: record.createdAt.toISOString(),
  updatedAt: record.updatedAt.toISOString(),
});
