export const SUPPLIER_SORT_FIELDS = ['createdAt', 'name'] as const;

export type SupplierSortField = (typeof SUPPLIER_SORT_FIELDS)[number];

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
  createdAt: string;
  updatedAt: string;
}

export interface DeleteSupplierResult {
  id: string;
  deleted: true;
}

export const supplierLabel = (supplier: Pick<SupplierDto, 'name' | 'pib'>): string =>
  supplier.pib ? `${supplier.name} · PIB ${supplier.pib}` : supplier.name;
