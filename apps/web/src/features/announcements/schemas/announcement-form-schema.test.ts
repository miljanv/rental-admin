import { describe, expect, it } from 'vitest';

import {
  announcementFormSchema,
  toAnnouncementFormValues,
  toAnnouncementRequest,
  toLocalDateTime,
} from './announcement-form-schema';

const valid = {
  message: 'Nova funkcija: PDV obračun',
  kind: 'INFO' as const,
  startsAt: '2026-11-09T08:00',
  endsAt: '',
  allOrganizations: false,
  organizationIds: ['org-1'],
};

describe('announcementFormSchema', () => {
  it('accepts a banner without an end', () => {
    expect(announcementFormSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects an end before the start', () => {
    const result = announcementFormSchema.safeParse({ ...valid, endsAt: '2026-11-09T07:59' });

    expect(result.error?.issues[0]?.path).toEqual(['endsAt']);
  });

  it('needs an organization unless the banner is for everyone', () => {
    const result = announcementFormSchema.safeParse({ ...valid, organizationIds: [] });

    expect(result.error?.issues[0]?.path).toEqual(['organizationIds']);
    expect(
      announcementFormSchema.safeParse({ ...valid, organizationIds: [], allOrganizations: true })
        .success,
    ).toBe(true);
  });
});

describe('toAnnouncementRequest', () => {
  it('sends local times as instants and drops the selection for everyone', () => {
    const request = toAnnouncementRequest({ ...valid, allOrganizations: true });

    expect(request.startsAt).toBe(new Date('2026-11-09T08:00').toISOString());
    expect(request.endsAt).toBeNull();
    expect(request.organizationIds).toEqual([]);
  });

  it('round-trips a stored banner through the form', () => {
    const startsAt = new Date('2026-11-09T08:00').toISOString();
    const values = toAnnouncementFormValues(
      {
        id: 'ann-1',
        message: 'Održavanje',
        kind: 'WARNING',
        startsAt,
        endsAt: null,
        allOrganizations: false,
        organizations: [{ id: 'org-1', name: 'Alfa' }],
        createdBy: null,
        createdAt: startsAt,
      },
      new Date(),
    );

    expect(values).toMatchObject({ startsAt: '2026-11-09T08:00', organizationIds: ['org-1'] });
    expect(toAnnouncementRequest(values).startsAt).toBe(startsAt);
  });
});

describe('toLocalDateTime', () => {
  it('formats in the local time zone', () => {
    expect(toLocalDateTime(new Date(2026, 0, 5, 7, 3).toISOString())).toBe('2026-01-05T07:03');
  });
});
