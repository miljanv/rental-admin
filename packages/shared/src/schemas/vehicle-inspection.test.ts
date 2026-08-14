import { describe, expect, it } from 'vitest';

import { expiringInspectionsQuerySchema, vehicleInspectionWriteSchema } from './vehicle-inspection';

describe('vehicleInspectionWriteSchema', () => {
  it('accepts a valid type and date', () => {
    const result = vehicleInspectionWriteSchema.safeParse({
      type: 'REGULAR',
      inspectedAt: '2026-08-14',
    });

    expect(result.success).toBe(true);
  });

  it('rejects an invalid type', () => {
    expect(
      vehicleInspectionWriteSchema.safeParse({ type: 'ANNUAL', inspectedAt: '2026-08-14' })
        .success,
    ).toBe(false);
  });

  it('rejects a malformed date', () => {
    expect(
      vehicleInspectionWriteSchema.safeParse({ type: 'MONTHLY', inspectedAt: '14-08-2026' })
        .success,
    ).toBe(false);
  });

  it('does not accept a client-supplied expiresAt', () => {
    const result = vehicleInspectionWriteSchema.safeParse({
      type: 'MONTHLY',
      inspectedAt: '2026-08-14',
      expiresAt: '2099-01-01',
    });

    expect(result.success).toBe(true);
    expect(result.data).not.toHaveProperty('expiresAt');
  });
});

describe('expiringInspectionsQuerySchema', () => {
  it('defaults days to 30', () => {
    expect(expiringInspectionsQuerySchema.parse({})).toEqual({ days: 30 });
  });
});
