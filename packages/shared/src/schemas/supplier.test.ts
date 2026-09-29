import { describe, expect, it } from 'vitest';

import { listSuppliersQuerySchema, supplierWriteSchema } from './supplier';

const validSupplier = {
  name: 'NIS Petrol',
  email: 'office@nis.rs',
  phone: '+381 11 123 456',
  pib: '123456789',
  registrationNumber: '20123456',
  address: 'Narodnog fronta 12',
  city: 'Novi Sad',
  contactPerson: 'Petar Petrović',
  note: 'Kartice za gorivo',
} as const;

describe('supplierWriteSchema', () => {
  it('accepts a supplier with optional contact data', () => {
    expect(supplierWriteSchema.safeParse(validSupplier).success).toBe(true);
  });

  it('requires a name', () => {
    expect(supplierWriteSchema.safeParse({ ...validSupplier, name: '' }).success).toBe(false);
  });

  it('normalizes empty optional fields to null', () => {
    const result = supplierWriteSchema.safeParse({
      name: 'Auto delovi',
      email: '',
      phone: '',
      pib: '',
      registrationNumber: '',
      address: '',
      city: '',
      contactPerson: '',
      note: '',
    });

    expect(result.success).toBe(true);
    expect(result.data).toMatchObject({
      email: null,
      phone: null,
      pib: null,
      registrationNumber: null,
      address: null,
      city: null,
      contactPerson: null,
      note: null,
    });
  });

  it('rejects invalid email', () => {
    expect(supplierWriteSchema.safeParse({ ...validSupplier, email: 'nije-email' }).success).toBe(
      false,
    );
  });

  it('rejects a PIB that is not exactly 9 digits', () => {
    const result = supplierWriteSchema.safeParse({ ...validSupplier, pib: '12345' });
    expect(result.success).toBe(false);
    expect(result.error?.issues.some((issue) => issue.path.includes('pib'))).toBe(true);
  });
});

describe('listSuppliersQuerySchema', () => {
  it('defaults to newest first', () => {
    expect(listSuppliersQuerySchema.parse({})).toEqual({
      page: 1,
      limit: 10,
      search: undefined,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });
  });
});
