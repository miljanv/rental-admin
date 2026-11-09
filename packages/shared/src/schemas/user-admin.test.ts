import { describe, expect, it } from 'vitest';

import {
  organizationProfileSchema,
  organizationWriteSchema,
  userCreateSchema,
  userUpdateSchema,
} from './user-admin';

describe('organizationWriteSchema', () => {
  it('trims the name and defaults to active', () => {
    const result = organizationWriteSchema.parse({ name: '  Rental Travel  ' });

    expect(result).toEqual({
      name: 'Rental Travel',
      isActive: true,
      maxVehicles: null,
      maxUsers: null,
    });
  });

  it('rejects a blank name', () => {
    expect(organizationWriteSchema.safeParse({ name: ' ' }).success).toBe(false);
  });

  it('reads blank or cleared limits as "no limit"', () => {
    const result = organizationWriteSchema.parse({ name: 'Firma', maxVehicles: '', maxUsers: NaN });

    expect(result.maxVehicles).toBeNull();
    expect(result.maxUsers).toBeNull();
  });

  it('accepts whole, non-negative limits only', () => {
    expect(organizationWriteSchema.parse({ name: 'Firma', maxVehicles: 0 }).maxVehicles).toBe(0);
    expect(organizationWriteSchema.safeParse({ name: 'Firma', maxVehicles: -1 }).success).toBe(
      false,
    );
    expect(organizationWriteSchema.safeParse({ name: 'Firma', maxUsers: 2.5 }).success).toBe(false);
  });
});

describe('userCreateSchema', () => {
  it('requires an organization for a regular user', () => {
    const result = userCreateSchema.safeParse({ username: 'marko', password: 'password1' });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(['organizationId']);
  });

  it('accepts a regular user with an organization', () => {
    const result = userCreateSchema.safeParse({
      username: 'marko',
      password: 'password1',
      organizationId: 'org-1',
    });

    expect(result.success).toBe(true);
    expect(result.data?.role).toBe('USER');
  });

  it('rejects a superadmin that is attached to an organization', () => {
    const result = userCreateSchema.safeParse({
      username: 'owner@example.com',
      password: 'password1',
      role: 'SUPERADMIN',
      organizationId: 'org-1',
    });

    expect(result.success).toBe(false);
  });

  it('accepts a superadmin without an organization', () => {
    const result = userCreateSchema.safeParse({
      username: 'owner@example.com',
      password: 'password1',
      role: 'SUPERADMIN',
    });

    expect(result.success).toBe(true);
    expect(result.data?.organizationId).toBeNull();
  });

  it('rejects a short password', () => {
    const result = userCreateSchema.safeParse({
      username: 'marko',
      password: 'short',
      organizationId: 'org-1',
    });

    expect(result.success).toBe(false);
  });
});

describe('userUpdateSchema', () => {
  it('treats a blank password as unchanged', () => {
    const result = userUpdateSchema.parse({ password: '' });

    expect(result.password).toBeUndefined();
  });

  it('accepts a partial update', () => {
    expect(userUpdateSchema.safeParse({ isActive: false }).success).toBe(true);
  });

  it('rejects a USER role update that explicitly clears the organization', () => {
    const result = userUpdateSchema.safeParse({ role: 'USER', organizationId: null });

    expect(result.success).toBe(false);
  });

  it('allows a role change that leaves the stored organization untouched', () => {
    expect(userUpdateSchema.safeParse({ role: 'USER' }).success).toBe(true);
  });
});

describe('organizationProfileSchema', () => {
  it('stores blank fields as null', () => {
    expect(organizationProfileSchema.parse({ taxId: '  ', address: '' })).toEqual({
      taxId: null,
      registrationNumber: null,
      address: null,
      contactName: null,
      contactPhone: null,
      contactEmail: null,
    });
  });

  it('accepts a 9-digit PIB and an 8-digit MB', () => {
    const result = organizationProfileSchema.parse({
      taxId: ' 101234567 ',
      registrationNumber: '07654321',
      contactPhone: '+381 64 123-4567',
      contactEmail: 'office@firma.rs',
    });

    expect(result.taxId).toBe('101234567');
    expect(result.registrationNumber).toBe('07654321');
  });

  it.each([
    ['taxId', '12345678'],
    ['taxId', '12345678a'],
    ['registrationNumber', '123456789'],
    ['contactEmail', 'nije-email'],
    ['contactPhone', 'zovi me'],
  ])('rejects %s = %s', (field, value) => {
    expect(organizationProfileSchema.safeParse({ [field]: value }).success).toBe(false);
  });
});
