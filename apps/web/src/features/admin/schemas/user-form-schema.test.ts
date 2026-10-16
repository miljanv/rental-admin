import { describe, expect, it } from 'vitest';

import {
  EMPTY_USER_FORM,
  createUserFormSchema,
  toUserCreateRequest,
  toUserUpdateRequest,
  userToFormValues,
} from './user-form-schema';

const valid = {
  ...EMPTY_USER_FORM,
  username: 'marko',
  password: 'lozinka123',
  organizationId: 'org-1',
};

describe('createUserFormSchema', () => {
  it('requires a password when creating', () => {
    const result = createUserFormSchema('create').safeParse({ ...valid, password: '' });

    expect(result.success).toBe(false);
  });

  it('lets a blank password through when editing, meaning unchanged', () => {
    expect(createUserFormSchema('edit').safeParse({ ...valid, password: '' }).success).toBe(true);
  });

  it('still rejects a short new password when editing', () => {
    expect(createUserFormSchema('edit').safeParse({ ...valid, password: 'kratka' }).success).toBe(
      false,
    );
  });

  it('requires an organization for a regular user', () => {
    const result = createUserFormSchema('create').safeParse({ ...valid, organizationId: '' });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(['organizationId']);
  });

  it('does not need an organization for a superadmin', () => {
    const result = createUserFormSchema('create').safeParse({
      ...valid,
      role: 'SUPERADMIN',
      organizationId: '',
    });

    expect(result.success).toBe(true);
  });
});

describe('request mapping', () => {
  it('drops the organization of a superadmin even if one is still selected', () => {
    const request = toUserCreateRequest({ ...valid, role: 'SUPERADMIN' });

    expect(request.organizationId).toBeNull();
  });

  it('leaves the password out of an update when it was left blank', () => {
    const request = toUserUpdateRequest({ ...valid, password: '' });

    expect(request).not.toHaveProperty('password');
    expect(request.organizationId).toBe('org-1');
  });

  it('sends the password when a new one was typed', () => {
    expect(toUserUpdateRequest({ ...valid, password: 'nova-lozinka' }).password).toBe(
      'nova-lozinka',
    );
  });

  it('opens an existing user with an empty password and no organization as an empty string', () => {
    const values = userToFormValues({
      id: 'u1',
      username: 'owner@example.com',
      role: 'SUPERADMIN',
      isActive: true,
      organizationId: null,
      organizationName: null,
      vehiclesCreated: 0,
      createdAt: '2026-10-14T00:00:00.000Z',
      updatedAt: '2026-10-14T00:00:00.000Z',
    });

    expect(values).toEqual({
      username: 'owner@example.com',
      password: '',
      role: 'SUPERADMIN',
      organizationId: '',
      isActive: true,
    });
  });
});
