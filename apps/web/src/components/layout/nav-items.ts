import { Bell, Bus, LayoutDashboard, Settings2, Truck, Wallet, type LucideIcon } from 'lucide-react';

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  description: string;
  emphasis?: 'alert';
}

/** Single source of truth for the sidebar and the breadcrumb labels. */
export const NAV_ITEMS: NavItem[] = [
  {
    title: 'Dashboard',
    href: '/',
    icon: LayoutDashboard,
    description: 'Pregled najhitnijih rokova',
  },
  {
    title: 'Alarm centar',
    href: '/alarms',
    icon: Bell,
    description: 'Svi rokovi vozača i vozila',
    emphasis: 'alert',
  },
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
    title: 'Finansije',
    href: '/finance',
    icon: Wallet,
    description: 'Transakcije, izveštaji i avansi',
  },
  {
    title: 'Podešavanja',
    href: '/settings',
    icon: Settings2,
    description: 'Pragovi upozorenja po tipu dokumenta',
  },
];

export const isActiveRoute = (pathname: string, href: string): boolean =>
  href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`);

export const MAIN_NAV_ITEMS = NAV_ITEMS.filter(
  (item) => item.href !== '/settings' && item.href !== '/alarms',
);
export const FOOTER_NAV_ITEMS = NAV_ITEMS.filter(
  (item) => item.href === '/alarms' || item.href === '/settings',
);
