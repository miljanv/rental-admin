import { describe, expect, it } from 'vitest';

import { announcementWriteSchema } from './announcement';

const valid = {
  message: 'Održavanje u nedelju od 22h',
  kind: 'WARNING',
  startsAt: '2026-11-09T08:00:00.000Z',
  endsAt: '2026-11-15T21:00:00.000Z',
  allOrganizations: true,
  organizationIds: [],
};

describe('announcementWriteSchema', () => {
  it('accepts a banner for every organization', () => {
    expect(announcementWriteSchema.parse(valid).message).toBe('Održavanje u nedelju od 22h');
  });

  it('accepts a banner without an end', () => {
    expect(announcementWriteSchema.safeParse({ ...valid, endsAt: null }).success).toBe(true);
  });

  it('rejects an end before the start', () => {
    const result = announcementWriteSchema.safeParse({
      ...valid,
      endsAt: '2026-11-08T08:00:00.000Z',
    });

    expect(result.error?.issues[0]?.path).toEqual(['endsAt']);
  });

  it('compares the period as instants, not as text', () => {
    expect(
      announcementWriteSchema.safeParse({
        ...valid,
        startsAt: '2026-11-09T08:00:00.500Z',
        endsAt: '2026-11-09T08:00:01Z',
      }).success,
    ).toBe(true);
  });

  it('needs at least one organization when not for everyone', () => {
    const result = announcementWriteSchema.safeParse({ ...valid, allOrganizations: false });

    expect(result.error?.issues[0]?.path).toEqual(['organizationIds']);
  });

  it('rejects an empty or overly long message', () => {
    expect(announcementWriteSchema.safeParse({ ...valid, message: '   ' }).success).toBe(false);
    expect(announcementWriteSchema.safeParse({ ...valid, message: 'x'.repeat(501) }).success).toBe(
      false,
    );
  });
});
