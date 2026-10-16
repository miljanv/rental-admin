import type { UserRole } from '@rental-admin/shared';
import {
  Bell,
  ChartNoAxesCombined,
  FileText,
  Fuel,
  LayoutDashboard,
  ReceiptText,
  Route,
  Settings2,
  ShieldCheck,
  Store,
  Truck,
  UserRound,
  Users,
  Wallet,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  description: string;
  emphasis?: 'alert';
  /** Shown only to a superadmin. Every other item is a screen of one organization's data. */
  access?: 'superadmin';
}

/** Single source of truth for the sidebar and the breadcrumb labels. */
export const NAV_ITEMS: NavItem[] = [
  {
    title: 'Kontrolna tabla',
    href: '/',
    icon: LayoutDashboard,
    description: 'Vožnje, finansije i rokovi',
  },
  {
    title: 'Vožnje',
    href: '/trips',
    icon: Route,
    description: 'Pojedinačne i ponavljajuće vožnje',
  },
  {
    title: 'Zaposleni',
    href: '/drivers',
    icon: UserRound,
    description: 'Evidencija zaposlenih',
  },
  {
    title: 'Vozila',
    href: '/vehicles',
    icon: Truck,
    description: 'Vozni park i osnovni podaci',
  },
  {
    title: 'Gorivo',
    href: '/fuel',
    icon: Fuel,
    description: 'Sipanja za sva vozila, sa grupnih računa',
  },
  {
    title: 'Troškovi',
    href: '/expenses',
    icon: ReceiptText,
    description: 'Računi, keš i zajednički troškovi firme',
  },
  {
    title: 'Partneri',
    href: '/partners',
    icon: Users,
    description: 'Naručioci prevoza',
  },
  {
    title: 'Dobavljači',
    href: '/suppliers',
    icon: Store,
    description: 'Evidencija dobavljača',
  },
  {
    title: 'Finansije',
    href: '/finance',
    icon: Wallet,
    description: 'Transakcije, izveštaji i avansi',
  },
  {
    title: 'Ugovori',
    href: '/contracts',
    icon: FileText,
    description: 'Ugovori o prevozu putnika',
  },
  {
    title: 'Analitika',
    href: '/analytics',
    icon: ChartNoAxesCombined,
    description: 'Pregled poslovanja',
  },
  {
    title: 'Firme i korisnici',
    href: '/admin',
    icon: ShieldCheck,
    description: 'Upravljanje firmama i nalozima',
    access: 'superadmin',
  },
  {
    title: 'Alarm centar',
    href: '/alarms',
    icon: Bell,
    description: 'Svi rokovi zaposlenih i vozila',
    emphasis: 'alert',
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

export interface NavAudience {
  role: UserRole;
  /** A superadmin has to pick an organization before any business screen has data. */
  hasOrganization: boolean;
}

/** Which nav items a signed-in user gets to see. */
export const filterNavItems = (items: NavItem[], audience: NavAudience): NavItem[] =>
  items.filter((item) => {
    if (item.access === 'superadmin') {
      return audience.role === 'SUPERADMIN';
    }

    return audience.role !== 'SUPERADMIN' || audience.hasOrganization;
  });
