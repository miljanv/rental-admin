import {
  supplierWriteSchema,
  type SupplierDto,
  type SupplierWriteInput,
} from '@rental-admin/shared';

export const supplierFormSchema = supplierWriteSchema;

export type SupplierFormValues = SupplierWriteInput;

export const EMPTY_SUPPLIER_FORM: SupplierFormValues = {
  name: '',
  email: '',
  phone: '',
  pib: '',
  registrationNumber: '',
  address: '',
  city: '',
  contactPerson: '',
  note: '',
  bankAccounts: [],
};

export const toSupplierFormValues = (supplier: SupplierDto): SupplierFormValues => ({
  name: supplier.name,
  email: supplier.email ?? '',
  phone: supplier.phone ?? '',
  pib: supplier.pib ?? '',
  registrationNumber: supplier.registrationNumber ?? '',
  address: supplier.address ?? '',
  city: supplier.city ?? '',
  contactPerson: supplier.contactPerson ?? '',
  note: supplier.note ?? '',
  bankAccounts: supplier.bankAccounts.map((account) => ({
    accountNumber: account.accountNumber,
  })),
});
