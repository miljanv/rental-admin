import { describe, expect, it } from 'vitest';

import { organizationWriteSchema, userCreateSchema, userUpdateSchema } from './user-admin';

describe('organizationWriteSchema', () => {
  it('trims the name and defaults to active', () => {
    const result = organizationWriteSchema.parse({ name: '  Rental Travel  ' });

    expect(result).toEqual({ name: 'Rental Travel', isActive: true });
  });

  it('rejects a blank name', () => {
    expect(organizationWriteSchema.safeParse({ name: ' ' }).success).toBe(false);
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
