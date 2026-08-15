import { describe, expect, it } from 'vitest';

import { driverWriteSchema, listDriversQuerySchema } from './driver';

const validDriver = {
  firstName: 'Marko',
  lastName: 'Marković',
  jmbg: '0101990710123',
  dateOfBirth: '1990-01-01',
  residencePlace: 'Novi Sad',
  educationLevel: 'SSS',
  idCardNumber: '123456789',
  drivingLicenseNumber: 'NS-123456',
  drivingLicenseCategory: 'D',
  licenseNumber: 'LIC-001',
  phone: '0692084860',
  email: 'marko@example.com',
  jobTitle: 'Vozač',
  status: 'ACTIVE',
} as const;

describe('driverWriteSchema', () => {
  it('accepts a complete driver payload and lowercases email', () => {
    const result = driverWriteSchema.safeParse({ ...validDriver, email: '  Marko@Example.COM ' });

    expect(result.success).toBe(true);
    expect(result.data?.email).toBe('marko@example.com');
    expect(result.data?.firstName).toBe('Marko');
  });

  it('rejects a JMBG that is not 13 digits', () => {
    expect(driverWriteSchema.safeParse({ ...validDriver, jmbg: '123' }).success).toBe(false);
    expect(driverWriteSchema.safeParse({ ...validDriver, jmbg: 'abcdefghijklm' }).success).toBe(
      false,
    );
  });

  it('rejects an invalid date of birth', () => {
    expect(driverWriteSchema.safeParse({ ...validDriver, dateOfBirth: '1990-13-01' }).success).toBe(
      false,
    );
  });

  it('rejects an ID card number that is not exactly 9 digits', () => {
    expect(driverWriteSchema.safeParse({ ...validDriver, idCardNumber: '1234' }).success).toBe(false);
    expect(
      driverWriteSchema.safeParse({ ...validDriver, idCardNumber: 'ABCDEFGHI' }).success,
    ).toBe(false);
  });
});

describe('listDriversQuerySchema', () => {
  it('defaults to last name ascending', () => {
    expect(listDriversQuerySchema.parse({})).toEqual({
      page: 1,
      limit: 10,
      sortBy: 'lastName',
      sortOrder: 'asc',
      search: undefined,
      status: undefined,
    });
  });
});
