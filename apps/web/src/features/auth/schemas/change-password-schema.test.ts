import { describe, expect, it } from 'vitest';

import { changePasswordFormSchema } from './change-password-schema';

const valid = {
  currentPassword: 'stara-lozinka',
  newPassword: 'nova-lozinka',
  confirmPassword: 'nova-lozinka',
};

describe('changePasswordFormSchema', () => {
  it('accepts a matching new password', () => {
    expect(changePasswordFormSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects a repeated password that does not match', () => {
    const result = changePasswordFormSchema.safeParse({ ...valid, confirmPassword: 'druga' });

    expect(result.success).toBe(false);
    expect(result.error?.issues.map((issue) => issue.path)).toContainEqual(['confirmPassword']);
  });

  it('rejects reusing the current password', () => {
    const result = changePasswordFormSchema.safeParse({
      currentPassword: 'ista-lozinka',
      newPassword: 'ista-lozinka',
      confirmPassword: 'ista-lozinka',
    });

    expect(result.success).toBe(false);
  });
});
