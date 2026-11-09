import { describe, expect, it } from 'vitest';

import { FOOTER_NAV_ITEMS, MAIN_NAV_ITEMS, filterNavItems, findActiveNavHref } from './nav-items';

const hrefs = (items: { href: string }[]): string[] => items.map((item) => item.href);

describe('filterNavItems', () => {
  it('gives a regular user every business screen and no admin screen', () => {
    const visible = hrefs(filterNavItems(MAIN_NAV_ITEMS, { role: 'USER', hasOrganization: true }));

    expect(visible).toContain('/vehicles');
    expect(visible).not.toContain('/admin');
    expect(visible).not.toContain('/admin/audit');
  });

  it('gives a superadmin without an organization only the admin screen', () => {
    const audience = { role: 'SUPERADMIN' as const, hasOrganization: false };

    expect(hrefs(filterNavItems(MAIN_NAV_ITEMS, audience))).toEqual([
      '/admin',
      '/admin/audit',
      '/admin/announcements',
    ]);
    expect(filterNavItems(FOOTER_NAV_ITEMS, audience)).toEqual([]);
  });

  it('gives a superadmin inside an organization everything, admin included', () => {
    const visible = hrefs(
      filterNavItems(MAIN_NAV_ITEMS, { role: 'SUPERADMIN', hasOrganization: true }),
    );

    expect(visible).toContain('/vehicles');
    expect(visible).toContain('/admin');
  });
});

describe('findActiveNavHref', () => {
  it('picks the most specific item', () => {
    expect(findActiveNavHref('/admin/audit')).toBe('/admin/audit');
    expect(findActiveNavHref('/admin/organizations/org-1')).toBe('/admin');
    expect(findActiveNavHref('/vehicles/veh-1/edit')).toBe('/vehicles');
    expect(findActiveNavHref('/')).toBe('/');
  });
});
