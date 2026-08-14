import { describe, expect, it } from 'vitest';

import { loginRequestSchema } from './auth';

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
