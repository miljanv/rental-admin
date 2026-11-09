import type { OrganizationDto } from '@rental-admin/shared';

import { usagePercent } from './usage';

const DAY_MS = 24 * 60 * 60 * 1000;

/** No sign-in for this long marks an organization as having stopped using the app. */
export const INACTIVE_AFTER_DAYS = 30;

/** From this share of a limit on, the organization is highlighted as close to it. */
export const NEAR_LIMIT_PERCENT = 80;

export type LimitLevel = 'ok' | 'near' | 'full';

export const limitLevel = (used: number, max: number | null): LimitLevel => {
  const percent = usagePercent(used, max);

  if (percent === null || percent < NEAR_LIMIT_PERCENT) {
    return 'ok';
  }

  return percent >= 100 ? 'full' : 'near';
};

const LEVEL_RANK: Record<LimitLevel, number> = { ok: 0, near: 1, full: 2 };

/** The tighter of the vehicle and user limits. */
export const organizationLimitLevel = (organization: OrganizationDto): LimitLevel => {
  const vehicles = limitLevel(organization.usage.vehicles, organization.usage.maxVehicles);
  const users = limitLevel(organization.usage.users, organization.usage.maxUsers);

  return LEVEL_RANK[vehicles] >= LEVEL_RANK[users] ? vehicles : users;
};

/**
 * Nobody has signed in for 30 days. An organization nobody has used yet counts
 * from its creation, so a brand-new one is not flagged right away.
 */
export const isInactive = (organization: OrganizationDto, now: Date): boolean => {
  const since = new Date(organization.lastActivityAt ?? organization.createdAt).getTime();

  return now.getTime() - since >= INACTIVE_AFTER_DAYS * DAY_MS;
};

export const ORGANIZATION_FILTERS = {
  all: 'Sve firme',
  active: 'Aktivne',
  suspended: 'Suspendovane',
  inactive: 'Neaktivne 30+ dana',
  nearLimit: 'Blizu limita',
} as const;

export type OrganizationFilter = keyof typeof ORGANIZATION_FILTERS;

export const matchesOrganization = (
  organization: OrganizationDto,
  { search, filter }: { search: string; filter: OrganizationFilter },
  now: Date,
): boolean => {
  const query = search.trim().toLocaleLowerCase('sr-Latn');

  if (query && !organization.name.toLocaleLowerCase('sr-Latn').includes(query)) {
    return false;
  }

  switch (filter) {
    case 'all':
      return true;
    case 'active':
      return organization.isActive;
    case 'suspended':
      return !organization.isActive;
    case 'inactive':
      return isInactive(organization, now);
    case 'nearLimit':
      return organizationLimitLevel(organization) !== 'ok';
  }
};

const relativeTime = new Intl.RelativeTimeFormat('sr-Latn', { numeric: 'auto' });

/** "danas", "juče", "pre 3 dana", "pre 2 meseca"; "nikad" without a sign-in. */
export const formatLastActivity = (isoDate: string | null, now: Date): string => {
  if (!isoDate) {
    return 'nikad';
  }

  const days = Math.floor((now.getTime() - new Date(isoDate).getTime()) / DAY_MS);

  if (days < 30) {
    return relativeTime.format(-Math.max(0, days), 'day');
  }

  if (days < 365) {
    return relativeTime.format(-Math.floor(days / 30), 'month');
  }

  return relativeTime.format(-Math.floor(days / 365), 'year');
};
