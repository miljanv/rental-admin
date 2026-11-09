import type { OrganizationDto } from '@rental-admin/shared';
import { describe, expect, it } from 'vitest';

import {
  formatLastActivity,
  isInactive,
  limitLevel,
  matchesOrganization,
  organizationLimitLevel,
} from './organization-health';

const now = new Date('2026-11-09T12:00:00Z');
const daysAgo = (days: number): string =>
  new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString();

const organization = (overrides: Partial<OrganizationDto> = {}): OrganizationDto => ({
  id: 'org-1',
  name: 'Rental Travel',
  isActive: true,
  profile: {
    taxId: null,
    registrationNumber: null,
    address: null,
    contactName: null,
    contactPhone: null,
    contactEmail: null,
  },
  usage: { vehicles: 2, maxVehicles: 10, users: 1, maxUsers: null },
  userCount: 1,
  vehicleCount: 2,
  driverCount: 0,
  tripCount: 0,
  lastActivityAt: daysAgo(1),
  createdAt: daysAgo(200),
  updatedAt: daysAgo(200),
  ...overrides,
});

describe('limitLevel', () => {
  it('turns yellow at 80% and red at the limit', () => {
    expect(limitLevel(7, 10)).toBe('ok');
    expect(limitLevel(8, 10)).toBe('near');
    expect(limitLevel(10, 10)).toBe('full');
    expect(limitLevel(99, null)).toBe('ok');
  });

  it('takes the tighter of the two limits', () => {
    expect(
      organizationLimitLevel(
        organization({ usage: { vehicles: 9, maxVehicles: 10, users: 3, maxUsers: 3 } }),
      ),
    ).toBe('full');
  });
});

describe('isInactive', () => {
  it('flags an organization nobody signed in to for 30 days', () => {
    expect(isInactive(organization({ lastActivityAt: daysAgo(30) }), now)).toBe(true);
    expect(isInactive(organization({ lastActivityAt: daysAgo(29) }), now)).toBe(false);
  });

  it('counts a never-used organization from its creation', () => {
    expect(isInactive(organization({ lastActivityAt: null, createdAt: daysAgo(3) }), now)).toBe(
      false,
    );
    expect(isInactive(organization({ lastActivityAt: null, createdAt: daysAgo(45) }), now)).toBe(
      true,
    );
  });
});

describe('matchesOrganization', () => {
  it('searches by name, ignoring case', () => {
    expect(matchesOrganization(organization(), { search: 'rental', filter: 'all' }, now)).toBe(
      true,
    );
    expect(matchesOrganization(organization(), { search: 'drugo', filter: 'all' }, now)).toBe(
      false,
    );
  });

  it('applies the status filters', () => {
    const suspended = organization({ isActive: false });
    const nearLimit = organization({
      usage: { vehicles: 8, maxVehicles: 10, users: 1, maxUsers: null },
    });

    expect(matchesOrganization(suspended, { search: '', filter: 'suspended' }, now)).toBe(true);
    expect(matchesOrganization(suspended, { search: '', filter: 'active' }, now)).toBe(false);
    expect(matchesOrganization(nearLimit, { search: '', filter: 'nearLimit' }, now)).toBe(true);
    expect(matchesOrganization(organization(), { search: '', filter: 'nearLimit' }, now)).toBe(
      false,
    );
  });
});

describe('formatLastActivity', () => {
  it('says how long ago, in Serbian', () => {
    expect(formatLastActivity(daysAgo(0), now)).toBe('danas');
    expect(formatLastActivity(daysAgo(3), now)).toBe('pre 3 dana');
    expect(formatLastActivity(daysAgo(65), now)).toBe('pre 2 meseca');
    expect(formatLastActivity(null, now)).toBe('nikad');
  });
});
