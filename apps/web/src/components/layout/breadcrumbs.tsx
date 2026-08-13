'use client';

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

/** Builds the trail from the current path, using the nav labels when known. */
const buildTrail = (pathname: string): { title: string; href: string }[] => {
  if (pathname === '/') {
    return [ROOT_CRUMB];
  }

  const segments = pathname.split('/').filter(Boolean);

  const crumbs = segments.map((segment, index) => {
    const href = `/${segments.slice(0, index + 1).join('/')}`;
    const navItem = NAV_ITEMS.find((item) => item.href === href);

    return { title: navItem?.title ?? toTitleCase(segment), href };
  });

  return [ROOT_CRUMB, ...crumbs];
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
                  <BreadcrumbLink href={crumb.href}>{crumb.title}</BreadcrumbLink>
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
