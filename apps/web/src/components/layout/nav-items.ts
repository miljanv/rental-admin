import { FolderOpen, LayoutDashboard, type LucideIcon } from 'lucide-react';

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  description: string;
}

/** Single source of truth for the sidebar and the breadcrumb labels. */
export const NAV_ITEMS: NavItem[] = [
  {
    title: 'Dashboard',
    href: '/',
    icon: LayoutDashboard,
    description: 'Storage overview',
  },
  {
    title: 'Files',
    href: '/files',
    icon: FolderOpen,
    description: 'Upload and manage files',
  },
];

export const isActiveRoute = (pathname: string, href: string): boolean =>
  href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`);
