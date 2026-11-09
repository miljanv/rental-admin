import { describe, expect, it } from 'vitest';

import { listAuditEventsQuerySchema } from './audit';

describe('listAuditEventsQuerySchema', () => {
  it('defaults to the first page', () => {
    expect(listAuditEventsQuerySchema.parse({})).toMatchObject({ page: 1, limit: 10 });
  });

  it('accepts the filters', () => {
    expect(
      listAuditEventsQuerySchema.parse({
        organizationId: 'org-1',
        action: 'LOGIN_FAILED',
        from: '2026-11-01',
        to: '2026-11-09',
      }),
    ).toMatchObject({ action: 'LOGIN_FAILED', from: '2026-11-01' });
  });

  it('rejects an unknown action and a reversed period', () => {
    expect(listAuditEventsQuerySchema.safeParse({ action: 'HACKED' }).success).toBe(false);
    expect(
      listAuditEventsQuerySchema.safeParse({ from: '2026-11-09', to: '2026-11-01' }).success,
    ).toBe(false);
  });
});
