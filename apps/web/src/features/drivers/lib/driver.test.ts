import { describe, expect, it } from 'vitest';

import { driverPortalUrl } from './driver';

describe('driverPortalUrl', () => {
  it('builds the portal address on the current site', () => {
    expect(driverPortalUrl('https://admin.example.com', 'abc_DEF-123')).toBe(
      'https://admin.example.com/v/abc_DEF-123',
    );
  });

  it('does not double the slash after the origin', () => {
    expect(driverPortalUrl('http://localhost:3000/', 'token')).toBe(
      'http://localhost:3000/v/token',
    );
  });
});
