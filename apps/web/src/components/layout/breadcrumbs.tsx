'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Fragment } from 'react';

import { NAV_ITEMS } from '@/components/layout/nav-items';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';

const ROOT_CRUMB = { title: 'Dashboard', href: '/' };

const toTitleCase = (segment: string): string =>
  segment
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

const SEGMENT_LABELS: Record<string, string> = {
  edit: 'Izmena',
  settings: 'Podešavanja',
  finance: 'Finansije',
  alarms: 'Alarm centar',
  fuel: 'Gorivo',
};

// "new" is shared across every section's create page — the label depends on
// what's being created, keyed by the segment right before "new" (matches
// each section's own page.tsx <title> exactly).
const NEW_LABELS: Record<string, string> = {
  drivers: 'Novi vozač',
  vehicles: 'Novo vozilo',
  partners: 'Novi partner',
  trips: 'Nova vožnja',
  contracts: 'Novi ugovor',
  series: 'Ponavljajuća vožnja',
};

/** Builds the trail from the current path, using the nav labels when known. */
const buildTrail = (pathname: string): { title: string; href: string }[] => {
  if (pathname === '/' || pathname === ROOT_CRUMB.href) {
    return [ROOT_CRUMB];
  }

  const segments = pathname.split('/').filter(Boolean);

  const crumbs = segments.map((segment, index) => {
    const href = `/${segments.slice(0, index + 1).join('/')}`;
    const navItem = NAV_ITEMS.find((item) => item.href === href);
    const previous = segments[index - 1];
    const isDriverId = previous === 'drivers' && segment !== 'new';

    return {
      title:
        navItem?.title ??
        (segment === 'new' ? NEW_LABELS[previous ?? ''] : undefined) ??
        SEGMENT_LABELS[segment] ??
        (isDriverId ? 'Profil' : toTitleCase(segment)),
      href,
    };
  });

  return crumbs[0]?.href === ROOT_CRUMB.href ? crumbs : [ROOT_CRUMB, ...crumbs];
};

export function Breadcrumbs() {
  const pathname = usePathname();
  const trail = buildTrail(pathname);

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {trail.map((crumb, index) => {
          const isLast = index === trail.length - 1;

          return (
            <Fragment key={crumb.href}>
              <BreadcrumbItem>
                {isLast ? (
                  <BreadcrumbPage>{crumb.title}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link href={crumb.href}>{crumb.title}</Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
              {isLast ? null : <BreadcrumbSeparator />}
            </Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
