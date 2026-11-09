import { passwordSchema } from '@rental-admin/shared';
import { describe, expect, it } from 'vitest';

import { GENERATED_PASSWORD_LENGTH, generatePassword } from './generate-password';

describe('generatePassword', () => {
  it('produces a password the API accepts', () => {
    const password = generatePassword();

    expect(password).toHaveLength(GENERATED_PASSWORD_LENGTH);
    expect(passwordSchema.safeParse(password).success).toBe(true);
  });

  it('avoids characters that are easy to misread', () => {
    const passwords = Array.from({ length: 50 }, () => generatePassword()).join('');

    expect(passwords).not.toMatch(/[0O1lI]/);
  });

  it('does not repeat itself', () => {
    expect(generatePassword()).not.toBe(generatePassword());
  });
});
