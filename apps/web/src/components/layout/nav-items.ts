import { Bus, FileText, Truck, Users, type LucideIcon } from 'lucide-react';

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  description: string;
}

/** Single source of truth for the sidebar and the breadcrumb labels. */
export const NAV_ITEMS: NavItem[] = [
  {
    title: 'Vozači',
    href: '/drivers',
    icon: Bus,
    description: 'Evidencija vozača',
  },
  {
    title: 'Vozila',
    href: '/vehicles',
    icon: Truck,
    description: 'Vozni park i osnovni podaci',
  },
  {
    title: 'Partneri',
    href: '/partners',
    icon: Users,
    description: 'Naručioci prevoza',
  },
  {
    title: 'Ugovori',
    href: '/contracts',
    icon: FileText,
    description: 'Ugovori o prevozu putnika',
  },
];

export const isActiveRoute = (pathname: string, href: string): boolean =>
  href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`);
