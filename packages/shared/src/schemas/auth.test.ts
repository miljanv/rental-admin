import { describe, expect, it } from 'vitest';

import { changePasswordSchema, loginRequestSchema } from './auth';

describe('loginRequestSchema', () => {
  it('accepts a trimmed username and password', () => {
    const result = loginRequestSchema.safeParse({ username: '  admin  ', password: 'admin123' });

    expect(result.success).toBe(true);
    expect(result.data?.username).toBe('admin');
  });

  it('rejects a blank username or password', () => {
    expect(loginRequestSchema.safeParse({ username: '   ', password: 'admin123' }).success).toBe(
      false,
    );
    expect(loginRequestSchema.safeParse({ username: 'admin', password: '' }).success).toBe(false);
  });
});

describe('changePasswordSchema', () => {
  it('accepts a new password of at least 8 characters', () => {
    expect(
      changePasswordSchema.safeParse({ currentPassword: 'stara123', newPassword: 'nova-lozinka' })
        .success,
    ).toBe(true);
  });

  it('rejects a short new password', () => {
    expect(
      changePasswordSchema.safeParse({ currentPassword: 'stara123', newPassword: 'kratka' })
        .success,
    ).toBe(false);
  });

  it('rejects a new password equal to the current one', () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: 'ista-lozinka',
      newPassword: 'ista-lozinka',
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(['newPassword']);
  });
});
