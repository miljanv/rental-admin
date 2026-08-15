'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { NAV_ITEMS, isActiveRoute, type NavItem } from '@/components/layout/nav-items';
import { cn } from '@/lib/utils';

interface SidebarNavProps {
  onNavigate?: () => void;
  items?: NavItem[];
  'aria-label'?: string;
}

export function SidebarNav({
  onNavigate,
  items = NAV_ITEMS,
  'aria-label': ariaLabel = 'Main navigation',
}: SidebarNavProps) {
  const pathname = usePathname();

  return (
    <nav aria-label={ariaLabel} className="flex flex-col gap-1 px-3">
      {items.map((item) => {
        const isActive = isActiveRoute(pathname, item.href);
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={isActive ? 'page' : undefined}
            className={cn(
              'group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              'focus-visible:ring-sidebar-ring/50 outline-none focus-visible:ring-2',
              item.emphasis === 'alert'
                ? 'bg-primary text-white hover:bg-primary/90 hover:text-white'
                : isActive
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                  : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
            )}
          >
            <Icon
              className={cn(
                'size-4 shrink-0 transition-colors',
                item.emphasis === 'alert'
                  ? 'text-white'
                  : isActive
                    ? 'text-sidebar-primary'
                    : 'text-sidebar-foreground/50 group-hover:text-sidebar-foreground',
              )}
              aria-hidden
            />
            <span className="truncate">{item.title}</span>
            {isActive && item.emphasis !== 'alert' ? (
              <span className="bg-sidebar-primary ml-auto size-1.5 rounded-full" />
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
